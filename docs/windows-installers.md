# Instaladores Windows

O desktop usa Electron e gera instaladores NSIS separados para cada modulo operacional:

- `Tavon-Admin-Setup-{version}.exe`
- `Tavon-Cardapio-Setup-{version}.exe`
- `Tavon-Garcom-Setup-{version}.exe`
- `Tavon-Cozinha-Setup-{version}.exe`
- `Tavon-Caixa-Setup-{version}.exe`

Saida esperada:

```bash
release/windows/
```

Comandos:

```bash
npm install
npm run desktop:dist:win:all
```

Gerar apenas um modulo:

```bash
npm run desktop:dist:win:admin
npm run desktop:dist:win:cardapio
npm run desktop:dist:win:garcom
npm run desktop:dist:win:cozinha
npm run desktop:dist:win:caixa
```

## Impressoras do PC

No app Windows, o painel administrativo usa a API nativa do Electron (`webContents.getPrintersAsync`) para listar as impressoras configuradas no computador.

No navegador comum, o botao `Buscar no PC` mostra aviso porque browsers nao permitem listar impressoras locais por seguranca.

## Atualizacao automatica via GitHub Releases

Os apps Windows usam `electron-updater` com releases do GitHub. Cada modulo tem um prefixo de tag proprio para evitar que um app baixe o instalador do outro:

- Admin: tag `admin-v{version}`
- Cardapio: tag `cardapio-v{version}`
- Garcom: tag `garcom-v{version}`
- Cozinha: tag `cozinha-v{version}`
- Caixa: tag `caixa-v{version}`

Antes de publicar, aumente a versao em `apps/desktop/package.json`, por exemplo de `0.1.0` para `0.1.1`.

Crie um token no GitHub com permissao para publicar releases e rode:

```bash
export GH_TOKEN="github_pat_..."

npm run desktop:publish:win:all
```

Publicar apenas um modulo:

```bash
npm run desktop:publish:win:admin
npm run desktop:publish:win:cardapio
npm run desktop:publish:win:garcom
npm run desktop:publish:win:cozinha
npm run desktop:publish:win:caixa
```

O `electron-builder` envia para a release do GitHub os `.exe`, os `.blockmap` e o `latest.yml`. Esses arquivos sao obrigatorios para o patch/update funcionar.

No Windows instalado, o app verifica updates automaticamente ao abrir e depois a cada 30 minutos. Quando uma versao nova e baixada, ele pede para reiniciar e aplicar.

Observacao: para reduzir avisos do Windows SmartScreen em producao, use um certificado de assinatura de codigo Authenticode.
