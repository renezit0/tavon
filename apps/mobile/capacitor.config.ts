import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.restaurant.qr",
  appName: "Restaurant QR Suite",
  webDir: "../web/dist",
  server: {
    androidScheme: "https"
  }
};

export default config;
