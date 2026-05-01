# Arquitetura

## Visao geral

O sistema foi organizado como um monorepo para manter a mesma base de regras em todos os canais:

```txt
Cliente QR / Tablet / Web Admin / Cozinha / Caixa
        |
        v
React Web App  <---- Socket.IO ---->  API Fastify
        |                              |
        |                              v
        |                         MySQL 8
        |                              |
        v                              v
Capacitor Android                Redis futuro
Electron/Tauri Windows           Impressao local
```

## Modulos

- `apps/web`: interface React com quatro telas principais: Admin, Cliente, Cozinha e Caixa.
- `apps/api`: API REST, autenticacao JWT, validacao, QR Code, WebSocket, caixa e impressao configuravel.
- `packages/shared`: contratos TypeScript compartilhados, status de pedido e regras como transicao obrigatoria de status.
- `database`: schema MySQL, seeds e modelagem relacional.

## Multi-tenant

Todas as entidades operacionais relevantes possuem `tenant_id`. O isolamento deve ser aplicado em todas as queries, indices e politicas de permissao. Para SaaS, o `tenant_id` vem do JWT, do subdominio ou do QR token resolvido pela API.

## Backend

A API usa Fastify por performance e organizacao simples. Os pontos principais sao:

- `JWT` para autenticacao.
- `Zod` para validacao de entrada.
- `@fastify/rate-limit` para reduzir abuso.
- `@fastify/helmet` para headers de seguranca.
- `Socket.IO` para pedidos em tempo real.
- `QRCode` para gerar QR de mesa e comanda.
- `mysql2/promise` preparado para adapter persistente.

Endpoints principais:

| Metodo | Rota | Uso |
| --- | --- | --- |
| `POST` | `/auth/login` | Login administrativo |
| `GET` | `/public/menu` | Cardapio publico por QR |
| `GET/PUT` | `/restaurant` | Configuracoes do restaurante |
| `GET/POST/PATCH` | `/categories` | Categorias |
| `GET/POST/PATCH/DELETE` | `/products` | Produtos |
| `GET/POST` | `/tables` | Mesas e dispositivos |
| `GET` | `/tables/:id/qr` | QR Code da mesa |
| `POST` | `/public/checks/resolve` | Valida QR individual e abre/reutiliza comanda da pessoa na mesa |
| `GET/POST` | `/customer-qrs` e `/customer-qrs/batch` | Lista e gera lotes de QR Codes individuais reutilizaveis |
| `GET` | `/customer-qrs/:id/qr` | Imagem PNG do QR individual |
| `POST` | `/orders` | Cliente cria pedido |
| `GET` | `/orders` | Cozinha e admin acompanham pedidos |
| `PATCH` | `/orders/:id/status` | Mudanca de status com fluxo validado |
| `GET` | `/checks/:code` | Caixa busca comanda |
| `POST` | `/checks/:code/payments` | Pagamento parcial ou total |
| `POST` | `/checks/:code/close` | Fechamento de comanda |
| `GET/PATCH` | `/printers` | Configuracao de impressoras |
| `POST` | `/print/jobs` | Fila de impressao |
| `GET` | `/dashboard` | Indicadores administrativos |
| `GET` | `/audit-logs` | Auditoria |

## Frontend

A interface foi pensada como produto operacional, nao como landing page:

- Layout responsivo para celular, tablet e desktop.
- Tema dark/light com cores editaveis no Admin.
- Cards com imagens reais, estados de loading e feedback visual.
- Cozinha em kanban por status.
- Caixa com busca por QR/codigo, pagamento parcial, saldo e fechamento.
- Cardapio do cliente isolado por mesa, com categorias em sidebar, finalizacao flutuante e QR individual obrigatorio para enviar pedido.
- Produto com adicionais, remocoes, opcoes e observacoes em modal responsivo.

## Impressao

O modelo atual cria uma abstracao de impressora por setor:

- `browser`: usa `window.print()` ou fluxo do navegador.
- `local_service`: envia para um servico local instalado no Windows.
- `network`: impressora IP.
- `escpos`: integracao ESC/POS futura.

O ticket e configuravel por template em `printers.ticket_template`. A interface de caixa e cozinha ja imprime em layout termico de bobina 80mm, com `@page size: 80mm` e CSS dedicado para esconder a tela operacional no momento da impressao.

## Offline

Estratégia prevista:

- Cache local do cardapio e temas no cliente.
- Fila local de pedidos no dispositivo da mesa.
- `offline_sync_queue` no banco para sincronizacao confiavel.
- Sincronizacao idempotente usando `device_id`, `entity_id` e status.
- Cozinha e caixa devem sinalizar quando estao operando com dados atrasados.

## Performance

Pontos de escalabilidade previstos:

- Indices por `tenant_id`, `restaurant_id`, `status` e datas.
- WebSocket por sala de tenant/restaurante.
- Redis futuro para cache de cardapio, sessoes e pub/sub horizontal.
- Paginacao em relatorios e historico.
- Busca com debounce no frontend e full-text nos produtos.
- Baixa de estoque assíncrona apos pedido entregue e comanda fechada.

## Seguranca

- Senhas com hash bcrypt.
- Segredos apenas no `.env`.
- JWT com expiracao.
- Rate limit.
- Validacao com Zod.
- Queries parametrizadas no adapter MySQL.
- Auditoria para pedidos, pagamentos, estoque, preco e cancelamentos.
- Permissoes por funcao.
- Separacao por ambiente: desenvolvimento, homologacao e producao.
