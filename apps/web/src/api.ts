import type {
  Category,
  CheckSummary,
  CashierTicket,
  CustomerQr,
  DashboardSummary,
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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

let token = "";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Erro de comunicacao" }));
    throw new Error(error.error || "Erro de comunicacao");
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  baseUrl: API_URL,
  async login() {
    const response = await request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@aurora.test", password: "123456" })
    });
    token = response.token;
    return response;
  },
  getMenu() {
    return request<{ restaurant: RestaurantSettings; categories: Category[]; products: Product[] }>("/public/menu");
  },
  getRestaurant() {
    return request<RestaurantSettings>("/restaurant");
  },
  updateRestaurant(input: Partial<RestaurantSettings>) {
    return request<RestaurantSettings>("/restaurant", { method: "PUT", body: JSON.stringify(input) });
  },
  verifyTabletSettingsPassword(password: string) {
    return request<{ ok: boolean }>("/public/tablet-settings/verify", {
      method: "POST",
      body: JSON.stringify({ password })
    });
  },
  updatePublicTabletSettings(input: {
    password: string;
    waiterCallEnabled?: boolean;
    manualCheckCodeEnabled?: boolean;
  }) {
    return request<RestaurantSettings>("/public/tablet-settings", {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },
  updateTabletSettings(input: { password?: string; waiterCallEnabled?: boolean; manualCheckCodeEnabled?: boolean }) {
    return request<RestaurantSettings>("/tablet-settings", {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },
  getDashboard() {
    return request<DashboardSummary>("/dashboard");
  },
  getTables() {
    return request<Table[]>("/tables");
  },
  getTableQr(tableId: string) {
    return request<{ payload: string; dataUrl: string }>(`/tables/${tableId}/qr`);
  },
  resolveCustomerCheck(input: { tableId: string; customerQrCode: string; tenantId?: string }) {
    return request<ResolvedCustomerCheck>("/public/checks/resolve", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  getCustomerQrs() {
    return request<CustomerQr[]>("/customer-qrs");
  },
  createCustomerQrBatch(quantity: number) {
    return request<CustomerQr[]>("/customer-qrs/batch", {
      method: "POST",
      body: JSON.stringify({ quantity })
    });
  },
  getCustomerQrImage(idOrCode: string) {
    return request<{ payload: string; dataUrl: string }>(`/customer-qrs/${encodeURIComponent(idOrCode)}/qr`);
  },
  getCategories() {
    return request<Category[]>("/categories");
  },
  getProducts() {
    return request<Product[]>("/products");
  },
  createProduct(input: Omit<Product, "id" | "tenantId">) {
    return request<Product>("/products", { method: "POST", body: JSON.stringify(input) });
  },
  updateProduct(productId: string, input: Partial<Product>) {
    return request<Product>(`/products/${productId}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  deleteProduct(productId: string) {
    return request<void>(`/products/${productId}`, { method: "DELETE" });
  },
  createOrder(input: {
    tableId: string;
    customerName: string;
    checkCode?: string;
    customerQrCode?: string;
    customerCheckCode?: string;
    items: Array<{
      productId: string;
      quantity: number;
      customization?: {
        removedIngredientIds?: string[];
        addonIds?: string[];
        optionValueIds?: string[];
        notes?: string;
      };
    }>;
  }) {
    return request<Order>("/orders", { method: "POST", body: JSON.stringify(input) });
  },
  getOrders() {
    return request<Order[]>("/orders");
  },
  updateOrderStatus(orderId: string, status: OrderStatus) {
    return request<Order>(`/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  },
  getCheck(code: string) {
    return request<CheckSummary>(`/checks/${encodeURIComponent(code)}`);
  },
  addPayment(code: string, method: string, amount: number) {
    return request<CheckSummary>(`/checks/${encodeURIComponent(code)}/payments`, {
      method: "POST",
      body: JSON.stringify({ method, amount })
    });
  },
  updateCheckAdjustments(code: string, input: { serviceFeeEnabled?: boolean; discount?: number }) {
    return request<CheckSummary>(`/checks/${encodeURIComponent(code)}/adjustments`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },
  closeCheck(code: string) {
    return request<CheckSummary>(`/checks/${encodeURIComponent(code)}/close`, { method: "POST" });
  },
  getTickets() {
    return request<CashierTicket[]>("/tickets");
  },
  getServiceCalls() {
    return request<ServiceCall[]>("/service-calls");
  },
  createServiceCall(input: { tableId: string; message?: string; tenantId?: string }) {
    return request<ServiceCall>("/public/service-calls", { method: "POST", body: JSON.stringify(input) });
  },
  updateServiceCallStatus(callId: string, status: ServiceCallStatus) {
    return request<ServiceCall>(`/service-calls/${callId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },
  getPrinters() {
    return request<PrinterConfig[]>("/printers");
  },
  updatePrinter(printerId: string, input: Partial<PrinterConfig>) {
    return request<PrinterConfig>(`/printers/${printerId}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  printJob(input: Record<string, unknown>) {
    return request<{ id: string; status: string }>("/print/jobs", { method: "POST", body: JSON.stringify(input) });
  },
  getAuditLogs() {
    return request<Array<{ id: string; action: string; actorName: string; entity: string; createdAt: string }>>(
      "/audit-logs"
    );
  }
};
