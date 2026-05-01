# Mobile Android/APK

Este diretorio guarda a configuracao inicial para empacotar o React Web com Capacitor.

Passos:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm run build -w apps/web
cd apps/mobile
npx cap add android
npx cap sync android
npx cap open android
```

Para uma experiencia mobile totalmente nativa, crie um `apps/mobile-native` com Expo e reutilize `packages/shared`.
