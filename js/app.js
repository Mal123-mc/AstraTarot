/* =========================================================
   星屿塔罗 · Astra Tarot
   应用主逻辑：抽牌、牌阵、解读、每日一牌、牌库、记录
   ========================================================= */
(function () {
  'use strict';

  const CARDS = window.TAROT_CARDS || [];
  const META = window.TAROT_META || {};
  const CARD_BY_ID = new Map(CARDS.map(function (card) { return [card.id, card]; }));

  const STORAGE = {
    settings: 'astra.settings.v1',
    history: 'astra.history.v1',
    daily: 'astra.daily.v1'
  };

  const SUIT_ICON = {
    wands: '#suit-wand',
    cups: '#suit-cup',
    swords: '#suit-sword',
    pentacles: '#suit-coin'
  };

  const SUIT_PALETTE = {
    wands: { deep: '#241813', accent: '#d99a62', glow: 'rgba(217, 154, 98, 0.18)' },
    cups: { deep: '#0f2025', accent: '#81b9c0', glow: 'rgba(129, 185, 192, 0.17)' },
    swords: { deep: '#151b2a', accent: '#aebbd4', glow: 'rgba(174, 187, 212, 0.16)' },
    pentacles: { deep: '#142017', accent: '#a9bd8b', glow: 'rgba(169, 189, 139, 0.17)' }
  };

  const MAJOR_DEEPS = ['#161a2d', '#1b1528', '#101f27', '#1d171a', '#131d2a', '#191a30'];
  const ELEMENT_COLORS = { 火: '#c98a5a', 水: '#7fb8bf', 风: '#aebbd4', 土: '#a9bd8b' };
  const ELEMENT_THEME = {
    火: '行动、热情与创造力',
    水: '情感、关系与直觉',
    风: '思考、沟通与真相',
    土: '现实、身体与积累'
  };
  const ELEMENT_QUOTE = {
    火: '先做，再想。让身体带着你走出犹豫。',
    水: '先诚实地感受，再决定要不要说出口。',
    风: '把事实与想象分开，写下来，然后开口。',
    土: '回到最小的、今天就能完成的一步。'
  };

  const SPREAD_ORDER = ['one', 'three', 'five', 'ten'];
  const SPREADS = {
    one: {
      key: 'one',
      name: '单牌指引',
      label: 'SINGLE CARD',
      count: 1,
      desc: '一张牌，回答此刻最重要的事。',
      layout: 'one',
      positions: [
        { name: '此刻的指引', lens: '把这张牌当作一面镜子。它描述的是此刻的能量，而不是一句不可更改的判决。' }
      ],
      glyph: [[50, 50]]
    },
    three: {
      key: 'three',
      name: '时间之流',
      label: 'THREE CARD',
      count: 3,
      desc: '过去 · 现在 · 未来，看见事情如何流动。',
      layout: 'three',
      positions: [
        { name: '过去', lens: '这张牌描述推动你走到此刻的力量。它可能是一次选择、一段关系，或一个尚未消化的旧经验。' },
        { name: '现在', lens: '这张牌是当下真正的处境与资源。留意它给出的关键词，哪两个最让你有感觉。' },
        { name: '未来', lens: '这张牌指出事情正在前往的方向。它是趋势，不是定论；你的下一步仍能改变它。' }
      ],
      glyph: [[22, 50], [50, 50], [78, 50]]
    },
    five: {
      key: 'five',
      name: '关系之镜',
      label: 'RELATIONSHIP',
      count: 5,
      desc: '你 · 对方 · 关系 · 挑战 · 走向',
      layout: 'five',
      positions: [
        { name: '你', lens: '你在这段关系中的位置、期待与盲点。' },
        { name: '对方', lens: '对方此刻的状态与能量。它不替对方表态，只提供一种理解的视角。' },
        { name: '关系现状', lens: '你们之间正在发生的真实互动，包括那些还没说出口的部分。' },
        { name: '挑战', lens: '这段关系需要面对的核心课题，或最容易卡住的地方。' },
        { name: '走向', lens: '如果当下的能量继续流动，关系可能前往的方向。' }
      ],
      glyph: [[50, 20], [24, 50], [50, 50], [76, 50], [50, 82]]
    },
    ten: {
      key: 'ten',
      name: '凯尔特十字',
      label: 'CELTIC CROSS',
      count: 10,
      desc: '十张牌的深读，适合复杂而重要的问题。',
      layout: 'ten',
      positions: [
        { name: '现状', lens: '问题的核心，以及你此刻真正站立的位置。' },
        { name: '挑战', lens: '横在面前的力量。它可能是外在阻碍，也可能是内在的抗拒。' },
        { name: '根基', lens: '这件事的深层基础，往往是你以为早已过去的旧经验。' },
        { name: '过去', lens: '刚刚过去、仍在影响现在的能量。' },
        { name: '意识', lens: '你清楚知道、并主动追求的目标。' },
        { name: '未来', lens: '近期可能展开的方向，是趋势而非定论。' },
        { name: '自我', lens: '你在这件事中的姿态、能力与盲点。' },
        { name: '环境', lens: '周围的人、条件与看不见的影响。' },
        { name: '希望与恐惧', lens: '你最深的期待，与最不愿面对的部分，往往指向同一处。' },
        { name: '结果', lens: '如果能量保持现在的走向，可能抵达的地方。它仍可被你的选择改写。' }
      ],
      glyph: [[42, 22], [42, 40], [42, 58], [26, 40], [42, 8], [58, 40], [78, 12], [78, 34], [78, 56], [78, 78]]
    }
  };

  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

  const state = {
    view: 'reading',
    spreadKey: 'three',
    question: '',
    draw: [],
    revealed: 0,
    dealt: false,
    isDealing: false,
    finished: false,
    dealToken: 0,
    lastReading: null,
    sound: false,
    daily: null,
    deckFilter: 'all',
    deckQuery: ''
  };

  const $ = function (selector, context) { return (context || document).querySelector(selector); };
  const $$ = function (selector, context) { return Array.prototype.slice.call((context || document).querySelectorAll(selector)); };

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function pad(value) { return String(value).padStart(2, '0'); }

  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  function reduceMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function randomInt(max) {
    if (window.crypto && window.crypto.getRandomValues) {
      const buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      return buffer[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function randomFloat() {
    if (window.crypto && window.crypto.getRandomValues) {
      const buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      return buffer[0] / 4294967296;
    }
    return Math.random();
  }

  function shuffleCopy(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function hashString(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.getFullYear() + '.' + pad(date.getMonth() + 1) + '.' + pad(date.getDate()) +
      ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function dayKey(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function formatDay(date) {
    return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日 · 星期' + WEEKDAYS[date.getDay()];
  }

  function readStorage(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  /* =========================================================
     Sound · 极轻的合成音，默认关闭
     ========================================================= */
  let audioCtx = null;

  function ensureAudio() {
    if (!state.sound) return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playTone(frequency, duration, gainValue, type, delay) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const start = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue || 0.025, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function playFlip() {
    if (!state.sound) return;
    playTone(620, 0.22, 0.022, 'sine', 0);
    playTone(930, 0.34, 0.012, 'sine', 0.055);
  }

  function playShuffle() {
    if (!state.sound) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const duration = 0.42;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      const envelope = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * envelope * envelope;
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 0.7;
    gain.gain.value = 0.02;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  function playReveal() {
    if (!state.sound) return;
    playTone(392, 1.1, 0.012, 'sine', 0);
    playTone(523.25, 1.2, 0.009, 'sine', 0.06);
    playTone(659.25, 1.3, 0.007, 'triangle', 0.12);
  }

  /* =========================================================
     Card rendering
     ========================================================= */
  function paletteFor(card) {
    if (card.arcana === 'major') {
      return {
        deep: MAJOR_DEEPS[card.id % MAJOR_DEEPS.length],
        accent: 'hsl(' + (38 + (card.id % 6) * 3) + ' 47% 71%)',
        glow: 'rgba(205, 172, 112, 0.2)'
      };
    }
    return SUIT_PALETTE[card.suit] || SUIT_PALETTE.pentacles;
  }

  function pointsString(points) {
    return points.map(function (point) { return point[0].toFixed(1) + ',' + point[1].toFixed(1); }).join(' ');
  }

  function starPoints(cx, cy, outer, inner, count, rotation) {
    const points = [];
    for (let i = 0; i < count * 2; i += 1) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = (Math.PI * i) / count - Math.PI / 2 + (rotation || 0);
      points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
    }
    return points;
  }

  function mandalaSVG(card) {
    const count = 8 + (card.id % 3) * 2;
    const rays = [];
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12;
      const inner = 57;
      const outer = i % 2 === 0 ? 86 : 78;
      rays.push('<line x1="' + (100 + Math.cos(angle) * inner).toFixed(1) +
        '" y1="' + (100 + Math.sin(angle) * inner).toFixed(1) +
        '" x2="' + (100 + Math.cos(angle) * outer).toFixed(1) +
        '" y2="' + (100 + Math.sin(angle) * outer).toFixed(1) +
        '" stroke="currentColor" stroke-width=".6" stroke-opacity=".26"/>');
    }
    const dots = [];
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12 + Math.PI / 12;
      dots.push('<circle cx="' + (100 + Math.cos(angle) * 91).toFixed(1) +
        '" cy="' + (100 + Math.sin(angle) * 91).toFixed(1) +
        '" r="1.4" fill="currentColor" fill-opacity=".55"/>');
    }
    return '<svg class="card-art__mandala" viewBox="0 0 200 200" fill="none" aria-hidden="true">' +
      '<circle cx="100" cy="100" r="94" stroke="currentColor" stroke-opacity=".22"/>' +
      '<circle cx="100" cy="100" r="84" stroke="currentColor" stroke-opacity=".46" stroke-dasharray="1 5"/>' +
      '<circle cx="100" cy="100" r="58" stroke="currentColor" stroke-opacity=".2"/>' +
      '<polygon points="' + pointsString(starPoints(100, 100, 69, 29, count, card.id * 0.11)) + '" stroke="currentColor" stroke-opacity=".28"/>' +
      rays.join('') + dots.join('') +
      '<circle cx="100" cy="100" r="2.4" fill="currentColor" fill-opacity=".7"/>' +
      '</svg>';
  }

  function suitSVG(suit) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="' + (SUIT_ICON[suit] || SUIT_ICON.pentacles) + '"></use></svg>';
  }

  function pipsLayout(rank) {
    const layouts = {
      1: [[50, 50]],
      2: [[50, 31], [50, 69]],
      3: [[50, 24], [29, 67], [71, 67]],
      4: [[30, 30], [70, 30], [30, 70], [70, 70]],
      5: [[30, 26], [70, 26], [50, 50], [30, 74], [70, 74]],
      6: [[30, 21], [70, 21], [30, 50], [70, 50], [30, 79], [70, 79]],
      7: [[30, 18], [70, 18], [50, 33], [30, 50], [70, 50], [30, 79], [70, 79]],
      8: [[30, 17], [70, 17], [30, 38], [70, 38], [30, 61], [70, 61], [30, 82], [70, 82]],
      9: [[24, 21], [50, 21], [76, 21], [24, 50], [50, 50], [76, 50], [24, 79], [50, 79], [76, 79]],
      10: [[31, 15], [69, 15], [31, 33], [69, 33], [31, 51], [69, 51], [31, 69], [69, 69], [31, 87], [69, 87]]
    };
    return layouts[rank] || layouts[1];
  }

  function pipSize(rank) {
    if (rank === 1) return 46;
    if (rank <= 3) return 25;
    if (rank <= 6) return 21;
    return 16;
  }

  function pipsArt(card) {
    const positions = pipsLayout(card.rank);
    const size = pipSize(card.rank);
    return '<span class="card-art__pips">' + positions.map(function (point) {
      return '<span class="card-art__pip" style="left:' + point[0] + '%;top:' + point[1] + '%;--pip:' + size + '%">' +
        suitSVG(card.suit) + '</span>';
    }).join('') + '</span>';
  }

  function courtArt(card) {
    const glyphs = { 11: '♙', 12: '♞', 13: '♛', 14: '♚' };
    return '<span class="card-art__court">' +
      '<span class="card-art__court-glyph">' + (glyphs[card.rank] || '♞') + '</span>' +
      '<span class="card-art__court-suit">' + suitSVG(card.suit) + '</span>' +
      '</span>';
  }

  function artFor(card) {
    if (card.arcana === 'major') {
      return mandalaSVG(card) +
        '<span class="card-art__glyph">' + escapeHTML(card.symbol) + '\uFE0E</span>';
    }
    if (card.rank <= 10) return mandalaSVG(card) + pipsArt(card);
    return mandalaSVG(card) + courtArt(card);
  }

  function backArt() {
    const star = starPoints(100, 160, 47, 19, 8, 0);
    const star2 = starPoints(100, 160, 31, 13, 8, Math.PI / 8);
    return '<svg class="card-back__art" viewBox="0 0 200 320" fill="none" aria-hidden="true">' +
      '<rect x="6.5" y="6.5" width="187" height="307" rx="3" stroke="currentColor" stroke-opacity=".34"/>' +
      '<rect x="13" y="13" width="174" height="294" rx="2" stroke="currentColor" stroke-opacity=".17"/>' +
      '<path d="M100 27v22M100 271v22M20 160h16M164 160h16" stroke="currentColor" stroke-opacity=".4" stroke-linecap="round"/>' +
      '<circle cx="100" cy="160" r="70" stroke="currentColor" stroke-opacity=".25"/>' +
      '<circle cx="100" cy="160" r="61" stroke="currentColor" stroke-opacity=".55" stroke-dasharray="1 5"/>' +
      '<polygon points="' + pointsString(star) + '" stroke="currentColor" stroke-opacity=".72"/>' +
      '<polygon points="' + pointsString(star2) + '" stroke="currentColor" stroke-opacity=".3"/>' +
      '<circle cx="100" cy="160" r="14" stroke="currentColor" stroke-opacity=".45"/>' +
      '<circle cx="100" cy="160" r="3.2" fill="currentColor" fill-opacity=".9"/>' +
      '<circle cx="100" cy="89" r="2" fill="currentColor" fill-opacity=".6"/>' +
      '<circle cx="100" cy="231" r="2" fill="currentColor" fill-opacity=".6"/>' +
      '<circle cx="29" cy="160" r="2" fill="currentColor" fill-opacity=".5"/>' +
      '<circle cx="171" cy="160" r="2" fill="currentColor" fill-opacity=".5"/>' +
      '<path d="M37 47l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6ZM163 263l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" fill="currentColor" fill-opacity=".42"/>' +
      '</svg>' +
      '<span class="card-back__seal">ASTRA</span>';
  }

  function cardMarkup(card, options) {
    const opts = options || {};
    const palette = paletteFor(card);
    const faceUp = Boolean(opts.faceUp);
    const isStatic = Boolean(opts.staticFace);
    const classes = ['tarot-card'];
    if (isStatic) classes.push('is-static');
    if (faceUp && !isStatic) classes.push('is-flipped');
    if (opts.className) classes.push(opts.className);

    let ariaLabel;
    if (opts.ariaLabel) ariaLabel = opts.ariaLabel;
    else if (isStatic) ariaLabel = card.name + '，查看牌义';
    else ariaLabel = (opts.positionName ? opts.positionName + '，' : '') + '点击翻开这张牌';

    const numeral = card.arcana === 'major' ? card.numeral : card.suitName;
    const badge = opts.badge ? '<span class="card-badge">' + opts.badge + '</span>' : '';
    const back = isStatic ? '' : '<span class="card-face card-face--back" aria-hidden="true">' + backArt() + '</span>';

    return '<button type="button" class="' + classes.join(' ') + '" data-card-id="' + card.id + '"' +
      (opts.slot != null ? ' data-slot="' + opts.slot + '"' : '') +
      ' style="--deep:' + palette.deep + ';--accent:' + palette.accent + ';--glow:' + palette.glow + '"' +
      ' aria-label="' + escapeHTML(ariaLabel) + '">' +
      '<span class="card-inner">' +
      back +
      '<span class="card-face card-face--front">' +
      '<span class="card-numeral">' + escapeHTML(numeral) + '</span>' +
      '<span class="card-art">' + artFor(card) + '</span>' +
      '<span class="card-title"><b>' + escapeHTML(card.name) + '</b><i>' + escapeHTML(card.en) + '</i></span>' +
      badge +
      '</span>' +
      '</span>' +
      '</button>';
  }

  /* =========================================================
     Reading · 抽牌与解读
     ========================================================= */
  function currentSpread() { return SPREADS[state.spreadKey] || SPREADS.three; }

  function drawCards(count) {
    return shuffleCopy(CARDS).slice(0, count).map(function (card, index) {
      return { card: card, reversed: randomFloat() < 0.32, position: index, flipped: false };
    });
  }

  function spreadGlyph(spread) {
    return spread.glyph.map(function (point) {
      return '<i style="left:' + point[0] + '%;top:' + point[1] + '%"></i>';
    }).join('');
  }

  function renderSpreadOptions() {
    const list = $('#spread-list');
    if (!list) return;
    list.innerHTML = SPREAD_ORDER.map(function (key) {
      const spread = SPREADS[key];
      const active = key === state.spreadKey;
      return '<button type="button" class="spread-option' + (active ? ' is-active' : '') + '"' +
        ' data-spread="' + key + '" role="radio" aria-checked="' + active + '" tabindex="' + (active ? '0' : '-1') + '">' +
        '<span class="spread-option__glyph" aria-hidden="true">' + spreadGlyph(spread) + '</span>' +
        '<span class="spread-option__body">' +
        '<span class="spread-option__name">' + spread.name + '<span class="spread-option__count">' + spread.count + ' 张</span></span>' +
        '<span class="spread-option__desc">' + spread.desc + '</span>' +
        '</span>' +
        '<span class="spread-option__mark" aria-hidden="true"></span>' +
        '</button>';
    }).join('');
  }

  function setDealBusy(busy) {
    const button = $('#deal-btn');
    const label = $('.primary-btn__label', button);
    button.disabled = busy;
    if (busy) {
      label.textContent = '洗牌中…';
    } else if (state.dealt) {
      label.textContent = '重新抽牌';
    } else {
      label.textContent = '洗牌并抽牌';
    }
  }

  function updateIdleTable() {
    const spread = currentSpread();
    const title = $('#table-title');
    const kicker = $('#table-kicker');
    const hint = $('#table-hint');
    const meta = $('#table-meta');
    if (state.dealt) return;
    if (title) title.textContent = '牌桌在等你';
    if (kicker) kicker.textContent = 'READY WHEN YOU ARE';
    if (hint) hint.textContent = '已选「' + spread.name + '」· ' + spread.count + ' 张。写下问题，然后洗牌。';
    if (meta) meta.textContent = spread.count + ' 张牌阵';
  }

  function resetTable(options) {
    const opts = options || {};
    state.dealToken += 1;
    state.isDealing = false;
    state.dealt = false;
    state.finished = false;
    state.draw = [];
    state.revealed = 0;

    const table = $('#card-table');
    const empty = $('#table-empty');
    const result = $('#reading-result');
    const resetBtn = $('#reset-btn');
    const dealBtn = $('#deal-btn');

    if (table) {
      table.hidden = true;
      table.className = 'card-table';
      table.innerHTML = '';
    }
    if (empty) empty.hidden = false;
    if (result) {
      result.hidden = true;
      result.innerHTML = '';
    }
    if (resetBtn) resetBtn.hidden = true;
    if (dealBtn) dealBtn.disabled = false;
    setDealBusy(false);
    updateIdleTable();

    if (!opts.silent) {
      const panel = $('.table-panel');
      if (panel && window.innerWidth <= 1100) {
        panel.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
      }
    }
  }

  function buildTableSlots(spread) {
    const slots = spread.positions.map(function (position, index) {
      const item = state.draw[index];
      return '<div class="card-slot" data-slot="' + index + '" style="animation-delay:' + (index * 75) + 'ms">' +
        cardMarkup(item.card, {
          faceUp: false,
          slot: index,
          badge: spread.layout === 'ten' ? index + 1 : null,
          positionName: position.name
        }) +
        '<div class="card-caption" data-caption="' + index + '">' +
        '<span class="card-caption__idx">' + pad(index + 1) + '</span>' +
        '<span class="card-caption__pos">' + escapeHTML(position.name) + '</span>' +
        '</div>' +
        '</div>';
    });
    if (spread.layout === 'ten') {
      return '<div class="celtic-cross">' + slots.slice(0, 6).join('') + '</div>' +
        '<div class="celtic-staff">' + slots.slice(6).join('') + '</div>';
    }
    return slots.join('');
  }

  async function dealCards() {
    if (state.isDealing) return;
    state.question = ($('#question').value || '').trim();
    const spread = currentSpread();
    state.isDealing = true;
    state.dealt = true;
    state.finished = false;
    state.revealed = 0;
    state.dealToken += 1;
    const token = state.dealToken;
    state.draw = drawCards(spread.count);

    const result = $('#reading-result');
    const empty = $('#table-empty');
    const table = $('#card-table');
    const resetBtn = $('#reset-btn');

    if (result) {
      result.hidden = true;
      result.innerHTML = '';
    }
    if (empty) empty.hidden = true;
    if (resetBtn) resetBtn.hidden = false;
    if (table) {
      table.hidden = false;
      table.className = 'card-table layout--' + spread.layout;
      table.innerHTML = '';
    }

    $('#table-title').textContent = spread.name;
    $('#table-kicker').textContent = 'SHUFFLING THE DECK';
    $('#table-hint').textContent = '正在为你洗牌 · ' + spread.count + ' 张';
    $('#table-meta').textContent = spread.name + ' · ' + spread.count + ' 张';
    setDealBusy(true);
    playShuffle();

    await wait(reduceMotion() ? 60 : 680);
    if (token !== state.dealToken) return;

    if (table) table.innerHTML = buildTableSlots(spread);
    $('#table-kicker').textContent = 'TAP A CARD TO REVEAL';
    $('#table-hint').textContent = spread.count === 1
      ? '凭第一直觉，翻开这张牌。'
      : '凭第一直觉，按任意顺序翻开每一张牌。';
    state.isDealing = false;
    setDealBusy(false);

    if (window.innerWidth <= 1100) {
      const panel = $('.table-panel');
      if (panel) panel.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function onTableClick(event) {
    const button = event.target.closest('.tarot-card');
    if (!button || !$('#card-table').contains(button) || state.isDealing) return;
    const slot = Number(button.dataset.slot);
    const item = state.draw[slot];
    if (!item || item.flipped) return;

    item.flipped = true;
    button.classList.add('is-flipped');
    const spread = currentSpread();
    const position = spread.positions[slot];
    button.setAttribute('aria-label', position.name + '：' + item.card.name + (item.reversed ? '，逆位' : '，正位'));

    const caption = $('[data-caption="' + slot + '"]');
    if (caption) {
      caption.innerHTML = '<span class="card-caption__idx">' + pad(slot + 1) + '</span>' +
        '<span class="card-caption__pos">' + escapeHTML(position.name) + '</span>' +
        '<span class="card-caption__name">' + escapeHTML(item.card.name) + '</span>' +
        (item.reversed ? '<span class="card-caption__rev">逆位</span>' : '');
    }

    state.revealed += 1;
    playFlip();
    $('#table-kicker').textContent = 'REVEALED ' + state.revealed + ' / ' + state.draw.length;
    $('#table-hint').textContent = state.revealed === state.draw.length
      ? '牌面已全部翻开，正在整理解读…'
      : '已翻开 ' + state.revealed + ' 张，还剩 ' + (state.draw.length - state.revealed) + ' 张。';

    if (state.revealed === state.draw.length && !state.finished) {
      state.finished = true;
      setTimeout(finishReading, reduceMotion() ? 80 : 760);
    }
  }

  function finishReading() {
    if (!state.dealt || !state.draw.length) return;
    const reading = {
      id: 'r' + Date.now() + '-' + randomInt(9999),
      question: state.question,
      spreadKey: state.spreadKey,
      cards: state.draw.map(function (item) {
        return { cardId: item.card.id, reversed: item.reversed };
      }),
      createdAt: Date.now()
    };
    state.lastReading = reading;
    renderReading(reading);
    const result = $('#reading-result');
    result.hidden = false;
    saveReading(reading);
    $('#table-kicker').textContent = 'READING COMPLETE';
    $('#table-hint').textContent = '解读已生成，并保存到「记录」。';
    playReveal();

    if (state.view === 'reading') {
      setTimeout(function () {
        result.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
      }, 160);
    }
  }

  /* =========================================================
     Analysis & synthesis
     ========================================================= */
  function analyze(items) {
    const elements = { 火: 0, 水: 0, 风: 0, 土: 0 };
    let majorCount = 0;
    let reversedCount = 0;
    const keywordCount = {};

    items.forEach(function (item) {
      if (item.card.arcana === 'major') majorCount += 1;
      else if (item.card.element && elements[item.card.element] != null) elements[item.card.element] += 1;
      if (item.reversed) reversedCount += 1;
      item.card.keywords.forEach(function (keyword) {
        keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
      });
    });

    const sortedElements = Object.keys(elements).sort(function (a, b) { return elements[b] - elements[a]; });
    const dominant = elements[sortedElements[0]] > 0 ? sortedElements[0] : null;
    const activeElements = Object.keys(elements).filter(function (key) { return elements[key] > 0; }).length;
    const repeated = Object.keys(keywordCount)
      .filter(function (key) { return keywordCount[key] > 1; })
      .sort(function (a, b) { return keywordCount[b] - keywordCount[a]; })
      .slice(0, 3);

    return {
      total: items.length,
      majorCount: majorCount,
      reversedCount: reversedCount,
      elements: elements,
      dominant: dominant,
      activeElements: activeElements,
      repeated: repeated,
      keywordCount: keywordCount
    };
  }

  function buildSynthesis(items) {
    const analysis = analyze(items);
    const paragraphs = [];
    const total = analysis.total;

    if (total > 1) {
      if (analysis.majorCount >= Math.ceil(total / 2)) {
        paragraphs.push('这组牌里有 ' + analysis.majorCount + ' 张大阿尔卡纳，分量不轻。它谈的不只是眼前的得失，而是你正在经历的一段更深的课题——急不来，也不会白走。');
      } else if (analysis.majorCount > 0) {
        paragraphs.push('大阿尔卡纳出现了 ' + analysis.majorCount + ' 张，说明这件事触到了你真正在意的地方。小牌描述日常，大牌描述阶段；两者放在一起看，会更完整。');
      } else {
        paragraphs.push('这组牌全部来自小阿尔卡纳，焦点落在具体的日常、关系与行动上。答案不在远方，而在下一步怎么做。');
      }
    } else if (analysis.majorCount === 1) {
      paragraphs.push('这是一张大阿尔卡纳。它给出的不是一个具体建议，而是一个阶段的主题，适合放在心里慢慢体会。');
    } else {
      paragraphs.push('这张小牌把目光拉回到具体生活里。它关心的不是宏大的命运，而是你今天如何度过。');
    }

    if (analysis.dominant) {
      const values = Object.keys(analysis.elements).map(function (key) { return analysis.elements[key]; });
      const max = Math.max.apply(null, values);
      const min = Math.min.apply(null, values);
      if (analysis.activeElements >= 3 && max - min <= 1) {
        paragraphs.push('四元素分布相当均衡，外在条件与内在状态都没有明显缺口。不必寻找戏剧性的答案，按部就班地推进，就是此刻最好的策略。');
      } else {
        paragraphs.push(analysis.dominant + '元素出现最多（' + analysis.elements[analysis.dominant] + ' 张），' +
          ELEMENT_THEME[analysis.dominant] + '是这组牌的钥匙。把注意力放在这里，其他问题会跟着松动。');
      }
    } else {
      paragraphs.push('牌面没有落入某一种元素，主题更偏向精神与命运本身。先别急着行动，把问题看得更清楚一点。');
    }

    if (total > 1) {
      if (analysis.reversedCount === 0) {
        paragraphs.push('所有牌都是正位，能量流动得比较顺。适合把已经想清楚的事付诸行动，不必再等一个「更合适的时机」。');
      } else if (analysis.reversedCount >= Math.ceil(total / 2)) {
        paragraphs.push('逆位偏多（' + analysis.reversedCount + '/' + total + '），能量更多向内收或暂时受阻。它不是坏兆头，而是在提醒：有些结还没解开。先处理内在的迟疑，再要求外在的结果。');
      } else {
        paragraphs.push('正逆位交错（' + analysis.reversedCount + ' 张逆位），事情有推进也有卡顿。把逆位牌看作需要多给一点时间的位置，而不是失败的证据。');
      }
    }

    if (analysis.repeated.length) {
      paragraphs.push('牌面反复出现「' + analysis.repeated.join('」「') + '」的主题。它们大概率才是这次提问真正的核心，值得多停留一会儿。');
    }

    let quote;
    if (analysis.reversedCount >= Math.ceil(total / 2) && total > 1) {
      quote = '允许自己慢一点。未解开的部分，不需要在今天就有答案。';
    } else if (analysis.dominant) {
      quote = ELEMENT_QUOTE[analysis.dominant];
    } else {
      quote = '把目光从待办清单上抬起来，问一句：我真正想靠近的是什么？';
    }

    return { paragraphs: paragraphs, quote: quote, analysis: analysis };
  }

  function interpretationItems(reading) {
    const spread = SPREADS[reading.spreadKey] || SPREADS.one;
    return reading.cards.map(function (entry, index) {
      const card = CARD_BY_ID.get(entry.cardId);
      return {
        card: card,
        reversed: entry.reversed,
        position: spread.positions[index] || { name: '第 ' + (index + 1) + ' 张', lens: '' }
      };
    }).filter(function (item) { return Boolean(item.card); });
  }

  function interpItemsHTML(items, options) {
    const opts = options || {};
    return items.map(function (item, index) {
      const meaning = item.reversed ? item.card.reversed : item.card.upright;
      return '<article class="interp-item">' +
        '<div class="interp-item__head">' +
        '<span class="interp-item__idx">' + pad(index + 1) + '</span>' +
        '<span class="interp-item__pos">' + escapeHTML(item.position.name) + '</span>' +
        '<span class="orientation' + (item.reversed ? ' orientation--rev' : '') + '">' + (item.reversed ? '逆位' : '正位') + '</span>' +
        '</div>' +
        '<div class="interp-item__card"><h3>' + escapeHTML(item.card.name) + '</h3><em>' + escapeHTML(item.card.en) + '</em></div>' +
        '<div class="interp-item__keywords">' + item.card.keywords.map(function (keyword) {
          return '<span>' + escapeHTML(keyword) + '</span>';
        }).join('') + '</div>' +
        '<p class="interp-item__text">' + escapeHTML(meaning) + '</p>' +
        (opts.showLens !== false && item.position.lens
          ? '<p class="interp-item__lens"><b>在这个位置：</b>' + escapeHTML(item.position.lens) + '</p>'
          : '') +
        '</article>';
    }).join('');
  }

  function synthesisHTML(synthesis, spreadName) {
    const analysis = synthesis.analysis;
    const segments = Object.keys(analysis.elements)
      .filter(function (key) { return analysis.elements[key] > 0; })
      .map(function (key) {
        return '<i style="width:' + (analysis.elements[key] / Math.max(1, analysis.total - analysis.majorCount)) * 100 +
          '%;--bar:' + ELEMENT_COLORS[key] + '"></i>';
      }).join('');
    const legend = Object.keys(analysis.elements).map(function (key) {
      return '<span><i style="--c:' + ELEMENT_COLORS[key] + '"></i>' + key + ' ' + analysis.elements[key] + '</span>';
    }).join('');
    const minorCount = analysis.total - analysis.majorCount;
    const elementBlock = minorCount > 0
      ? '<div class="element-bar">' + segments + '</div>' +
        '<div class="element-legend">' + legend + '</div>'
      : '<p class="element-empty">全为大阿尔卡纳，元素由牌面主题统摄。</p>';

    return '<div class="synthesis">' +
      '<div class="synthesis__main">' +
      '<div class="synthesis__head"><span class="synthesis__glyph" aria-hidden="true">✦</span><h3>综合指引</h3></div>' +
      '<div class="synthesis__text">' + synthesis.paragraphs.map(function (paragraph) {
        return '<p>' + escapeHTML(paragraph) + '</p>';
      }).join('') + '</div>' +
      '<blockquote class="synthesis__quote">' + escapeHTML(synthesis.quote) + '</blockquote>' +
      '</div>' +
      '<div class="synthesis__side">' +
      '<div>' +
      '<div class="stat-label"><span>元素分布</span><span>小牌 ' + minorCount + ' 张</span></div>' +
      elementBlock +
      '</div>' +
      '<div class="stat-rows">' +
      '<div class="stat-row"><span>大阿尔卡纳</span><b>' + analysis.majorCount + ' / ' + analysis.total + '</b></div>' +
      '<div class="stat-row"><span>逆位</span><b>' + analysis.reversedCount + ' / ' + analysis.total + '</b></div>' +
      '<div class="stat-row"><span>主导元素</span><b>' + (analysis.dominant || '精神') + '</b></div>' +
      '<div class="stat-row"><span>牌阵</span><b>' + escapeHTML(spreadName) + '</b></div>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  function renderReading(reading) {
    const container = $('#reading-result');
    const spread = SPREADS[reading.spreadKey] || SPREADS.one;
    const items = interpretationItems(reading);
    const synthesis = buildSynthesis(items);
    const question = reading.question || '此刻的指引';
    const date = formatDate(reading.createdAt);

    container.innerHTML =
      '<header class="result-head">' +
      '<div class="result-head__main">' +
      '<p class="result-question">YOUR READING · ' + date + '</p>' +
      '<h2>' + escapeHTML(question) + '</h2>' +
      '<div class="result-meta">' +
      '<span class="meta-chip">' + spread.name + '</span>' +
      '<span class="meta-chip">' + spread.count + ' 张</span>' +
      '<span class="meta-chip">逆位 ' + synthesis.analysis.reversedCount + ' 张</span>' +
      '<span class="meta-chip">已保存</span>' +
      '</div>' +
      '</div>' +
      '<div class="result-actions">' +
      '<button type="button" class="ghost-btn" data-copy-reading>复制解读</button>' +
      '<button type="button" class="ghost-btn" data-new-reading>再抽一次</button>' +
      '</div>' +
      '</header>' +
      '<div class="result-overview result-overview--' + items.length + '">' + items.map(function (item) {
        return '<div class="result-mini">' +
          cardMarkup(item.card, { faceUp: true, staticFace: true }) +
          '<div class="card-caption">' + (item.reversed ? '<span class="card-caption__rev">逆位</span>' : '') + '</div>' +
          '</div>';
      }).join('') + '</div>' +
      (items.length > 5 ? '<p class="result-scroll-hint">左右滑动 · 查看全部 ' + items.length + ' 张牌</p>' : '') +
      '<div class="interpretation interpretation--' + items.length + '">' + interpItemsHTML(items) + '</div>' +
      '<div class="result-synthesis">' + synthesisHTML(synthesis, spread.name) + '</div>' +
      '<p class="result-disclaimer">塔罗呈现的是此刻的能量与可能性，不是确定的预言。请把最终的判断与选择，留给你自己。</p>';
  }

  function readingToText(reading) {
    const spread = SPREADS[reading.spreadKey] || SPREADS.one;
    const items = interpretationItems(reading);
    const synthesis = buildSynthesis(items);
    const lines = [];
    lines.push('星屿塔罗 · ' + spread.name);
    lines.push(formatDate(reading.createdAt));
    lines.push('问题：' + (reading.question || '此刻的指引'));
    lines.push('');
    items.forEach(function (item, index) {
      lines.push(pad(index + 1) + ' ' + item.position.name + ' · ' + item.card.name + '（' + (item.reversed ? '逆位' : '正位') + '）');
      lines.push(item.reversed ? item.card.reversed : item.card.upright);
      lines.push('');
    });
    lines.push('综合指引');
    lines.push(synthesis.paragraphs.join('\n\n'));
    lines.push('');
    lines.push(synthesis.quote);
    lines.push('');
    lines.push('—— 塔罗是自我觉察的工具，不是确定的预言。');
    return lines.join('\n');
  }

  function saveReading(reading) {
    const stored = readStorage(STORAGE.history, []);
    journal = Array.isArray(stored) ? stored : [];
    journal.unshift(reading);
    journal = journal.slice(0, 60);
    writeStorage(STORAGE.history, journal);
    renderHistory();
    showToast('已保存到「记录」');
  }

  function copyReading() {
    if (!state.lastReading) return;
    const text = readingToText(state.lastReading);
    const finish = function () { showToast('解读已复制'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(finish).catch(function () { fallbackCopy(text, finish); });
    } else {
      fallbackCopy(text, finish);
    }
  }

  function fallbackCopy(text, onDone) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); onDone(); } catch (error) { showToast('复制失败，请手动选择文字'); }
    document.body.removeChild(area);
  }

  /* =========================================================
     Daily card
     ========================================================= */
  function dailySelection(date) {
    const key = dayKey(date);
    const hash = hashString('astra-' + key);
    return {
      cardId: hash % CARDS.length,
      reversed: ((hash >>> 9) % 100) < 32
    };
  }

  function loadDaily() {
    const stored = readStorage(STORAGE.daily, null);
    const today = new Date();
    if (stored && stored.date === dayKey(today) && CARD_BY_ID.has(Number(stored.cardId))) {
      state.daily = { date: stored.date, cardId: Number(stored.cardId), reversed: Boolean(stored.reversed) };
    } else {
      state.daily = null;
    }
  }

  function renderDaily() {
    const today = new Date();
    const todayKey = dayKey(today);
    if (state.daily && state.daily.date !== todayKey) state.daily = null;
    const dateText = $('#daily-date');
    if (dateText) dateText.textContent = formatDay(today);

    const selection = dailySelection(today);
    const drawn = Boolean(state.daily);
    const card = CARD_BY_ID.get(drawn ? state.daily.cardId : selection.cardId) || CARDS[0];
    const reversed = drawn ? state.daily.reversed : selection.reversed;
    const slot = $('#daily-card');
    const hint = $('#daily-stage-hint');
    const button = $('#daily-draw-btn');
    const status = $('#daily-status');
    const title = $('#daily-title');
    const intro = $('#daily-intro');
    const guidance = $('#daily-guidance');

    if (!slot) return;

    if (drawn) {
      slot.innerHTML = cardMarkup(card, { faceUp: true, staticFace: true });
      title.textContent = '今天，留意「' + card.keywords[0] + '」';
      if (intro) intro.textContent = '牌已经翻开。把今天的提醒，放进一个具体的时刻里。';
      hint.textContent = '今日之牌已翻开 · 明天见';
      button.disabled = true;
      $('.primary-btn__label', button).textContent = '今日已抽取';
      status.textContent = '同一天只抽一次，明日零点重置。';
      renderDailyGuidance(card, reversed);
    } else {
      slot.innerHTML = cardMarkup(card, { faceUp: false, ariaLabel: '抽取并翻开今日之牌' });
      title.textContent = '今天，想对你说';
      if (intro) intro.textContent = '在翻开之前，先深呼吸一次，想一想：今天我最需要留意什么？';
      hint.textContent = '轻触牌背，翻开今天。';
      button.disabled = false;
      $('.primary-btn__label', button).textContent = '抽取今日之牌';
      status.textContent = '每日一张，与今天好好相处。';
      guidance.hidden = true;
      guidance.innerHTML = '';
    }
  }

  function drawDaily() {
    if (state.daily) return;
    const today = new Date();
    const selection = dailySelection(today);
    const card = CARD_BY_ID.get(selection.cardId);
    if (!card) return;

    state.daily = { date: dayKey(today), cardId: card.id, reversed: selection.reversed };
    writeStorage(STORAGE.daily, state.daily);

    const switchCard = $('#daily-card .tarot-card');
    if (switchCard) {
      switchCard.classList.add('is-flipped');
      switchCard.setAttribute('aria-label', card.name + '，' + (selection.reversed ? '逆位' : '正位'));
    }
    playFlip();

    const button = $('#daily-draw-btn');
    button.disabled = true;
    $('.primary-btn__label', button).textContent = '今日已抽取';
    $('#daily-status').textContent = '已记录在今天里。';
    $('#daily-stage-hint').textContent = '今日之牌已翻开 · 明天见';
    $('#daily-title').textContent = '今天，留意「' + card.keywords[0] + '」';
    const intro = $('#daily-intro');
    if (intro) intro.textContent = '牌已经翻开。把今天的提醒，放进一个具体的时刻里。';

    setTimeout(function () {
      renderDailyGuidance(card, selection.reversed);
      playReveal();
    }, reduceMotion() ? 40 : 820);
  }

  function renderDailyGuidance(card, reversed) {
    const guidance = $('#daily-guidance');
    if (!guidance) return;
    const meaning = reversed ? card.reversed : card.upright;
    const advice = dailyAdvice(card, reversed);
    guidance.hidden = false;
    guidance.innerHTML =
      '<div class="daily-guidance__head">' +
      '<h3>' + escapeHTML(card.name) + '</h3>' +
      '<em>' + escapeHTML(card.en) + '</em>' +
      '<span class="orientation' + (reversed ? ' orientation--rev' : '') + '">' + (reversed ? '逆位' : '正位') + '</span>' +
      '</div>' +
      '<div class="daily-guidance__keywords">' + card.keywords.map(function (keyword) {
        return '<span>' + escapeHTML(keyword) + '</span>';
      }).join('') + '</div>' +
      '<p>' + escapeHTML(meaning) + '</p>' +
      '<div class="daily-guidance__advice">' + escapeHTML(advice) + '</div>';
  }

  function dailyAdvice(card, reversed) {
    let base;
    if (card.arcana === 'major') {
      base = '今天适合把目光从待办清单上抬起来，问一句：我真正想靠近的是什么？答案不必宏大，但要诚实。';
    } else {
      const map = {
        wands: '把热情用在第一件真正想做的事上，先动十分钟，不必等状态完美。',
        cups: '给一段关系或一种情绪留出诚实的时间，先感受，再回应。',
        swords: '把脑中的盘旋写下来，把事实与担心分两列。你会发现很多墙是想象出来的。',
        pentacles: '回到身体与日常：好好吃一顿饭、整理桌面、完成一个很小的目标。'
      };
      base = map[card.suit] || map.pentacles;
    }
    return reversed ? '如果今天觉得卡住，不必硬推。' + base : base;
  }

  /* =========================================================
     Deck
     ========================================================= */
  function filterLabel(key) {
    if (key === 'all') return '全部';
    if (key === 'major') return '大阿尔卡纳';
    return (META.suits[key] && META.suits[key].name) || key;
  }

  function filterCount(key) {
    if (key === 'all') return CARDS.length;
    if (key === 'major') return CARDS.filter(function (card) { return card.arcana === 'major'; }).length;
    return CARDS.filter(function (card) { return card.suit === key; }).length;
  }

  function renderDeckFilters() {
    const container = $('#deck-filters');
    if (!container) return;
    const keys = ['all', 'major', 'wands', 'cups', 'swords', 'pentacles'];
    container.innerHTML = keys.map(function (key) {
      const active = state.deckFilter === key;
      return '<button type="button" class="filter-btn' + (active ? ' is-active' : '') + '" data-filter="' + key + '" aria-pressed="' + active + '">' +
        filterLabel(key) + '<span>' + filterCount(key) + '</span></button>';
    }).join('');
  }

  function renderDeck() {
    const grid = $('#deck-grid');
    const empty = $('#deck-empty');
    if (!grid) return;
    const query = state.deckQuery.trim().toLowerCase();
    const filtered = CARDS.filter(function (card) {
      if (state.deckFilter === 'major' && card.arcana !== 'major') return false;
      if (state.deckFilter !== 'all' && state.deckFilter !== 'major' && card.suit !== state.deckFilter) return false;
      if (!query) return true;
      const haystack = (card.name + ' ' + card.en + ' ' + card.keywords.join(' ') + ' ' + card.suitName).toLowerCase();
      return haystack.indexOf(query) !== -1;
    });

    grid.innerHTML = filtered.map(function (card, index) {
      return '<div class="deck-item" style="animation-delay:' + Math.min(index * 18, 320) + 'ms">' +
        cardMarkup(card, { faceUp: true, staticFace: true }) +
        '</div>';
    }).join('');
    if (empty) empty.hidden = filtered.length !== 0;
  }

  /* =========================================================
     History
     ========================================================= */
  let journal = [];

  function loadHistory() {
    const stored = readStorage(STORAGE.history, []);
    journal = Array.isArray(stored) ? stored.filter(function (reading) {
      return reading && Array.isArray(reading.cards) && SPREADS[reading.spreadKey];
    }) : [];
  }

  function renderHistory() {
    const list = $('#history-list');
    const empty = $('#history-empty');
    const clear = $('#clear-history-btn');
    if (!list) return;
    if (clear) clear.hidden = journal.length === 0;
    if (empty) empty.hidden = journal.length > 0;

    list.innerHTML = journal.map(function (reading) {
      const spread = SPREADS[reading.spreadKey] || SPREADS.one;
      const cards = reading.cards.map(function (entry) { return CARD_BY_ID.get(entry.cardId); }).filter(Boolean);
      const reversed = reading.cards.filter(function (entry) { return entry.reversed; }).length;
      const shown = cards.slice(0, 4);
      return '<article class="history-item" data-reading-id="' + escapeHTML(reading.id) + '">' +
        '<div class="history-item__date">' + formatDate(reading.createdAt) + '<b>' + spread.name + '</b></div>' +
        '<div class="history-item__body">' +
        '<p class="history-item__question">' + escapeHTML(reading.question || '未命名的提问') + '</p>' +
        '<div class="history-item__meta"><span>' + spread.count + ' 张</span><span>逆位 ' + reversed + '</span><span>' + cards.length + ' 张已解</span></div>' +
        '<div class="history-item__cards">' + shown.map(function (card, index) {
          return '<span class="history-chip">' + escapeHTML(card.name) + (reading.cards[index].reversed ? ' <em>逆</em>' : '') + '</span>';
        }).join('') + (cards.length > 4 ? '<span class="history-chip">+' + (cards.length - 4) + '</span>' : '') + '</div>' +
        '</div>' +
        '<div class="history-item__actions">' +
        '<button type="button" class="icon-text-btn" data-open-history="' + escapeHTML(reading.id) + '">查看</button>' +
        '<button type="button" class="icon-text-btn icon-text-btn--danger" data-delete-history="' + escapeHTML(reading.id) + '" data-label="删除">删除</button>' +
        '</div>' +
        '</article>';
    }).join('');
  }

  function openHistoryModal(id) {
    const reading = journal.find(function (item) { return item.id === id; });
    if (!reading) return;
    const spread = SPREADS[reading.spreadKey] || SPREADS.one;
    const items = interpretationItems(reading);
    const reversed = reading.cards.filter(function (entry) { return entry.reversed; }).length;
    const body = $('#history-modal-body');
    body.innerHTML =
      '<div class="history-modal__head">' +
      '<div><p class="result-question">SAVED READING · ' + formatDate(reading.createdAt) + '</p>' +
      '<h2 id="history-modal-title">' + escapeHTML(reading.question || '未命名的提问') + '</h2>' +
      '<div class="history-modal__meta"><span>' + spread.name + '</span><span>' + spread.count + ' 张</span><span>逆位 ' + reversed + ' 张</span></div></div>' +
      '</div>' +
      '<div class="history-modal__cards">' + items.map(function (item) {
        return '<span class="history-modal__card"><b>' + escapeHTML(item.position.name) + '</b> ' + escapeHTML(item.card.name) +
          (item.reversed ? ' <em>逆</em>' : '') + '</span>';
      }).join('') + '</div>' +
      '<div class="interpretation interpretation--modal">' + interpItemsHTML(items, { showLens: true }) + '</div>' +
      '<button type="button" class="history-modal__delete" data-delete-history="' + escapeHTML(reading.id) + '" data-label="删除这条记录">删除这条记录</button>';
    openDialog('history-dialog');
  }

  function armDelete(button, action) {
    if (button.dataset.armed === '1') {
      action();
      return;
    }
    button.dataset.armed = '1';
    button.dataset.original = button.textContent;
    button.textContent = '再点一次确认';
    button.classList.add('is-armed');
    setTimeout(function () {
      if (!button.isConnected) return;
      button.dataset.armed = '0';
      button.textContent = button.dataset.label || button.dataset.original || '删除';
      button.classList.remove('is-armed');
    }, 3200);
  }

  function deleteReading(id) {
    journal = journal.filter(function (item) { return item.id !== id; });
    writeStorage(STORAGE.history, journal);
    renderHistory();
    const dialog = $('#history-dialog');
    if (dialog && dialog.open) dialog.close();
    showToast('记录已删除');
  }

  /* =========================================================
     Dialogs & toast
     ========================================================= */
  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    if (!dialog.open) {
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDialog(dialog) {
    if (dialog && dialog.open) dialog.close();
  }

  function openCardModal(cardId) {
    const card = CARD_BY_ID.get(Number(cardId));
    if (!card) return;
    $('#modal-card').innerHTML = cardMarkup(card, { faceUp: true, staticFace: true });
    $('#modal-eyebrow').textContent = (card.arcana === 'major' ? '大阿尔卡纳' : '小阿尔卡纳 · ' + card.suitName) + ' · ' + card.numeral;
    $('#modal-title').textContent = card.name;
    $('#modal-en').textContent = card.en;
    $('#modal-keywords').innerHTML = card.keywords.map(function (keyword) {
      return '<span>' + escapeHTML(keyword) + '</span>';
    }).join('');
    $('#modal-upright').textContent = card.upright;
    $('#modal-reversed').textContent = card.reversed;
    openDialog('card-dialog');
  }

  let toastTimer = null;
  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2600);
  }

  /* =========================================================
     Views
     ========================================================= */
  const VIEW_TITLES = {
    reading: '星屿塔罗 · Astra Tarot',
    daily: '每日一牌 · 星屿塔罗',
    deck: '牌库 · 星屿塔罗',
    history: '占卜记录 · 星屿塔罗'
  };

  function setView(name, options) {
    const opts = options || {};
    if (!VIEW_TITLES[name]) name = 'reading';
    state.view = name;
    $$('.view').forEach(function (panel) {
      panel.hidden = panel.id !== 'view-' + name;
    });
    $$('.nav-btn').forEach(function (button) {
      const active = button.dataset.view === name;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    document.title = VIEW_TITLES[name];
    if (opts.updateHash !== false && window.location.hash !== '#' + name) {
      try { window.history.replaceState(null, '', '#' + name); } catch (error) { /* file:// may fail */ }
    }
    if (name === 'daily') renderDaily();
    if (name === 'history') renderHistory();
    if (name === 'deck') renderDeck();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* =========================================================
     Settings & starfield
     ========================================================= */
  function loadSettings() {
    const settings = readStorage(STORAGE.settings, {});
    state.sound = Boolean(settings && settings.sound);
    updateSoundButton();
  }

  function updateSoundButton() {
    const button = $('#sound-btn');
    if (!button) return;
    button.setAttribute('aria-pressed', String(state.sound));
    button.setAttribute('aria-label', state.sound ? '关闭声音' : '开启声音');
    button.title = state.sound ? '关闭声音' : '开启声音';
  }

  function toggleSound() {
    state.sound = !state.sound;
    writeStorage(STORAGE.settings, { sound: state.sound });
    updateSoundButton();
    if (state.sound) {
      playTone(523.25, 0.5, 0.02, 'sine', 0);
      playTone(783.99, 0.7, 0.012, 'sine', 0.12);
      showToast('声音已开启');
    } else {
      showToast('声音已关闭');
    }
  }

  function initStarfield() {
    const canvas = $('#starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let stars = [];
    let meteors = [];
    let lastMeteor = performance.now();
    let raf = 0;
    const reduce = reduceMotion();

    function makeStars() {
      const count = Math.min(260, Math.max(90, Math.round((width * height) / 7200)));
      stars = [];
      for (let i = 0; i < count; i += 1) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.25 + 0.25,
          alpha: Math.random() * 0.55 + 0.15,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.0005 + 0.00016,
          drift: Math.random() * 0.02 + 0.005,
          warm: Math.random() > 0.72
        });
      }
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, width < 820 ? 1.5 : 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeStars();
      if (reduce) draw(0);
    }

    function draw(timestamp) {
      ctx.clearRect(0, 0, width, height);
      stars.forEach(function (star) {
        const twinkle = 0.72 + Math.sin(timestamp * star.speed + star.phase) * 0.28;
        const alpha = Math.max(0.05, star.alpha * twinkle);
        ctx.beginPath();
        ctx.fillStyle = star.warm
          ? 'rgba(226, 202, 156, ' + alpha + ')'
          : 'rgba(205, 220, 245, ' + alpha + ')';
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
        if (star.radius > 1.2) {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(232, 208, 160, ' + (alpha * 0.16) + ')';
          ctx.arc(star.x, star.y, star.radius * 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      const now = timestamp || performance.now();
      if (!reduce) {
        if (now - lastMeteor > 13000 + Math.random() * 9000) {
          lastMeteor = now;
          meteors.push({
            x: Math.random() * width * 0.75 + width * 0.2,
            y: Math.random() * height * 0.35,
            vx: -(2.8 + Math.random() * 1.8),
            vy: 1.2 + Math.random() * 0.8,
            life: 1
          });
        }
        meteors = meteors.filter(function (meteor) {
          meteor.x += meteor.vx;
          meteor.y += meteor.vy;
          meteor.life -= 0.012;
          if (meteor.life <= 0) return false;
          const gradient = ctx.createLinearGradient(meteor.x, meteor.y, meteor.x - meteor.vx * 26, meteor.y - meteor.vy * 26);
          gradient.addColorStop(0, 'rgba(232, 210, 162, ' + (meteor.life * 0.6) + ')');
          gradient.addColorStop(1, 'rgba(232, 210, 162, 0)');
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(meteor.x, meteor.y);
          ctx.lineTo(meteor.x - meteor.vx * 26, meteor.y - meteor.vy * 26);
          ctx.stroke();
          return true;
        });
        raf = window.requestAnimationFrame(draw);
      }
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();
    if (!reduce) raf = window.requestAnimationFrame(draw);
    window.addEventListener('pagehide', function () { if (raf) window.cancelAnimationFrame(raf); });
  }

  /* =========================================================
     Event wiring
     ========================================================= */
  function bindEvents() {
    document.addEventListener('click', function (event) {
      const viewButton = event.target.closest('[data-view]');
      if (viewButton) {
        event.preventDefault();
        setView(viewButton.dataset.view);
        return;
      }

      const navBrand = event.target.closest('[data-nav]');
      if (navBrand) {
        event.preventDefault();
        setView(navBrand.dataset.nav);
        return;
      }

      const staticCard = event.target.closest('.tarot-card.is-static');
      if (staticCard && !staticCard.closest('dialog')) {
        openCardModal(staticCard.dataset.cardId);
        return;
      }

      const closeButton = event.target.closest('[data-close]');
      if (closeButton) {
        const dialog = closeButton.closest('dialog');
        closeDialog(dialog);
        return;
      }

      if (event.target.tagName === 'DIALOG') {
        closeDialog(event.target);
      }
    });

    $('#spread-list').addEventListener('click', function (event) {
      const button = event.target.closest('.spread-option');
      if (!button || state.isDealing) return;
      const key = button.dataset.spread;
      if (!SPREADS[key] || key === state.spreadKey) return;
      state.spreadKey = key;
      renderSpreadOptions();
      resetTable({ silent: true });
      updateIdleTable();
      const selected = $('.spread-option.is-active');
      if (selected) selected.focus();
    });

    const question = $('#question');
    question.addEventListener('input', function () {
      $('#question-count').textContent = String(question.value.length);
    });

    $('#prompt-chips').addEventListener('click', function (event) {
      const button = event.target.closest('[data-prompt]');
      if (!button) return;
      question.value = button.dataset.prompt;
      question.focus();
      $('#question-count').textContent = String(question.value.length);
    });

    $('#deal-btn').addEventListener('click', dealCards);
    $('#reset-btn').addEventListener('click', function () { resetTable(); });
    $('#card-table').addEventListener('click', onTableClick);

    $('#sound-btn').addEventListener('click', toggleSound);

    $('#daily-draw-btn').addEventListener('click', drawDaily);
    $('#daily-card').addEventListener('click', function (event) {
      if (event.target.closest('.tarot-card') && !state.daily) drawDaily();
    });

    $('#deck-filters').addEventListener('click', function (event) {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      state.deckFilter = button.dataset.filter;
      renderDeckFilters();
      renderDeck();
    });

    let searchTimer = null;
    $('#deck-search').addEventListener('input', function (event) {
      state.deckQuery = event.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(renderDeck, 90);
    });

    $('#history-list').addEventListener('click', function (event) {
      const open = event.target.closest('[data-open-history]');
      if (open) {
        openHistoryModal(open.dataset.openHistory);
        return;
      }
      const remove = event.target.closest('[data-delete-history]');
      if (remove) {
        armDelete(remove, function () {
          deleteReading(remove.dataset.deleteHistory);
        });
      }
    });

    $('#clear-history-btn').addEventListener('click', function (event) {
      const button = event.currentTarget;
      armDelete(button, function () {
        journal = [];
        writeStorage(STORAGE.history, []);
        renderHistory();
        showToast('所有记录已清空');
      });
    });

    $('#history-dialog').addEventListener('click', function (event) {
      const remove = event.target.closest('[data-delete-history]');
      if (remove) {
        armDelete(remove, function () { deleteReading(remove.dataset.deleteHistory); });
      }
    });

    $('#reading-result').addEventListener('click', function (event) {
      if (event.target.closest('[data-copy-reading]')) {
        copyReading();
        return;
      }
      if (event.target.closest('[data-new-reading]')) {
        resetTable({ silent: true });
        window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
      }
    });

    $$('dialog').forEach(function (dialog) {
      dialog.addEventListener('close', function () {
        document.body.style.overflow = '';
      });
      dialog.addEventListener('click', function (event) {
        if (event.target === dialog) dialog.close();
      });
    });

    window.addEventListener('hashchange', function () {
      const name = window.location.hash.replace('#', '');
      if (name !== state.view) setView(name, { updateHash: false });
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 980 && state.view === 'reading') {
        document.body.style.overflow = '';
      }
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () { /* offline support is optional */ });
    });
  }

  function init() {
    if (!CARDS.length) {
      document.body.innerHTML = '<p style="padding:40px;color:#ddd">牌库数据未能加载，请刷新页面。</p>';
      return;
    }
    loadSettings();
    loadHistory();
    loadDaily();
    renderSpreadOptions();
    renderDeckFilters();
    renderDeck();
    renderHistory();
    bindEvents();
    initStarfield();
    updateIdleTable();

    const initial = window.location.hash.replace('#', '');
    setView(VIEW_TITLES[initial] ? initial : 'reading', { updateHash: false });
    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
