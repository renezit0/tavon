import {
  Bell,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  CreditCard,
  LayoutDashboard,
  MonitorSmartphone,
  Moon,
  Pencil,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  Search,
  Settings2,
  ShoppingBag,
  Sparkles,
  Sun,
  Save,
  Trash2,
  Utensils,
  UsersRound,
  X
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBowlFood,
  faBurger,
  faChampagneGlasses,
  faDrumstickBite,
  faFish,
  faIceCream,
  faMartiniGlassCitrus,
  faMugHot,
  faPizzaSlice,
  faUtensils,
  faWineGlass
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  Addon,
  AuditLog,
  CashierTicket,
  Category,
  CheckSummary,
  CustomerQr,
  DashboardSummary,
  formatCurrencyBRL,
  ORDER_STATUS_LABEL,
  Order,
  OrderStatus,
  PrinterConfig,
  Product,
  ResolvedCustomerCheck,
  RestaurantSettings,
  ServiceCall,
  ServiceCallStatus,
  Table
} from "@restaurant/shared";
import { api } from "./api";

type ModuleId = "admin" | "client" | "waiter" | "kitchen" | "cashier";
type PageId = "home" | "admin" | "client" | "waiter" | "kitchen" | "cashier";

type CartItem = {
  cartId: string;
  product: Product;
  quantity: number;
  removedIngredientIds: string[];
  addonIds: string[];
  optionValueIds: string[];
  notes?: string;
  unitPrice: number;
  subtotal: number;
};

const moduleTabs: Array<{ id: ModuleId; label: string; icon: typeof LayoutDashboard }> = [
  { id: "admin", label: "Admin", icon: LayoutDashboard },
  { id: "client", label: "Cliente", icon: Utensils },
  { id: "waiter", label: "Garçom", icon: ClipboardList },
  { id: "kitchen", label: "Cozinha", icon: ChefHat },
  { id: "cashier", label: "Caixa", icon: CircleDollarSign }
];

const routeLinks: Array<{ id: PageId; label: string; href: string; icon: typeof LayoutDashboard; description: string }> = [
  {
    id: "admin",
    label: "Painel Administrativo",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Gestao do restaurante, produtos, mesas, usuarios, relatorios e impressao."
  },
  {
    id: "client",
    label: "Cardapio QR",
    href: "/cardapio?table=M01",
    icon: Utensils,
    description: "Experiencia do cliente na mesa com pedido vinculado a comanda."
  },
  {
    id: "waiter",
    label: "Garçom",
    href: "/garcom",
    icon: ClipboardList,
    description: "Lançamento de pedidos pelo garçom com mesa e comanda individual."
  },
  {
    id: "kitchen",
    label: "Cozinha",
    href: "/cozinha",
    icon: ChefHat,
    description: "Fila em tempo real por status, setor, tempo decorrido e impressao."
  },
  {
    id: "cashier",
    label: "Caixa",
    href: "/caixa",
    icon: CircleDollarSign,
    description: "Busca por QR/comanda, pagamento parcial, divisao e fechamento."
  }
];

const statusOrder: OrderStatus[] = ["new", "preparing", "ready", "delivered", "cancelled"];

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  new: "preparing",
  preparing: "ready",
  ready: "delivered"
};

const statusTone: Record<OrderStatus, string> = {
  new: "tone-new",
  preparing: "tone-preparing",
  ready: "tone-ready",
  delivered: "tone-delivered",
  cancelled: "tone-cancelled"
};

const sectorLabels: Record<string, string> = {
  all: "Todos",
  kitchen: "Cozinha",
  bar: "Bar",
  dessert: "Sobremesas",
  cashier: "Caixa"
};

const paymentMethodLabels: Record<string, string> = {
  pix: "PIX",
  credit_card: "Crédito",
  debit_card: "Débito",
  cash: "Dinheiro",
  voucher: "Voucher",
  split: "Dividir"
};

const checkStatusLabels: Record<string, string> = {
  open: "Aberta",
  closed: "Fechada",
  cancelled: "Cancelada"
};

function sectorLabel(sector?: string) {
  return sector ? sectorLabels[sector] || sector : "";
}

function paymentMethodLabel(method: string) {
  return paymentMethodLabels[method] || method;
}

function checkStatusLabel(status: string) {
  return checkStatusLabels[status] || status;
}

function extractCustomerQrCode(rawValue: string) {
  const normalized = rawValue.trim().toUpperCase();
  return normalized.match(/PAX-[A-Z0-9]{6}/)?.[0] || normalized;
}

function productForOrderItem(products: Product[], item: Order["items"][number]) {
  return products.find((product) => product.id === item.productId || product.name === item.productName);
}

function itemCustomizationLabels(products: Product[], item: Order["items"][number]) {
  const product = productForOrderItem(products, item);
  const addonNames = item.customization.addonIds.map(
    (id) => product?.addons.find((addon) => addon.id === id)?.name || id
  );
  const removedIngredientNames = item.customization.removedIngredientIds.map(
    (id) => product?.ingredients.find((ingredient) => ingredient.id === id)?.name || id
  );
  const optionNames = item.customization.optionValueIds.map(
    (id) => product?.options.flatMap((option) => option.values).find((value) => value.id === id)?.name || id
  );

  return {
    addons: addonNames.join(", "),
    removedIngredients: removedIngredientNames.join(", "),
    options: optionNames.join(", ")
  };
}

function categoryIcon(icon?: string, fallbackName?: string): IconDefinition {
  const normalized = `${icon || ""} ${fallbackName || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fas|fa|fa-solid)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ");

  if (normalized.includes("burger") || normalized.includes("hamburg")) return faBurger;
  if (normalized.includes("drink") || normalized.includes("bebida") || normalized.includes("martini")) return faMartiniGlassCitrus;
  if (normalized.includes("wine") || normalized.includes("vinho")) return faWineGlass;
  if (normalized.includes("bar") || normalized.includes("champagne")) return faChampagneGlasses;
  if (normalized.includes("dessert") || normalized.includes("sobremesa") || normalized.includes("ice")) return faIceCream;
  if (normalized.includes("pizza")) return faPizzaSlice;
  if (normalized.includes("carne") || normalized.includes("meat") || normalized.includes("frango")) return faDrumstickBite;
  if (normalized.includes("fish") || normalized.includes("peixe")) return faFish;
  if (normalized.includes("coffee") || normalized.includes("cafe")) return faMugHot;
  if (normalized.includes("bowl") || normalized.includes("prato")) return faBowlFood;
  return faUtensils;
}

const defaultRestaurant: RestaurantSettings = {
  id: "loading",
  tenantId: "tenant_demo",
  name: "Tavon",
  logoUrl: "/tavonlogowhite.png",
  coverUrl: "",
  serviceFeePercent: 10,
  averageDeliveryMinutes: 20,
  autoPrint: true,
  waiterCallEnabled: true,
  manualCheckCodeEnabled: true,
  theme: {
    mode: "dark",
    primaryColor: "#F2A541",
    accentColor: "#2EC4B6",
    surfaceColor: "#121417",
    textColor: "#F8FAFC",
    radius: 8
  }
};

function cssVars(restaurant: RestaurantSettings) {
  return {
    "--primary": restaurant.theme.primaryColor,
    "--accent": restaurant.theme.accentColor,
    "--radius": `${restaurant.theme.radius}px`
  } as React.CSSProperties;
}

function resolveAssetUrl(url: string) {
  if (!url) return url;
  // absolute paths break with file:// in Electron — make them relative
  if (url.startsWith("/") && !url.startsWith("//")) return "." + url;
  return url;
}

function themedLogoUrl(restaurant: RestaurantSettings) {
  if (!restaurant.logoUrl) return restaurant.theme.mode === "light" ? "/tavonlogo.png" : "/tavonlogowhite.png";
  const isDark = restaurant.theme.mode !== "light";
  const isTavonLogo = restaurant.logoUrl.includes("tavonlogo");
  const url = isDark && isTavonLogo ? "/tavonlogowhite.png" : restaurant.logoUrl;
  return resolveAssetUrl(url);
}

async function printThermalElement(selector: string) {
  const element = document.querySelector(selector);
  if (!element) throw new Error("Comprovante nao encontrado para impressao");
  if (window.tavonDesktop?.printHtml) {
    await window.tavonDesktop.printHtml({ html: element.outerHTML });
    return;
  }
  window.print();
}

function productUnitPrice(product: Product, addonIds: string[], optionValueIds: string[]) {
  const addons = product.addons.filter((addon) => addonIds.includes(addon.id)).reduce((sum, addon) => sum + addon.price, 0);
  const options = product.options
    .flatMap((option) => option.values)
    .filter((value) => optionValueIds.includes(value.id))
    .reduce((sum, value) => sum + value.priceDelta, 0);
  return Number((product.price + addons + options).toFixed(2));
}

function minutesSince(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
}

function getPageFromPathname(pathname: string): PageId {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/cardapio") || pathname.startsWith("/cliente") || pathname.startsWith("/mesa")) return "client";
  if (pathname.startsWith("/garcom") || pathname.startsWith("/atendimento")) return "waiter";
  if (pathname.startsWith("/cozinha") || pathname.startsWith("/pedidos")) return "kitchen";
  if (pathname.startsWith("/caixa")) return "cashier";
  return "home";
}

function getCurrentAppPathname() {
  return new URLSearchParams(window.location.search).get("appRoute") || window.location.pathname;
}

// Módulo travado: no Electron, a tela é fixada ao módulo instalado (ex: só Cozinha)
const desktopLockedPage = (() => {
  if (!window.tavonDesktop?.isDesktop) return null;
  const page = getPageFromPathname(getCurrentAppPathname());
  return page !== "home" && page !== "admin" ? page : null;
})();

function App() {
  const [activePage, setActivePage] = useState<PageId>(() => getPageFromPathname(getCurrentAppPathname()));
  const [restaurant, setRestaurant] = useState<RestaurantSettings>(defaultRestaurant);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [customerQrs, setCustomerQrs] = useState<CustomerQr[]>([]);
  const [tickets, setTickets] = useState<CashierTicket[]>([]);
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [desktopConfigOpen, setDesktopConfigOpen] = useState(false);
  const [desktopConfigUnlocked, setDesktopConfigUnlocked] = useState(false);
  const [desktopServerUrl, setDesktopServerUrl] = useState(api.baseUrl);
  const [desktopConfigPassword, setDesktopConfigPassword] = useState("");
  const [desktopConfigError, setDesktopConfigError] = useState("");
  const lastUpdateToastRef = useRef("");

  const reload = async () => {
    setError("");
    const [menu, dash, tableList, orderList, printerList, customerQrList, ticketList, callList, logs] = await Promise.all([
      api.getMenu(),
      api.getDashboard(),
      api.getTables(),
      api.getOrders(),
      api.getPrinters(),
      api.getCustomerQrs(),
      api.getTickets(),
      api.getServiceCalls(),
      api.getAuditLogs()
    ]);
    setRestaurant(menu.restaurant);
    setCategories(menu.categories);
    setProducts(menu.products);
    setDashboard(dash);
    setTables(tableList);
    setOrders(orderList);
    setPrinters(printerList);
    setCustomerQrs(customerQrList);
    setTickets(ticketList);
    setServiceCalls(callList);
    setAuditLogs(logs as AuditLog[]);
  };

  const refreshOperationalState = async () => {
    const [dash, tableList, customerQrList, ticketList, callList] = await Promise.all([
      api.getDashboard(),
      api.getTables(),
      api.getCustomerQrs(),
      api.getTickets(),
      api.getServiceCalls()
    ]);
    setDashboard(dash);
    setTables(tableList);
    setCustomerQrs(customerQrList);
    setTickets(ticketList);
    setServiceCalls(callList);
  };

  useEffect(() => {
    const onPopState = () => setActivePage(getPageFromPathname(getCurrentAppPathname()));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function boot() {
      try {
        if (window.tavonDesktop?.getConfig) {
          const config = await window.tavonDesktop.getConfig();
          if (config.serverUrl) {
            api.setBaseUrl(config.serverUrl);
            setDesktopServerUrl(config.serverUrl);
          }
        }
        await api.login();
        await reload();
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Nao foi possivel conectar ao servidor");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    boot();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading || error) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL || api.baseUrl, { transports: ["websocket", "polling"] });

    socket.on("order:new", (order: Order) => {
      setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)]);
      setToast(`Novo pedido em ${order.tableName}`);
      refreshOperationalState().catch(() => undefined);
    });

    socket.on("order:updated", (order: Order) => {
      setOrders((current) => current.map((item) => (item.id === order.id ? order : item)));
    });

    socket.on("dashboard:update", (summary: DashboardSummary) => setDashboard(summary));
    socket.on("check:updated", () => {
      refreshOperationalState().catch(() => undefined);
    });
    socket.on("check:closed", () => {
      setToast("Comanda fechada com sucesso");
      refreshOperationalState().catch(() => undefined);
    });
    socket.on("service-call:new", (call: ServiceCall) => {
      setServiceCalls((current) => [call, ...current.filter((item) => item.id !== call.id)]);
      setToast(`Chamado em ${call.tableName}`);
    });
    socket.on("service-call:updated", (call: ServiceCall) => {
      setServiceCalls((current) => current.map((item) => (item.id === call.id ? call : item)));
    });

    return () => {
      socket.disconnect();
    };
  }, [loading, error]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!window.tavonDesktop?.onUpdateStatus) return;

    return window.tavonDesktop.onUpdateStatus((payload) => {
      if (!payload.message) return;
      if (!["available", "downloaded", "error"].includes(payload.status)) return;
      const message = payload.status === "error" ? `Erro na atualizacao: ${payload.message}` : payload.message;
      if (lastUpdateToastRef.current === message) return;
      lastUpdateToastRef.current = message;
      setToast(message);
    });
  }, []);

  const MODULE_NAMES: Record<string, string> = {
    admin:   "Tavon Admin",
    client:  "Tavon Cardápio",
    waiter:  "Tavon Garçom",
    kitchen: "Tavon Cozinha",
    cashier: "Tavon Caixa",
    home:    "Tavon"
  };

  useEffect(() => {
    const name = MODULE_NAMES[activePage] ?? "Tavon";
    document.title = name;
  }, [activePage]);

  const themeMode = restaurant.theme.mode === "light" ? "light" : "dark";
  const logoUrl = themedLogoUrl(restaurant);
  const openOrders = orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length;
  const toastIsError = /\b(falha|erro|nao|não|invalido|inválido|impossivel|possivel|autenticado|credenciais)\b/i.test(toast);
  const navigate = (href: string) => {
    if (desktopLockedPage) return; // módulo travado: bloqueia navegação cruzada
    try { window.history.pushState({}, "", href); } catch { /* file:// context */ }
    setActivePage(getPageFromPathname(href));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openDesktopConfig = () => {
    setDesktopConfigPassword("");
    setDesktopConfigError("");
    setDesktopConfigUnlocked(false);
    setDesktopConfigOpen(true);
  };

  const unlockDesktopConfig = () => {
    if (desktopConfigPassword !== "1234") {
      setDesktopConfigError("Senha invalida");
      return;
    }
    setDesktopConfigError("");
    setDesktopConfigUnlocked(true);
    setDesktopServerUrl(api.baseUrl);
  };

  const saveDesktopServerConfig = async () => {
    setDesktopConfigError("");
    const normalizedUrl = desktopServerUrl.trim().replace(/\/+$/, "");
    try {
      if (window.tavonDesktop?.setConfig) {
        await window.tavonDesktop.setConfig({ serverUrl: normalizedUrl });
      }
      api.setBaseUrl(normalizedUrl);
      setDesktopConfigOpen(false);
      setToast("Servidor configurado. Reabrindo conexao...");
      window.setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      setDesktopConfigError(err instanceof Error ? err.message : "Nao foi possivel salvar o servidor");
    }
  };
  const showOperationalShell = activePage !== "client" && !desktopLockedPage;

  return (
    <div className={`app route-${activePage}${desktopLockedPage ? " module-locked" : ""}`} data-mode={themeMode} style={cssVars(restaurant)}>
      {showOperationalShell && (
        <aside className="rail">
          <button className="brand-mark" onClick={() => navigate("/")} title="Inicio">
            {logoUrl ? <img src={logoUrl} alt="" /> : <Utensils />}
          </button>
          <nav>
            {routeLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.id}
                  className={activePage === link.id ? "active" : ""}
                  onClick={() => navigate(link.href)}
                  title={link.label}
                >
                  <Icon size={20} />
                  <span>{link.label.replace("Painel ", "").replace(" Administrativo", "")}</span>
                </button>
              );
            })}
          </nav>
        </aside>
      )}

      <main className={showOperationalShell ? "workspace" : "workspace public-workspace"}>
        {showOperationalShell && (
          <header className="topbar">
            <div>
              <p className="eyebrow">{MODULE_NAMES[activePage] ?? "Tavon"}</p>
              <h1>{activePage === "home" ? restaurant.name : routeLinks.find((link) => link.id === activePage)?.label}</h1>
            </div>
            <div className="topbar-actions">
              <span className="live-pill">
                <Bell size={16} />
                {openOrders} ativos
              </span>
              {window.tavonDesktop?.isDesktop && (
                <button className="icon-button" onClick={openDesktopConfig} title="Configurar servidor">
                  <Settings2 size={18} />
                </button>
              )}
              <button
                className="icon-button"
                onClick={() =>
                  setRestaurant((current) => ({
                    ...current,
                    theme: { ...current.theme, mode: current.theme.mode === "light" ? "dark" : "light" }
                  }))
                }
                title="Alternar tema"
              >
                {themeMode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  reload()
                    .then(() => setToast("Dados atualizados"))
                    .catch((err) => setToast(err instanceof Error ? err.message : "Falha ao sincronizar"))
                }
              >
                <Sparkles size={17} />
                Sincronizar
              </button>
            </div>
          </header>
        )}

        {error && (
          <div className="error-banner">
            <X size={18} />
            <span>{error}</span>
            {window.tavonDesktop?.isDesktop && (
              <button className="ghost-button" onClick={openDesktopConfig}>
                Configurar servidor
              </button>
            )}
          </div>
        )}

        {loading ? (
          <LoadingScreen />
        ) : (
          <>
            {activePage === "home" && (
              <SystemHome
                restaurant={restaurant}
                dashboard={dashboard}
                openOrders={openOrders}
                navigate={navigate}
              />
            )}
            {activePage === "admin" && (
              <AdminPanel
                restaurant={restaurant}
                setRestaurant={setRestaurant}
                categories={categories}
                products={products}
                setProducts={setProducts}
                tables={tables}
                dashboard={dashboard}
                printers={printers}
                setPrinters={setPrinters}
                customerQrs={customerQrs}
                setCustomerQrs={setCustomerQrs}
                tickets={tickets}
                auditLogs={auditLogs}
                onToast={setToast}
                onReload={reload}
              />
            )}
            {activePage === "client" && (
              <CustomerMenu
                restaurant={restaurant}
                categories={categories}
                products={products}
                tables={tables}
                cart={cart}
                setCart={setCart}
                onOrder={(order) => {
                  setOrders((current) => [order, ...current]);
                  setToast(`Pedido ${order.checkCode} enviado para preparo`);
                }}
                onRestaurantUpdate={setRestaurant}
                onServiceCall={async (tableId) => {
                  try {
                    const call = await api.createServiceCall({ tableId, message: "Chamar garçom" });
                    setServiceCalls((current) => [call, ...current.filter((item) => item.id !== call.id)]);
                    setToast(`Garçom chamado para ${call.tableName}`);
                  } catch (err) {
                    setToast(err instanceof Error ? err.message : "Nao foi possivel chamar o garçom");
                  }
                }}
                navigate={navigate}
                onConfigOpen={openDesktopConfig}
              />
            )}
            {activePage === "waiter" && (
              <WaiterOrderPanel
                restaurant={restaurant}
                categories={categories}
                products={products}
                tables={tables}
                customerQrs={customerQrs}
                serviceCalls={serviceCalls}
                onOrder={(order) => {
                  setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)]);
                  setToast(`Pedido ${order.checkCode} lançado para ${order.tableName}`);
                }}
                onResolveServiceCall={async (callId) => {
                  try {
                    const call = await api.updateServiceCallStatus(callId, "resolved");
                    setServiceCalls((current) => current.map((item) => (item.id === call.id ? call : item)));
                    setToast(`Chamado de ${call.tableName} atendido`);
                  } catch (err) {
                    setToast(err instanceof Error ? err.message : "Nao foi possivel atualizar o chamado");
                  }
                }}
                onToast={setToast}
                onReload={reload}
                onConfigOpen={openDesktopConfig}
              />
            )}
            {activePage === "kitchen" && (
              <KitchenBoard
                orders={orders}
                products={products}
                serviceCalls={serviceCalls}
                onStatusChange={async (orderId, status) => {
                  try {
                    const order = await api.updateOrderStatus(orderId, status);
                    setOrders((current) => current.map((item) => (item.id === order.id ? order : item)));
                    setToast(`Pedido atualizado para ${ORDER_STATUS_LABEL[status]}`);
                  } catch (err) {
                    setToast(err instanceof Error ? err.message : "Nao foi possivel atualizar o pedido");
                  }
                }}
                onPrint={(order) =>
                  api
                    .printJob({ type: "kitchen-ticket", paperWidth: "80mm", order })
                    .then(() => setToast("Ticket 80mm enviado"))
                    .catch((err) => setToast(err instanceof Error ? err.message : "Falha ao imprimir ticket"))
                }
                onResolveServiceCall={async (callId) => {
                  try {
                    const call = await api.updateServiceCallStatus(callId, "resolved");
                    setServiceCalls((current) => current.map((item) => (item.id === call.id ? call : item)));
                    setToast(`Chamado de ${call.tableName} atendido`);
                  } catch (err) {
                    setToast(err instanceof Error ? err.message : "Nao foi possivel atualizar o chamado");
                  }
                }}
                onConfigOpen={openDesktopConfig}
              />
            )}
            {activePage === "cashier" && (
              <CashierPanel
                restaurant={restaurant}
                tables={tables}
                customerQrs={customerQrs}
                onToast={setToast}
                onReload={reload}
                onConfigOpen={openDesktopConfig}
              />
            )}
          </>
        )}

        {toast && (
          <div className={`toast ${toastIsError ? "error-toast" : "success-toast"}`} role="status" aria-live="polite">
            {toastIsError ? <X size={18} /> : <CheckCircle2 size={18} />}
            <span>{toast}</span>
          </div>
        )}
        {desktopConfigOpen && (
          <div className="service-confirm-backdrop">
            <section className="service-confirm-dialog tablet-settings-dialog" role="dialog" aria-modal="true">
              <button className="dialog-close" onClick={() => setDesktopConfigOpen(false)}>
                <X size={18} />
              </button>
              <div className="service-confirm-icon">
                <Settings2 size={26} />
              </div>
              <p className="eyebrow">Configuracao</p>
              <h3>Servidor Tavon</h3>
              {!desktopConfigUnlocked ? (
                <>
                  <p>Digite a senha para configurar o endereco do servidor.</p>
                  <label className="field full">
                    Senha
                    <input
                      type="password"
                      inputMode="numeric"
                      value={desktopConfigPassword}
                      onChange={(e) => { setDesktopConfigPassword(e.target.value); setDesktopConfigError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") unlockDesktopConfig(); }}
                      placeholder="1234"
                      autoFocus
                    />
                  </label>
                  {desktopConfigError && <p className="inline-error">{desktopConfigError}</p>}
                  <div className="service-confirm-actions single-action">
                    <button className="checkout-button" onClick={unlockDesktopConfig}>
                      Liberar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>Informe o IP da maquina com o Tavon Server. Ex: http://192.168.1.10:3333</p>
                  <label className="field full">
                    Endereco do servidor
                    <input
                      value={desktopServerUrl}
                      onChange={(e) => setDesktopServerUrl(e.target.value)}
                      placeholder="http://192.168.1.10:3333"
                      onKeyDown={(e) => { if (e.key === "Enter") saveDesktopServerConfig(); }}
                      autoFocus
                    />
                  </label>
                  {desktopConfigError && <p className="inline-error">{desktopConfigError}</p>}
                  <div className="service-confirm-actions">
                    <button className="ghost-button" onClick={() => setDesktopConfigOpen(false)}>
                      Cancelar
                    </button>
                    <button className="checkout-button" onClick={saveDesktopServerConfig}>
                      Salvar
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function SystemHome(props: {
  restaurant: RestaurantSettings;
  dashboard: DashboardSummary | null;
  openOrders: number;
  navigate: (href: string) => void;
}) {
  return (
    <section className="system-home">
      <div className="system-hero">
        <div>
          <p className="eyebrow">Sistema multi-tela vinculado</p>
          <h2>{props.restaurant.name}</h2>
          <p>
            Cada funcionalidade tem sua propria URL operacional. O QR Code leva ao cardapio da mesa, a cozinha recebe
            pedidos em tempo real e o caixa fecha a comanda pelo codigo.
          </p>
        </div>
        <div className="home-metrics">
          <Metric title="Ativos agora" value={String(props.openOrders)} icon={Bell} />
          <Metric title="Faturamento" value={formatCurrencyBRL(props.dashboard?.revenueToday || 0)} icon={CircleDollarSign} />
          <Metric title="Mesas abertas" value={String(props.dashboard?.activeTables || 0)} icon={MonitorSmartphone} />
        </div>
      </div>

      <div className="system-link-grid">
        {routeLinks.map((link) => {
          const Icon = link.icon;
            return (
              <button
                key={link.id}
                className="system-link-card"
                onClick={() => props.navigate(link.href)}
              >
                <Icon size={22} />
                <span>{link.label}</span>
                <small>{link.description}</small>
              </button>
            );
          })}
      </div>
    </section>
  );
}

function LoadingScreen() {
  return (
    <div className="loader-splash">
      {/* 04 – Stroke Draw */}
      <div className="loader-stroke">
        <svg viewBox="0 340 1000 410" preserveAspectRatio="xMidYMid meet">
          <g className="loader-letter loader-t" transform="translate(-120 0)">
            <path fill="#eae6df" d="M173.81,592.91c.07,30.29,13.88,56.32,36.2,74.38,31.02,22.62,69.57,27.49,106.16,10.6l17.53,36.58c-36.28,16.82-74.5,18.54-111.24,5.49-52.64-18.7-89.32-67.8-89.38-124.5l-.2-187.3,40.66-.15.47,59.86,134.78-.15-.16,37.72-135,.09.19,87.38Z"/>
          </g>
          <g className="loader-letter loader-v" transform="translate(-485 0)">
            <path fill="#b9a784" d="M761.68,467l41.84-.47,34.95,64.83,3.23,5.84,84.81,152.61c5.26,9.9,15.16,9.73,21.46-.34l121.68-222.43,44.11.07-86.38,158.88-43.99,79.51c-9.06,16.37-22.96,28.09-41.05,29.37-17.56,1.24-37.98-5.51-47.32-22.45l-133.35-245.43Z"/>
          </g>
          <g className="loader-letter loader-fork" transform="translate(-485 0)">
            <path fill="#b9a784" d="M979.61,352.41l-.02,89.63c0,12.67-8.23,23.16-18.5,28.7-15.68,8.46-9.23,22.13-13.49,33.01l-19.91.07c-2.75-12.91,2.17-25.31-13.25-33.15-9.59-4.88-18.18-14.86-18.23-26.77l-.38-90.61c-.02-4.24,4.5-9,7.9-9.29,5.08-.44,9.18,3.89,9.53,9.28l-.28,75.21c1.21,2.65,4.98,6.61,7.56,6.93,2.91.36,7.51-3.91,8.65-7l-.26-77.04c1.3-4.39,5.64-8.13,9.81-7.88,3.45.21,7.73,5.49,7.73,9.72l.1,74.91c0,3.22,5.78,7.7,8.7,7.36,4.29-.5,7.35-5.26,7.35-9.87l-.08-74.27c0-2.9,5.02-7.4,7.66-7.77,3.34-.48,9.41,3.54,9.41,8.83Z"/>
          </g>
          <g className="loader-letter loader-n" transform="translate(-820 0)">
            <path fill="#eae6df" d="M1745.43,581.97c-.18-52.19-46.02-87.4-95.44-83.11-50.17,4.36-82.12,43.66-81.93,93.01l.5,133.23-40.58.11.33-147.43c.11-51.05,33.55-94.95,81.17-111.88,41.82-14.86,87.19-10.47,124.09,14.35,32.39,21.78,52.56,57.87,52.66,97.17l.35,147.66-40.65.34-.49-143.45Z"/>
          </g>
        </svg>
      </div>

      {/* 06 – Bar Wave */}
      <div className="loader-bars">
        <span /><span /><span /><span /><span /><span /><span />
      </div>
    </div>
  );
}

function AdminPanel(props: {
  restaurant: RestaurantSettings;
  setRestaurant: (restaurant: RestaurantSettings) => void;
  categories: Category[];
  products: Product[];
  setProducts: (products: Product[]) => void;
  tables: Table[];
  dashboard: DashboardSummary | null;
  printers: PrinterConfig[];
  setPrinters: (printers: PrinterConfig[]) => void;
  customerQrs: CustomerQr[];
  setCustomerQrs: (customerQrs: CustomerQr[]) => void;
  tickets: CashierTicket[];
  auditLogs: AuditLog[];
  onToast: (message: string) => void;
  onReload: () => Promise<void>;
}) {
  const [activeSection, setActiveSection] =
    useState<"dashboard" | "produtos" | "comandas" | "tickets" | "configuracoes">("dashboard");
  const [qrTableId, setQrTableId] = useState(props.tables[0]?.id || "");
  const [qrCode, setQrCode] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productDraft, setProductDraft] = useState({
    name: "",
    price: "32.90",
    categoryId: props.categories[0]?.id || "",
    sector: "kitchen",
    description: "Novo produto cadastrado pelo painel administrativo."
  });
  const [qrBatchQuantity, setQrBatchQuantity] = useState("10");
  const [customerQrCode, setCustomerQrCode] = useState(props.customerQrs[0]?.code || "");
  const [customerQrImage, setCustomerQrImage] = useState("");
  const [activationTableId, setActivationTableId] = useState(props.tables[0]?.id || "");
  const [tabletPasswordDraft, setTabletPasswordDraft] = useState("");
  const [desktopPrinters, setDesktopPrinters] = useState<TavonDesktopPrinter[]>([]);
  const [printerDiscoveryLoading, setPrinterDiscoveryLoading] = useState(false);

  useEffect(() => {
    if (!qrTableId && props.tables[0]) setQrTableId(props.tables[0].id);
    if (!activationTableId && props.tables[0]) setActivationTableId(props.tables[0].id);
  }, [activationTableId, props.tables, qrTableId]);

  useEffect(() => {
    if (!customerQrCode && props.customerQrs[0]) setCustomerQrCode(props.customerQrs[0].code);
  }, [customerQrCode, props.customerQrs]);

  const tableNameFor = (tableId?: string) => props.tables.find((table) => table.id === tableId)?.name || "Sem mesa";
  const activeCustomerQrs = props.customerQrs.filter((qr) => qr.status === "in_use" && qr.currentCheckCode);
  const filteredAdminProducts = props.products.filter((product) =>
    `${product.name} ${product.description}`.toLowerCase().includes(productSearch.trim().toLowerCase())
  );

  const saveTheme = async () => {
    try {
      const updated = await api.updateRestaurant(props.restaurant);
      props.setRestaurant(updated);
      props.onToast("Configuracoes visuais salvas");
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Nao foi possivel salvar");
    }
  };

  const saveTabletSettings = async () => {
    try {
      const updated = await api.updateTabletSettings({
        password: tabletPasswordDraft.trim() || undefined,
        waiterCallEnabled: props.restaurant.waiterCallEnabled,
        manualCheckCodeEnabled: props.restaurant.manualCheckCodeEnabled
      });
      props.setRestaurant(updated);
      setTabletPasswordDraft("");
      props.onToast("Configuracoes do tablet salvas");
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Nao foi possivel salvar as configuracoes do tablet");
    }
  };

  const createProduct = async () => {
    const baseProduct = props.products[0];
    if (!baseProduct || !productDraft.name.trim()) {
      props.onToast("Informe o nome do produto");
      return;
    }
    try {
      const created = await api.createProduct({
        ...baseProduct,
        categoryId: productDraft.categoryId || baseProduct.categoryId,
        name: productDraft.name.trim(),
        price: Number(productDraft.price),
        sector: productDraft.sector as Product["sector"],
        featured: false,
        imageUrl: baseProduct.imageUrl,
        description: productDraft.description
      });
      props.setProducts([created, ...props.products]);
      props.onToast("Produto cadastrado");
      setProductDraft({ ...productDraft, name: "" });
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Nao foi possivel criar o produto");
    }
  };

  const generateQr = async () => {
    try {
      const qr = await api.getTableQr(qrTableId);
      setQrCode(qr.dataUrl);
      props.onToast("QR da mesa gerado");
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Nao foi possivel gerar o QR");
    }
  };

  const updateEditingProduct = (patch: Partial<Product>) => {
    setEditingProduct((current) => (current ? { ...current, ...patch } : current));
  };

  const saveEditedProduct = async () => {
    if (!editingProduct) return;
    try {
      const updated = await api.updateProduct(editingProduct.id, {
        categoryId: editingProduct.categoryId,
        name: editingProduct.name,
        description: editingProduct.description,
        price: Number(editingProduct.price),
        imageUrl: editingProduct.imageUrl,
        active: editingProduct.active,
        featured: editingProduct.featured,
        temporarilyUnavailable: editingProduct.temporarilyUnavailable,
        preparationMinutes: Number(editingProduct.preparationMinutes),
        allowNotes: editingProduct.allowNotes,
        sector: editingProduct.sector,
        ingredients: editingProduct.ingredients,
        addons: editingProduct.addons,
        options: editingProduct.options,
        tags: editingProduct.tags
      });
      setEditingProduct(updated);
      props.setProducts(props.products.map((item) => (item.id === updated.id ? updated : item)));
      props.onToast("Produto atualizado");
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Nao foi possivel salvar o produto");
    }
  };

  const deleteEditedProduct = async () => {
    if (!editingProduct) return;
    try {
      await api.deleteProduct(editingProduct.id);
      props.setProducts(props.products.filter((item) => item.id !== editingProduct.id));
      setEditingProduct(null);
      props.onToast("Produto excluido");
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Nao foi possivel excluir o produto");
    }
  };

  const createQrBatch = async () => {
    const quantity = Math.min(200, Math.max(1, Number(qrBatchQuantity) || 1));
    try {
      await api.createCustomerQrBatch(quantity);
      props.setCustomerQrs(await api.getCustomerQrs());
      props.onToast(`${quantity} QR Codes individuais gerados`);
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Nao foi possivel gerar o lote");
    }
  };

  const previewCustomerQr = async () => {
    if (!customerQrCode.trim()) {
      props.onToast("Selecione ou informe uma comanda");
      return;
    }
    try {
      const qr = await api.getCustomerQrImage(customerQrCode.trim().toUpperCase());
      setCustomerQrImage(qr.dataUrl);
      props.onToast("QR individual carregado");
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Nao foi possivel carregar o QR");
    }
  };

  const activateCustomerQr = async () => {
    if (!activationTableId || !customerQrCode.trim()) {
      props.onToast("Selecione mesa e comanda");
      return;
    }
    try {
      const resolved = await api.resolveCustomerCheck({
        tableId: activationTableId,
        customerQrCode: customerQrCode.trim().toUpperCase()
      });
      await props.onReload();
      props.onToast(`${resolved.checkCode} ativa em ${resolved.tableName}`);
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Nao foi possivel ativar a comanda");
    }
  };

  const discoverDesktopPrinters = async () => {
    if (!window.tavonDesktop?.listPrinters) {
      props.onToast("Busca de impressoras locais disponivel apenas no app Windows");
      return;
    }
    setPrinterDiscoveryLoading(true);
    try {
      const printers = await window.tavonDesktop.listPrinters();
      setDesktopPrinters(printers);
      props.onToast(`${printers.length} impressoras encontradas no PC`);
    } catch (err) {
      props.onToast(err instanceof Error ? err.message : "Nao foi possivel buscar impressoras do PC");
    } finally {
      setPrinterDiscoveryLoading(false);
    }
  };

  const updateIngredient = (ingredientId: string, patch: Partial<Product["ingredients"][number]>) => {
    if (!editingProduct) return;
    updateEditingProduct({
      ingredients: editingProduct.ingredients.map((ingredient) =>
        ingredient.id === ingredientId ? { ...ingredient, ...patch } : ingredient
      )
    });
  };

  const updateAddon = (addonId: string, patch: Partial<Product["addons"][number]>) => {
    if (!editingProduct) return;
    updateEditingProduct({
      addons: editingProduct.addons.map((addon) => (addon.id === addonId ? { ...addon, ...patch } : addon))
    });
  };

  const updateOption = (optionId: string, patch: Partial<Product["options"][number]>) => {
    if (!editingProduct) return;
    updateEditingProduct({
      options: editingProduct.options.map((option) => (option.id === optionId ? { ...option, ...patch } : option))
    });
  };

  const updateOptionValue = (
    optionId: string,
    valueId: string,
    patch: Partial<Product["options"][number]["values"][number]>
  ) => {
    if (!editingProduct) return;
    updateEditingProduct({
      options: editingProduct.options.map((option) =>
        option.id === optionId
          ? {
              ...option,
              values: option.values.map((value) => (value.id === valueId ? { ...value, ...patch } : value))
            }
          : option
      )
    });
  };

  return (
    <section className="module-grid admin-grid">
      <div className="panel admin-tabs-panel">
        <div>
          <p className="eyebrow">Painel Administrativo</p>
          <h2>Gestao real do restaurante</h2>
        </div>
        <div className="segmented admin-section-nav">
          {[
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "produtos", label: "Produtos", icon: ShoppingBag },
            { id: "comandas", label: "Comandas", icon: UsersRound },
            { id: "tickets", label: "Tickets", icon: ReceiptText },
            { id: "configuracoes", label: "Configuracoes", icon: Settings2 }
          ].map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                className={activeSection === section.id ? "active" : ""}
                onClick={() => setActiveSection(section.id as typeof activeSection)}
              >
                <Icon size={16} />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeSection === "dashboard" && (
        <>
          <div className="panel hero-panel">
            <div>
              <p className="eyebrow">Dashboard operacional</p>
              <h2>Vendas, mesas e preparo em tempo real</h2>
            </div>
            <div className="metric-grid">
              <Metric title="Faturamento" value={formatCurrencyBRL(props.dashboard?.revenueToday || 0)} icon={CircleDollarSign} />
              <Metric title="Pedidos" value={String(props.dashboard?.ordersToday || 0)} icon={ReceiptText} />
              <Metric title="Ticket medio" value={formatCurrencyBRL(props.dashboard?.averageTicket || 0)} icon={CreditCard} />
              <Metric title="Mesas ativas" value={String(props.dashboard?.activeTables || 0)} icon={MonitorSmartphone} />
            </div>
            <div className="bar-chart">
              {props.dashboard?.salesByHour.map((item) => (
                <div key={item.hour} className="bar-column">
                  <span style={{ height: `${Math.max(16, item.total / 10)}px` }} />
                  <small>{item.hour}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Comandas ativas</p>
                <h3>Agora no salao</h3>
              </div>
              <span className="live-pill">{activeCustomerQrs.length} abertas</span>
            </div>
            <div className="admin-list">
              {activeCustomerQrs.length === 0 && <p className="empty-state">Nenhuma comanda individual aberta.</p>}
              {activeCustomerQrs.slice(0, 7).map((qr) => (
                <div key={qr.id} className="admin-row">
                  <div className="icon-tile">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <strong>{qr.label}</strong>
                    <small>{qr.currentCheckCode} · {tableNameFor(qr.currentTableId)}</small>
                  </div>
                  <span className="status-badge open">ativa</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel audit-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Auditoria</p>
                <h3>Rastreio de acoes</h3>
              </div>
            </div>
            <div className="timeline">
              {props.auditLogs.slice(0, 8).map((log) => (
                <div key={log.id}>
                  <span />
                  <p>{log.action}</p>
                  <small>{log.actorName} · {new Date(log.createdAt).toLocaleTimeString("pt-BR")}</small>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeSection === "produtos" && (
        <>
          <div className="panel product-create-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Produtos</p>
                <h3>Cadastrar novo produto</h3>
              </div>
              <button className="primary-button" onClick={createProduct}>
                <Plus size={17} />
                Criar
              </button>
            </div>
            <div className="product-form">
              <input
                placeholder="Nome do produto"
                value={productDraft.name}
                onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })}
              />
              <input
                type="number"
                value={productDraft.price}
                onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })}
              />
              <select
                value={productDraft.categoryId}
                onChange={(event) => setProductDraft({ ...productDraft, categoryId: event.target.value })}
              >
                {props.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                value={productDraft.sector}
                onChange={(event) => setProductDraft({ ...productDraft, sector: event.target.value })}
              >
                <option value="kitchen">Cozinha</option>
                <option value="bar">Bar</option>
                <option value="dessert">Sobremesas</option>
              </select>
            </div>
            <label className="field">
              Descricao inicial
              <textarea
                value={productDraft.description}
                onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })}
              />
            </label>
          </div>

          <div className="panel product-list-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Catalogo</p>
                <h3>Editar e pausar itens</h3>
              </div>
            </div>
            <div className="search-box admin-search">
              <Search size={18} />
              <input placeholder="Buscar produto" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />
            </div>
            <div className="admin-list product-admin-list">
              {filteredAdminProducts.map((product) => (
                <div key={product.id} className="admin-row">
                  <img src={product.imageUrl} alt="" />
                  <div>
                    <strong>{product.name}</strong>
                    <small>
                      {formatCurrencyBRL(product.price)} · {sectorLabel(product.sector)} · {product.active ? "ativo" : "inativo"}
                    </small>
                  </div>
                  <button className="ghost-button" onClick={() => setEditingProduct(product)}>
                    <Pencil size={16} />
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="panel product-editor-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Editor de produto</p>
                <h3>{editingProduct ? editingProduct.name : "Selecione um produto"}</h3>
              </div>
              {editingProduct && (
                <button className="primary-button" onClick={saveEditedProduct}>
                  <Save size={17} />
                  Salvar
                </button>
              )}
            </div>
            {!editingProduct ? (
              <div className="empty-state editor-empty">Escolha um produto na lista para alterar preco, status, adicionais e opcoes.</div>
            ) : (
              <>
                <div className="editor-grid">
                  <label className="field">
                    Nome
                    <input value={editingProduct.name} onChange={(event) => updateEditingProduct({ name: event.target.value })} />
                  </label>
                  <label className="field">
                    Valor
                    <input
                      type="number"
                      step="0.01"
                      value={editingProduct.price}
                      onChange={(event) => updateEditingProduct({ price: Number(event.target.value) })}
                    />
                  </label>
                  <label className="field">
                    Categoria
                    <select
                      value={editingProduct.categoryId}
                      onChange={(event) => updateEditingProduct({ categoryId: event.target.value })}
                    >
                      {props.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Setor
                    <select
                      value={editingProduct.sector}
                      onChange={(event) => updateEditingProduct({ sector: event.target.value as Product["sector"] })}
                    >
                      <option value="kitchen">Cozinha</option>
                      <option value="bar">Bar</option>
                      <option value="dessert">Sobremesas</option>
                      <option value="cashier">Caixa</option>
                    </select>
                  </label>
                  <label className="field">
                    Tempo medio
                    <input
                      type="number"
                      value={editingProduct.preparationMinutes}
                      onChange={(event) => updateEditingProduct({ preparationMinutes: Number(event.target.value) })}
                    />
                  </label>
                  <label className="field">
                    Imagem
                    <input value={editingProduct.imageUrl} onChange={(event) => updateEditingProduct({ imageUrl: event.target.value })} />
                  </label>
                </div>
                <label className="field">
                  Descricao
                  <textarea
                    value={editingProduct.description}
                    onChange={(event) => updateEditingProduct({ description: event.target.value })}
                  />
                </label>
                <div className="switch-grid">
                  {[
                    ["active", "Produto ativo"],
                    ["featured", "Produto em destaque"],
                    ["temporarilyUnavailable", "Indisponivel temporariamente"],
                    ["allowNotes", "Permitir observacoes"]
                  ].map(([key, label]) => (
                    <label key={key} className="toggle-row">
                      <input
                        type="checkbox"
                        checked={Boolean(editingProduct[key as keyof Product])}
                        onChange={(event) => updateEditingProduct({ [key]: event.target.checked } as Partial<Product>)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>

                <div className="nested-editor">
                  <div className="nested-heading">
                    <strong>Ingredientes removiveis</strong>
                    <button
                      className="ghost-button"
                      onClick={() =>
                        updateEditingProduct({
                          ingredients: [
                            ...editingProduct.ingredients,
                            {
                              id: `ing_${crypto.randomUUID()}`,
                              tenantId: editingProduct.tenantId,
                              name: "Novo ingrediente",
                              removable: true
                            }
                          ]
                        })
                      }
                    >
                      <Plus size={15} />
                      Ingrediente
                    </button>
                  </div>
                  {editingProduct.ingredients.map((ingredient) => (
                    <div key={ingredient.id} className="nested-row">
                      <input value={ingredient.name} onChange={(event) => updateIngredient(ingredient.id, { name: event.target.value })} />
                      <label className="mini-check">
                        <input
                          type="checkbox"
                          checked={ingredient.removable}
                          onChange={(event) => updateIngredient(ingredient.id, { removable: event.target.checked })}
                        />
                        Removivel
                      </label>
                      <button
                        className="icon-button"
                        onClick={() =>
                          updateEditingProduct({
                            ingredients: editingProduct.ingredients.filter((item) => item.id !== ingredient.id)
                          })
                        }
                        title="Remover ingrediente"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="nested-editor">
                  <div className="nested-heading">
                    <strong>Adicionais pagos</strong>
                    <button
                      className="ghost-button"
                      onClick={() =>
                        updateEditingProduct({
                          addons: [
                            ...editingProduct.addons,
                            {
                              id: `add_${crypto.randomUUID()}`,
                              tenantId: editingProduct.tenantId,
                              name: "Novo adicional",
                              price: 0,
                              sector: editingProduct.sector,
                              active: true
                            }
                          ]
                        })
                      }
                    >
                      <Plus size={15} />
                      Adicional
                    </button>
                  </div>
                  {editingProduct.addons.map((addon) => (
                    <div key={addon.id} className="nested-row addon-row">
                      <input value={addon.name} onChange={(event) => updateAddon(addon.id, { name: event.target.value })} />
                      <input
                        type="number"
                        step="0.01"
                        value={addon.price}
                        onChange={(event) => updateAddon(addon.id, { price: Number(event.target.value) })}
                      />
                      <select value={addon.sector} onChange={(event) => updateAddon(addon.id, { sector: event.target.value as Product["sector"] })}>
                        <option value="kitchen">Cozinha</option>
                        <option value="bar">Bar</option>
                        <option value="dessert">Sobremesa</option>
                      </select>
                      <button
                        className="icon-button"
                        onClick={() => updateEditingProduct({ addons: editingProduct.addons.filter((item) => item.id !== addon.id) })}
                        title="Remover adicional"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="nested-editor">
                  <div className="nested-heading">
                    <strong>Opcoes obrigatorias/opcionais</strong>
                    <button
                      className="ghost-button"
                      onClick={() =>
                        updateEditingProduct({
                          options: [
                            ...editingProduct.options,
                            {
                              id: `opt_${crypto.randomUUID()}`,
                              name: "Nova opcao",
                              required: false,
                              minChoices: 0,
                              maxChoices: 1,
                              values: [{ id: `optv_${crypto.randomUUID()}`, name: "Opcao", priceDelta: 0 }]
                            }
                          ]
                        })
                      }
                    >
                      <Plus size={15} />
                      Opcao
                    </button>
                  </div>
                  {editingProduct.options.map((option) => (
                    <div key={option.id} className="option-editor">
                      <div className="nested-row option-row">
                        <input value={option.name} onChange={(event) => updateOption(option.id, { name: event.target.value })} />
                        <label className="mini-check">
                          <input
                            type="checkbox"
                            checked={option.required}
                            onChange={(event) => updateOption(option.id, { required: event.target.checked })}
                          />
                          Obrigatoria
                        </label>
                        <input
                          type="number"
                          value={option.maxChoices}
                          onChange={(event) => updateOption(option.id, { maxChoices: Number(event.target.value) })}
                        />
                        <button
                          className="icon-button"
                          onClick={() => updateEditingProduct({ options: editingProduct.options.filter((item) => item.id !== option.id) })}
                          title="Remover opcao"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      {option.values.map((value) => (
                        <div key={value.id} className="nested-row option-value-row">
                          <input value={value.name} onChange={(event) => updateOptionValue(option.id, value.id, { name: event.target.value })} />
                          <input
                            type="number"
                            step="0.01"
                            value={value.priceDelta}
                            onChange={(event) => updateOptionValue(option.id, value.id, { priceDelta: Number(event.target.value) })}
                          />
                          <button
                            className="icon-button"
                            onClick={() =>
                              updateOption(option.id, { values: option.values.filter((item) => item.id !== value.id) })
                            }
                            title="Remover valor"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                      <button
                        className="ghost-button compact-action"
                        onClick={() =>
                          updateOption(option.id, {
                            values: [
                              ...option.values,
                              { id: `optv_${crypto.randomUUID()}`, name: "Novo valor", priceDelta: 0 }
                            ]
                          })
                        }
                      >
                        <Plus size={15} />
                        Valor da opcao
                      </button>
                    </div>
                  ))}
                </div>

                <button className="danger-button" onClick={deleteEditedProduct}>
                  <Trash2 size={17} />
                  Excluir produto
                </button>
              </>
            )}
          </div>
        </>
      )}

      {activeSection === "comandas" && (
        <>
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">QRs individuais</p>
                <h3>Lote de comandas fisicas</h3>
              </div>
              <button className="primary-button" onClick={createQrBatch}>
                <Plus size={17} />
                Gerar lote
              </button>
            </div>
            <label className="field">
              Quantidade
              <input value={qrBatchQuantity} type="number" onChange={(event) => setQrBatchQuantity(event.target.value)} />
            </label>
            <p className="helper-text">
              Esses codigos sao reutilizaveis, impressos em cartao ou plaquinha, e cada pessoa usa um QR proprio.
            </p>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Ativar comanda</p>
                <h3>Vincular pessoa a mesa</h3>
              </div>
              <button className="checkout-button" onClick={activateCustomerQr}>
                <CheckCircle2 size={17} />
                Ativar
              </button>
            </div>
            <label className="field">
              Comanda
              <select value={customerQrCode} onChange={(event) => setCustomerQrCode(event.target.value)}>
                {props.customerQrs.map((qr) => (
                  <option key={qr.id} value={qr.code}>
                    {qr.label} · {qr.code} · {qr.status === "in_use" ? tableNameFor(qr.currentTableId) : "livre"}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Mesa
              <select value={activationTableId} onChange={(event) => setActivationTableId(event.target.value)}>
                {props.tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name} · {table.code}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="panel qr-management-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Impressao do QR individual</p>
                <h3>Pre-visualizar codigo</h3>
              </div>
              <button className="ghost-button" onClick={previewCustomerQr}>
                <QrCode size={17} />
                Ver QR
              </button>
            </div>
            <label className="field">
              Codigo manual
              <input value={customerQrCode} onChange={(event) => setCustomerQrCode(event.target.value.toUpperCase())} />
            </label>
            {customerQrImage ? (
              <img className="qr-preview" src={customerQrImage} alt="QR Code individual da comanda" />
            ) : (
              <div className="qr-placeholder">PAX</div>
            )}
          </div>

          <div className="panel check-list-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Gerenciamento de comandas</p>
                <h3>Disponiveis e ativas</h3>
              </div>
              <span className="live-pill">{props.customerQrs.length} codigos</span>
            </div>
            <div className="admin-list qr-admin-list">
              {props.customerQrs.map((qr) => (
                <button
                  key={qr.id}
                  className={`qr-admin-row ${qr.status}`}
                  onClick={() => {
                    setCustomerQrCode(qr.code);
                    if (qr.currentTableId) setActivationTableId(qr.currentTableId);
                  }}
                >
                  <span>
                    <strong>{qr.label}</strong>
                    <small>{qr.code}</small>
                  </span>
                  <span>{qr.status === "in_use" ? tableNameFor(qr.currentTableId) : "Livre"}</span>
                  <b>{qr.status === "in_use" ? "Ativa" : qr.status === "inactive" ? "Inativa" : "Disponivel"}</b>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {activeSection === "tickets" && (
        <>
          <div className="panel hero-panel">
            <div>
              <p className="eyebrow">Tickets de caixa</p>
              <h2>Comprovantes registrados no fechamento</h2>
            </div>
            <div className="metric-grid">
              <Metric title="Tickets" value={String(props.tickets.length)} icon={ReceiptText} />
              <Metric
                title="Total emitido"
                value={formatCurrencyBRL(props.tickets.reduce((sum, ticket) => sum + ticket.total, 0))}
                icon={CircleDollarSign}
              />
              <Metric
                title="Itens"
                value={String(props.tickets.reduce((sum, ticket) => sum + ticket.itemCount, 0))}
                icon={ShoppingBag}
              />
              <Metric
                title="Descontos"
                value={formatCurrencyBRL(props.tickets.reduce((sum, ticket) => sum + ticket.discount, 0))}
                icon={CreditCard}
              />
            </div>
          </div>

          <div className="panel tickets-admin-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Historico</p>
                <h3>Tickets emitidos</h3>
              </div>
              <span className="live-pill">{props.tickets.length} registros</span>
            </div>
            <div className="admin-list ticket-admin-list">
              {props.tickets.length === 0 && <p className="empty-state">Nenhum ticket registrado ainda.</p>}
              {props.tickets.map((ticket) => (
                <div key={ticket.id} className="admin-row ticket-admin-row">
                  <div className="icon-tile">
                    <ReceiptText size={18} />
                  </div>
                  <div>
                    <strong>{ticket.number}</strong>
                    <small>
                      {ticket.tableName} · {ticket.customerName} · {ticket.checkCode}
                    </small>
                  </div>
                  <div className="ticket-admin-amount">
                    <strong>{formatCurrencyBRL(ticket.total)}</strong>
                    <small>{new Date(ticket.issuedAt).toLocaleString("pt-BR")}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeSection === "configuracoes" && (
        <>
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Tema e marca</p>
                <h3>Identidade do restaurante</h3>
              </div>
              <button className="primary-button" onClick={saveTheme}>
                <Settings2 size={17} />
                Salvar
              </button>
            </div>
            <label className="field">
              Nome
              <input
                value={props.restaurant.name}
                onChange={(event) => props.setRestaurant({ ...props.restaurant, name: event.target.value })}
              />
            </label>
            <div className="split-fields">
              <label className="field">
                Cor principal
                <input
                  type="color"
                  value={props.restaurant.theme.primaryColor}
                  onChange={(event) =>
                    props.setRestaurant({
                      ...props.restaurant,
                      theme: { ...props.restaurant.theme, primaryColor: event.target.value }
                    })
                  }
                />
              </label>
              <label className="field">
                Cor de apoio
                <input
                  type="color"
                  value={props.restaurant.theme.accentColor}
                  onChange={(event) =>
                    props.setRestaurant({
                      ...props.restaurant,
                      theme: { ...props.restaurant.theme, accentColor: event.target.value }
                    })
                  }
                />
              </label>
            </div>
            <label className="field">
              Taxa de servico (%)
              <input
                type="number"
                value={props.restaurant.serviceFeePercent}
                onChange={(event) =>
                  props.setRestaurant({ ...props.restaurant, serviceFeePercent: Number(event.target.value) })
                }
              />
            </label>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Tablet da mesa</p>
                <h3>Configuracao protegida</h3>
              </div>
              <button className="primary-button" onClick={saveTabletSettings}>
                <Save size={17} />
                Salvar
              </button>
            </div>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={props.restaurant.waiterCallEnabled}
                onChange={(event) =>
                  props.setRestaurant({ ...props.restaurant, waiterCallEnabled: event.target.checked })
                }
              />
              <span>Permitir botao Chamar garçom no cardapio</span>
              <strong>{props.restaurant.waiterCallEnabled ? "Ativo" : "Oculto"}</strong>
            </label>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={props.restaurant.manualCheckCodeEnabled}
                onChange={(event) =>
                  props.setRestaurant({ ...props.restaurant, manualCheckCodeEnabled: event.target.checked })
                }
              />
              <span>Permitir digitar codigo da comanda</span>
              <strong>{props.restaurant.manualCheckCodeEnabled ? "Ativo" : "Somente QR"}</strong>
            </label>
            <label className="field">
              Nova senha da engrenagem
              <input
                type="password"
                value={tabletPasswordDraft}
                onChange={(event) => setTabletPasswordDraft(event.target.value)}
                placeholder="Padrao atual: 1234"
              />
            </label>
            <p className="helper-text">Essa senha libera a configuracao local do tablet no cardapio da mesa.</p>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Mesas e QR Code</p>
                <h3>Dispositivos por mesa</h3>
              </div>
              <button className="ghost-button" onClick={generateQr}>
                <QrCode size={17} />
                Gerar
              </button>
            </div>
            <select value={qrTableId} onChange={(event) => setQrTableId(event.target.value)}>
              {props.tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name} · {table.code}
                </option>
              ))}
            </select>
            {qrCode ? <img className="qr-preview" src={qrCode} alt="QR Code da mesa" /> : <div className="qr-placeholder">QR</div>}
            <div className="table-grid">
              {props.tables.slice(0, 8).map((table) => (
                <span key={table.id} className={`table-chip ${table.status}`}>
                  {table.name}
                </span>
              ))}
            </div>
          </div>

          <div className="panel printer-config-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Configuracoes de impressao</p>
                <h3>Impressoras padrao por setor</h3>
              </div>
              <button className="ghost-button" onClick={discoverDesktopPrinters}>
                <Printer size={17} />
                {printerDiscoveryLoading ? "Buscando..." : "Buscar no PC"}
              </button>
            </div>
            {desktopPrinters.length > 0 && (
              <div className="desktop-printer-list">
                {desktopPrinters.map((printer) => (
                  <span key={printer.name} className={printer.isDefault ? "default" : ""}>
                    {printer.displayName}
                    {printer.isDefault ? " · padrao" : ""}
                  </span>
                ))}
              </div>
            )}
            <div className="admin-list">
              {props.printers.map((printer) => (
                <div key={printer.id} className="printer-row">
                  <div className="icon-tile">
                    <Printer size={18} />
                  </div>
                  <label className="field">
                    Nome
                    {desktopPrinters.length > 0 ? (
                      <select
                        value={printer.target === "default" ? "" : printer.target}
                        onChange={async (event) => {
                          const selected = desktopPrinters.find((item) => item.name === event.target.value);
                          const updated = await api.updatePrinter(printer.id, {
                            name: selected?.displayName || printer.name,
                            target: selected?.name || "default"
                          });
                          props.setPrinters(props.printers.map((item) => (item.id === updated.id ? updated : item)));
                        }}
                      >
                        <option value="">Padrao do Windows</option>
                        {desktopPrinters.map((item) => (
                          <option key={item.name} value={item.name}>
                            {item.displayName}
                            {item.isDefault ? " · padrao" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                      value={printer.name}
                      onChange={async (event) => {
                        const updated = await api.updatePrinter(printer.id, { name: event.target.value });
                        props.setPrinters(props.printers.map((item) => (item.id === updated.id ? updated : item)));
                      }}
                      />
                    )}
                  </label>
                  <label className="field">
                    Setor
                    <select
                      value={printer.sector}
                      onChange={async (event) => {
                        const updated = await api.updatePrinter(printer.id, { sector: event.target.value as Product["sector"] });
                        props.setPrinters(props.printers.map((item) => (item.id === updated.id ? updated : item)));
                      }}
                    >
                      <option value="kitchen">Cozinha</option>
                      <option value="bar">Bar</option>
                      <option value="dessert">Sobremesas</option>
                      <option value="cashier">Caixa</option>
                    </select>
                  </label>
                  <label className="field">
                    Bobina
                    <select
                      value={printer.paperWidthMm}
                      onChange={async (event) => {
                        const updated = await api.updatePrinter(printer.id, { paperWidthMm: Number(event.target.value) as 58 | 80 });
                        props.setPrinters(props.printers.map((item) => (item.id === updated.id ? updated : item)));
                      }}
                    >
                      <option value={80}>80mm</option>
                      <option value={58}>58mm</option>
                    </select>
                  </label>
                  <button
                    className={printer.autoPrint ? "primary-button" : "ghost-button"}
                    onClick={async () => {
                      try {
                        const updated = await api.updatePrinter(printer.id, { autoPrint: !printer.autoPrint });
                        props.setPrinters(props.printers.map((item) => (item.id === updated.id ? updated : item)));
                        props.onToast(updated.autoPrint ? "Impressao automatica ativada" : "Impressao automatica pausada");
                      } catch (err) {
                        props.onToast(err instanceof Error ? err.message : "Nao foi possivel atualizar a impressora");
                      }
                    }}
                  >
                    Auto
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof LayoutDashboard }) {
  return (
    <div className="metric-card">
      <Icon size={19} />
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CustomerMenu(props: {
  restaurant: RestaurantSettings;
  categories: Category[];
  products: Product[];
  tables: Table[];
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  onOrder: (order: Order) => void;
  onRestaurantUpdate: (restaurant: RestaurantSettings) => void;
  onServiceCall: (tableId: string) => Promise<void>;
  navigate: (href: string) => void;
  onConfigOpen?: () => void;
}) {
  const tableCodeFromUrl = new URLSearchParams(window.location.search).get("table");
  const initialTableId =
    props.tables.find((table) => table.code === tableCodeFromUrl || table.id === tableCodeFromUrl)?.id ||
    props.tables[0]?.id ||
    "";
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedTableId, setSelectedTableId] = useState(initialTableId);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerQrCode, setCustomerQrCode] = useState("");
  const [resolvedCheck, setResolvedCheck] = useState<ResolvedCustomerCheck | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [scanMode, setScanMode] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [scannerReady, setScannerReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [serviceCallConfirmOpen, setServiceCallConfirmOpen] = useState(false);
  const [serviceCallSending, setServiceCallSending] = useState(false);
  const [tabletSettingsOpen, setTabletSettingsOpen] = useState(false);
  const [tabletSettingsUnlocked, setTabletSettingsUnlocked] = useState(false);
  const [tabletSettingsPassword, setTabletSettingsPassword] = useState("");
  const [tabletSettingsError, setTabletSettingsError] = useState("");
  const [tabletSettingsSaving, setTabletSettingsSaving] = useState(false);
  const [tabletWaiterCallEnabled, setTabletWaiterCallEnabled] = useState(props.restaurant.waiterCallEnabled);
  const [tabletManualCheckCodeEnabled, setTabletManualCheckCodeEnabled] = useState(
    props.restaurant.manualCheckCodeEnabled
  );
  const scannerVideoRef = useRef<HTMLVideoElement | null>(null);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return props.products.filter((product) => {
      if (selectedCategory !== "all" && product.categoryId !== selectedCategory) return false;
      if (term && !`${product.name} ${product.description}`.toLowerCase().includes(term)) return false;
      return product.active && !product.temporarilyUnavailable;
    });
  }, [props.products, search, selectedCategory]);

  const cartTotal = props.cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartQuantity = props.cart.reduce((sum, item) => sum + item.quantity, 0);
  const currentTable = props.tables.find((table) => table.id === selectedTableId);
  const logoUrl = themedLogoUrl(props.restaurant);

  const confirmServiceCall = async () => {
    if (!selectedTableId) return;
    setServiceCallSending(true);
    try {
      await props.onServiceCall(selectedTableId);
      setServiceCallConfirmOpen(false);
    } finally {
      setServiceCallSending(false);
    }
  };

  const openTabletSettings = () => {
    setTabletSettingsOpen(true);
    setTabletSettingsUnlocked(false);
    setTabletSettingsPassword("");
    setTabletSettingsError("");
    setTabletWaiterCallEnabled(props.restaurant.waiterCallEnabled);
    setTabletManualCheckCodeEnabled(props.restaurant.manualCheckCodeEnabled);
  };

  const unlockTabletSettings = async () => {
    setTabletSettingsError("");
    try {
      await api.verifyTabletSettingsPassword(tabletSettingsPassword);
      setTabletSettingsUnlocked(true);
    } catch (err) {
      setTabletSettingsError(err instanceof Error ? err.message : "Senha invalida");
    }
  };

  const saveTabletSettingsFromMenu = async () => {
    setTabletSettingsError("");
    setTabletSettingsSaving(true);
    try {
      const updated = await api.updatePublicTabletSettings({
        password: tabletSettingsPassword,
        waiterCallEnabled: tabletWaiterCallEnabled,
        manualCheckCodeEnabled: tabletManualCheckCodeEnabled
      });
      props.onRestaurantUpdate(updated);
      setTabletSettingsOpen(false);
    } catch (err) {
      setTabletSettingsError(err instanceof Error ? err.message : "Nao foi possivel salvar");
    } finally {
      setTabletSettingsSaving(false);
    }
  };

  const changeTabletTable = (tableId: string) => {
    setSelectedTableId(tableId);
    const table = props.tables.find((item) => item.id === tableId);
    if (table) {
      window.history.replaceState({}, "", `/cardapio?table=${encodeURIComponent(table.code)}`);
    }
  };

  const sendOrder = async (qrCodeOverride?: string) => {
    if (!props.cart.length || !selectedTableId) return;
    setCheckoutError("");
    const normalizedQrCode = extractCustomerQrCode(qrCodeOverride || customerQrCode);
    if (!normalizedQrCode) {
      setCheckoutError("Escaneie ou digite o QR da comanda individual.");
      return;
    }
    setSending(true);
    try {
      const check = await api.resolveCustomerCheck({
        tableId: selectedTableId,
        customerQrCode: normalizedQrCode
      });
      setResolvedCheck(check);
      const order = await api.createOrder({
        tableId: selectedTableId,
        customerName: check.customerName,
        customerQrCode: check.customerQrCode,
        items: props.cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          customization: {
            removedIngredientIds: item.removedIngredientIds,
            addonIds: item.addonIds,
            optionValueIds: item.optionValueIds,
            notes: item.notes
          }
        }))
      });
      props.setCart([]);
      setCheckoutOpen(false);
      setCustomerQrCode("");
      setResolvedCheck(null);
      props.onOrder(order);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Nao foi possivel finalizar o pedido");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!checkoutOpen || !scanMode) return;

    let stopped = false;
    let scanTimer = 0;
    let stream: MediaStream | null = null;

    async function startScanner() {
      setScannerError("");
      setScannerReady(false);
      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerError(
          props.restaurant.manualCheckCodeEnabled
            ? "Camera indisponivel neste navegador. Digite o codigo da comanda."
            : "Camera indisponivel neste navegador. Solicite a leitura do QR da comanda."
        );
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!scannerVideoRef.current || stopped) return;
        scannerVideoRef.current.srcObject = stream;
        await scannerVideoRef.current.play();
        setScannerReady(true);

        type BarcodeDetectorResult = { rawValue: string };
        type BarcodeDetectorInstance = {
          detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>;
        };
        const DetectorCtor = (window as unknown as {
          BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorInstance;
        }).BarcodeDetector;

        if (!DetectorCtor) {
          setScannerError(
            props.restaurant.manualCheckCodeEnabled
              ? "Camera aberta. Leitura automatica indisponivel aqui, use o campo manual."
              : "Camera aberta. Leitura automatica indisponivel neste navegador."
          );
          return;
        }

        const detector = new DetectorCtor({ formats: ["qr_code"] });
        scanTimer = window.setInterval(async () => {
          if (stopped || !scannerVideoRef.current || sending) return;
          try {
            const [result] = await detector.detect(scannerVideoRef.current);
            if (!result?.rawValue) return;
            const code = extractCustomerQrCode(result.rawValue);
            if (!code) return;
            stopped = true;
            setCustomerQrCode(code);
            setScanMode(false);
            await sendOrder(code);
          } catch {
            undefined;
          }
        }, 550);
      } catch {
        setScannerError(
          props.restaurant.manualCheckCodeEnabled
            ? "Nao foi possivel acessar a camera. Digite o codigo da comanda."
            : "Nao foi possivel acessar a camera. Permita o uso da camera para ler o QR."
        );
      }
    }

    startScanner();

    return () => {
      stopped = true;
      window.clearInterval(scanTimer);
      stream?.getTracks().forEach((track) => track.stop());
      if (scannerVideoRef.current) scannerVideoRef.current.srcObject = null;
      setScannerReady(false);
    };
  }, [checkoutOpen, scanMode, selectedTableId, props.cart, sending, props.restaurant.manualCheckCodeEnabled]);

  useEffect(() => {
    if (checkoutOpen && !props.restaurant.manualCheckCodeEnabled) {
      setScanMode(true);
      setCustomerQrCode("");
      setCheckoutError("");
    }
  }, [checkoutOpen, props.restaurant.manualCheckCodeEnabled]);

  return (
    <section className="client-page">
      <header className="client-header">
        <button className="client-brand" onClick={() => props.navigate("/cardapio?table=M01")}>
          {logoUrl ? <img src={logoUrl} alt="" /> : <Utensils size={20} />}
          <span>{props.restaurant.name}</span>
        </button>
        <div className="client-header-actions">
          <span className="live-pill">Mesa {currentTable?.code || "QR"}</span>
          {props.restaurant.waiterCallEnabled && (
            <button className="ghost-button" onClick={() => setServiceCallConfirmOpen(true)}>
              <Bell size={17} />
              Chamar garçom
            </button>
          )}
          <button
            className="ghost-button"
            onClick={() => setCheckoutOpen(true)}
          >
            <ShoppingBag size={17} />
            Comanda
          </button>
          <button className="icon-button client-settings-button" onClick={openTabletSettings} title="Configuracoes do tablet">
            <Settings2 size={18} />
          </button>
        </div>
      </header>

      <div className="client-layout">
        <aside className="category-sidebar">
          <p className="eyebrow">Categorias</p>
          <button className={selectedCategory === "all" ? "active" : ""} onClick={() => setSelectedCategory("all")}>
            <span className="category-icon">
              <FontAwesomeIcon icon={faUtensils} />
            </span>
            <span>Todos</span>
          </button>
          {props.categories.map((category) => (
            <button
              key={category.id}
              className={selectedCategory === category.id ? "active" : ""}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="category-icon">
                <FontAwesomeIcon icon={categoryIcon(category.icon, category.name)} />
              </span>
              <span>{category.name}</span>
            </button>
          ))}
          {logoUrl && (
            <div className="category-sidebar-logo">
              <img src={logoUrl} alt="" />
            </div>
          )}
        </aside>

      <div className="menu-content">
        <div className="cover" style={{ backgroundImage: `url(${props.restaurant.coverUrl})` }}>
          <div>
            <p className="eyebrow">Mesa {currentTable?.code || "QR"}</p>
            <h2>{props.restaurant.name}</h2>
            <p>Cardapio interativo, pedido direto na cozinha e comanda acumulada por cliente.</p>
          </div>
        </div>

        <div className="client-toolbar">
          <div className="search-box">
            <Search size={18} />
            <input placeholder="Buscar produto" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="table-lock">
            <QrCode size={16} />
            {currentTable?.name || "Mesa vinculada"}
          </div>
        </div>

        <div className="featured-row">
          {props.products
            .filter((product) => product.featured)
            .slice(0, 3)
            .map((product) => (
              <button key={product.id} className="featured-card" onClick={() => setSelectedProduct(product)}>
                <img src={product.imageUrl} alt="" />
                <span>{product.name}</span>
                <strong>{formatCurrencyBRL(product.price)}</strong>
              </button>
            ))}
        </div>

        <div className="product-grid">
          {filteredProducts.map((product) => (
            <article key={product.id} className="product-card">
              <img src={product.imageUrl} alt="" />
              <div>
                <span className="prep-time">
                  <Clock3 size={14} />
                  {product.preparationMinutes} min
                </span>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <div className="product-card-footer">
                  <strong>{formatCurrencyBRL(product.price)}</strong>
                  <button className="primary-button" onClick={() => setSelectedProduct(product)}>
                    <Plus size={17} />
                    Adicionar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {selectedProduct && (
        <ProductDialog
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={(item) => {
            props.setCart([...props.cart, item]);
            setSelectedProduct(null);
          }}
        />
      )}
      </div>

      {props.cart.length > 0 && (
        <button className="floating-checkout" onClick={() => setCheckoutOpen(true)}>
          <span>{cartQuantity} {cartQuantity === 1 ? "item" : "itens"}</span>
          <strong>Finalizar pedido</strong>
          <b>{formatCurrencyBRL(cartTotal)}</b>
        </button>
      )}

      {serviceCallConfirmOpen && (
        <div className="service-confirm-backdrop">
          <section className="service-confirm-dialog" role="dialog" aria-modal="true" aria-label="Confirmar chamado do garçom">
            <button className="dialog-close" onClick={() => setServiceCallConfirmOpen(false)} title="Fechar">
              <X size={18} />
            </button>
            <div className="service-confirm-icon">
              <Bell size={26} />
            </div>
            <p className="eyebrow">Atendimento</p>
            <h3>Chamar garçom?</h3>
            <p>
              Enviaremos um chamado para {currentTable?.name || "esta mesa"} aparecer em destaque na tela do garçom e da cozinha.
            </p>
            <div className="service-confirm-actions">
              <button className="ghost-button" onClick={() => setServiceCallConfirmOpen(false)}>
                Cancelar
              </button>
              <button className="checkout-button" disabled={serviceCallSending} onClick={confirmServiceCall}>
                <Bell size={17} />
                {serviceCallSending ? "Chamando..." : "Confirmar chamado"}
              </button>
            </div>
          </section>
        </div>
      )}

      {tabletSettingsOpen && (
        <div className="service-confirm-backdrop">
          <section className="service-confirm-dialog tablet-settings-dialog" role="dialog" aria-modal="true" aria-label="Configuracoes do tablet">
            <button className="dialog-close" onClick={() => setTabletSettingsOpen(false)} title="Fechar">
              <X size={18} />
            </button>
            <div className="service-confirm-icon">
              <Settings2 size={26} />
            </div>
            <p className="eyebrow">Configuracoes</p>
            <h3>Tablet da mesa</h3>

            {!tabletSettingsUnlocked ? (
              <>
                <p>Digite a senha de configuracao para alterar a mesa e os atalhos do cardapio.</p>
                <label className="field full">
                  Senha
                  <input
                    type="password"
                    inputMode="numeric"
                    value={tabletSettingsPassword}
                    onChange={(event) => {
                      setTabletSettingsPassword(event.target.value);
                      setTabletSettingsError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") unlockTabletSettings();
                    }}
                    placeholder="1234"
                  />
                </label>
                {tabletSettingsError && <p className="inline-error">{tabletSettingsError}</p>}
                <div className="service-confirm-actions single-action">
                  <button className="checkout-button" onClick={unlockTabletSettings}>
                    Liberar
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="field full">
                  Mesa vinculada
                  <select value={selectedTableId} onChange={(event) => changeTabletTable(event.target.value)}>
                    {props.tables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.name} · {table.code}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="toggle-row tablet-toggle-row">
                  <input
                    type="checkbox"
                    checked={tabletWaiterCallEnabled}
                    onChange={(event) => setTabletWaiterCallEnabled(event.target.checked)}
                  />
                  <span>Exibir Chamar garçom</span>
                  <strong>{tabletWaiterCallEnabled ? "Ativo" : "Oculto"}</strong>
                </label>
                <label className="toggle-row tablet-toggle-row">
                  <input
                    type="checkbox"
                    checked={tabletManualCheckCodeEnabled}
                    onChange={(event) => setTabletManualCheckCodeEnabled(event.target.checked)}
                  />
                  <span>Permitir codigo manual da comanda</span>
                  <strong>{tabletManualCheckCodeEnabled ? "Ativo" : "Somente QR"}</strong>
                </label>
                {window.tavonDesktop?.isDesktop && props.onConfigOpen && (
                  <button
                    className="ghost-button full"
                    onClick={() => { setTabletSettingsOpen(false); props.onConfigOpen!(); }}
                  >
                    <Settings2 size={15} />
                    Configurar servidor
                  </button>
                )}
                {tabletSettingsError && <p className="inline-error">{tabletSettingsError}</p>}
                <div className="service-confirm-actions">
                  <button className="ghost-button" onClick={() => setTabletSettingsOpen(false)}>
                    Cancelar
                  </button>
                  <button className="checkout-button" disabled={tabletSettingsSaving} onClick={saveTabletSettingsFromMenu}>
                    {tabletSettingsSaving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {checkoutOpen && (
        <div className="checkout-backdrop">
          <section className="checkout-sheet">
            <div className="sheet-grabber" />
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Finalizar pedido</p>
                <h3>{currentTable?.name || "Mesa vinculada"}</h3>
              </div>
              <button className="icon-button" onClick={() => setCheckoutOpen(false)} title="Fechar">
                <X size={18} />
              </button>
            </div>

            <div className="checkout-grid">
              <div>
                <div className="cart-list sheet-cart-list">
                  {props.cart.length === 0 && <p className="empty-state">Nenhum item selecionado.</p>}
                  {props.cart.map((item) => (
                    <div key={item.cartId} className="cart-item">
                      <div>
                        <strong>{item.quantity}x {item.product.name}</strong>
                        <small>{formatCurrencyBRL(item.unitPrice)} un.</small>
                      </div>
                      <span>{formatCurrencyBRL(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="cart-total">
                  <span>Total parcial</span>
                  <strong>{formatCurrencyBRL(cartTotal)}</strong>
                </div>
              </div>

              <div className="customer-qr-panel">
                <div className={scanMode ? "scanner-frame active" : "scanner-frame"}>
                  {scanMode ? (
                    <>
                      <video ref={scannerVideoRef} className="scanner-video" muted playsInline />
                      <div className="scanner-reticle" />
                      <span>{scannerReady ? "Aponte para o QR da pessoa" : "Abrindo camera..."}</span>
                    </>
                  ) : (
                    <>
                      <QrCode size={32} />
                      <span>QR da comanda individual</span>
                    </>
                  )}
                </div>
                {scannerError && <p className="inline-error">{scannerError}</p>}
                <div className="segmented">
                  <button className={scanMode ? "active" : ""} onClick={() => setScanMode(true)}>
                    Escanear QR
                  </button>
                  {props.restaurant.manualCheckCodeEnabled && (
                    <button className={!scanMode ? "active" : ""} onClick={() => setScanMode(false)}>
                      Digitar codigo
                    </button>
                  )}
                </div>
                {props.restaurant.manualCheckCodeEnabled ? (
                  <label className="field">
                    Codigo da comanda
                    <input
                      value={customerQrCode}
                      onChange={(event) => {
                        setCustomerQrCode(event.target.value.toUpperCase());
                        setResolvedCheck(null);
                        setCheckoutError("");
                      }}
                      placeholder="PAX-8F3KQ2"
                    />
                  </label>
                ) : (
                  <p className="helper-text qr-only-note">
                    Entrada manual desabilitada. O pedido sera enviado somente apos ler um QR valido da comanda.
                  </p>
                )}
                {resolvedCheck && (
                  <div className="resolved-check">
                    <CheckCircle2 size={16} />
                    {resolvedCheck.customerName} · {resolvedCheck.checkCode}
                  </div>
                )}
                {checkoutError && <p className="inline-error">{checkoutError}</p>}
                <button className="checkout-button full" disabled={!props.cart.length || sending} onClick={() => sendOrder()}>
                  <ReceiptText size={18} />
                  {sending ? "Enviando..." : "Enviar para cozinha"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function WaiterOrderPanel(props: {
  restaurant: RestaurantSettings;
  categories: Category[];
  products: Product[];
  tables: Table[];
  customerQrs: CustomerQr[];
  serviceCalls: ServiceCall[];
  onOrder: (order: Order) => void;
  onResolveServiceCall: (callId: string) => Promise<void>;
  onToast: (message: string) => void;
  onReload: () => Promise<void>;
  onConfigOpen?: () => void;
}) {
  const [selectedTableId, setSelectedTableId] = useState(props.tables[0]?.id || "");
  const [selectedQrCode, setSelectedQrCode] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [resolvedCheck, setResolvedCheck] = useState<ResolvedCustomerCheck | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const currentTable = props.tables.find((table) => table.id === selectedTableId);
  const activeChecks = props.customerQrs.filter((qr) => qr.status === "in_use" && qr.currentCheckCode);
  const openServiceCalls = props.serviceCalls.filter((call) => call.status === "open");
  const assignableQrs = props.customerQrs.filter(
    (qr) => qr.status !== "inactive" && (qr.status !== "in_use" || qr.currentTableId === selectedTableId)
  );
  const selectedQr = props.customerQrs.find((qr) => qr.code === selectedQrCode);
  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return props.products.filter((product) => {
      if (selectedCategory !== "all" && product.categoryId !== selectedCategory) return false;
      if (term && !`${product.name} ${product.description}`.toLowerCase().includes(term)) return false;
      return product.active && !product.temporarilyUnavailable;
    });
  }, [props.products, search, selectedCategory]);

  useEffect(() => {
    if (!selectedTableId && props.tables[0]) setSelectedTableId(props.tables[0].id);
  }, [props.tables, selectedTableId]);

  useEffect(() => {
    if (!assignableQrs.some((qr) => qr.code === selectedQrCode)) {
      setSelectedQrCode(assignableQrs[0]?.code || "");
      setResolvedCheck(null);
    }
  }, [assignableQrs, selectedQrCode]);

  const tableNameFor = (tableId?: string) => props.tables.find((table) => table.id === tableId)?.name || "Mesa";

  const activateCheck = async () => {
    if (!selectedTableId || !selectedQrCode) {
      setError("Selecione mesa e comanda.");
      return null;
    }
    setError("");
    try {
      const check = await api.resolveCustomerCheck({
        tableId: selectedTableId,
        customerQrCode: selectedQrCode
      });
      setResolvedCheck(check);
      await props.onReload();
      props.onToast(`${check.checkCode} ativa em ${check.tableName}`);
      return check;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nao foi possivel ativar a comanda";
      setError(message);
      props.onToast(message);
      return null;
    }
  };

  const sendOrder = async () => {
    if (!cart.length) {
      setError("Adicione pelo menos um item.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const check =
        resolvedCheck?.tableId === selectedTableId && resolvedCheck.customerQrCode === selectedQrCode
          ? resolvedCheck
          : await api.resolveCustomerCheck({ tableId: selectedTableId, customerQrCode: selectedQrCode });
      setResolvedCheck(check);
      const order = await api.createOrder({
        tableId: selectedTableId,
        customerName: check.customerName,
        customerQrCode: check.customerQrCode,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          customization: {
            removedIngredientIds: item.removedIngredientIds,
            addonIds: item.addonIds,
            optionValueIds: item.optionValueIds,
            notes: item.notes
          }
        }))
      });
      setCart([]);
      props.onOrder(order);
      await props.onReload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nao foi possivel lançar o pedido";
      setError(message);
      props.onToast(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="waiter-layout">
      <div className="module-header">
        <div>
          <p className="eyebrow">Atendimento</p>
          <h2>Pedido do garçom</h2>
        </div>
        <div className="module-header-actions">
          <div className="live-pill">
            <ReceiptText size={16} />
            {cartQuantity} {cartQuantity === 1 ? "item" : "itens"} · {formatCurrencyBRL(cartTotal)}
          </div>
          {window.tavonDesktop?.isDesktop && props.onConfigOpen && (
            <button className="icon-button" onClick={props.onConfigOpen} title="Configurar servidor">
              <Settings2 size={17} />
            </button>
          )}
        </div>
      </div>

      <div className="waiter-shell">
        <aside className="panel waiter-command-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Mesa e comanda</p>
              <h3>Ativar consumo</h3>
            </div>
            <UsersRound size={20} />
          </div>

          <div className="waiter-field-grid">
            <label className="field">
              Mesa
              <select
                value={selectedTableId}
                onChange={(event) => {
                  setSelectedTableId(event.target.value);
                  setResolvedCheck(null);
                }}
              >
                {props.tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name} · {table.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Comanda individual
              <select
                value={selectedQrCode}
                onChange={(event) => {
                  setSelectedQrCode(event.target.value);
                  setResolvedCheck(null);
                }}
              >
                {assignableQrs.map((qr) => (
                  <option key={qr.id} value={qr.code}>
                    {qr.label} · {qr.code} · {qr.status === "in_use" ? "ativa" : "livre"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button className="checkout-button full" disabled={!selectedQrCode} onClick={activateCheck}>
            <CheckCircle2 size={17} />
            Ativar comanda
          </button>

          <div className="waiter-current-check">
            <span>{currentTable?.name || "Mesa"}</span>
            <strong>{resolvedCheck?.checkCode || selectedQr?.currentCheckCode || selectedQrCode || "Sem comanda"}</strong>
            <small>{resolvedCheck?.customerName || selectedQr?.label || "Selecione uma comanda"}</small>
          </div>

          {activeChecks.length > 0 && (
            <div className="waiter-active-list">
              <p className="eyebrow">Comandas abertas</p>
              {activeChecks.map((qr) => (
                <button
                  key={qr.id}
                  className={qr.code === selectedQrCode ? "active" : ""}
                  onClick={() => {
                    if (qr.currentTableId) setSelectedTableId(qr.currentTableId);
                    setSelectedQrCode(qr.code);
                    setResolvedCheck(null);
                  }}
                >
                  <span>{tableNameFor(qr.currentTableId)}</span>
                  <strong>{qr.label}</strong>
                  <small>{qr.currentCheckCode}</small>
                </button>
              ))}
            </div>
          )}

          <div className="service-call-list">
            <div className="service-call-heading">
              <div>
                <p className="eyebrow">Chamados</p>
                <strong>Atendimento da mesa</strong>
              </div>
              <span>{openServiceCalls.length}</span>
            </div>
            {openServiceCalls.length === 0 && <span className="empty-state">Nenhum chamado aberto.</span>}
            {openServiceCalls.map((call) => (
              <button key={call.id} onClick={() => props.onResolveServiceCall(call.id)}>
                <Bell size={20} />
                <span>{call.tableName}</span>
                <strong>{call.message}</strong>
                <small>{new Date(call.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · Toque para marcar atendido</small>
              </button>
            ))}
          </div>

          <div className="waiter-cart">
            <div className="panel-heading compact-heading">
              <div>
                <p className="eyebrow">Resumo</p>
                <h3>Itens do pedido</h3>
              </div>
              {cart.length > 0 && (
                <button className="ghost-button" onClick={() => setCart([])}>
                  Limpar
                </button>
              )}
            </div>
            <div className="cart-list">
              {cart.length === 0 && <p className="empty-state">Nenhum item adicionado.</p>}
              {cart.map((item) => (
                <div key={item.cartId} className="cart-item waiter-cart-item">
                  <div>
                    <strong>
                      {item.quantity}x {item.product.name}
                    </strong>
                    <small>{formatCurrencyBRL(item.unitPrice)} un.</small>
                  </div>
                  <span>{formatCurrencyBRL(item.subtotal)}</span>
                  <button
                    className="icon-button"
                    onClick={() => setCart(cart.filter((cartItem) => cartItem.cartId !== item.cartId))}
                    title="Remover item"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
            <div className="cart-total">
              <span>Total parcial</span>
              <strong>{formatCurrencyBRL(cartTotal)}</strong>
            </div>
            {error && <p className="inline-error">{error}</p>}
            <button className="primary-button full" disabled={!cart.length || !selectedQrCode || sending} onClick={sendOrder}>
              <ReceiptText size={18} />
              {sending ? "Lançando..." : "Enviar para cozinha"}
            </button>
          </div>
        </aside>

        <section className="waiter-menu-panel">
          <div className="panel waiter-toolbar">
            <div className="search-box">
              <Search size={18} />
              <input placeholder="Buscar produto" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <div className="category-strip waiter-category-strip">
              <button className={selectedCategory === "all" ? "active" : ""} onClick={() => setSelectedCategory("all")}>
                <FontAwesomeIcon icon={faUtensils} />
                Todos
              </button>
              {props.categories.map((category) => (
                <button
                  key={category.id}
                  className={selectedCategory === category.id ? "active" : ""}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <FontAwesomeIcon icon={categoryIcon(category.icon, category.name)} />
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="product-grid waiter-product-grid">
            {filteredProducts.map((product) => (
              <article key={product.id} className="product-card">
                <img src={product.imageUrl} alt="" />
                <div>
                  <span className="prep-time">
                    <Clock3 size={14} />
                    {product.preparationMinutes} min
                  </span>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="product-card-footer">
                    <strong>{formatCurrencyBRL(product.price)}</strong>
                    <button className="primary-button" onClick={() => setSelectedProduct(product)}>
                      <Plus size={17} />
                      Lançar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {selectedProduct && (
        <ProductDialog
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={(item) => {
            setCart([...cart, item]);
            setSelectedProduct(null);
          }}
        />
      )}
    </section>
  );
}

function ProductDialog(props: { product: Product; onClose: () => void; onAdd: (item: CartItem) => void }) {
  const [quantity, setQuantity] = useState(1);
  const [removedIngredientIds, setRemovedIngredientIds] = useState<string[]>([]);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [optionValueIds, setOptionValueIds] = useState<string[]>(
    props.product.options.flatMap((option) => (option.required && option.values[0] ? [option.values[0].id] : []))
  );
  const [notes, setNotes] = useState("");
  const unitPrice = productUnitPrice(props.product, addonIds, optionValueIds);
  const subtotal = unitPrice * quantity;

  const toggle = (value: string, values: string[], setValues: (items: string[]) => void) => {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  return (
    <div className="dialog-backdrop">
      <div className="product-dialog">
        <button className="dialog-close" onClick={props.onClose} title="Fechar">
          <X size={20} />
        </button>
        <img src={props.product.imageUrl} alt="" />
        <div className="dialog-content">
          <div className="dialog-scroll">
            <p className="eyebrow">Personalizar pedido</p>
            <h2>{props.product.name}</h2>
            <p>{props.product.description}</p>

            {props.product.options.map((option) => (
              <div key={option.id} className="choice-group">
                <strong>{option.name}</strong>
                {option.values.map((value) => (
                  <label key={value.id} className="choice-row">
                    <input
                      type={option.maxChoices === 1 ? "radio" : "checkbox"}
                      name={option.id}
                      checked={optionValueIds.includes(value.id)}
                      onChange={() => {
                        if (option.maxChoices === 1) {
                          const otherIds = option.values.map((item) => item.id);
                          setOptionValueIds([...optionValueIds.filter((item) => !otherIds.includes(item)), value.id]);
                        } else {
                          toggle(value.id, optionValueIds, setOptionValueIds);
                        }
                      }}
                    />
                    <span>{value.name}</span>
                    {value.priceDelta > 0 && <small>+{formatCurrencyBRL(value.priceDelta)}</small>}
                  </label>
                ))}
              </div>
            ))}

            {props.product.ingredients.length > 0 && (
              <div className="choice-group">
                <strong>Remover ingredientes</strong>
                {props.product.ingredients
                  .filter((ingredient) => ingredient.removable)
                  .map((ingredient) => (
                    <label key={ingredient.id} className="choice-row">
                      <input
                        type="checkbox"
                        checked={removedIngredientIds.includes(ingredient.id)}
                        onChange={() => toggle(ingredient.id, removedIngredientIds, setRemovedIngredientIds)}
                      />
                      <span>Sem {ingredient.name.toLowerCase()}</span>
                    </label>
                  ))}
              </div>
            )}

            {props.product.addons.length > 0 && (
              <div className="choice-group">
                <strong>Adicionais</strong>
                {props.product.addons.map((addon: Addon) => (
                  <label key={addon.id} className="choice-row">
                    <input type="checkbox" checked={addonIds.includes(addon.id)} onChange={() => toggle(addon.id, addonIds, setAddonIds)} />
                    <span>{addon.name}</span>
                    <small>+{formatCurrencyBRL(addon.price)}</small>
                  </label>
                ))}
              </div>
            )}

            {props.product.allowNotes && (
              <label className="field">
                Observacao
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex: sem molho" />
              </label>
            )}
          </div>

          <div className="dialog-footer">
            <div className="stepper">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
              <strong>{quantity}</strong>
              <button onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>
            <button
              className="checkout-button"
              onClick={() =>
                props.onAdd({
                  cartId: crypto.randomUUID(),
                  product: props.product,
                  quantity,
                  removedIngredientIds,
                  addonIds,
                  optionValueIds,
                  notes,
                  unitPrice,
                  subtotal
                })
              }
            >
              Adicionar · {formatCurrencyBRL(subtotal)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KitchenBoard(props: {
  orders: Order[];
  products: Product[];
  serviceCalls: ServiceCall[];
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
  onPrint: (order: Order) => Promise<void>;
  onResolveServiceCall: (callId: string) => Promise<void>;
  onConfigOpen?: () => void;
}) {
  const [sector, setSector] = useState("all");
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredOrders = props.orders.filter((order) => {
    if (sector === "all") return true;
    return order.items.some((item) => item.sector === sector);
  });
  const openServiceCalls = props.serviceCalls.filter((call) => call.status === "open");

  const printTicket = async (order: Order) => {
    setPrintOrder(order);
    await props.onPrint(order);
    window.setTimeout(() => {
      printThermalElement("[data-print-ticket='kitchen']")
        .catch(() => window.print());
    }, 120);
  };

  return (
    <section className="kitchen-layout">
      <div className="module-header">
        <div>
          <p className="eyebrow">Tela de preparo</p>
          <h2>Pedidos por status</h2>
        </div>
        <div className="module-header-actions">
          <div className="segmented">
            {["all", "kitchen", "bar", "dessert"].map((item) => (
              <button key={item} className={sector === item ? "active" : ""} onClick={() => setSector(item)}>
                {sectorLabel(item)}
              </button>
            ))}
          </div>
          {window.tavonDesktop?.isDesktop && props.onConfigOpen && (
            <button className="icon-button" onClick={props.onConfigOpen} title="Configurar servidor">
              <Settings2 size={17} />
            </button>
          )}
        </div>
      </div>

      {openServiceCalls.length > 0 && (
        <div className="service-call-strip">
          <div>
            <p className="eyebrow">Chamados do salao</p>
            <strong>{openServiceCalls.length} aguardando atendimento</strong>
          </div>
          <div className="service-call-chips">
            {openServiceCalls.map((call) => (
              <button key={call.id} onClick={() => props.onResolveServiceCall(call.id)}>
                <Bell size={15} />
                <span>{call.tableName}</span>
                <small>{call.message}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="kanban">
        {statusOrder.map((status) => (
          <div key={status} className="kanban-column">
            <div className="column-title">
              <span className={statusTone[status]} />
              <strong>{ORDER_STATUS_LABEL[status]}</strong>
              <small>{filteredOrders.filter((order) => order.status === status).length}</small>
            </div>
            {filteredOrders
              .filter((order) => order.status === status)
              .map((order) => (
                <KitchenCard
                  key={order.id}
                  order={order}
                  products={props.products}
                  onStatusChange={props.onStatusChange}
                  onPrint={printTicket}
                />
              ))}
          </div>
        ))}
      </div>
      {printOrder && <ThermalOrderTicket order={printOrder} products={props.products} />}
    </section>
  );
}

function KitchenCard(props: {
  order: Order;
  products: Product[];
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
  onPrint: (order: Order) => Promise<void>;
}) {
  const elapsed = minutesSince(props.order.createdAt);
  const delayed = elapsed > 25 && ["new", "preparing"].includes(props.order.status);
  const next = nextStatus[props.order.status];

  return (
    <article className={`order-card ${delayed ? "delayed" : ""}`}>
      <div className="order-card-top">
        <div>
          <strong>{props.order.tableName}</strong>
          <small>{props.order.customerName} · {props.order.checkCode}</small>
        </div>
        <span>
          <Clock3 size={14} />
          {elapsed} min
        </span>
      </div>
      <div className="order-items">
        {props.order.items.map((item) => {
          const customization = itemCustomizationLabels(props.products, item);
          return (
            <div key={item.id}>
              <b>{item.quantity}x {item.productName}</b>
              {item.customization.notes && <small>{item.customization.notes}</small>}
              {customization.options && <small>Opcao: {customization.options}</small>}
              {customization.addons && <small>Adicionais: {customization.addons}</small>}
              {customization.removedIngredients && <small>Remover: {customization.removedIngredients}</small>}
            </div>
          );
        })}
      </div>
      <div className="order-actions">
        <button className="ghost-button" onClick={() => props.onPrint(props.order)}>
          <Printer size={16} />
          Ticket
        </button>
        {next && (
          <button className="primary-button" onClick={() => props.onStatusChange(props.order.id, next)}>
            {ORDER_STATUS_LABEL[next]}
          </button>
        )}
      </div>
    </article>
  );
}

function ThermalOrderTicket({ order, products }: { order: Order; products: Product[] }) {
  return (
    <article className="thermal-ticket print-only" data-print-ticket="kitchen">
      <h1>COZINHA</h1>
      <div className="thermal-row">
        <span>Mesa</span>
        <strong>{order.tableName}</strong>
      </div>
      <div className="thermal-row">
        <span>Comanda</span>
        <strong>{order.checkCode}</strong>
      </div>
      <div className="thermal-row">
        <span>Horario</span>
        <strong>{new Date(order.createdAt).toLocaleString("pt-BR")}</strong>
      </div>
      <div className="thermal-divider" />
      {order.items.map((item) => {
        const customization = itemCustomizationLabels(products, item);
        return (
          <div key={item.id} className="thermal-item">
            <strong>{item.quantity}x {item.productName}</strong>
            {customization.options && <small>Opcao: {customization.options}</small>}
            {customization.addons && <small>Adic: {customization.addons}</small>}
            {customization.removedIngredients && <small>Sem: {customization.removedIngredients}</small>}
            {item.customization.notes && <small>Obs: {item.customization.notes}</small>}
          </div>
        );
      })}
      <div className="thermal-divider" />
      <p>Pedido #{order.id}</p>
    </article>
  );
}

function ThermalReceipt({ restaurant, check }: { restaurant: RestaurantSettings; check: CheckSummary }) {
  return (
    <article className="thermal-ticket print-only" data-print-ticket="receipt">
      <h1>{restaurant.name}</h1>
      <p>COMPROVANTE DE CONSUMO</p>
      {check.ticket && <p>{check.ticket.number}</p>}
      <div className="thermal-divider" />
      <div className="thermal-row">
        <span>Mesa</span>
        <strong>{check.tableName}</strong>
      </div>
      <div className="thermal-row">
        <span>Comanda</span>
        <strong>{check.code}</strong>
      </div>
      <div className="thermal-row">
        <span>Cliente</span>
        <strong>{check.customerName}</strong>
      </div>
      <div className="thermal-divider" />
      {check.orders.flatMap((order) =>
        order.items.map((item) => (
          <div key={item.id} className="thermal-line">
            <span>{item.quantity}x {item.productName}</span>
            <strong>{formatCurrencyBRL(item.subtotal)}</strong>
          </div>
        ))
      )}
      <div className="thermal-divider" />
      <div className="thermal-line">
        <span>Subtotal</span>
        <strong>{formatCurrencyBRL(check.subtotal)}</strong>
      </div>
      <div className="thermal-line">
        <span>Servico</span>
        <strong>{formatCurrencyBRL(check.serviceFee)}</strong>
      </div>
      {check.discount > 0 && (
        <div className="thermal-line">
          <span>Desconto</span>
          <strong>-{formatCurrencyBRL(check.discount)}</strong>
        </div>
      )}
      <div className="thermal-line">
        <span>Pago</span>
        <strong>{formatCurrencyBRL(check.paid)}</strong>
      </div>
      <div className="thermal-line thermal-total">
        <span>Total</span>
        <strong>{formatCurrencyBRL(check.total)}</strong>
      </div>
      <p>{new Date().toLocaleString("pt-BR")}</p>
      {check.ticket && <p>Emitido por {check.ticket.issuedByName}</p>}
    </article>
  );
}

function CashierPanel(props: {
  restaurant: RestaurantSettings;
  tables: Table[];
  customerQrs: CustomerQr[];
  onToast: (message: string) => void;
  onReload: () => Promise<void>;
  onConfigOpen?: () => void;
}) {
  const checkCodeFromUrl = new URLSearchParams(window.location.search).get("check");
  const [code, setCode] = useState(checkCodeFromUrl || "");
  const [check, setCheck] = useState<CheckSummary | null>(null);
  const [method, setMethod] = useState("pix");
  const [amount, setAmount] = useState("");
  const [serviceFeeEnabled, setServiceFeeEnabled] = useState(true);
  const [discount, setDiscount] = useState("0");
  const [error, setError] = useState("");

  const syncCheckState = (data: CheckSummary) => {
    setCheck(data);
    setAmount(String(data.remaining));
    setServiceFeeEnabled(data.serviceFeeEnabled);
    setDiscount(String(data.discount));
  };

  const loadCheck = async () => {
    setError("");
    try {
      const data = await api.getCheck(code);
      syncCheckState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comanda nao encontrada");
    }
  };

  const applyAdjustments = async (next?: { serviceFeeEnabled?: boolean; discount?: number }) => {
    if (!check) return;
    setError("");
    const nextServiceFeeEnabled = next?.serviceFeeEnabled ?? serviceFeeEnabled;
    const nextDiscount = next?.discount ?? Number(discount || 0);
    try {
      const updated = await api.updateCheckAdjustments(check.code, {
        serviceFeeEnabled: nextServiceFeeEnabled,
        discount: nextDiscount
      });
      syncCheckState(updated);
      props.onToast("Ajustes da comanda aplicados");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel aplicar o ajuste");
    }
  };

  const activeChecks = props.customerQrs.filter((qr) => qr.status === "in_use" && qr.currentCheckCode);
  const tableNameFor = (tableId?: string) => props.tables.find((table) => table.id === tableId)?.name || "Mesa aberta";
  const hasPendingOrders = Boolean(
    check?.orders.some((order) => !["delivered", "cancelled"].includes(order.status))
  );

  const loadCheckByCode = async (nextCode: string) => {
    const normalizedCode = nextCode.trim().toUpperCase();
    if (!normalizedCode) return;
    setError("");
    setCode(normalizedCode);
    window.history.replaceState({}, "", `/caixa?check=${encodeURIComponent(normalizedCode)}`);
    try {
      const data = await api.getCheck(normalizedCode);
      syncCheckState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comanda nao encontrada");
    }
  };

  const pay = async () => {
    if (!check) return;
    setError("");
    try {
      const updated = await api.addPayment(check.code, method, Number(amount));
      syncCheckState(updated);
      props.onToast("Pagamento registrado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel registrar o pagamento");
    }
  };

  const close = async () => {
    if (!check) return;
    setError("");
    try {
      const updated = await api.closeCheck(check.code);
      syncCheckState(updated);
      await props.onReload();
      props.onToast("Comanda fechada");
      window.setTimeout(() => {
        printThermalElement("[data-print-ticket='receipt']")
          .catch(() => undefined);
      }, 160);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel fechar a comanda");
    }
  };

  useEffect(() => {
    if (checkCodeFromUrl) {
      loadCheckByCode(checkCodeFromUrl);
    }
  }, []);

  return (
    <section className="cashier-layout">
      <div className="module-header">
        <div>
          <p className="eyebrow">Caixa</p>
          <h2>Fechamento de comanda</h2>
        </div>
        {window.tavonDesktop?.isDesktop && props.onConfigOpen && (
          <button className="icon-button" onClick={props.onConfigOpen} title="Configurar servidor">
            <Settings2 size={17} />
          </button>
        )}
      </div>
      <div className="panel cashier-search">
        <div className="scan-row">
          <QrCode size={22} />
          <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Escanear QR ou digitar codigo" />
          <button className="primary-button" onClick={() => loadCheckByCode(code)}>
            Buscar
          </button>
        </div>
        {activeChecks.length > 0 && (
          <div className="active-checks-panel">
            <div className="panel-heading compact-heading">
              <div>
                <p className="eyebrow">Comandas ativas no momento</p>
                <h3>Selecione direto pelo caixa</h3>
              </div>
              <span className="live-pill">{activeChecks.length} abertas</span>
            </div>
            <div className="active-check-grid">
              {activeChecks.map((qr) => (
                <button
                  key={qr.id}
                  className={check?.code === qr.currentCheckCode ? "active" : ""}
                  onClick={() => loadCheckByCode(qr.currentCheckCode || qr.code)}
                >
                  <span>{tableNameFor(qr.currentTableId)}</span>
                  <strong>{qr.label}</strong>
                  <small>{qr.currentCheckCode || qr.code}</small>
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p className="inline-error">{error}</p>}
      </div>

      {check ? (
        <>
          <div className="panel receipt-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{check.tableName}</p>
                <h3>{check.customerName}</h3>
                {check.ticket && <small className="ticket-meta">{check.ticket.number} · {new Date(check.ticket.issuedAt).toLocaleString("pt-BR")}</small>}
              </div>
              <span className={`status-badge ${check.status}`}>{checkStatusLabel(check.status)}</span>
            </div>
            {check.ticket && (
              <div className="ticket-issued-banner">
                <ReceiptText size={18} />
                <div>
                  <strong>Ticket registrado</strong>
                  <small>
                    {check.ticket.number} · {check.ticket.itemCount} {check.ticket.itemCount === 1 ? "item" : "itens"} · {formatCurrencyBRL(check.ticket.total)}
                  </small>
                </div>
              </div>
            )}
            <div className="receipt-lines">
              {check.orders.flatMap((order) =>
                order.items.map((item) => (
                  <div key={item.id}>
                    <span>{item.quantity}x {item.productName}</span>
                    <strong>{formatCurrencyBRL(item.subtotal)}</strong>
                  </div>
                ))
              )}
            </div>
            <div className="totals">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrencyBRL(check.subtotal)}</strong>
              </div>
              <div>
                <span>Taxa de servico</span>
                <strong>{formatCurrencyBRL(check.serviceFee)}</strong>
              </div>
              {check.discount > 0 && (
                <div>
                  <span>Desconto</span>
                  <strong>-{formatCurrencyBRL(check.discount)}</strong>
                </div>
              )}
              <div>
                <span>Pago</span>
                <strong>{formatCurrencyBRL(check.paid)}</strong>
              </div>
              <div className="grand-total">
                <span>Total final</span>
                <strong>{formatCurrencyBRL(check.total)}</strong>
              </div>
            </div>
          </div>

          <div className="panel payment-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Pagamento</p>
                <h3>Saldo {formatCurrencyBRL(check.remaining)}</h3>
              </div>
              <CreditCard size={21} />
            </div>
            <div className="cashier-adjustments">
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={serviceFeeEnabled}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    setServiceFeeEnabled(enabled);
                    applyAdjustments({ serviceFeeEnabled: enabled });
                  }}
                />
                <span>Taxa do garçom</span>
                <strong>{serviceFeeEnabled ? formatCurrencyBRL(check.serviceFee) : "Removida"}</strong>
              </label>
              <label className="field compact-field">
                Desconto
                <div className="adjustment-row">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(event) => setDiscount(event.target.value)}
                    onBlur={() => applyAdjustments({ discount: Number(discount || 0) })}
                  />
                  <button className="ghost-button" onClick={() => applyAdjustments({ discount: Number(discount || 0) })}>
                    Aplicar
                  </button>
                </div>
              </label>
            </div>
            <div className="segmented pay-methods">
              {["pix", "credit_card", "debit_card", "cash", "split"].map((item) => (
                <button key={item} className={method === item ? "active" : ""} onClick={() => setMethod(item)}>
                  {paymentMethodLabel(item)}
                </button>
              ))}
            </div>
            <label className="field">
              Valor
              <input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </label>
            <button className="primary-button full" disabled={!check.remaining} onClick={pay}>
              Registrar pagamento
            </button>
            {hasPendingOrders && (
              <p className="inline-error">
                Esta comanda ainda tem pedido em preparo/pronto. Feche somente depois de marcar como entregue ou cancelado.
              </p>
            )}
            <button className="checkout-button" disabled={check.remaining > 0 || hasPendingOrders || check.status !== "open"} onClick={close}>
              <CheckCircle2 size={18} />
              {check.status === "closed" ? "Comanda fechada" : hasPendingOrders ? "Aguardando entrega" : "Fechar comanda"}
            </button>
            <button
              className="ghost-button full"
              onClick={() =>
                printThermalElement("[data-print-ticket='receipt']")
                  .then(() => props.onToast("Comprovante enviado para impressao"))
                  .catch((err) => props.onToast(err instanceof Error ? err.message : "Falha ao imprimir comprovante"))
              }
            >
              <Printer size={17} />
              Reimprimir comprovante
            </button>
          </div>
          <ThermalReceipt restaurant={props.restaurant} check={check} />
        </>
      ) : (
        <div className="empty-panel">
          <ReceiptText size={36} />
          <p>Busque uma comanda para visualizar itens, dividir conta, registrar pagamentos e fechar a mesa.</p>
        </div>
      )}
    </section>
  );
}

export default App;
