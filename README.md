# Restaurant QR Suite

Sistema multi-restaurante para pedidos via QR Code, controle de comandas, cozinha em tempo real, painel administrativo e fechamento no caixa.

## Stack

- Monorepo npm workspaces.
- Frontend: React + Vite + TypeScript + Socket.IO client.
- Backend: Node.js + Fastify + TypeScript + Socket.IO + Zod + JWT.
- Banco: MySQL 8 com script em `database/schema.sql` e seeds em `database/seeds.sql`.
- Preparado para empacotar Web, Windows com Electron/Tauri e Android com Capacitor/Expo.

## Estrutura

```txt
apps/
  api/       API, autenticacao, pedidos, QR Code, caixa, impressao e realtime
  desktop/   Template Electron para Windows
  mobile/    Template Capacitor para Android/APK
  web/       React responsivo com Admin, Cliente, Cozinha e Caixa
packages/
  shared/    Tipos, status e regras compartilhadas
database/
  schema.sql Modelagem MySQL completa
  seeds.sql  Dados iniciais de desenvolvimento
docs/
  ARCHITECTURE.md
  DATABASE.md
  DEPLOYMENT.md
  FLOWS.md
```

## Rodar localmente

```bash
npm install
cp .env.example .env
npm run dev
```

Depois acesse:

- Entrada do sistema: `http://localhost:5180`
- Admin: `http://localhost:5180/admin`
- Cardapio QR: `http://localhost:5180/cardapio?table=M01`
- Cozinha: `http://localhost:5180/cozinha`
- Caixa: `http://localhost:5180/caixa?check=PAX-8F3KQ2`
- API health: `http://localhost:3333/health`

QR Codes individuais demo para fechar pedido no cardapio:

- `PAX-8F3KQ2`
- `PAX-4N7V1A`
- `PAX-9C2L6M`
- `PAX-2H8R5T`

Login demo usado pela interface:

- Email: `admin@aurora.test`
- Senha: `123456`

## Banco MySQL

```bash
mysql -u <usuario> -p <database> < database/schema.sql
mysql -u <usuario> -p <database> < database/seeds.sql
```

Credenciais devem ficar apenas no `.env`. O arquivo `.env.example` contem placeholders e nao deve receber senhas reais.

## Observacao sobre armazenamento

A API roda funcionalmente em `API_STORAGE=memory` para desenvolvimento local rapido. O schema MySQL completo esta pronto para producao e a conexao MySQL fica centralizada em `apps/api/src/database/mysql.ts`; o proximo passo natural e implementar o adapter persistente usando os mesmos contratos do `DemoStore`.

Os workspaces ativos instalam apenas API, Web e Shared. `apps/desktop` e `apps/mobile` sao templates de empacotamento para evitar baixar Electron/Capacitor no fluxo padrao.

## Documentacao

- [Arquitetura](docs/ARCHITECTURE.md)
- [Banco de dados](docs/DATABASE.md)
- [Fluxos operacionais](docs/FLOWS.md)
- [Build e plataformas](docs/DEPLOYMENT.md)
- [Analise de lacunas](docs/GAP_ANALYSIS.md)
