import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api.ts";
import {
  Users,
  Key,
  BarChart3,
  LogOut,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  X,
  Copy,
  RefreshCw,
  Sun,
  Moon,
  Menu,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Page = "dashboard" | "clients" | "licenses";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

interface Admin {
  id: number;
  name: string;
  email: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(val: string | null | undefined): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "badge badge-active",
    inactive: "badge badge-inactive",
    expired: "badge badge-expired",
    suspended: "badge badge-suspended",
  };
  const labels: Record<string, string> = {
    active: "Ativo",
    inactive: "Inativo",
    expired: "Expirado",
    suspended: "Suspenso",
  };
  return <span className={map[status] || "badge badge-inactive"}>{labels[status] || status}</span>;
}

function ModuleBadge({ module }: { module: string }) {
  const map: Record<string, string> = {
    admin: "badge badge-mod-admin",
    cardapio: "badge badge-mod-cardapio",
    garcom: "badge badge-mod-garcom",
    cozinha: "badge badge-mod-cozinha",
    caixa: "badge badge-mod-caixa",
    totem: "badge badge-mod-totem",
    all: "badge badge-mod-all",
  };
  return <span className={map[module] || "badge badge-inactive"}>{module}</span>;
}

function ClientActiveBadge({ active }: { active: number | boolean }) {
  return active ? (
    <span className="badge badge-active">Ativo</span>
  ) : (
    <span className="badge badge-inactive">Inativo</span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => remove(t.id)}>
          {t.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }: { onLogin: (token: string, admin: Admin) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(email, password);
      localStorage.setItem("tvn_license_token", res.token);
      onLogin(res.token, res.admin);
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/tavonlogowhite.png" alt="Tavon" className="login-logo-img login-logo-dark" />
          <img src="/tavonlogo.png"      alt="Tavon" className="login-logo-img login-logo-light" />
          <span className="login-logo-tag">Gestão de Licenças</span>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@tavon.com.br"
              required
            />
          </div>
          <div className="field">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 6 }}>
            {loading ? (
              <>
                <div className="spinner" style={{ borderTopColor: "#0a0a0c" }} />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
function DashboardPage({ toast }: { toast: (msg: string, type?: "success" | "error") => void }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.stats();
      setStats(data);
    } catch (err: any) {
      toast(err.message || "Erro ao carregar dados", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const validationResultLabel: Record<string, string> = {
    valid: "Válida",
    invalid: "Inválida",
    expired: "Expirada",
    suspended: "Suspensa",
  };

  const validationResultClass: Record<string, string> = {
    valid: "badge badge-active",
    invalid: "badge badge-expired",
    expired: "badge badge-expired",
    suspended: "badge badge-suspended",
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Visão geral do sistema de licenças</div>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {loading && !stats ? (
        <div className="loading-wrap">
          <div className="spinner" />
          Carregando...
        </div>
      ) : stats ? (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon blue">
                <Users size={18} />
              </div>
              <div className="stat-number">{stats.clients.total}</div>
              <div className="stat-label">Total de clientes</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <CheckCircle size={18} />
              </div>
              <div className="stat-number">{stats.licenses.active}</div>
              <div className="stat-label">Licenças ativas</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">
                <Clock size={18} />
              </div>
              <div className="stat-number">{stats.licenses.expired}</div>
              <div className="stat-label">Licenças expiradas</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow">
                <Key size={18} />
              </div>
              <div className="stat-number">{stats.licenses.total}</div>
              <div className="stat-label">Total de licenças</div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-card-header">
              <span className="section-card-title">Validações recentes</span>
            </div>
            {stats.recent_validations.length === 0 ? (
              <div className="empty-state">
                <BarChart3 size={40} />
                <p>Nenhuma validação registrada ainda</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Chave</th>
                      <th>Módulo</th>
                      <th>IP</th>
                      <th>Resultado</th>
                      <th>Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_validations.map((v: any) => (
                      <tr key={v.id}>
                        <td>
                          <span className="license-key-text">{v.license_key}</span>
                        </td>
                        <td>
                          <ModuleBadge module={v.module || "—"} />
                        </td>
                        <td className="muted">{v.ip || "—"}</td>
                        <td>
                          <span className={validationResultClass[v.result] || "badge badge-inactive"}>
                            {validationResultLabel[v.result] || v.result}
                          </span>
                        </td>
                        <td className="muted">
                          {new Date(v.validated_at).toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── Client Modal ─────────────────────────────────────────────────────────────
function ClientModal({
  client,
  onClose,
  onSaved,
}: {
  client?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: client?.name || "",
    email: client?.email || "",
    phone: client?.phone || "",
    company: client?.company || "",
    notes: client?.notes || "",
    active: client?.active !== undefined ? Boolean(client.active) : true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (client) {
        await api.updateClient(client.id, {
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          company: form.company || null,
          notes: form.notes || null,
          active: form.active,
        });
      } else {
        await api.createClient({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          company: form.company || undefined,
          notes: form.notes || undefined,
        });
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar cliente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="tvn-modal">
        <div className="tvn-modal-header">
          <h3>{client ? "Editar cliente" : "Novo cliente"}</h3>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="tvn-modal-body">
          <form id="client-form" onSubmit={handleSubmit}>
            {error && <div className="inline-error">{error}</div>}
            <div className="field">
              <label>Nome *</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome completo" required />
            </div>
            <div className="field">
              <label>E-mail *</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@exemplo.com" required />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Telefone</label>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="field">
                <label>Empresa</label>
                <input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Nome da empresa" />
              </div>
            </div>
            <div className="field">
              <label>Observações</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notas opcionais..." />
            </div>
            {client && (
              <div className="field">
                <label>Status</label>
                <select value={form.active ? "1" : "0"} onChange={(e) => set("active", e.target.value === "1")}>
                  <option value="1">Ativo</option>
                  <option value="0">Inativo</option>
                </select>
              </div>
            )}
          </form>
        </div>
        <div className="tvn-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="client-form" className="btn btn-primary" disabled={loading}>
            {loading ? <><div className="spinner" />Salvando...</> : client ? "Salvar alterações" : "Criar cliente"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({
  title,
  message,
  onConfirm,
  onClose,
  loading,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="tvn-modal" style={{ width: "min(420px, calc(100vw - 32px))" }}>
        <div className="tvn-modal-body" style={{ paddingTop: 28, alignItems: "center", textAlign: "center", gap: 12 }}>
          <div className="confirm-icon">
            <Trash2 size={20} />
          </div>
          <strong style={{ fontSize: 17, color: "var(--text)" }}>{title}</strong>
          <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.55, maxWidth: 320 }}>{message}</p>
        </div>
        <div className="tvn-modal-footer" style={{ justifyContent: "center" }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <><div className="spinner" />Excluindo...</> : "Sim, excluir"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Clients Page ─────────────────────────────────────────────────────────────
function ClientsPage({ toast }: { toast: (msg: string, type?: "success" | "error") => void }) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (activeFilter !== "") params.active = activeFilter;
      const data = await api.listClients(params);
      setClients(data);
    } catch (err: any) {
      toast(err.message || "Erro ao carregar clientes", "error");
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter, toast]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteClient(deleteTarget.id);
      toast("Cliente excluído com sucesso", "success");
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast(err.message || "Erro ao excluir cliente", "error");
    } finally {
      setDeleteLoading(false);
    }
  }

  function openCreate() {
    setEditClient(null);
    setModalOpen(true);
  }

  function openEdit(client: any) {
    setEditClient(client);
    setModalOpen(true);
  }

  function handleSaved() {
    setModalOpen(false);
    setEditClient(null);
    toast(editClient ? "Cliente atualizado!" : "Cliente criado!", "success");
    load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Clientes</div>
          <div className="page-subtitle">Gerencie os clientes do sistema</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} />
          Novo cliente
        </button>
      </div>

      <div className="search-row">
        <div className="search-input-wrap">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou empresa..."
          />
        </div>
        <select className="filter-select" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <button className="btn btn-ghost" onClick={load}>
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="section-card">
        {loading ? (
          <div className="loading-wrap">
            <div className="spinner" />
            Carregando...
          </div>
        ) : clients.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <p>Nenhum cliente encontrado</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Empresa</th>
                  <th>Status</th>
                  <th>Cadastrado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td className="muted">{c.email}</td>
                    <td className="muted">{c.company || "—"}</td>
                    <td>
                      <ClientActiveBadge active={c.active} />
                    </td>
                    <td className="muted">{formatDate(c.created_at)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          className="btn-icon"
                          title="Editar"
                          onClick={() => openEdit(c)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn-icon danger"
                          title="Excluir"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <ClientModal
          client={editClient}
          onClose={() => { setModalOpen(false); setEditClient(null); }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Excluir cliente"
          message={`Tem certeza que deseja excluir "${deleteTarget.name}"? Todas as licenças associadas também serão removidas.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}

// ─── License Modal ────────────────────────────────────────────────────────────
function LicenseModal({
  license,
  clients,
  onClose,
  onSaved,
}: {
  license?: any;
  clients: any[];
  onClose: () => void;
  onSaved: (createdKey?: string) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    client_id: license?.client_id?.toString() || (clients[0]?.id?.toString() || ""),
    module: license?.module || "all",
    status: license?.status || "active",
    started_at: license?.started_at ? license.started_at.split("T")[0] : today,
    expires_at: license?.expires_at ? license.expires_at.split("T")[0] : "",
    max_devices: license?.max_devices?.toString() || "1",
    notes: license?.notes || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (license) {
        await api.updateLicense(license.id, {
          status: form.status,
          started_at: form.started_at,
          expires_at: form.expires_at || null,
          max_devices: Number(form.max_devices),
          notes: form.notes || null,
        });
        onSaved();
      } else {
        const created = await api.createLicense({
          client_id: Number(form.client_id),
          module: form.module,
          status: form.status,
          started_at: form.started_at,
          expires_at: form.expires_at || null,
          max_devices: Number(form.max_devices),
          notes: form.notes || undefined,
        });
        setCreatedKey(created.license_key);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao salvar licença");
    } finally {
      setLoading(false);
    }
  }

  function copyKey() {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey).catch(() => {});
    }
  }

  if (createdKey) {
    return (
      <>
        <div className="modal-backdrop" onClick={() => onSaved(createdKey)} />
        <div className="tvn-modal">
          <div className="tvn-modal-header">
            <h3>Licença criada!</h3>
            <button className="btn-icon" onClick={() => onSaved(createdKey)}>
              <X size={16} />
            </button>
          </div>
          <div className="tvn-modal-body">
            <div className="success-screen">
              <div className="success-icon">
                <CheckCircle size={28} />
              </div>
              <h4>Licença gerada com sucesso</h4>
              <p>Guarde esta chave — ela será usada para ativar o software no cliente.</p>
              <div className="key-display">{createdKey}</div>
              <button className="btn btn-primary" onClick={copyKey}>
                <Copy size={14} />
                Copiar chave
              </button>
            </div>
          </div>
          <div className="tvn-modal-footer">
            <button className="btn btn-ghost" onClick={() => onSaved(createdKey)}>
              Fechar
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="tvn-modal tvn-modal-lg">
        <div className="tvn-modal-header">
          <h3>{license ? "Editar licença" : "Nova licença"}</h3>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="tvn-modal-body">
          <form id="license-form" onSubmit={handleSubmit}>
            {error && <div className="inline-error">{error}</div>}

            {!license && (
              <div className="field">
                <label>Cliente *</label>
                <select value={form.client_id} onChange={(e) => set("client_id", e.target.value)} required>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id.toString()}>
                      {c.name} {c.company ? `(${c.company})` : ""}
                    </option>
                  ))}
                  {clients.length === 0 && <option value="">Nenhum cliente disponível</option>}
                </select>
              </div>
            )}

            <div className={license ? "field" : "field-row"}>
              {!license && (
                <div className="field">
                  <label>Módulo *</label>
                  <select value={form.module} onChange={(e) => set("module", e.target.value)}>
                    <option value="all">Todos (all)</option>
                    <option value="admin">Admin</option>
                    <option value="cardapio">Cardápio</option>
                    <option value="garcom">Garçom</option>
                    <option value="cozinha">Cozinha</option>
                    <option value="caixa">Caixa</option>
                    <option value="totem">Totem</option>
                  </select>
                </div>
              )}
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="expired">Expirado</option>
                  <option value="suspended">Suspenso</option>
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Início *</label>
                <input type="date" value={form.started_at} onChange={(e) => set("started_at", e.target.value)} required />
              </div>
              <div className="field">
                <label>Expiração (vazio = vitalícia)</label>
                <input type="date" value={form.expires_at} onChange={(e) => set("expires_at", e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label>Máx. dispositivos</label>
              <input
                type="number"
                min="1"
                value={form.max_devices}
                onChange={(e) => set("max_devices", e.target.value)}
              />
            </div>

            <div className="field">
              <label>Observações</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notas opcionais..." />
            </div>
          </form>
        </div>
        <div className="tvn-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="license-form" className="btn btn-primary" disabled={loading || (!license && clients.length === 0)}>
            {loading ? (
              <>
                <div className="spinner" style={{ borderTopColor: "#061210" }} />
                Salvando...
              </>
            ) : (
              license ? "Salvar alterações" : "Criar licença"
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Licenses Page ────────────────────────────────────────────────────────────
function LicensesPage({ toast }: { toast: (msg: string, type?: "success" | "error") => void }) {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editLicense, setEditLicense] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (moduleFilter) params.module = moduleFilter;
      const data = await api.listLicenses(params);
      setLicenses(data);
    } catch (err: any) {
      toast(err.message || "Erro ao carregar licenças", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, moduleFilter, toast]);

  const loadClients = useCallback(async () => {
    try {
      const data = await api.listClients({ active: "true" });
      setClients(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadLicenses();
    loadClients();
  }, [loadLicenses, loadClients]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteLicense(deleteTarget.id);
      toast("Licença excluída com sucesso", "success");
      setDeleteTarget(null);
      loadLicenses();
    } catch (err: any) {
      toast(err.message || "Erro ao excluir licença", "error");
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleSaved(createdKey?: string) {
    setModalOpen(false);
    setEditLicense(null);
    if (!createdKey) {
      toast("Licença atualizada!", "success");
    } else {
      toast("Licença criada com sucesso!", "success");
    }
    loadLicenses();
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).then(
      () => toast("Chave copiada!", "success"),
      () => toast("Erro ao copiar", "error")
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Licenças</div>
          <div className="page-subtitle">Gerencie as licenças emitidas</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditLicense(null); setModalOpen(true); }}>
          <Plus size={15} />
          Nova licença
        </button>
      </div>

      <div className="search-row">
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
          <option value="expired">Expirado</option>
          <option value="suspended">Suspenso</option>
        </select>
        <select className="filter-select" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          <option value="">Todos os módulos</option>
          <option value="all">all</option>
          <option value="admin">admin</option>
          <option value="cardapio">cardapio</option>
          <option value="garcom">garcom</option>
          <option value="cozinha">cozinha</option>
          <option value="caixa">caixa</option>
          <option value="totem">totem</option>
        </select>
        <button className="btn btn-ghost" onClick={loadLicenses}>
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="section-card">
        {loading ? (
          <div className="loading-wrap">
            <div className="spinner" />
            Carregando...
          </div>
        ) : licenses.length === 0 ? (
          <div className="empty-state">
            <Key size={48} />
            <p>Nenhuma licença encontrada</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Chave</th>
                  <th>Cliente</th>
                  <th>Módulo</th>
                  <th>Status</th>
                  <th>Início</th>
                  <th>Expiração</th>
                  <th>Disp.</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="license-key-cell">
                        <span className="license-key-text" title={l.license_key}>
                          {l.license_key.length > 22 ? l.license_key.substring(0, 22) + "…" : l.license_key}
                        </span>
                        <button
                          className="btn-icon"
                          title="Copiar chave"
                          onClick={() => copyKey(l.license_key)}
                          style={{ padding: 3 }}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{l.client_name}</div>
                      {l.client_company && (
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{l.client_company}</div>
                      )}
                    </td>
                    <td>
                      <ModuleBadge module={l.module} />
                    </td>
                    <td>
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="muted">{formatDate(l.started_at)}</td>
                    <td className="muted">
                      {l.expires_at ? (
                        <span style={{ color: l.status === "expired" ? "var(--danger)" : undefined }}>
                          {formatDate(l.expires_at)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--primary)", fontSize: 12 }}>Vitalícia</span>
                      )}
                    </td>
                    <td className="muted">{l.max_devices}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          className="btn-icon"
                          title="Editar"
                          onClick={() => { setEditLicense(l); setModalOpen(true); }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn-icon danger"
                          title="Excluir"
                          onClick={() => setDeleteTarget(l)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <LicenseModal
          license={editLicense}
          clients={clients}
          onClose={() => { setModalOpen(false); setEditLicense(null); }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Excluir licença"
          message={`Tem certeza que deseja excluir a licença "${deleteTarget.license_key}"? Esta ação não pode ser desfeita.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem("tvn_license_token") || "");
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [page, setPage] = useState<Page>("dashboard");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("tvn_theme") as any) || "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toastId = useRef(0);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("tvn_theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  const toast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  function removeToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function handleLogin(newToken: string, newAdmin: Admin) {
    setToken(newToken);
    setAdmin(newAdmin);
    setPage("dashboard");
  }

  function handleLogout() {
    localStorage.removeItem("tvn_license_token");
    setToken("");
    setAdmin(null);
    setPage("dashboard");
  }

  function navigate(p: Page) {
    setPage(p);
    setSidebarOpen(false);
  }

  if (!token) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <ToastContainer toasts={toasts} remove={removeToast} />
      </>
    );
  }

  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 size={16} /> },
    { id: "clients",   label: "Clientes",  icon: <Users size={16} /> },
    { id: "licenses",  label: "Licenças",  icon: <Key size={16} /> },
  ];

  return (
    <div className="app">
      {/* Topbar */}
      <header className="topbar">
        <button className="topbar-hamburger" onClick={() => setSidebarOpen(true)} title="Menu">
          <Menu size={18} />
        </button>
        <div className="topbar-logo">
          <img src="/tavonlogowhite.png" alt="Tavon" className="topbar-logo-img topbar-logo-dark" />
          <img src="/tavonlogo.png"      alt="Tavon" className="topbar-logo-img topbar-logo-light" />
          <span className="topbar-label">Licenças</span>
        </div>
        <div className="topbar-right">
          {admin && <span className="topbar-admin">{admin.name || admin.email}</span>}
          <button className="theme-toggle" onClick={toggleTheme} title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="btn btn-ghost" onClick={handleLogout} style={{ padding: "0 12px", minHeight: 36 }}>
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </header>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-label">Menu</div>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? "active" : ""}`}
            onClick={() => navigate(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </aside>

      {/* Main */}
      <main className="main">
        {page === "dashboard" && <DashboardPage toast={toast} />}
        {page === "clients"   && <ClientsPage toast={toast} />}
        {page === "licenses"  && <LicensesPage toast={toast} />}
      </main>

      <ToastContainer toasts={toasts} remove={removeToast} />
    </div>
  );
}
