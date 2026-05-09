const BASE = import.meta.env.VITE_API_URL || "https://tavonapi.seellbr.com";

function getToken() {
  return localStorage.getItem("tvn_license_token") || "";
}

function getPortalToken() {
  return localStorage.getItem("tvn_portal_token") || "";
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Erro desconhecido");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function portalRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(getPortalToken() ? { Authorization: `Bearer ${getPortalToken()}` } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Erro desconhecido");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // ── Auth unificado ──────────────────────────────────────────────────────────
  login: (email: string, password: string) =>
    request<{
      token: string;
      role: "admin" | "client";
      user: { id: number; name: string; email: string; company?: string };
    }>("POST", "/auth/login", { email, password }),

  stats: () => request<any>("GET", "/stats"),

  // ── Clients ─────────────────────────────────────────────────────────────────
  listClients: (params?: { search?: string; active?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return request<any[]>("GET", `/clients${q ? `?${q}` : ""}`);
  },
  getClient: (id: number) => request<any>("GET", `/clients/${id}`),
  createClient: (data: any) => request<any>("POST", "/clients", data),
  updateClient: (id: number, data: any) => request<any>("PUT", `/clients/${id}`, data),
  deleteClient: (id: number) => request<void>("DELETE", `/clients/${id}`),

  // ── Licenses ─────────────────────────────────────────────────────────────────
  listLicenses: (params?: { client_id?: number; status?: string; module?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any[]>("GET", `/licenses${q ? `?${q}` : ""}`);
  },
  createLicense: (data: any) => request<any>("POST", "/licenses", data),
  updateLicense: (id: number, data: any) => request<any>("PUT", `/licenses/${id}`, data),
  deleteLicense: (id: number) => request<void>("DELETE", `/licenses/${id}`),

  // ── Admins ───────────────────────────────────────────────────────────────────
  listAdmins: () => request<any[]>("GET", "/admins"),
  createAdmin: (data: any) => request<any>("POST", "/admins", data),
  updateAdmin: (id: number, data: any) => request<any>("PUT", `/admins/${id}`, data),
  deleteAdmin: (id: number) => request<void>("DELETE", `/admins/${id}`),

  // ── Payments ─────────────────────────────────────────────────────────────────
  listPayments: (params?: { client_id?: number; status?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any[]>("GET", `/payments${q ? `?${q}` : ""}`);
  },
  createPayment: (data: any) => request<any>("POST", "/payments", data),
  updatePayment: (id: number, data: any) => request<any>("PUT", `/payments/${id}`, data),
  deletePayment: (id: number) => request<void>("DELETE", `/payments/${id}`),

  // ── Demo requests ────────────────────────────────────────────────────────────
  listDemos: (status?: string) => {
    const q = status ? `?status=${status}` : "";
    return request<any[]>("GET", `/demo${q}`);
  },
  updateDemo: (id: number, status: string) => request<any>("PUT", `/demo/${id}`, { status }),
  deleteDemo: (id: number) => request<void>("DELETE", `/demo/${id}`),

  // ── Portal do cliente ─────────────────────────────────────────────────────
  setClientPassword: (id: number, password: string) =>
    request<any>("POST", `/clients/${id}/set-password`, { password }),

  portalMe: () => portalRequest<any>("GET", "/portal/me"),
};
