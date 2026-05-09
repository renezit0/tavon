import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tavon.cardapio",
  appName: "Tavon Cardápio",
  webDir: "../web/dist",
  server: {
    androidScheme: "https"
  },
  android: {
    minSdkVersion: 24,
    targetSdkVersion: 34
  }
};

export default config;
