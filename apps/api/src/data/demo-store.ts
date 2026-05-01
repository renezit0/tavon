import {
  Addon,
  AuditLog,
  canMoveOrderStatus,
  CashierTicket,
  Category,
  CheckSummary,
  CustomerQr,
  DashboardSummary,
  ID,
  Ingredient,
  KitchenSector,
  Order,
  OrderItem,
  OrderItemCustomization,
  OrderStatus,
  PaymentMethod,
  PrinterConfig,
  Product,
  ResolvedCustomerCheck,
  RestaurantSettings,
  ServiceCall,
  ServiceCallStatus,
  Table
} from "@restaurant/shared";

type CreateOrderItemInput = {
  productId: ID;
  quantity: number;
  customization?: Partial<OrderItemCustomization>;
};

type CreateOrderInput = {
  tenantId: ID;
  tableId: ID;
  customerName: string;
  checkCode?: string;
  customerQrCode?: string;
  customerCheckCode?: string;
  items: CreateOrderItemInput[];
};

type CheckPayment = {
  id: ID;
  checkId: ID;
  checkCode: string;
  method: PaymentMethod;
  amount: number;
  createdAt: string;
};

type CustomerCheckSession = {
  id: ID;
  tenantId: ID;
  tableId: ID;
  tableName: string;
  checkCode: string;
  customerQrCode: string;
  customerName: string;
  status: "open" | "closed" | "cancelled";
  serviceFeeEnabled: boolean;
  discount: number;
  openedAt: string;
  closedAt?: string;
};

function id(prefix: string): ID {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function now() {
  return new Date().toISOString();
}

const tenantId = "tenant_demo";

const ingredients: Ingredient[] = [
  { id: "ing_onion", tenantId, name: "Cebola roxa", removable: true },
  { id: "ing_tomato", tenantId, name: "Tomate", removable: true },
  { id: "ing_pickles", tenantId, name: "Picles artesanal", removable: true },
  { id: "ing_sauce", tenantId, name: "Molho da casa", removable: true },
  { id: "ing_cheese", tenantId, name: "Queijo", removable: true }
];

const addons: Addon[] = [
  { id: "add_bacon", tenantId, name: "Bacon crocante", price: 7.5, sector: "kitchen", active: true },
  { id: "add_cheese", tenantId, name: "Queijo extra", price: 6, sector: "kitchen", active: true },
  { id: "add_fries", tenantId, name: "Batata pequena", price: 12, sector: "kitchen", active: true },
  { id: "add_gin", tenantId, name: "Dose premium", price: 16, sector: "bar", active: true }
];

const categories: Category[] = [
  {
    id: "cat_burgers",
    tenantId,
    name: "Burgers",
    description: "Classicos da casa com ingredientes frescos.",
    imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80",
    icon: "burger",
    sortOrder: 1,
    active: true
  },
  {
    id: "cat_mains",
    tenantId,
    name: "Pratos",
    description: "Receitas de cozinha quente para almoco e jantar.",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
    icon: "utensils",
    sortOrder: 2,
    active: true
  },
  {
    id: "cat_drinks",
    tenantId,
    name: "Bebidas",
    description: "Drinks, cervejas, vinhos e nao alcoolicos.",
    imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80",
    icon: "glass",
    sortOrder: 3,
    active: true
  },
  {
    id: "cat_dessert",
    tenantId,
    name: "Sobremesas",
    description: "Finalizacoes doces e sobremesas autorais.",
    imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80",
    icon: "cake",
    sortOrder: 4,
    active: true
  }
];

const products: Product[] = [
  {
    id: "prod_smash",
    tenantId,
    categoryId: "cat_burgers",
    name: "Smash Prime",
    description: "Blend 160g, cheddar, picles artesanal, cebola roxa e molho da casa.",
    price: 39.9,
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
    active: true,
    featured: true,
    temporarilyUnavailable: false,
    preparationMinutes: 18,
    allowNotes: true,
    sector: "kitchen",
    ingredients: [ingredients[0], ingredients[2], ingredients[3], ingredients[4]],
    addons: [addons[0], addons[1], addons[2]],
    tags: ["destaque", "carne"],
    options: [
      {
        id: "opt_point",
        name: "Ponto da carne",
        required: true,
        minChoices: 1,
        maxChoices: 1,
        values: [
          { id: "point_rare", name: "Mal passado", priceDelta: 0 },
          { id: "point_medium", name: "Ao ponto", priceDelta: 0 },
          { id: "point_done", name: "Bem passado", priceDelta: 0 }
        ]
      }
    ]
  },
  {
    id: "prod_ribs",
    tenantId,
    categoryId: "cat_mains",
    name: "Costela Barbecue",
    description: "Costela suina assada lentamente, barbecue defumado e batatas rusticas.",
    price: 68,
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
    active: true,
    featured: true,
    temporarilyUnavailable: false,
    preparationMinutes: 28,
    allowNotes: true,
    sector: "kitchen",
    ingredients: [ingredients[3]],
    addons: [addons[2]],
    tags: ["compartilhar"],
    options: [
      {
        id: "opt_side",
        name: "Acompanhamento",
        required: true,
        minChoices: 1,
        maxChoices: 1,
        values: [
          { id: "side_fries", name: "Batata rustica", priceDelta: 0 },
          { id: "side_salad", name: "Salada verde", priceDelta: 0 },
          { id: "side_rice", name: "Arroz cremoso", priceDelta: 5 }
        ]
      }
    ]
  },
  {
    id: "prod_salmon",
    tenantId,
    categoryId: "cat_mains",
    name: "Salmao Citrus",
    description: "Salmao grelhado, legumes tostados, reducao citrica e ervas frescas.",
    price: 74,
    imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80",
    active: true,
    featured: false,
    temporarilyUnavailable: false,
    preparationMinutes: 24,
    allowNotes: true,
    sector: "kitchen",
    ingredients: [],
    addons: [],
    tags: ["leve"],
    options: []
  },
  {
    id: "prod_negroni",
    tenantId,
    categoryId: "cat_drinks",
    name: "Negroni da Casa",
    description: "Gin, vermute tinto, bitter italiano e laranja bahia.",
    price: 34,
    imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=80",
    active: true,
    featured: true,
    temporarilyUnavailable: false,
    preparationMinutes: 7,
    allowNotes: false,
    sector: "bar",
    ingredients: [],
    addons: [addons[3]],
    tags: ["bar"],
    options: []
  },
  {
    id: "prod_limonada",
    tenantId,
    categoryId: "cat_drinks",
    name: "Limonada Siciliana",
    description: "Limao siciliano, hortela, agua com gas e gelo cristalino.",
    price: 18,
    imageUrl: "https://images.unsplash.com/photo-1523371054106-bbf80586c38c?auto=format&fit=crop&w=900&q=80",
    active: true,
    featured: false,
    temporarilyUnavailable: false,
    preparationMinutes: 5,
    allowNotes: false,
    sector: "bar",
    ingredients: [],
    addons: [],
    tags: ["sem alcool"],
    options: []
  },
  {
    id: "prod_redbull",
    tenantId,
    categoryId: "cat_drinks",
    name: "Energético Red Bull",
    description: "Lata 250ml servida gelada.",
    price: 16,
    imageUrl: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?auto=format&fit=crop&w=900&q=80",
    active: true,
    featured: false,
    temporarilyUnavailable: false,
    preparationMinutes: 2,
    allowNotes: false,
    sector: "bar",
    ingredients: [],
    addons: [],
    tags: ["energetico", "lata", "bebida"],
    options: []
  },
  {
    id: "prod_coca_lata",
    tenantId,
    categoryId: "cat_drinks",
    name: "Coca-Cola Lata",
    description: "Refrigerante lata 350ml.",
    price: 7.9,
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80",
    active: true,
    featured: false,
    temporarilyUnavailable: false,
    preparationMinutes: 2,
    allowNotes: false,
    sector: "bar",
    ingredients: [],
    addons: [],
    tags: ["refrigerante", "lata", "coca"],
    options: []
  },
  {
    id: "prod_coca_zero_lata",
    tenantId,
    categoryId: "cat_drinks",
    name: "Coca-Cola Zero Lata",
    description: "Refrigerante zero açúcar lata 350ml.",
    price: 7.9,
    imageUrl: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=900&q=80",
    active: true,
    featured: false,
    temporarilyUnavailable: false,
    preparationMinutes: 2,
    allowNotes: false,
    sector: "bar",
    ingredients: [],
    addons: [],
    tags: ["refrigerante", "zero", "lata"],
    options: []
  },
  {
    id: "prod_guarana_lata",
    tenantId,
    categoryId: "cat_drinks",
    name: "Guaraná Antarctica Lata",
    description: "Refrigerante lata 350ml.",
    price: 7.5,
    imageUrl: "https://images.unsplash.com/photo-1581006852262-e4307cf6283a?auto=format&fit=crop&w=900&q=80",
    active: true,
    featured: false,
    temporarilyUnavailable: false,
    preparationMinutes: 2,
    allowNotes: false,
    sector: "bar",
    ingredients: [],
    addons: [],
    tags: ["refrigerante", "guarana", "lata"],
    options: []
  },
  {
    id: "prod_agua_sem_gas",
    tenantId,
    categoryId: "cat_drinks",
    name: "Água Mineral",
    description: "Garrafa 500ml sem gás.",
    price: 5.9,
    imageUrl: "https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=900&q=80",
    active: true,
    featured: false,
    temporarilyUnavailable: false,
    preparationMinutes: 1,
    allowNotes: false,
    sector: "bar",
    ingredients: [],
    addons: [],
    tags: ["agua", "sem gas"],
    options: []
  },
  {
    id: "prod_heineken_long",
    tenantId,
    categoryId: "cat_drinks",
    name: "Heineken Long Neck",
    description: "Cerveja long neck 330ml.",
    price: 14.9,
    imageUrl: "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=900&q=80",
    active: true,
    featured: false,
    temporarilyUnavailable: false,
    preparationMinutes: 2,
    allowNotes: false,
    sector: "bar",
    ingredients: [],
    addons: [],
    tags: ["cerveja", "long neck"],
    options: []
  },
  {
    id: "prod_brownie",
    tenantId,
    categoryId: "cat_dessert",
    name: "Brownie Quente",
    description: "Brownie de chocolate belga, sorvete de baunilha e calda quente.",
    price: 29,
    imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80",
    active: true,
    featured: false,
    temporarilyUnavailable: false,
    preparationMinutes: 12,
    allowNotes: true,
    sector: "dessert",
    ingredients: [],
    addons: [],
    tags: ["sobremesa"],
    options: []
  }
];

const tables: Table[] = Array.from({ length: 12 }).map((_, index) => ({
  id: `table_${index + 1}`,
  tenantId,
  code: `M${String(index + 1).padStart(2, "0")}`,
  name: `Mesa ${index + 1}`,
  status: index < 5 ? "open" : "available",
  capacity: index % 3 === 0 ? 6 : 4,
  deviceId: index < 3 ? `tablet-${index + 1}` : undefined
}));

const customerQrs: CustomerQr[] = [
  "PAX-8F3KQ2",
  "PAX-4N7V1A",
  "PAX-9C2L6M",
  "PAX-2H8R5T",
  "PAX-7Q1D4Z",
  "PAX-5M9B3X"
].map((code, index) => ({
  id: `custqr_${index + 1}`,
  tenantId,
  code,
  label: `Comanda ${index + 1}`,
  status: "available",
  createdAt: now()
}));

const restaurant: RestaurantSettings = {
  id: "rest_demo",
  tenantId,
  name: "Tavon",
  logoUrl: "/tavonlogo.png",
  coverUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80",
  serviceFeePercent: 10,
  averageDeliveryMinutes: 22,
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

const printers: PrinterConfig[] = [
  {
    id: "printer_kitchen",
    tenantId,
    name: "Cozinha quente",
    sector: "kitchen",
    connectionType: "browser",
    target: "default",
    autoPrint: true,
    paperWidthMm: 80,
    ticketTemplate: "COZINHA\nMESA {{table}}\nCOMANDA {{check}}\n----------------\n{{items}}\n"
  },
  {
    id: "printer_bar",
    tenantId,
    name: "Bar",
    sector: "bar",
    connectionType: "browser",
    target: "default",
    autoPrint: true,
    paperWidthMm: 80,
    ticketTemplate: "BAR\nMESA {{table}}\nCOMANDA {{check}}\n----------------\n{{items}}\n"
  },
  {
    id: "printer_cashier",
    tenantId,
    name: "Caixa",
    sector: "cashier",
    connectionType: "browser",
    target: "default",
    autoPrint: false,
    paperWidthMm: 80,
    ticketTemplate: "COMPROVANTE\n{{customer}}\nTOTAL {{total}}\nPAGOS {{payments}}\n"
  }
];

export class DemoStore {
  private restaurant = structuredClone(restaurant);
  private tabletSettingsPassword = "1234";
  private categories = structuredClone(categories);
  private products = structuredClone(products);
  private tables = structuredClone(tables);
  private customerQrs = structuredClone(customerQrs);
  private customerChecks: CustomerCheckSession[] = [];
  private printers = structuredClone(printers);
  private orders: Order[] = [];
  private payments: CheckPayment[] = [];
  private cashierTickets: CashierTicket[] = [];
  private serviceCalls: ServiceCall[] = [];
  private auditLogs: AuditLog[] = [];

  constructor() {
    const seedOrder = this.createOrder({
      tenantId,
      tableId: "table_1",
      customerName: "Comanda 1",
      customerQrCode: "PAX-8F3KQ2",
      items: [
        {
          productId: "prod_smash",
          quantity: 2,
          customization: {
            addonIds: ["add_bacon"],
            optionValueIds: ["point_medium"],
            removedIngredientIds: ["ing_onion"],
            notes: "Molho separado"
          }
        },
        { productId: "prod_negroni", quantity: 1, customization: { addonIds: ["add_gin"] } }
      ]
    });
    this.updateOrderStatus(seedOrder.id, "preparing", "system", "Sistema");
  }

  getTenantId() {
    return tenantId;
  }

  getRestaurant() {
    return this.restaurant;
  }

  updateRestaurant(input: Partial<RestaurantSettings>, actorId: ID, actorName: string) {
    this.restaurant = { ...this.restaurant, ...input, theme: { ...this.restaurant.theme, ...input.theme } };
    this.audit(actorId, actorName, "restaurant.updated", "restaurants", this.restaurant.id, input);
    return this.restaurant;
  }

  verifyTabletSettingsPassword(password: string) {
    if (password !== this.tabletSettingsPassword) throw new Error("Senha de configuracao invalida");
    return { ok: true };
  }

  updateTabletSettings(
    input: { password?: string; waiterCallEnabled?: boolean; manualCheckCodeEnabled?: boolean },
    actorId: ID,
    actorName: string
  ) {
    if (typeof input.password === "string" && input.password.trim().length >= 4) {
      this.tabletSettingsPassword = input.password.trim();
    }
    if (typeof input.waiterCallEnabled === "boolean") {
      this.restaurant.waiterCallEnabled = input.waiterCallEnabled;
    }
    if (typeof input.manualCheckCodeEnabled === "boolean") {
      this.restaurant.manualCheckCodeEnabled = input.manualCheckCodeEnabled;
    }
    this.audit(actorId, actorName, "tablet_settings.updated", "restaurants", this.restaurant.id, {
      passwordChanged: Boolean(input.password),
      waiterCallEnabled: this.restaurant.waiterCallEnabled,
      manualCheckCodeEnabled: this.restaurant.manualCheckCodeEnabled
    });
    return this.restaurant;
  }

  updatePublicTabletSettings(input: { password: string; waiterCallEnabled?: boolean; manualCheckCodeEnabled?: boolean }) {
    this.verifyTabletSettingsPassword(input.password);
    if (typeof input.waiterCallEnabled === "boolean") {
      this.restaurant.waiterCallEnabled = input.waiterCallEnabled;
    }
    if (typeof input.manualCheckCodeEnabled === "boolean") {
      this.restaurant.manualCheckCodeEnabled = input.manualCheckCodeEnabled;
    }
    this.audit("tablet", "Tablet", "tablet_settings.updated_public", "restaurants", this.restaurant.id, {
      waiterCallEnabled: this.restaurant.waiterCallEnabled,
      manualCheckCodeEnabled: this.restaurant.manualCheckCodeEnabled
    });
    return this.restaurant;
  }

  listCategories() {
    return [...this.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  createCategory(input: Omit<Category, "id" | "tenantId">, actorId: ID, actorName: string) {
    const category: Category = { id: id("cat"), tenantId, ...input };
    this.categories.push(category);
    this.audit(actorId, actorName, "category.created", "categories", category.id, input);
    return category;
  }

  updateCategory(categoryId: ID, input: Partial<Category>, actorId: ID, actorName: string) {
    const category = this.categories.find((item) => item.id === categoryId);
    if (!category) throw new Error("Categoria nao encontrada");
    Object.assign(category, input, { id: category.id, tenantId: category.tenantId });
    this.audit(actorId, actorName, "category.updated", "categories", category.id, input);
    return category;
  }

  listProducts(filters: { categoryId?: ID; q?: string; featured?: boolean; sector?: KitchenSector } = {}) {
    const query = filters.q?.trim().toLowerCase();
    return this.products.filter((product) => {
      if (filters.categoryId && product.categoryId !== filters.categoryId) return false;
      if (filters.featured !== undefined && product.featured !== filters.featured) return false;
      if (filters.sector && product.sector !== filters.sector) return false;
      if (query && !`${product.name} ${product.description} ${product.tags.join(" ")}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }

  getProduct(productId: ID) {
    return this.products.find((product) => product.id === productId);
  }

  createProduct(input: Omit<Product, "id" | "tenantId">, actorId: ID, actorName: string) {
    const product: Product = { id: id("prod"), tenantId, ...input };
    this.products.push(product);
    this.audit(actorId, actorName, "product.created", "products", product.id, { name: product.name });
    return product;
  }

  updateProduct(productId: ID, input: Partial<Product>, actorId: ID, actorName: string) {
    const product = this.products.find((item) => item.id === productId);
    if (!product) throw new Error("Produto nao encontrado");
    Object.assign(product, input, { id: product.id, tenantId: product.tenantId });
    this.audit(actorId, actorName, "product.updated", "products", product.id, input);
    return product;
  }

  deleteProduct(productId: ID, actorId: ID, actorName: string) {
    const before = this.products.length;
    this.products = this.products.filter((product) => product.id !== productId);
    if (before === this.products.length) throw new Error("Produto nao encontrado");
    this.audit(actorId, actorName, "product.deleted", "products", productId, {});
  }

  listTables() {
    return this.tables;
  }

  listCustomerQrs() {
    return this.customerQrs.map((qr) => ({
      ...qr,
      status: this.customerChecks.some((check) => check.customerQrCode === qr.code && check.status === "open")
        ? "in_use"
        : qr.status,
      currentCheckId: this.customerChecks.find((check) => check.customerQrCode === qr.code && check.status === "open")
        ?.id,
      currentCheckCode: this.customerChecks.find((check) => check.customerQrCode === qr.code && check.status === "open")
        ?.checkCode,
      currentTableId: this.customerChecks.find((check) => check.customerQrCode === qr.code && check.status === "open")
        ?.tableId
    }));
  }

  createCustomerQrBatch(quantity: number, actorId: ID, actorName: string) {
    const created = Array.from({ length: quantity }).map((_, index) => {
      const code = this.generateCustomerQrCode();
      const qr: CustomerQr = {
        id: id("custqr"),
        tenantId,
        code,
        label: `Comanda ${this.customerQrs.length + index + 1}`,
        status: "available",
        createdAt: now()
      };
      return qr;
    });
    this.customerQrs.push(...created);
    this.audit(actorId, actorName, "customer_qr.batch_created", "customer_qrs", "batch", { quantity });
    return created;
  }

  resolveCustomerCheck(tableId: ID, customerQrCode: string): ResolvedCustomerCheck {
    const table = this.tables.find((item) => item.id === tableId || item.code === tableId);
    if (!table) throw new Error("Mesa nao encontrada");

    const normalizedCode = customerQrCode.trim().toUpperCase();
    const qr = this.customerQrs.find((item) => item.code === normalizedCode);
    if (!qr || qr.status === "inactive") throw new Error("QR de comanda invalido ou inativo");

    const openForAnotherTable = this.customerChecks.find(
      (check) => check.customerQrCode === qr.code && check.status === "open" && check.tableId !== table.id
    );
    if (openForAnotherTable) {
      throw new Error(`QR ja esta em uso em ${openForAnotherTable.tableName}`);
    }

    let check = this.customerChecks.find(
      (item) => item.customerQrCode === qr.code && item.tableId === table.id && item.status === "open"
    );
    if (!check) {
      check = {
        id: id("check"),
        tenantId,
        tableId: table.id,
        tableName: table.name,
        checkCode: qr.code,
        customerQrCode: qr.code,
        customerName: qr.label,
        status: "open",
        serviceFeeEnabled: true,
        discount: 0,
        openedAt: now()
      };
      this.customerChecks.unshift(check);
    }

    qr.status = "in_use";
    qr.currentTableId = table.id;
    qr.currentCheckCode = check.checkCode;
    table.status = "open";

    return {
      tenantId,
      tableId: table.id,
      tableName: table.name,
      checkId: check.id,
      checkCode: check.checkCode,
      customerQrCode: qr.code,
      customerName: check.customerName,
      status: check.status
    };
  }

  createTable(input: Omit<Table, "id" | "tenantId">, actorId: ID, actorName: string) {
    const table: Table = { id: id("table"), tenantId, ...input };
    this.tables.push(table);
    this.audit(actorId, actorName, "table.created", "tables", table.id, input);
    return table;
  }

  listPrinters() {
    return this.printers;
  }

  updatePrinter(printerId: ID, input: Partial<PrinterConfig>, actorId: ID, actorName: string) {
    const printer = this.printers.find((item) => item.id === printerId);
    if (!printer) throw new Error("Impressora nao encontrada");
    Object.assign(printer, input, { id: printer.id, tenantId: printer.tenantId });
    this.audit(actorId, actorName, "printer.updated", "printers", printer.id, input);
    return printer;
  }

  createOrder(input: CreateOrderInput) {
    const table = this.tables.find((item) => item.id === input.tableId);
    if (!table) throw new Error("Mesa nao encontrada");

    const resolvedCheck = input.customerQrCode
      ? this.resolveCustomerCheck(table.id, input.customerQrCode)
        : input.customerCheckCode
        ? this.findOpenCustomerCheck(table.id, input.customerCheckCode)
        : this.ensureLegacyCheck(table, input.checkCode, input.customerName);
    const checkCode = resolvedCheck.checkCode;
    const checkId = resolvedCheck.checkId;
    const items: OrderItem[] = input.items.map((item) => this.buildOrderItem(item));
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    const timestamp = now();
    table.status = "open";

    const order: Order = {
      id: id("ord"),
      tenantId: input.tenantId,
      tableId: table.id,
      tableName: table.name,
      checkId,
      checkCode,
      customerName: resolvedCheck.customerName || input.customerName || "Cliente",
      status: "new",
      items,
      total,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.orders.unshift(order);
    this.audit("customer", order.customerName, "order.created", "orders", order.id, {
      table: table.name,
      checkCode,
      total
    });
    return order;
  }

  listOrders(filters: { status?: OrderStatus; sector?: KitchenSector; tableId?: ID } = {}) {
    return this.orders.filter((order) => {
      if (filters.status && order.status !== filters.status) return false;
      if (filters.tableId && order.tableId !== filters.tableId) return false;
      if (filters.sector && !order.items.some((item) => item.sector === filters.sector)) return false;
      return true;
    });
  }

  getOrder(orderId: ID) {
    return this.orders.find((order) => order.id === orderId);
  }

  updateOrderStatus(orderId: ID, status: OrderStatus, actorId: ID, actorName: string) {
    const order = this.getOrder(orderId);
    if (!order) throw new Error("Pedido nao encontrado");
    if (order.status !== status && !canMoveOrderStatus(order.status, status)) {
      throw new Error(`Transicao invalida: ${order.status} para ${status}`);
    }
    order.status = status;
    order.updatedAt = now();
    if (status === "delivered") order.deliveredAt = order.updatedAt;
    this.audit(actorId, actorName, "order.status_changed", "orders", order.id, { status });
    return order;
  }

  getCheck(code: string): CheckSummary {
    const session =
      this.customerChecks.find((check) => check.checkCode === code && check.status === "open") ||
      this.customerChecks.find((check) => check.checkCode === code);
    const orders = session
      ? this.orders.filter((order) => order.checkId === session.id)
      : this.orders.filter((order) => order.checkCode === code && order.checkId === code);
    if (orders.length === 0 && !session) throw new Error("Comanda nao encontrada");

    const first = orders[0];
    const subtotal = orders
      .filter((order) => order.status !== "cancelled")
      .reduce((sum, order) => sum + order.total, 0);
    const serviceFeeEnabled = session?.serviceFeeEnabled ?? true;
    const discount = Math.min(Number((session?.discount || 0).toFixed(2)), subtotal);
    const serviceFee = serviceFeeEnabled ? Number(((subtotal * this.restaurant.serviceFeePercent) / 100).toFixed(2)) : 0;
    const paid = this.payments
      .filter((payment) => (session ? payment.checkId === session.id : payment.checkCode === code))
      .reduce((sum, payment) => sum + payment.amount, 0);
    const total = Math.max(Number((subtotal + serviceFee - discount).toFixed(2)), 0);
    const remaining = Math.max(Number((total - paid).toFixed(2)), 0);
    const checkId = session?.id || code;
    const ticket = this.cashierTickets.find((item) => item.checkId === checkId || item.checkCode === code);

    return {
      id: checkId,
      tenantId,
      code,
      tableId: first?.tableId || session?.tableId || "",
      tableName: first?.tableName || session?.tableName || "",
      customerName: first?.customerName || session?.customerName || "Cliente",
      status: session?.status || (remaining === 0 && total > 0 ? "closed" : "open"),
      subtotal,
      serviceFeeEnabled,
      serviceFee,
      discount,
      total,
      paid,
      remaining,
      orders,
      ticket
    };
  }

  updateCheckAdjustments(
    code: string,
    input: { serviceFeeEnabled?: boolean; discount?: number },
    actorId: ID,
    actorName: string
  ) {
    const check = this.getCheck(code);
    const session = this.customerChecks.find((item) => item.id === check.id);
    if (!session) throw new Error("Comanda nao encontrada");
    if (session.status !== "open") throw new Error("Somente comandas abertas podem receber ajuste");

    if (typeof input.serviceFeeEnabled === "boolean") {
      session.serviceFeeEnabled = input.serviceFeeEnabled;
    }
    if (typeof input.discount === "number") {
      const normalizedDiscount = Math.max(0, Number(input.discount.toFixed(2)));
      if (normalizedDiscount > check.subtotal) throw new Error("Desconto nao pode ser maior que o subtotal");
      session.discount = normalizedDiscount;
    }

    this.audit(actorId, actorName, "check.adjusted", "checks", session.id, {
      code,
      serviceFeeEnabled: session.serviceFeeEnabled,
      discount: session.discount
    });
    return this.getCheck(code);
  }

  addPayment(code: string, method: PaymentMethod, amount: number, actorId: ID, actorName: string) {
    const check = this.getCheck(code);
    if (amount <= 0 || amount > check.remaining) throw new Error("Valor de pagamento invalido");
    const payment: CheckPayment = { id: id("pay"), checkId: check.id, checkCode: code, method, amount, createdAt: now() };
    this.payments.push(payment);
    this.audit(actorId, actorName, "payment.created", "payments", payment.id, { code, method, amount });
    return this.getCheck(code);
  }

  closeCheck(code: string, actorId: ID, actorName: string) {
    const check = this.getCheck(code);
    const hasPendingOrders = check.orders.some((order) => !["delivered", "cancelled"].includes(order.status));
    if (hasPendingOrders) {
      throw new Error("A comanda possui pedidos que ainda nao foram entregues ou cancelados");
    }
    if (check.remaining > 0) {
      throw new Error("A comanda ainda possui saldo em aberto");
    }
    const table = this.tables.find((item) => item.id === check.tableId);
    const session = this.customerChecks.find((item) => item.id === check.id && item.status === "open");
    if (session) {
      session.status = "closed";
      session.closedAt = now();
      const qr = this.customerQrs.find((item) => item.code === session.customerQrCode);
      if (qr) {
        qr.status = "available";
        qr.currentCheckCode = undefined;
        qr.currentTableId = undefined;
      }
    }
    if (table && !this.customerChecks.some((item) => item.tableId === table.id && item.status === "open")) {
      table.status = "available";
    }
    const { ticket, created } = this.ensureCashierTicket(check, actorId, actorName);
    this.audit(actorId, actorName, "check.closed", "checks", code, { total: check.total });
    if (created) {
      this.audit(actorId, actorName, "cashier_ticket.issued", "cashier_tickets", ticket.id, {
        number: ticket.number,
        checkCode: code,
        total: ticket.total
      });
    }
    return this.getCheck(code);
  }

  private ensureCashierTicket(check: CheckSummary, actorId: ID, actorName: string) {
    const existing = this.cashierTickets.find((ticket) => ticket.checkId === check.id || ticket.checkCode === check.code);
    if (existing) return { ticket: existing, created: false };

    const itemCount = check.orders.flatMap((order) => order.items).reduce((sum, item) => sum + item.quantity, 0);
    const ticket: CashierTicket = {
      id: id("ticket"),
      tenantId,
      number: `TKT-${String(this.cashierTickets.length + 1).padStart(6, "0")}`,
      checkId: check.id,
      checkCode: check.code,
      tableId: check.tableId,
      tableName: check.tableName,
      customerName: check.customerName,
      subtotal: check.subtotal,
      serviceFee: check.serviceFee,
      discount: check.discount,
      total: check.total,
      paid: check.paid,
      remaining: check.remaining,
      orderCount: check.orders.length,
      itemCount,
      issuedAt: now(),
      issuedById: actorId,
      issuedByName: actorName
    };
    this.cashierTickets.unshift(ticket);
    return { ticket, created: true };
  }

  getDashboard(): DashboardSummary {
    const deliveredOrders = this.orders.filter((order) => order.status !== "cancelled");
    const revenueToday = deliveredOrders.reduce((sum, order) => sum + order.total, 0);
    const ordersToday = deliveredOrders.length;
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const order of deliveredOrders) {
      for (const item of order.items) {
        const current = productMap.get(item.productId) || { name: item.productName, quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += item.subtotal;
        productMap.set(item.productId, current);
      }
    }

    return {
      revenueToday,
      ordersToday,
      averageTicket: ordersToday ? revenueToday / ordersToday : 0,
      averagePreparationMinutes: 19,
      activeTables: this.tables.filter((table) => table.status === "open").length,
      delayedOrders: this.orders.filter((order) => this.isDelayed(order)).length,
      salesByHour: [
        { hour: "12h", total: 320 },
        { hour: "13h", total: 560 },
        { hour: "14h", total: 430 },
        { hour: "19h", total: 780 },
        { hour: "20h", total: 920 },
        { hour: "21h", total: 640 }
      ],
      topProducts: [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
      tableStatus: this.tables.slice(0, 8).map((table) => {
        const total = this.orders
          .filter((order) => order.tableId === table.id && order.status !== "cancelled")
          .reduce((sum, order) => sum + order.total, 0);
        return { table: table.name, status: table.status, total };
      })
    };
  }

  listAuditLogs() {
    return this.auditLogs.slice(0, 100);
  }

  listCashierTickets() {
    return this.cashierTickets.slice(0, 150);
  }

  listServiceCalls() {
    return this.serviceCalls.slice(0, 100);
  }

  createServiceCall(input: { tableId: ID; message?: string; source?: ServiceCall["source"] }) {
    const table = this.tables.find((item) => item.id === input.tableId || item.code === input.tableId);
    if (!table) throw new Error("Mesa nao encontrada");

    const openCall = this.serviceCalls.find((call) => call.tableId === table.id && call.status === "open");
    if (openCall) return openCall;

    const call: ServiceCall = {
      id: id("call"),
      tenantId,
      tableId: table.id,
      tableName: table.name,
      source: input.source || "customer",
      message: input.message?.trim() || "Chamar garçom",
      status: "open",
      createdAt: now()
    };
    this.serviceCalls.unshift(call);
    this.audit("customer", table.name, "service_call.created", "service_calls", call.id, {
      table: table.name,
      message: call.message
    });
    return call;
  }

  updateServiceCallStatus(callId: ID, status: ServiceCallStatus, actorId: ID, actorName: string) {
    const call = this.serviceCalls.find((item) => item.id === callId);
    if (!call) throw new Error("Chamado nao encontrado");
    call.status = status;
    if (status === "acknowledged") call.acknowledgedAt = now();
    if (status === "resolved" || status === "cancelled") call.resolvedAt = now();
    this.audit(actorId, actorName, "service_call.updated", "service_calls", call.id, { status });
    return call;
  }

  private buildOrderItem(input: CreateOrderItemInput): OrderItem {
    const product = this.products.find((item) => item.id === input.productId);
    if (!product || !product.active || product.temporarilyUnavailable) {
      throw new Error("Produto indisponivel");
    }

    const customization: OrderItemCustomization = {
      removedIngredientIds: input.customization?.removedIngredientIds || [],
      addonIds: input.customization?.addonIds || [],
      optionValueIds: input.customization?.optionValueIds || [],
      notes: input.customization?.notes
    };

    const addonPrice = product.addons
      .filter((addon) => customization.addonIds.includes(addon.id))
      .reduce((sum, addon) => sum + addon.price, 0);
    const optionPrice = product.options
      .flatMap((option) => option.values)
      .filter((value) => customization.optionValueIds.includes(value.id))
      .reduce((sum, value) => sum + value.priceDelta, 0);
    const unitPrice = Number((product.price + addonPrice + optionPrice).toFixed(2));
    const quantity = Math.max(1, input.quantity);

    return {
      id: id("item"),
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice,
      subtotal: Number((unitPrice * quantity).toFixed(2)),
      sector: product.sector,
      customization
    };
  }

  private isDelayed(order: Order) {
    if (!["new", "preparing"].includes(order.status)) return false;
    const oldestMinutes = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
    const expected = Math.max(...order.items.map((item) => this.getProduct(item.productId)?.preparationMinutes || 20));
    return oldestMinutes > expected;
  }

  private findOpenCustomerCheck(tableId: ID, checkCode: string): ResolvedCustomerCheck {
    const session = this.customerChecks.find(
      (item) => item.tableId === tableId && item.checkCode === checkCode && item.status === "open"
    );
    if (!session) throw new Error("Comanda individual nao encontrada para esta mesa");
    return {
      tenantId,
      tableId: session.tableId,
      tableName: session.tableName,
      checkId: session.id,
      checkCode: session.checkCode,
      customerQrCode: session.customerQrCode,
      customerName: session.customerName,
      status: session.status
    };
  }

  private ensureLegacyCheck(table: Table, checkCode: string | undefined, customerName: string): ResolvedCustomerCheck {
    if (!checkCode) throw new Error("Informe o QR de comanda do cliente antes de enviar o pedido");
    let session = this.customerChecks.find((item) => item.tableId === table.id && item.checkCode === checkCode);
    if (!session) {
      session = {
        id: id("check"),
        tenantId,
        tableId: table.id,
        tableName: table.name,
        checkCode,
        customerQrCode: checkCode,
        customerName: customerName || "Cliente",
        status: "open",
        serviceFeeEnabled: true,
        discount: 0,
        openedAt: now()
      };
      this.customerChecks.unshift(session);
    }
    return {
      tenantId,
      tableId: table.id,
      tableName: table.name,
      checkId: session.id,
      checkCode: session.checkCode,
      customerQrCode: session.customerQrCode,
      customerName: session.customerName,
      status: session.status
    };
  }

  private generateCustomerQrCode() {
    let code = "";
    do {
      code = `PAX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    } while (this.customerQrs.some((qr) => qr.code === code));
    return code;
  }

  private audit(
    actorId: ID,
    actorName: string,
    action: string,
    entity: string,
    entityId: ID,
    metadata: Record<string, unknown>
  ) {
    this.auditLogs.unshift({
      id: id("aud"),
      tenantId,
      actorId,
      actorName,
      action,
      entity,
      entityId,
      metadata,
      createdAt: now()
    });
  }
}
