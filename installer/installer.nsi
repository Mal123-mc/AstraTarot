; 星屿塔罗 · Astra Tarot — per-user Windows installer
; Build with installer\build.ps1 (NSIS 3.x required).

Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

!define APP_NAME "星屿塔罗 Astra Tarot"
!define APP_NAME_SHORT "星屿塔罗"
!define APP_VERSION "1.0.0"
!define APP_EXE "启动塔罗.bat"
!define APP_REG "Software\AstraTarot"
!define UNINST_REG "Software\Microsoft\Windows\CurrentVersion\Uninstall\AstraTarot"
!define APP_ICON "icons\astra-tarot-transparent.ico"

Name "${APP_NAME}"
OutFile "..\dist\星屿塔罗-安装程序-${APP_VERSION}.exe"
InstallDir "$LOCALAPPDATA\Programs\AstraTarot"
InstallDirRegKey HKCU "${APP_REG}" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 64
BrandingText "星屿塔罗 · ASTRA TAROT"

; ---------------------------------------------------------------- UI
!define MUI_ABORTWARNING
!define MUI_ICON "..\icons\astra-tarot-transparent.ico"
!define MUI_UNICON "..\icons\astra-tarot-transparent.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "assets\welcome.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "assets\welcome.bmp"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "assets\header.bmp"
!define MUI_HEADERIMAGE_RIGHT

!define MUI_WELCOMEPAGE_TITLE "欢迎安装 星屿塔罗"
!define MUI_WELCOMEPAGE_TEXT "把问题交给牌面，把答案留给自己。$\r$\n$\r$\n星屿塔罗包含 78 张全牌、正逆位、四种牌阵、每日一牌与本地记录。安装程序会把应用放到当前用户目录，不需要管理员权限；所有占卜记录只保存在你的浏览器里。"
!define MUI_FINISHPAGE_TITLE "星屿塔罗，已经准备好了"
!define MUI_FINISHPAGE_TEXT "开始菜单快捷方式已创建。$\r$\n$\r$\n启动后会打开一个本地服务窗口，关闭它即可停止服务。"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "立即启动星屿塔罗"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "SimpChinese"

; ---------------------------------------------------------------- install
Section "星屿塔罗（必需）" SEC_APP
  SectionIn RO
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  File /r "..\dist\payload\*.*"

  WriteUninstaller "$INSTDIR\uninstall.exe"

  CreateDirectory "$SMPROGRAMS\${APP_NAME_SHORT}"
  CreateShortCut "$SMPROGRAMS\${APP_NAME_SHORT}\${APP_NAME_SHORT}.lnk" \
    "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_ICON}" 0 SW_SHOWNORMAL "" "开启星屿塔罗"
  CreateShortCut "$SMPROGRAMS\${APP_NAME_SHORT}\卸载 ${APP_NAME_SHORT}.lnk" \
    "$INSTDIR\uninstall.exe" "" "$INSTDIR\uninstall.exe" 0 SW_SHOWNORMAL "" "卸载星屿塔罗"

  WriteRegStr HKCU "${APP_REG}" "InstallDir" "$INSTDIR"
  WriteRegDWORD HKCU "${APP_REG}" "DesktopShortcut" 0
  WriteRegStr HKCU "${UNINST_REG}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKCU "${UNINST_REG}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "${UNINST_REG}" "Publisher" "Astra Tarot"
  WriteRegStr HKCU "${UNINST_REG}" "DisplayIcon" "$INSTDIR\${APP_ICON}"
  WriteRegStr HKCU "${UNINST_REG}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_REG}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKCU "${UNINST_REG}" "QuietUninstallString" '"$INSTDIR\uninstall.exe" /S'
  WriteRegDWORD HKCU "${UNINST_REG}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_REG}" "NoRepair" 1
  WriteRegDWORD HKCU "${UNINST_REG}" "EstimatedSize" 120000
SectionEnd

Section "桌面快捷方式" SEC_DESKTOP
  SetShellVarContext current
  ${GetParameters} $R0
  ${GetOptions} $R0 "/NODESKTOP" $R1
  ${If} ${Errors}
    CreateShortCut "$DESKTOP\${APP_NAME_SHORT}.lnk" \
      "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_ICON}" 0 SW_SHOWNORMAL "" "开启星屿塔罗"
    WriteRegDWORD HKCU "${APP_REG}" "DesktopShortcut" 1
  ${EndIf}
SectionEnd

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_APP} "星屿塔罗的全部程序文件，包含内置的 Node.js 运行时。"
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_DESKTOP} "在桌面创建「星屿塔罗」快捷方式。"
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; ---------------------------------------------------------------- uninstall
Section "Uninstall"
  SetShellVarContext current
  ReadRegDWORD $0 HKCU "${APP_REG}" "DesktopShortcut"
  ${If} $0 == 1
    Delete "$DESKTOP\${APP_NAME_SHORT}.lnk"
  ${EndIf}
  RMDir /r "$SMPROGRAMS\${APP_NAME_SHORT}"
  DeleteRegKey HKCU "${UNINST_REG}"
  DeleteRegKey HKCU "${APP_REG}"

  Delete "$INSTDIR\uninstall.exe"
  RMDir /r "$INSTDIR"
SectionEnd

Function .onInit
  SetShellVarContext current
FunctionEnd

Function un.onInit
  SetShellVarContext current
  !insertmacro MUI_UNGETLANGUAGE
FunctionEnd

; ---------------------------------------------------------------- metadata
VIProductVersion "${APP_VERSION}.0"
VIAddVersionKey "ProductName" "${APP_NAME}"
VIAddVersionKey "FileDescription" "星屿塔罗安装程序"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "ProductVersion" "${APP_VERSION}"
VIAddVersionKey "LegalCopyright" "© 2026 Astra Tarot"
