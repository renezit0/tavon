import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import bcrypt from "bcryptjs";
import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import QRCode from "qrcode";
import { Server as SocketServer } from "socket.io";
import { z } from "zod";
import { OrderStatus, PaymentMethod, ServiceCallStatus } from "@restaurant/shared";
import { env } from "./config/env.js";
import { createMysqlPool } from "./database/mysql.js";
import { DemoStore } from "./data/demo-store.js";

const app = Fastify({
  logger: {
    level: env.NODE_ENV === "production" ? "info" : "debug"
  }
});

const store = new DemoStore();
const mysqlPool = createMysqlPool();
const corsOrigins: string[] | boolean = env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((o) => o.trim());

const demoUser = {
  id: "usr_admin",
  tenantId: store.getTenantId(),
  name: "Administrador",
  email: "admin@aurora.test",
  role: "Administrador",
  permissions: [
    "admin.manage",
    "menu.manage",
    "orders.read",
    "orders.update",
    "cashier.close",
    "reports.read",
    "audit.read"
  ],
  passwordHash: bcrypt.hashSync("123456", 10)
};

const io = new SocketServer(app.server, {
  cors: { origin: corsOrigins, credentials: true }
});

io.on("connection", (socket) => {
  socket.join(store.getTenantId());
  socket.emit("connected", { tenantId: store.getTenantId() });
});

await app.register(cors, {
  origin: corsOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
});
await app.register(helmet);
await app.register(rateLimit, {
  max: 120,
  timeWindow: "1 minute"
});
await app.register(jwt, {
  secret: env.JWT_SECRET
});

type AuthUser = typeof demoUser;

function getActor(request: FastifyRequest) {
  const user = request.user as AuthUser | undefined;
  return {
    id: user?.id || "system",
    name: user?.name || "Sistema"
  };
}

async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Nao autenticado" });
  }
}

function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  return schema.parse(body);
}

function fail(reply: FastifyReply, error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Erro inesperado";
  return reply.status(status).send({ error: message });
}

const productSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(2),
  description: z.string().min(2),
  price: z.number().nonnegative(),
  imageUrl: z.string().url(),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  temporarilyUnavailable: z.boolean().default(false),
  preparationMinutes: z.number().int().positive().default(20),
  allowNotes: z.boolean().default(true),
  sector: z.enum(["kitchen", "bar", "dessert", "cashier"]).default("kitchen"),
  ingredients: z.array(z.any()).default([]),
  addons: z.array(z.any()).default([]),
  options: z.array(z.any()).default([]),
  tags: z.array(z.string()).default([])
});

const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().default(99),
  active: z.boolean().default(true)
});

const createOrderSchema = z.object({
  tenantId: z.string().default(store.getTenantId()),
  tableId: z.string(),
  customerName: z.string().min(2).default("Cliente"),
  checkCode: z.string().optional(),
  customerQrCode: z.string().optional(),
  customerCheckCode: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        customization: z
          .object({
            removedIngredientIds: z.array(z.string()).default([]),
            addonIds: z.array(z.string()).default([]),
            optionValueIds: z.array(z.string()).default([]),
            notes: z.string().optional()
          })
          .partial()
          .optional()
      })
    )
    .min(1)
}).refine((input) => Boolean(input.customerQrCode || input.customerCheckCode || input.checkCode), {
  message: "Informe o QR de comanda do cliente antes de enviar o pedido"
});

const orderStatusSchema = z.object({
  status: z.enum(["new", "preparing", "ready", "delivered", "cancelled"])
});

const paymentSchema = z.object({
  method: z.enum(["cash", "credit_card", "debit_card", "pix", "voucher", "split"]),
  amount: z.number().positive()
});

const checkAdjustmentsSchema = z.object({
  serviceFeeEnabled: z.boolean().optional(),
  discount: z.number().nonnegative().optional()
});

const serviceCallSchema = z.object({
  tenantId: z.string().default(store.getTenantId()),
  tableId: z.string(),
  message: z.string().optional()
});

const serviceCallStatusSchema = z.object({
  status: z.enum(["open", "acknowledged", "resolved", "cancelled"])
});

const tabletSettingsPasswordSchema = z.object({
  password: z.string().min(4)
});

const tabletSettingsSchema = z.object({
  password: z.string().min(4).optional(),
  waiterCallEnabled: z.boolean().optional(),
  manualCheckCodeEnabled: z.boolean().optional()
});

const publicTabletSettingsSchema = z.object({
  password: z.string().min(4),
  waiterCallEnabled: z.boolean().optional(),
  manualCheckCodeEnabled: z.boolean().optional()
});

app.get("/health", async () => {
  let database = "memory";
  if (env.API_STORAGE === "mysql" && mysqlPool) {
    await mysqlPool.query("SELECT 1");
    database = "mysql";
  }

  return {
    ok: true,
    storage: env.API_STORAGE,
    database,
    websocket: true,
    now: new Date().toISOString()
  };
});

app.post("/auth/login", async (request, reply) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
  });

  try {
    const input = parseBody(schema, request.body);
    const validUser = input.email === demoUser.email && (await bcrypt.compare(input.password, demoUser.passwordHash));
    if (!validUser) return reply.status(401).send({ error: "Credenciais invalidas" });

    const token = app.jwt.sign(
      {
        id: demoUser.id,
        tenantId: demoUser.tenantId,
        name: demoUser.name,
        role: demoUser.role,
        permissions: demoUser.permissions
      },
      { expiresIn: "12h" }
    );

    return { token, user: { ...demoUser, passwordHash: undefined } };
  } catch (error) {
    return fail(reply, error);
  }
});

app.get("/me", { preHandler: requireAuth }, async (request) => {
  return { user: request.user };
});

app.get("/public/restaurant", async () => store.getRestaurant());

app.get("/public/menu", async (request) => {
  const query = request.query as { categoryId?: string; q?: string; featured?: string };
  return {
    restaurant: store.getRestaurant(),
    categories: store.listCategories().filter((category) => category.active),
    products: store
      .listProducts({
        categoryId: query.categoryId,
        q: query.q,
        featured: query.featured === "true" ? true : undefined
      })
      .filter((product) => product.active)
  };
});

app.get("/restaurant", { preHandler: requireAuth }, async () => store.getRestaurant());

app.put("/restaurant", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const actor = getActor(request);
    return store.updateRestaurant(request.body as never, actor.id, actor.name);
  } catch (error) {
    return fail(reply, error);
  }
});

app.post("/public/tablet-settings/verify", async (request, reply) => {
  try {
    const input = parseBody(tabletSettingsPasswordSchema, request.body);
    return store.verifyTabletSettingsPassword(input.password);
  } catch (error) {
    return fail(reply, error);
  }
});

app.patch("/public/tablet-settings", async (request, reply) => {
  try {
    const input = parseBody(publicTabletSettingsSchema, request.body);
    return store.updatePublicTabletSettings(input);
  } catch (error) {
    return fail(reply, error);
  }
});

app.patch("/tablet-settings", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const input = parseBody(tabletSettingsSchema, request.body);
    const actor = getActor(request);
    return store.updateTabletSettings(input, actor.id, actor.name);
  } catch (error) {
    return fail(reply, error);
  }
});

app.get("/categories", { preHandler: requireAuth }, async () => store.listCategories());

app.post("/categories", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const input = parseBody(categorySchema, request.body);
    const actor = getActor(request);
    return store.createCategory(input, actor.id, actor.name);
  } catch (error) {
    return fail(reply, error);
  }
});

app.patch("/categories/:id", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const input = parseBody(categorySchema.partial(), request.body);
    const actor = getActor(request);
    return store.updateCategory((request.params as { id: string }).id, input, actor.id, actor.name);
  } catch (error) {
    return fail(reply, error);
  }
});

app.get("/products", { preHandler: requireAuth }, async (request) => {
  const query = request.query as { categoryId?: string; q?: string; featured?: string; sector?: never };
  return store.listProducts({
    categoryId: query.categoryId,
    q: query.q,
    featured: query.featured === "true" ? true : undefined,
    sector: query.sector
  });
});

app.post("/products", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const input = parseBody(productSchema, request.body);
    const actor = getActor(request);
    return store.createProduct(input, actor.id, actor.name);
  } catch (error) {
    return fail(reply, error);
  }
});

app.patch("/products/:id", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const input = parseBody(productSchema.partial(), request.body);
    const actor = getActor(request);
    return store.updateProduct((request.params as { id: string }).id, input, actor.id, actor.name);
  } catch (error) {
    return fail(reply, error);
  }
});

app.delete("/products/:id", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const actor = getActor(request);
    store.deleteProduct((request.params as { id: string }).id, actor.id, actor.name);
    return reply.status(204).send();
  } catch (error) {
    return fail(reply, error);
  }
});

app.get("/tables", { preHandler: requireAuth }, async () => store.listTables());

app.post("/tables", { preHandler: requireAuth }, async (request, reply) => {
  const schema = z.object({
    code: z.string().min(1),
    name: z.string().min(2),
    status: z.enum(["available", "open", "closing", "disabled"]).default("available"),
    capacity: z.number().int().positive().default(4),
    deviceId: z.string().optional()
  });

  try {
    const input = parseBody(schema, request.body);
    const actor = getActor(request);
    return store.createTable(input, actor.id, actor.name);
  } catch (error) {
    return fail(reply, error);
  }
});

app.get("/tables/:id/qr", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const table = store.listTables().find((item) => item.id === (request.params as { id: string }).id);
    if (!table) throw new Error("Mesa nao encontrada");
    const payload = `${env.APP_PUBLIC_URL}/cardapio?table=${encodeURIComponent(table.code)}&tenant=${store.getTenantId()}`;
    const dataUrl = await QRCode.toDataURL(payload, { margin: 1, scale: 8 });
    return { payload, dataUrl };
  } catch (error) {
    return fail(reply, error);
  }
});

app.post("/public/checks/resolve", async (request, reply) => {
  const schema = z.object({
    tenantId: z.string().default(store.getTenantId()),
    tableId: z.string(),
    customerQrCode: z.string().min(4)
  });

  try {
    const input = parseBody(schema, request.body);
    return store.resolveCustomerCheck(input.tableId, input.customerQrCode);
  } catch (error) {
    return fail(reply, error);
  }
});

app.get("/checks/:code/qr", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const code = (request.params as { code: string }).code;
    const payload = `${env.APP_PUBLIC_URL}/caixa?check=${encodeURIComponent(code)}&tenant=${store.getTenantId()}`;
    const dataUrl = await QRCode.toDataURL(payload, { margin: 1, scale: 8 });
    return { payload, dataUrl };
  } catch (error) {
    return fail(reply, error);
  }
});

app.get("/customer-qrs", { preHandler: requireAuth }, async () => store.listCustomerQrs());

app.post("/customer-qrs/batch", { preHandler: requireAuth }, async (request, reply) => {
  const schema = z.object({
    quantity: z.number().int().min(1).max(200).default(10)
  });

  try {
    const input = parseBody(schema, request.body);
    const actor = getActor(request);
    return reply.status(201).send(store.createCustomerQrBatch(input.quantity, actor.id, actor.name));
  } catch (error) {
    return fail(reply, error);
  }
});

app.get("/customer-qrs/:id/qr", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const qr = store
      .listCustomerQrs()
      .find((item) => item.id === (request.params as { id: string }).id || item.code === (request.params as { id: string }).id);
    if (!qr) throw new Error("QR de comanda nao encontrado");
    const dataUrl = await QRCode.toDataURL(qr.code, { margin: 1, scale: 8 });
    return { payload: qr.code, dataUrl };
  } catch (error) {
    return fail(reply, error);
  }
});

app.get("/tickets", { preHandler: requireAuth }, async () => store.listCashierTickets());

app.get("/service-calls", { preHandler: requireAuth }, async () => store.listServiceCalls());

app.post("/public/service-calls", async (request, reply) => {
  try {
    const input = parseBody(serviceCallSchema, request.body);
    const call = store.createServiceCall({ tableId: input.tableId, message: input.message, source: "customer" });
    io.to(call.tenantId).emit("service-call:new", call);
    return reply.status(201).send(call);
  } catch (error) {
    return fail(reply, error);
  }
});

app.patch("/service-calls/:id/status", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const input = parseBody(serviceCallStatusSchema, request.body);
    const actor = getActor(request);
    const call = store.updateServiceCallStatus(
      (request.params as { id: string }).id,
      input.status as ServiceCallStatus,
      actor.id,
      actor.name
    );
    io.to(call.tenantId).emit("service-call:updated", call);
    return call;
  } catch (error) {
    return fail(reply, error);
  }
});

app.post("/orders", async (request, reply) => {
  try {
    const input = parseBody(createOrderSchema, request.body);
    const order = store.createOrder(input);
    io.to(order.tenantId).emit("order:new", order);
    io.to(order.tenantId).emit("dashboard:update", store.getDashboard());
    return reply.status(201).send(order);
  } catch (error) {
    return fail(reply, error);
  }
});

app.get("/orders", { preHandler: requireAuth }, async (request) => {
  const query = request.query as { status?: OrderStatus; sector?: never; tableId?: string };
  return store.listOrders(query);
});

app.get("/orders/:id", { preHandler: requireAuth }, async (request, reply) => {
  const order = store.getOrder((request.params as { id: string }).id);
  if (!order) return reply.status(404).send({ error: "Pedido nao encontrado" });
  return order;
});

app.patch("/orders/:id/status", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const input = parseBody(orderStatusSchema, request.body);
    const actor = getActor(request);
    const order = store.updateOrderStatus((request.params as { id: string }).id, input.status, actor.id, actor.name);
    io.to(order.tenantId).emit("order:updated", order);
    io.to(order.tenantId).emit("dashboard:update", store.getDashboard());
    return order;
  } catch (error) {
    return fail(reply, error);
  }
});

app.get("/checks/:code", { preHandler: requireAuth }, async (request, reply) => {
  try {
    return store.getCheck((request.params as { code: string }).code);
  } catch (error) {
    return fail(reply, error, 404);
  }
});

app.post("/checks/:code/payments", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const input = parseBody(paymentSchema, request.body);
    const actor = getActor(request);
    const check = store.addPayment(
      (request.params as { code: string }).code,
      input.method as PaymentMethod,
      input.amount,
      actor.id,
      actor.name
    );
    io.to(check.tenantId).emit("check:updated", check);
    return check;
  } catch (error) {
    return fail(reply, error);
  }
});

app.patch("/checks/:code/adjustments", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const input = parseBody(checkAdjustmentsSchema, request.body);
    const actor = getActor(request);
    const check = store.updateCheckAdjustments((request.params as { code: string }).code, input, actor.id, actor.name);
    io.to(check.tenantId).emit("check:updated", check);
    return check;
  } catch (error) {
    return fail(reply, error);
  }
});

app.post("/checks/:code/close", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const actor = getActor(request);
    const check = store.closeCheck((request.params as { code: string }).code, actor.id, actor.name);
    io.to(check.tenantId).emit("check:closed", check);
    return check;
  } catch (error) {
    return fail(reply, error);
  }
});

app.get("/printers", { preHandler: requireAuth }, async () => store.listPrinters());

app.patch("/printers/:id", { preHandler: requireAuth }, async (request, reply) => {
  try {
    const actor = getActor(request);
    return store.updatePrinter((request.params as { id: string }).id, request.body as never, actor.id, actor.name);
  } catch (error) {
    return fail(reply, error);
  }
});

app.post("/print/jobs", { preHandler: requireAuth }, async (request) => {
  const payload = request.body as Record<string, unknown>;
  return {
    id: `print_${Date.now().toString(36)}`,
    status: env.PRINT_SERVICE_URL ? "queued_remote" : "queued_browser",
    payload
  };
});

app.get("/dashboard", { preHandler: requireAuth }, async () => store.getDashboard());

app.get("/audit-logs", { preHandler: requireAuth }, async () => store.listAuditLogs());

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  return reply.status(500).send({ error: "Erro interno do servidor" });
});

try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
