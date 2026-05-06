; ══════════════════════════════════════════════════════════════════════════════
; Tavon Suite — Universal Installer
; Instala um único binário Electron e cria um atalho por módulo selecionado.
; Compile com:  makensis universal.nsi
; Gerado por:   build-universal.js   (substitui VAR_VERSION e VAR_EXE_NAME)
; ══════════════════════════════════════════════════════════════════════════════

Unicode True
!include "MUI2.nsh"
!include "Sections.nsh"
!include "LogicLib.nsh"

; ── Metadados ─────────────────────────────────────────────────────────────────
!define PRODUCT_NAME    "Tavon Suite"
!define PRODUCT_VERSION "VAR_VERSION"
!define PRODUCT_PUBNAME "Tavon"
!define APP_ID          "com.tavon.restaurant.suite"
!define EXE_NAME        "VAR_EXE_NAME"    ; ex: "Tavon Suite.exe"
!define INSTALL_DIR     "$PROGRAMFILES64\Tavon"
!define REG_ROOT        "HKLM"
!define REG_PATH        "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}"
!define SUPPORT_URL     "https://tavon.com.br/suporte"

Name          "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile       "..\..\release\windows\Tavon-Suite-Setup-${PRODUCT_VERSION}.exe"
InstallDir    "${INSTALL_DIR}"
RequestExecutionLevel admin
BrandingText  " "

; ── Aparência (custom.nsh) ────────────────────────────────────────────────────
!include "custom.nsh"

; ── Páginas ──────────────────────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "PortugueseBR"

; ── Seções (módulos) ──────────────────────────────────────────────────────────
; Cada seção instala um atalho apontando para o mesmo binário com --module=X
; O binário principal é instalado na seção "Core" (obrigatória, oculta).

Section "-Core" SEC_CORE
  SectionIn RO   ; obrigatória, não pode desmarcar
  SetOutPath "${INSTALL_DIR}"

  ; Copia o binário e recursos
  File /r "..\..\release\windows\win-unpacked\*.*"

  ; Desinstalador
  WriteUninstaller "${INSTALL_DIR}\Uninstall Tavon.exe"

  ; Chave de registro (Add/Remove Programs)
  WriteRegStr   ${REG_ROOT} "${REG_PATH}" "DisplayName"          "${PRODUCT_NAME}"
  WriteRegStr   ${REG_ROOT} "${REG_PATH}" "DisplayVersion"       "${PRODUCT_VERSION}"
  WriteRegStr   ${REG_ROOT} "${REG_PATH}" "Publisher"            "${PRODUCT_PUBNAME}"
  WriteRegStr   ${REG_ROOT} "${REG_PATH}" "URLInfoAbout"         "${SUPPORT_URL}"
  WriteRegStr   ${REG_ROOT} "${REG_PATH}" "UninstallString"      '"${INSTALL_DIR}\Uninstall Tavon.exe"'
  WriteRegStr   ${REG_ROOT} "${REG_PATH}" "InstallLocation"      "${INSTALL_DIR}"
  WriteRegDWORD ${REG_ROOT} "${REG_PATH}" "NoModify"             1
  WriteRegDWORD ${REG_ROOT} "${REG_PATH}" "NoRepair"             1
SectionEnd

; ── Módulos (checkboxes) ──────────────────────────────────────────────────────

Section "Tavon Admin" SEC_ADMIN
  SetShellVarContext all
  CreateShortcut "$DESKTOP\Tavon Admin.lnk"             "${INSTALL_DIR}\${EXE_NAME}" "--module=admin"
  CreateShortcut "$SMPROGRAMS\Tavon\Tavon Admin.lnk"    "${INSTALL_DIR}\${EXE_NAME}" "--module=admin"
SectionEnd

Section "Tavon Cardápio" SEC_CARDAPIO
  SetShellVarContext all
  CreateShortcut "$DESKTOP\Tavon Cardápio.lnk"          "${INSTALL_DIR}\${EXE_NAME}" "--module=cardapio"
  CreateShortcut "$SMPROGRAMS\Tavon\Tavon Cardápio.lnk" "${INSTALL_DIR}\${EXE_NAME}" "--module=cardapio"
SectionEnd

Section "Tavon Garçom" SEC_GARCOM
  SetShellVarContext all
  CreateShortcut "$DESKTOP\Tavon Garçom.lnk"            "${INSTALL_DIR}\${EXE_NAME}" "--module=garcom"
  CreateShortcut "$SMPROGRAMS\Tavon\Tavon Garçom.lnk"   "${INSTALL_DIR}\${EXE_NAME}" "--module=garcom"
SectionEnd

Section "Tavon Cozinha" SEC_COZINHA
  SetShellVarContext all
  CreateShortcut "$DESKTOP\Tavon Cozinha.lnk"           "${INSTALL_DIR}\${EXE_NAME}" "--module=cozinha"
  CreateShortcut "$SMPROGRAMS\Tavon\Tavon Cozinha.lnk"  "${INSTALL_DIR}\${EXE_NAME}" "--module=cozinha"
SectionEnd

Section "Tavon Caixa" SEC_CAIXA
  SetShellVarContext all
  CreateShortcut "$DESKTOP\Tavon Caixa.lnk"             "${INSTALL_DIR}\${EXE_NAME}" "--module=caixa"
  CreateShortcut "$SMPROGRAMS\Tavon\Tavon Caixa.lnk"    "${INSTALL_DIR}\${EXE_NAME}" "--module=caixa"
SectionEnd

Section "Tavon Totem" SEC_TOTEM
  SetShellVarContext all
  CreateShortcut "$DESKTOP\Tavon Totem.lnk"             "${INSTALL_DIR}\${EXE_NAME}" "--module=totem"
  CreateShortcut "$SMPROGRAMS\Tavon\Tavon Totem.lnk"    "${INSTALL_DIR}\${EXE_NAME}" "--module=totem"
SectionEnd

; ── Descrições dos componentes ────────────────────────────────────────────────
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_ADMIN}    "Painel administrativo do restaurante."
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_CARDAPIO} "Cardápio digital para mesas (QR Code)."
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_GARCOM}   "Aplicativo de pedidos para garçons."
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_COZINHA}  "Monitor de pedidos para a cozinha."
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_CAIXA}    "Sistema de caixa e fechamento."
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_TOTEM}    "Totem de autoatendimento."
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; ── Desinstalador ─────────────────────────────────────────────────────────────
Section "Uninstall"
  SetShellVarContext all

  ; Remove atalhos
  Delete "$DESKTOP\Tavon Admin.lnk"
  Delete "$DESKTOP\Tavon Cardápio.lnk"
  Delete "$DESKTOP\Tavon Garçom.lnk"
  Delete "$DESKTOP\Tavon Cozinha.lnk"
  Delete "$DESKTOP\Tavon Caixa.lnk"
  Delete "$DESKTOP\Tavon Totem.lnk"
  RMDir  /r "$SMPROGRAMS\Tavon"

  ; Remove arquivos
  RMDir  /r "${INSTALL_DIR}"

  ; Remove registro
  DeleteRegKey ${REG_ROOT} "${REG_PATH}"
SectionEnd
