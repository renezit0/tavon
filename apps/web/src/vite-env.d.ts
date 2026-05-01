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

interface Window {
  tavonDesktop?: {
    isDesktop: boolean;
    listPrinters: () => Promise<TavonDesktopPrinter[]>;
    checkForUpdates: () => Promise<TavonUpdateStatus>;
    installUpdate: () => Promise<void>;
    onUpdateStatus: (callback: (payload: TavonUpdateStatus) => void) => () => void;
  };
}
