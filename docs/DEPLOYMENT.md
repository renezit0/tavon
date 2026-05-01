# Instalacao e plataformas

## Desenvolvimento local

```bash
npm install
cp .env.example .env
npm run dev
```

URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:3333`

## Build web

```bash
npm run build
npm run preview -w apps/web
```

O build final fica em `apps/web/dist`.

## Producao web

Recomendado:

- API Node em VPS, Docker ou PaaS.
- MySQL 8 gerenciado ou VPS com backup.
- Nginx ou Cloudflare na frente.
- HTTPS obrigatorio.
- `JWT_SECRET` forte.
- `CORS_ORIGIN` apontando para o dominio real.
- Redis para cache e pub/sub quando houver mais de uma instancia da API.

## Windows com Electron

Caminho recomendado:

1. Gerar o build web:

   ```bash
   npm run build -w apps/web
   ```

2. Usar o template em `apps/desktop`.
3. Instalar as dependencias dentro do diretorio desktop.
4. Usar `electron-builder` para gerar `.exe`.
5. Para impressoras termicas, instalar um servico local que exponha HTTP/WebSocket para a API ou app Electron.

Comandos:

```bash
cd apps/desktop
npm install
npm run dist:win
```

## Windows com Tauri

Tauri e mais leve que Electron, mas exige Rust:

```bash
npm create tauri-app@latest
```

Configure o frontend para usar `apps/web/dist` como origem. Para impressao termica local, crie um comando Rust isolado que fale com a impressora.

## Android/APK com Capacitor

Capacitor permite reaproveitar o React Web:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init RestaurantQR com.restaurant.qr
npm run build -w apps/web
cd apps/mobile
npx cap add android
npx cap sync android
npx cap open android
```

No Android Studio, gere o APK ou AAB. Para operacao offline, use IndexedDB/local storage no app e sincronize com a API.

## React Native/Expo

Expo e indicado se a experiencia mobile precisar ficar mais nativa:

- Reaproveitar `packages/shared`.
- Criar `apps/mobile`.
- Implementar telas Cliente, Cozinha e Caixa com React Native.
- Usar a mesma API e Socket.IO.

## iOS futuro

Opcoes:

- Capacitor iOS reaproveitando a Web App.
- Expo se houver app nativo.

Para publicar na App Store e necessario conta Apple Developer, Mac com Xcode e ajustes de certificados.

## Impressao em producao

Tres caminhos:

- Navegador: simples, depende do operador.
- Electron/Tauri: imprime localmente no Windows.
- Servico local: recomendado para ESC/POS e impressao automatica. A API envia job para o agente local, que fala com USB, serial ou rede.

## Backups

- Backup diario do MySQL.
- Retencao minima de 30 dias.
- Teste mensal de restauracao.
- Backup separado de imagens se forem armazenadas fora do banco.
