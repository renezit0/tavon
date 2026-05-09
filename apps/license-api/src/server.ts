import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { pool } from "./db.js";
import { z } from "zod";
import "dotenv/config";

const app = Fastify({ logger: true });

await app.register(helmet);
await app.register(cors, { origin: "*" });
await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
await app.register(jwt, { secret: process.env.JWT_SECRET || "tavon_license_secret_change_me" });

// ─── Auth middleware ────────────────────────────────────────────────────────
async function requireAuth(request: any, reply: any) {
  try {
    await request.jwtVerify();
    if ((request as any).user?.role !== "admin")
      return reply.status(403).send({ error: "Acesso restrito a administradores" });
  } catch {
    reply.status(401).send({ error: "Nao autorizado" });
  }
}

// ─── Health ─────────────────────────────────────────────────────────────────
app.get("/health", async () => ({ ok: true, service: "tavon-license-api", ts: new Date().toISOString() }));

// ─── Auth — login unificado ───────────────────────────────────────────────────
// Tenta admin primeiro, depois client. Mesmo tempo de resposta independente do
// resultado para evitar user-enumeration por timing.
const DUMMY_HASH = "$2b$12$LHxEA5oJ8jHtXvCg3RbAuuBqb6ekAJ5qexhJIGLZwWK0WaUBGz3FS";

app.post("/auth/login", async (request, reply) => {
  const { email, password } = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  }).parse(request.body);

  const [[adminRows], [clientRows]] = await Promise.all([
    pool.query("SELECT * FROM admins WHERE email = ?", [email]),
    pool.query("SELECT * FROM clients WHERE email = ? AND active = 1", [email]),
  ]);
  const admin  = (adminRows  as any[])[0];
  const client = (clientRows as any[])[0];

  // Sempre executa bcrypt para evitar timing attacks
  const [adminOk, clientOk] = await Promise.all([
    bcrypt.compare(password, admin?.password_hash  || DUMMY_HASH),
    bcrypt.compare(password, client?.password_hash || DUMMY_HASH),
  ]);

  if (admin && adminOk) {
    const token = app.jwt.sign({ id: admin.id, email: admin.email, role: "admin" }, { expiresIn: "12h" });
    return { token, role: "admin", user: { id: admin.id, name: admin.name, email: admin.email } };
  }

  if (client && clientOk && client.password_hash) {
    const token = app.jwt.sign({ id: client.id, email: client.email, role: "client" }, { expiresIn: "12h" });
    return { token, role: "client", user: { id: client.id, name: client.name, email: client.email, company: client.company } };
  }

  return reply.status(401).send({ error: "Credenciais invalidas" });
});

// ─── Clients ─────────────────────────────────────────────────────────────────
app.get("/clients", { preHandler: requireAuth }, async (request) => {
  const { search, active } = request.query as any;
  let sql = "SELECT * FROM clients WHERE 1=1";
  const params: unknown[] = [];
  if (search) { sql += " AND (name LIKE ? OR email LIKE ? OR company LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (active !== undefined) { sql += " AND active = ?"; params.push(active === "true" ? 1 : 0); }
  sql += " ORDER BY name";
  const [rows] = await pool.query(sql, params);
  return rows;
});

app.get("/clients/:id", { preHandler: requireAuth }, async (request, reply) => {
  const { id } = request.params as any;
  const [rows] = await pool.query("SELECT * FROM clients WHERE id = ?", [id]);
  const client = (rows as any[])[0];
  if (!client) return reply.status(404).send({ error: "Cliente nao encontrado" });
  const [licenses] = await pool.query("SELECT * FROM licenses WHERE client_id = ? ORDER BY created_at DESC", [id]);
  return { ...client, licenses };
});

app.post("/clients", { preHandler: requireAuth }, async (request, reply) => {
  const data = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    company: z.string().optional(),
    notes: z.string().optional()
  }).parse(request.body);

  const [result] = await pool.query(
    "INSERT INTO clients (name, email, phone, company, notes) VALUES (?, ?, ?, ?, ?)",
    [data.name, data.email, data.phone || null, data.company || null, data.notes || null]
  );
  const id = (result as any).insertId;
  const [rows] = await pool.query("SELECT * FROM clients WHERE id = ?", [id]);
  return reply.status(201).send((rows as any[])[0]);
});

app.put("/clients/:id", { preHandler: requireAuth }, async (request, reply) => {
  const { id } = request.params as any;
  const data = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    active: z.boolean().optional()
  }).parse(request.body);

  const sets: string[] = [];
  const vals: unknown[] = [];
  if (data.name !== undefined) { sets.push("name = ?"); vals.push(data.name); }
  if (data.email !== undefined) { sets.push("email = ?"); vals.push(data.email); }
  if (data.phone !== undefined) { sets.push("phone = ?"); vals.push(data.phone); }
  if (data.company !== undefined) { sets.push("company = ?"); vals.push(data.company); }
  if (data.notes !== undefined) { sets.push("notes = ?"); vals.push(data.notes); }
  if (data.active !== undefined) { sets.push("active = ?"); vals.push(data.active ? 1 : 0); }
  if (!sets.length) return reply.status(400).send({ error: "Nenhum campo para atualizar" });

  await pool.query(`UPDATE clients SET ${sets.join(", ")} WHERE id = ?`, [...vals, id]);
  const [rows] = await pool.query("SELECT * FROM clients WHERE id = ?", [id]);
  return (rows as any[])[0];
});

app.delete("/clients/:id", { preHandler: requireAuth }, async (request, reply) => {
  const { id } = request.params as any;
  await pool.query("DELETE FROM clients WHERE id = ?", [id]);
  return reply.status(204).send();
});

// ─── Licenses ─────────────────────────────────────────────────────────────────
app.get("/licenses", { preHandler: requireAuth }, async (request) => {
  const { client_id, status, module } = request.query as any;
  let sql = `
    SELECT l.*, c.name AS client_name, c.email AS client_email, c.company AS client_company
    FROM licenses l
    JOIN clients c ON c.id = l.client_id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (client_id) { sql += " AND l.client_id = ?"; params.push(client_id); }
  if (status) { sql += " AND l.status = ?"; params.push(status); }
  if (module) { sql += " AND l.module = ?"; params.push(module); }
  sql += " ORDER BY l.created_at DESC";
  const [rows] = await pool.query(sql, params);
  return rows;
});

app.post("/licenses", { preHandler: requireAuth }, async (request, reply) => {
  const data = z.object({
    client_id: z.number(),
    module: z.enum(["admin","cardapio","garcom","cozinha","caixa","totem","all"]),
    status: z.enum(["active","inactive","expired","suspended"]).default("active"),
    started_at: z.string(),
    expires_at: z.string().nullable().optional(),
    max_devices: z.number().default(1),
    notes: z.string().optional()
  }).parse(request.body);

  const license_key = `TVN-${nanoid(6).toUpperCase()}-${nanoid(6).toUpperCase()}-${nanoid(6).toUpperCase()}`;

  const [result] = await pool.query(
    `INSERT INTO licenses (client_id, license_key, module, status, started_at, expires_at, max_devices, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.client_id, license_key, data.module, data.status, data.started_at, data.expires_at || null, data.max_devices, data.notes || null]
  );
  const id = (result as any).insertId;
  const [rows] = await pool.query("SELECT * FROM licenses WHERE id = ?", [id]);
  return reply.status(201).send((rows as any[])[0]);
});

app.put("/licenses/:id", { preHandler: requireAuth }, async (request, reply) => {
  const { id } = request.params as any;
  const data = z.object({
    status: z.enum(["active","inactive","expired","suspended"]).optional(),
    started_at: z.string().optional(),
    expires_at: z.string().nullable().optional(),
    max_devices: z.number().optional(),
    notes: z.string().nullable().optional()
  }).parse(request.body);

  const sets: string[] = [];
  const vals: unknown[] = [];
  if (data.status !== undefined) { sets.push("status = ?"); vals.push(data.status); }
  if (data.started_at !== undefined) { sets.push("started_at = ?"); vals.push(data.started_at); }
  if (data.expires_at !== undefined) { sets.push("expires_at = ?"); vals.push(data.expires_at); }
  if (data.max_devices !== undefined) { sets.push("max_devices = ?"); vals.push(data.max_devices); }
  if (data.notes !== undefined) { sets.push("notes = ?"); vals.push(data.notes); }
  if (!sets.length) return reply.status(400).send({ error: "Nenhum campo para atualizar" });

  await pool.query(`UPDATE licenses SET ${sets.join(", ")} WHERE id = ?`, [...vals, id]);
  const [rows] = await pool.query("SELECT * FROM licenses WHERE id = ?", [id]);
  return (rows as any[])[0];
});

app.delete("/licenses/:id", { preHandler: requireAuth }, async (request, reply) => {
  const { id } = request.params as any;
  await pool.query("DELETE FROM licenses WHERE id = ?", [id]);
  return reply.status(204).send();
});

// ─── License Validation (called by desktop apps) ──────────────────────────────
app.post("/licenses/validate", async (request, reply) => {
  const { license_key, module, machine_id, hostname, platform } = z.object({
    license_key: z.string(),
    module: z.string(),
    machine_id: z.string().optional(),
    hostname: z.string().optional(),
    platform: z.string().optional()
  }).parse(request.body);

  const ip = request.ip;
  const user_agent = (request.headers["user-agent"] || "").substring(0, 255);

  const [rows] = await pool.query(
    "SELECT l.*, c.name AS client_name, c.active AS client_active FROM licenses l JOIN clients c ON c.id = l.client_id WHERE l.license_key = ?",
    [license_key]
  );
  const lic = (rows as any[])[0];

  let result: "valid" | "invalid" | "expired" | "suspended" = "invalid";
  let response: Record<string, unknown> = { valid: false };

  if (!lic || !lic.client_active) {
    result = "invalid";
    response = { valid: false, reason: "Licenca invalida ou cliente inativo" };
  } else if (lic.status === "suspended") {
    result = "suspended";
    response = { valid: false, reason: "Licenca suspensa. Contate o suporte Tavon." };
  } else if (lic.status === "inactive") {
    result = "invalid";
    response = { valid: false, reason: "Licenca inativa" };
  } else if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
    result = "expired";
    await pool.query("UPDATE licenses SET status = 'expired' WHERE id = ?", [lic.id]);
    response = { valid: false, reason: "Licenca expirada. Renove com o suporte Tavon." };
  } else if (lic.module !== "all" && lic.module !== module) {
    result = "invalid";
    response = { valid: false, reason: `Licenca nao valida para o modulo ${module}` };
  } else {
    // ── Valid license: enforce device limit and track activation ──────────────
    if (machine_id) {
      const [existingDevice] = await pool.query(
        "SELECT id FROM device_activations WHERE license_id = ? AND machine_id = ?",
        [lic.id, machine_id]
      ) as any[];

      if ((existingDevice as any[]).length === 0) {
        // New device — check limit
        const [deviceCount] = await pool.query(
          "SELECT COUNT(DISTINCT machine_id) AS n FROM device_activations WHERE license_id = ?",
          [lic.id]
        ) as any[];
        const count = (deviceCount as any[])[0].n;

        if (count >= lic.max_devices) {
          result = "invalid";
          await pool.query(
            "INSERT INTO license_validations (license_key, module, ip, user_agent, result) VALUES (?, ?, ?, ?, ?)",
            [license_key, module, ip, user_agent, result]
          );
          return { valid: false, reason: `Limite de dispositivos atingido (${lic.max_devices}). Contate o suporte.` };
        }
      }

      // Upsert device record
      await pool.query(
        `INSERT INTO device_activations (license_id, machine_id, hostname, platform)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE last_seen = NOW(), hostname = VALUES(hostname)`,
        [lic.id, machine_id, hostname || null, platform || null]
      );
    }

    result = "valid";
    const now = Date.now();
    const daysLeft = lic.expires_at
      ? Math.max(0, Math.ceil((new Date(lic.expires_at).getTime() - now) / 86400000))
      : null;

    response = {
      valid: true,
      client_name: lic.client_name,
      module: lic.module,
      expires_at: lic.expires_at,
      days_left: daysLeft,
      grace_days: 7   // desktop app may stay offline up to 7 days after last successful check
    };
  }

  await pool.query(
    "INSERT INTO license_validations (license_key, module, ip, user_agent, result) VALUES (?, ?, ?, ?, ?)",
    [license_key, module, ip, user_agent, result]
  );

  return response;
});

// ─── Admins CRUD ─────────────────────────────────────────────────────────────
app.get("/admins", { preHandler: requireAuth }, async () => {
  const [rows] = await pool.query("SELECT id, name, email, created_at FROM admins ORDER BY name");
  return rows;
});

app.post("/admins", { preHandler: requireAuth }, async (request, reply) => {
  const data = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6)
  }).parse(request.body);
  const hash = await bcrypt.hash(data.password, 12);
  const [result] = await pool.query(
    "INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)",
    [data.name, data.email, hash]
  );
  const [rows] = await pool.query("SELECT id, name, email, created_at FROM admins WHERE id = ?", [(result as any).insertId]);
  return reply.status(201).send((rows as any[])[0]);
});

app.put("/admins/:id", { preHandler: requireAuth }, async (request, reply) => {
  const { id } = request.params as any;
  const data = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional()
  }).parse(request.body);
  const sets: string[] = [], vals: unknown[] = [];
  if (data.name)     { sets.push("name = ?");          vals.push(data.name); }
  if (data.email)    { sets.push("email = ?");         vals.push(data.email); }
  if (data.password) { sets.push("password_hash = ?"); vals.push(await bcrypt.hash(data.password, 12)); }
  if (!sets.length)  return reply.status(400).send({ error: "Nenhum campo para atualizar" });
  await pool.query(`UPDATE admins SET ${sets.join(", ")} WHERE id = ?`, [...vals, id]);
  const [rows] = await pool.query("SELECT id, name, email, created_at FROM admins WHERE id = ?", [id]);
  return (rows as any[])[0];
});

app.delete("/admins/:id", { preHandler: requireAuth }, async (request, reply) => {
  const { id } = request.params as any;
  const caller = (request as any).user;
  if (String(caller.id) === String(id)) return reply.status(400).send({ error: "Nao e possivel remover a si mesmo" });
  await pool.query("DELETE FROM admins WHERE id = ?", [id]);
  return reply.status(204).send();
});

// ─── Payments CRUD ────────────────────────────────────────────────────────────
app.get("/payments", { preHandler: requireAuth }, async (request) => {
  const { client_id, status } = request.query as any;
  let sql = `SELECT p.*, c.name AS client_name, c.company AS client_company
             FROM payments p JOIN clients c ON c.id = p.client_id WHERE 1=1`;
  const params: unknown[] = [];
  if (client_id) { sql += " AND p.client_id = ?"; params.push(client_id); }
  if (status)    { sql += " AND p.status = ?";    params.push(status); }
  sql += " ORDER BY p.due_date DESC, p.created_at DESC";
  const [rows] = await pool.query(sql, params);
  return rows;
});

app.post("/payments", { preHandler: requireAuth }, async (request, reply) => {
  const data = z.object({
    client_id:   z.number(),
    license_id:  z.number().nullable().optional(),
    amount:      z.number(),
    description: z.string().min(1),
    status:      z.enum(["pending","paid","overdue","cancelled"]).default("pending"),
    due_date:    z.string().nullable().optional(),
    paid_at:     z.string().nullable().optional(),
    notes:       z.string().optional()
  }).parse(request.body);
  const [result] = await pool.query(
    `INSERT INTO payments (client_id, license_id, amount, description, status, due_date, paid_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.client_id, data.license_id ?? null, data.amount, data.description,
     data.status, data.due_date ?? null, data.paid_at ?? null, data.notes ?? null]
  );
  const [rows] = await pool.query("SELECT * FROM payments WHERE id = ?", [(result as any).insertId]);
  return reply.status(201).send((rows as any[])[0]);
});

app.put("/payments/:id", { preHandler: requireAuth }, async (request, reply) => {
  const { id } = request.params as any;
  const data = z.object({
    amount:      z.number().optional(),
    description: z.string().optional(),
    status:      z.enum(["pending","paid","overdue","cancelled"]).optional(),
    due_date:    z.string().nullable().optional(),
    paid_at:     z.string().nullable().optional(),
    notes:       z.string().nullable().optional()
  }).parse(request.body);
  const sets: string[] = [], vals: unknown[] = [];
  if (data.amount      !== undefined) { sets.push("amount = ?");      vals.push(data.amount); }
  if (data.description !== undefined) { sets.push("description = ?"); vals.push(data.description); }
  if (data.status      !== undefined) { sets.push("status = ?");      vals.push(data.status); }
  if (data.due_date    !== undefined) { sets.push("due_date = ?");    vals.push(data.due_date); }
  if (data.paid_at     !== undefined) { sets.push("paid_at = ?");     vals.push(data.paid_at); }
  if (data.notes       !== undefined) { sets.push("notes = ?");       vals.push(data.notes); }
  // auto-mark paid_at when status → paid
  if (data.status === "paid" && data.paid_at === undefined) { sets.push("paid_at = NOW()"); }
  if (!sets.length) return reply.status(400).send({ error: "Nenhum campo para atualizar" });
  await pool.query(`UPDATE payments SET ${sets.join(", ")} WHERE id = ?`, [...vals, id]);
  const [rows] = await pool.query("SELECT * FROM payments WHERE id = ?", [id]);
  return (rows as any[])[0];
});

app.delete("/payments/:id", { preHandler: requireAuth }, async (request, reply) => {
  const { id } = request.params as any;
  await pool.query("DELETE FROM payments WHERE id = ?", [id]);
  return reply.status(204).send();
});

// ─── Portal do cliente ────────────────────────────────────────────────────────
async function requirePortalAuth(request: any, reply: any) {
  try {
    await request.jwtVerify();
    if ((request as any).user?.role !== "client")
      return reply.status(403).send({ error: "Acesso restrito ao portal do cliente" });
  } catch {
    reply.status(401).send({ error: "Nao autorizado" });
  }
}

app.post("/portal/login", async (request, reply) => {
  const { email, password } = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  }).parse(request.body);

  const [rows] = await pool.query("SELECT * FROM clients WHERE email = ? AND active = 1", [email]);
  const client = (rows as any[])[0];
  if (!client || !client.password_hash) return reply.status(401).send({ error: "Credenciais invalidas ou acesso nao configurado" });

  const ok = await bcrypt.compare(password, client.password_hash);
  if (!ok) return reply.status(401).send({ error: "Credenciais invalidas" });

  const token = app.jwt.sign({ id: client.id, email: client.email, role: "client" }, { expiresIn: "12h" });
  return { token, role: "client", client: { id: client.id, name: client.name, email: client.email, company: client.company } };
});

app.get("/portal/me", { preHandler: requirePortalAuth }, async (request) => {
  const { id } = (request as any).user;
  const [clients] = await pool.query("SELECT id, name, email, phone, company, created_at FROM clients WHERE id = ?", [id]);
  const client = (clients as any[])[0];
  if (!client) return { error: "Cliente nao encontrado" };

  const [licenses] = await pool.query(
    "SELECT id, license_key, module, status, started_at, expires_at, max_devices, created_at FROM licenses WHERE client_id = ? ORDER BY created_at DESC",
    [id]
  );
  const [payments] = await pool.query(
    "SELECT id, amount, description, status, due_date, paid_at, created_at FROM payments WHERE client_id = ? ORDER BY due_date DESC, created_at DESC",
    [id]
  );
  const [devices] = await pool.query(
    `SELECT da.machine_id, da.hostname, da.platform, da.first_seen, da.last_seen
     FROM device_activations da
     JOIN licenses l ON l.id = da.license_id
     WHERE l.client_id = ? ORDER BY da.last_seen DESC`,
    [id]
  );

  return { ...client, licenses, payments, devices };
});

// Endpoint para admin definir/resetar senha do portal do cliente
app.post("/clients/:id/set-password", { preHandler: requireAuth }, async (request, reply) => {
  const { id } = request.params as any;
  const { password } = z.object({ password: z.string().min(6) }).parse(request.body);
  const hash = await bcrypt.hash(password, 12);
  await pool.query("UPDATE clients SET password_hash = ? WHERE id = ?", [hash, id]);
  return { ok: true };
});

// ─── Demo requests ────────────────────────────────────────────────────────────
app.post("/demo", async (request, reply) => {
  const data = z.object({
    email:   z.string().email(),
    name:    z.string().min(1).optional(),
    message: z.string().optional(),
  }).parse(request.body);
  const ip = request.ip;
  await pool.query(
    "INSERT INTO demo_requests (email, name, message, ip) VALUES (?, ?, ?, ?)",
    [data.email, data.name || null, data.message || null, ip]
  );
  return reply.status(201).send({ ok: true });
});

app.get("/demo", { preHandler: requireAuth }, async (request) => {
  const { status } = request.query as any;
  let sql = "SELECT * FROM demo_requests WHERE 1=1";
  const params: unknown[] = [];
  if (status) { sql += " AND status = ?"; params.push(status); }
  sql += " ORDER BY created_at DESC";
  const [rows] = await pool.query(sql, params);
  return rows;
});

app.put("/demo/:id", { preHandler: requireAuth }, async (request, reply) => {
  const { id } = request.params as any;
  const { status } = z.object({
    status: z.enum(["new","contacted","closed"])
  }).parse(request.body);
  await pool.query("UPDATE demo_requests SET status = ? WHERE id = ?", [status, id]);
  const [rows] = await pool.query("SELECT * FROM demo_requests WHERE id = ?", [id]);
  return (rows as any[])[0];
});

app.delete("/demo/:id", { preHandler: requireAuth }, async (request, reply) => {
  const { id } = request.params as any;
  await pool.query("DELETE FROM demo_requests WHERE id = ?", [id]);
  return reply.status(204).send();
});

// ─── Stats ────────────────────────────────────────────────────────────────────
app.get("/stats", { preHandler: requireAuth }, async () => {
  const [[totalClients]] = await pool.query("SELECT COUNT(*) AS n FROM clients") as any;
  const [[activeClients]] = await pool.query("SELECT COUNT(*) AS n FROM clients WHERE active = 1") as any;
  const [[totalLicenses]] = await pool.query("SELECT COUNT(*) AS n FROM licenses") as any;
  const [[activeLicenses]] = await pool.query("SELECT COUNT(*) AS n FROM licenses WHERE status = 'active'") as any;
  const [[expiredLicenses]] = await pool.query("SELECT COUNT(*) AS n FROM licenses WHERE status = 'expired'") as any;
  const [recentValidations] = await pool.query(
    "SELECT * FROM license_validations ORDER BY validated_at DESC LIMIT 10"
  ) as any;
  return {
    clients: { total: totalClients.n, active: activeClients.n },
    licenses: { total: totalLicenses.n, active: activeLicenses.n, expired: expiredLicenses.n },
    recent_validations: recentValidations
  };
});

// ─── Start ────────────────────────────────────────────────────────────────────
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT) || 4444;
await app.listen({ host, port });
console.log(`License API rodando em http://${host}:${port}`);
