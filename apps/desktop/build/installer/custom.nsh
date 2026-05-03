; ── Tavon Custom NSIS Include ─────────────────────────────────────────────
; Injected by electron-builder via nsis.include.
; Customises installer text, colours and page behaviour.

; MUI2 colour overrides (where supported)
!define MUI_BGCOLOR         "0D0D0F"
!define MUI_TEXTCOLOR       "EAE6DF"

; Compact progress page — hide details log to keep it clean
!define MUI_FINISHPAGE_NOAUTOCLOSE

; Welcome page strings
!define MUI_WELCOMEPAGE_TITLE     "Bem-vindo ao Tavon"
!define MUI_WELCOMEPAGE_TEXT      "O instalador vai configurar o aplicativo no seu computador.$\r$\n$\r$\nClique em Instalar para continuar."

; Finish page strings
!define MUI_FINISHPAGE_TITLE      "Instalacao concluida"
!define MUI_FINISHPAGE_TEXT       "O Tavon foi instalado com sucesso.$\r$\nClique em Concluir para fechar o instalador."
!define MUI_FINISHPAGE_RUN_TEXT   "Abrir agora"

; Remove "Nullsoft Install System vX.X" branding from title bar
BrandingText " "
