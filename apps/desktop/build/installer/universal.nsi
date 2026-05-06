; Tavon Suite - Universal Installer (Download-based)
; VAR_VERSION

Unicode True
!include "MUI2.nsh"
!include "Sections.nsh"
!include "LogicLib.nsh"

; --- Definicoes ---
!define PRODUCT_NAME    "Tavon Suite"
!define PRODUCT_VERSION "VAR_VERSION"
!define APP_ID          "com.tavon.restaurant.suite"
!define INSTALL_DIR     "$PROGRAMFILES64\Tavon"
!define REG_ROOT        "HKLM"
!define REG_PATH        "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}"
!define SUPPORT_URL     "https://tavon.com.br/suporte"
!define BASE_URL        "https://github.com/renezit0/tavon/releases/download"

Name          "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile       "..\..\release\windows\Tavon-Suite-Setup-${PRODUCT_VERSION}.exe"
InstallDir    "${INSTALL_DIR}"
RequestExecutionLevel admin
BrandingText  " "
SetCompressor lzma

!include "custom.nsh"

; --- Paginas ---
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "PortugueseBR"

; --- Macros de download e instalacao ---
!macro DownloadAndInstall MODULE TAG FILENAME
  DetailPrint "Baixando Tavon ${MODULE}..."
  ExecWait 'powershell.exe -NoProfile -Command "Invoke-WebRequest -Uri ''${BASE_URL}/${TAG}-v${PRODUCT_VERSION}/${FILENAME}-Setup-${PRODUCT_VERSION}.exe'' -OutFile ''$TEMP\${FILENAME}.exe'' -UseBasicParsing"' $0
  ${If} $0 == 0
    DetailPrint "Instalando Tavon ${MODULE}..."
    ExecWait '"$TEMP\${FILENAME}.exe" /S' $1
    Delete "$TEMP\${FILENAME}.exe"
    ${If} $1 != 0
      MessageBox MB_OK|MB_ICONEXCLAMATION "Falha ao instalar Tavon ${MODULE}. Codigo: $1"
    ${EndIf}
  ${Else}
    MessageBox MB_OK|MB_ICONEXCLAMATION "Falha ao baixar Tavon ${MODULE}. Verifique sua conexao com a internet."
  ${EndIf}
!macroend

; --- Secoes (checkboxes) ---

Section "Tavon Admin" SEC_ADMIN
  !insertmacro DownloadAndInstall "Admin" "admin" "Tavon-Admin"
SectionEnd

Section "Tavon Cardapio" SEC_CARDAPIO
  !insertmacro DownloadAndInstall "Cardapio" "cardapio" "Tavon-Cardapio"
SectionEnd

Section "Tavon Garcom" SEC_GARCOM
  !insertmacro DownloadAndInstall "Garcom" "garcom" "Tavon-Garcom"
SectionEnd

Section "Tavon Cozinha" SEC_COZINHA
  !insertmacro DownloadAndInstall "Cozinha" "cozinha" "Tavon-Cozinha"
SectionEnd

Section "Tavon Caixa" SEC_CAIXA
  !insertmacro DownloadAndInstall "Caixa" "caixa" "Tavon-Caixa"
SectionEnd

; --- Descricoes ---
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_ADMIN}    "Painel administrativo do restaurante."
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_CARDAPIO} "Cardapio digital para mesas (QR Code)."
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_GARCOM}   "Aplicativo de pedidos para garcons."
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_COZINHA}  "Monitor de pedidos para a cozinha."
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_CAIXA}    "Sistema de caixa e fechamento."
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; --- Desinstalador (apenas remove registro; cada modulo tem seu proprio) ---
Section "Uninstall"
  DeleteRegKey ${REG_ROOT} "${REG_PATH}"
SectionEnd
