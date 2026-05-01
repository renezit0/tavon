export type ID = string;

export type TenantId = string;

export type OrderStatus = "new" | "preparing" | "ready" | "delivered" | "cancelled";

export type PaymentStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "partially_paid"
  | "refunded"
  | "failed"
  | "cancelled";

export type PaymentMethod = "cash" | "credit_card" | "debit_card" | "pix" | "voucher" | "split";

export type KitchenSector = "kitchen" | "bar" | "dessert" | "cashier";

export type ThemeMode = "dark" | "light" | "auto";

export type PermissionKey =
  | "admin.manage"
  | "menu.manage"
  | "orders.read"
  | "orders.update"
  | "cashier.close"
  | "reports.read"
  | "audit.read";

export interface ThemeSettings {
  mode: ThemeMode;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  radius: number;
}

export interface RestaurantSettings {
  id: ID;
  tenantId: TenantId;
  name: string;
  logoUrl: string;
  coverUrl: string;
  serviceFeePercent: number;
  averageDeliveryMinutes: number;
  theme: ThemeSettings;
  autoPrint: boolean;
  waiterCallEnabled: boolean;
  manualCheckCodeEnabled: boolean;
}

export interface Table {
  id: ID;
  tenantId: TenantId;
  code: string;
  name: string;
  status: "available" | "open" | "closing" | "disabled";
  capacity: number;
  deviceId?: string;
}

export interface CustomerQr {
  id: ID;
  tenantId: TenantId;
  code: string;
  label: string;
  status: "available" | "in_use" | "inactive";
  currentTableId?: ID;
  currentCheckId?: ID;
  currentCheckCode?: string;
  createdAt: string;
}

export interface ResolvedCustomerCheck {
  tenantId: TenantId;
  tableId: ID;
  tableName: string;
  checkId: ID;
  checkCode: string;
  customerQrCode: string;
  customerName: string;
  status: "open" | "closed" | "cancelled";
}

export interface Category {
  id: ID;
  tenantId: TenantId;
  name: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  sortOrder: number;
  active: boolean;
}

export interface Ingredient {
  id: ID;
  tenantId: TenantId;
  name: string;
  removable: boolean;
}

export interface ProductOption {
  id: ID;
  name: string;
  required: boolean;
  minChoices: number;
  maxChoices: number;
  values: ProductOptionValue[];
}

export interface ProductOptionValue {
  id: ID;
  name: string;
  priceDelta: number;
}

export interface Addon {
  id: ID;
  tenantId: TenantId;
  name: string;
  price: number;
  sector: KitchenSector;
  active: boolean;
}

export interface Product {
  id: ID;
  tenantId: TenantId;
  categoryId: ID;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  active: boolean;
  featured: boolean;
  temporarilyUnavailable: boolean;
  preparationMinutes: number;
  allowNotes: boolean;
  sector: KitchenSector;
  ingredients: Ingredient[];
  addons: Addon[];
  options: ProductOption[];
  tags: string[];
}

export interface OrderItemCustomization {
  removedIngredientIds: ID[];
  addonIds: ID[];
  optionValueIds: ID[];
  notes?: string;
}

export interface OrderItem {
  id: ID;
  productId: ID;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  sector: KitchenSector;
  customization: OrderItemCustomization;
}

export interface Order {
  id: ID;
  tenantId: TenantId;
  tableId: ID;
  tableName: string;
  checkId: ID;
  checkCode: string;
  customerName: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  cancelledReason?: string;
}

export interface CashierTicket {
  id: ID;
  tenantId: TenantId;
  number: string;
  checkId: ID;
  checkCode: string;
  tableId: ID;
  tableName: string;
  customerName: string;
  subtotal: number;
  serviceFee: number;
  discount: number;
  total: number;
  paid: number;
  remaining: number;
  orderCount: number;
  itemCount: number;
  issuedAt: string;
  issuedById: ID;
  issuedByName: string;
}

export type ServiceCallStatus = "open" | "acknowledged" | "resolved" | "cancelled";

export interface ServiceCall {
  id: ID;
  tenantId: TenantId;
  tableId: ID;
  tableName: string;
  source: "customer" | "waiter" | "system";
  message: string;
  status: ServiceCallStatus;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface CheckSummary {
  id: ID;
  tenantId: TenantId;
  code: string;
  tableId: ID;
  tableName: string;
  customerName: string;
  status: "open" | "closed" | "cancelled";
  subtotal: number;
  serviceFeeEnabled: boolean;
  serviceFee: number;
  discount: number;
  total: number;
  paid: number;
  remaining: number;
  orders: Order[];
  ticket?: CashierTicket;
}

export interface PrinterConfig {
  id: ID;
  tenantId: TenantId;
  name: string;
  sector: KitchenSector;
  connectionType: "browser" | "local_service" | "network" | "escpos";
  target: string;
  autoPrint: boolean;
  paperWidthMm: 58 | 80;
  ticketTemplate: string;
}

export interface AuditLog {
  id: ID;
  tenantId: TenantId;
  actorId: ID;
  actorName: string;
  action: string;
  entity: string;
  entityId: ID;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardSummary {
  revenueToday: number;
  ordersToday: number;
  averageTicket: number;
  averagePreparationMinutes: number;
  activeTables: number;
  delayedOrders: number;
  salesByHour: Array<{ hour: string; total: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  tableStatus: Array<{ table: string; status: Table["status"]; total: number }>;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Novo",
  preparing: "Em preparo",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado"
};

export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  new: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: []
};

export function canMoveOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_FLOW[from].includes(to);
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}
