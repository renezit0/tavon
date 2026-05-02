/// <reference types="vite/client" />

interface TavonDesktopPrinter {
  name: string;
  displayName: string;
  description?: string;
  status?: number;
  isDefault: boolean;
}

interface TavonUpdateStatus {
  status: "checking" | "available" | "downloading" | "downloaded" | "idle" | "error" | "disabled" | "ok";
  message?: string;
  version?: string;
  percent?: number;
}

interface TavonDesktopConfig {
  module?: string;
  serverUrl?: string;
}

interface Window {
  tavonDesktop?: {
    isDesktop: boolean;
    listPrinters: () => Promise<TavonDesktopPrinter[]>;
    getConfig: () => Promise<TavonDesktopConfig>;
    setConfig: (input: TavonDesktopConfig) => Promise<TavonDesktopConfig>;
    printHtml: (input: { html: string; deviceName?: string }) => Promise<{ ok: boolean }>;
    checkForUpdates: () => Promise<TavonUpdateStatus>;
    installUpdate: () => Promise<void>;
    onUpdateStatus: (callback: (payload: TavonUpdateStatus) => void) => () => void;
  };
}
