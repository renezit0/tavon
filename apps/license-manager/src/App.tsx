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
  Shield,
  CreditCard,
  Download,
  Lock,
  Eye,
  EyeOff,
  Monitor,
  ExternalLink,
  AlertCircle,
  CheckSquare,
  Building2,
  MessageSquare,
  Home,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Page = "dashboard" | "clients" | "licenses" | "admins" | "payments" | "downloads" | "demos";

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

function formatCurrency(val: number | string): string {
  return Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "badge badge-suspended",
    paid: "badge badge-active",
    overdue: "badge badge-expired",
    cancelled: "badge badge-inactive",
  };
  const labels: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    overdue: "Vencido",
    cancelled: "Cancelado",
  };
  return <span className={map[status] || "badge badge-inactive"}>{labels[status] || status}</span>;
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

// ─── Password Input ───────────────────────────────────────────────────────────
function PasswordInput({
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "••••••••"}
        required={required}
        autoComplete={autoComplete}
        style={{ paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--muted)",
          display: "flex",
          alignItems: "center",
          padding: 0,
        }}
        tabIndex={-1}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
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

// ─── Set Client Password Modal ────────────────────────────────────────────────
function SetPasswordModal({
  client,
  onClose,
  onSaved,
}: {
  client: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError("Senha deve ter ao menos 6 caracteres"); return; }
    if (password !== confirm) { setError("As senhas não coincidem"); return; }
    setError("");
    setLoading(true);
    try {
      await api.setClientPassword(client.id, password);
      onSaved();
    } catch (err: any) {
      setError(err.message || "Erro ao definir senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="tvn-modal" style={{ width: "min(400px, calc(100vw - 32px))" }}>
        <div className="tvn-modal-header">
          <h3>Senha do portal — {client.name}</h3>
          <button type="button" className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="tvn-modal-body">
          <form id="setpw-form" onSubmit={handleSubmit}>
            {error && <div className="inline-error">{error}</div>}
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8 }}>
              Define a senha que <strong>{client.email}</strong> usará para acessar o portal do cliente.
            </p>
            <div className="field">
              <label>Nova senha *</label>
              <PasswordInput value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" required autoComplete="new-password" />
            </div>
            <div className="field">
              <label>Confirmar senha *</label>
              <PasswordInput value={confirm} onChange={setConfirm} placeholder="Repita a senha" required autoComplete="new-password" />
            </div>
          </form>
        </div>
        <div className="tvn-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" form="setpw-form" className="btn btn-primary" disabled={loading}>
            {loading ? <><div className="spinner" />Salvando...</> : "Definir senha"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Orbit Loader ────────────────────────────────────────────────────────────
function Loader({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="tvn-loader-wrap">
      <div className="tvn-orbit">
        <div className="tvn-orbit-track" />
        <div className="tvn-orbit-track tvn-orbit-inner" />
        <div className="tvn-orbit-center">
          <span className="mark-tavon tvn-orbit-mark" aria-hidden="true">
            T<span className="wm-v-stack"><span className="wm-fork">^</span><span className="wm-v">v</span></span>N
          </span>
        </div>
      </div>
      {label && <span className="tvn-loader-label">{label}</span>}
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({
  onLogin,
}: {
  onLogin: (token: string, role: "admin" | "client", user: any) => void;
}) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.role === "admin") {
        localStorage.setItem("tvn_license_token", res.token);
      } else {
        localStorage.setItem("tvn_portal_token", res.token);
      }
      onLogin(res.token, res.role, res.user);
    } catch (err: any) {
      setError(err.message || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ width: "min(420px, calc(100vw - 32px))" }}>
        <div className="login-logo">
          <span className="mark-tavon login-wordmark" aria-label="Tavon">TA<span className="wm-v-stack"><span className="wm-fork">^</span><span className="wm-v">v</span></span>ON</span>
          <span className="login-logo-tag">Área Restrita</span>
        </div>

        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label>E-mail</label>
            <input
              type="email" value={email} autoFocus required
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label>Senha</label>
            <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 6 }}>
            {loading
              ? <><div className="spinner" style={{ borderTopColor: "#0a0a0c" }} />Verificando...</>
              : "Entrar"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <a href="/" className="login-home-link">
            <Home size={12} style={{ verticalAlign: "middle", marginRight: 5 }} />
            Voltar à página inicial
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Client Portal Page ───────────────────────────────────────────────────────
function ClientPortalPage({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("tvn_theme") as any) || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("tvn_theme", theme);
  }, [theme]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.portalMe(token);
      setData(res);
    } catch (err: any) {
      if (err.message?.includes("401") || err.message?.toLowerCase().includes("token")) {
        onLogout();
      } else {
        setError(err.message || "Erro ao carregar dados");
      }
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => { load(); }, [load]);

  // /portal/me returns: { id, name, email, ..., licenses[], payments[], devices[] }
  const client = data ? { id: data.id, name: data.name, email: data.email, phone: data.phone, company: data.company } : null;
  const licenses: any[] = data?.licenses || [];
  const payments: any[] = data?.payments || [];
  const devices: any[] = data?.devices || [];

  const pendingTotal = payments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-logo">
          <span className="mark-tavon topbar-wordmark" aria-label="Tavon">TA<span className="wm-v-stack"><span className="wm-fork">^</span><span className="wm-v">v</span></span>ON</span>
          <span className="topbar-label">Portal do Cliente</span>
        </div>
        <div className="topbar-right">
          {client && <span className="topbar-admin">{client.name}</span>}
          <button className="theme-toggle" onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")} title="Alternar tema">
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="btn btn-ghost" onClick={onLogout} style={{ padding: "0 12px", minHeight: 36 }}>
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </header>

      <main style={{ padding: "24px 24px 40px", maxWidth: 960, margin: "0 auto" }}>
        {loading ? (
          <Loader />
        ) : error ? (
          <div className="empty-state">
            <AlertCircle size={40} />
            <p>{error}</p>
            <button className="btn btn-primary" onClick={load}><RefreshCw size={14} />Tentar novamente</button>
          </div>
        ) : (
          <>
            {/* Header welcome */}
            <div style={{ marginBottom: 28 }}>
              <div className="page-title">Olá, {client?.name?.split(" ")[0]} 👋</div>
              <div className="page-subtitle">
                {client?.company && <><Building2 size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />{client.company} · </>}
                {client?.email}
              </div>
            </div>

            {/* Summary cards */}
            <div className="stat-grid" style={{ marginBottom: 28 }}>
              <div className="stat-card">
                <div className="stat-icon green"><Key size={18} /></div>
                <div className="stat-number">{licenses.filter((l) => l.status === "active").length}</div>
                <div className="stat-label">Licenças ativas</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue"><Monitor size={18} /></div>
                <div className="stat-number">{devices.length}</div>
                <div className="stat-label">Dispositivos registrados</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon yellow"><CreditCard size={18} /></div>
                <div className="stat-number">{payments.filter((p) => p.status === "pending" || p.status === "overdue").length}</div>
                <div className="stat-label">Pagamentos pendentes</div>
              </div>
              {pendingTotal > 0 && (
                <div className="stat-card">
                  <div className="stat-icon red"><AlertCircle size={18} /></div>
                  <div className="stat-number" style={{ fontSize: 18 }}>{formatCurrency(pendingTotal)}</div>
                  <div className="stat-label">Total em aberto</div>
                </div>
              )}
            </div>

            {/* Licenses */}
            <div className="section-card" style={{ marginBottom: 24 }}>
              <div className="section-card-header">
                <span className="section-card-title">Minhas licenças</span>
              </div>
              {licenses.length === 0 ? (
                <div className="empty-state"><Key size={40} /><p>Nenhuma licença encontrada</p></div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Chave</th>
                        <th>Módulo</th>
                        <th>Status</th>
                        <th>Expiração</th>
                        <th>Disp. / Máx.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licenses.map((l: any) => (
                        <tr key={l.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span className="license-key-text" title={l.license_key}>
                                {l.license_key.length > 22 ? l.license_key.substring(0, 22) + "…" : l.license_key}
                              </span>
                              <button
                                className="btn-icon"
                                title="Copiar"
                                style={{ padding: 3 }}
                                onClick={() => navigator.clipboard.writeText(l.license_key)}
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </td>
                          <td><ModuleBadge module={l.module} /></td>
                          <td><StatusBadge status={l.status} /></td>
                          <td className="muted">
                            {l.expires_at ? (
                              <span style={{ color: l.status === "expired" ? "var(--danger)" : undefined }}>
                                {formatDate(l.expires_at)}
                              </span>
                            ) : (
                              <span style={{ color: "var(--primary)", fontSize: 12 }}>Vitalícia</span>
                            )}
                          </td>
                          <td className="muted">{l.devices?.length || 0} / {l.max_devices}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Devices */}
              {devices.length > 0 && (
                <div style={{ padding: "0 20px 16px" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, fontWeight: 600 }}>
                    Dispositivos ativados
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {devices.map((d: any, i: number) => (
                      <div key={i} style={{
                        background: "var(--surface2)", borderRadius: 8,
                        padding: "6px 12px", fontSize: 12, color: "var(--text)",
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        <Monitor size={12} style={{ color: "var(--primary)" }} />
                        <span>{d.hostname || d.machine_id.substring(0, 12)}</span>
                        {d.platform && <span style={{ color: "var(--muted)" }}>{d.platform}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Payments */}
            <div className="section-card">
              <div className="section-card-header">
                <span className="section-card-title">Histórico de pagamentos</span>
              </div>
              {payments.length === 0 ? (
                <div className="empty-state"><CreditCard size={40} /><p>Nenhum pagamento registrado</p></div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Descrição</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th>Vencimento</th>
                        <th>Pago em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p: any) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 500 }}>{p.description}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                          <td><PaymentStatusBadge status={p.status} /></td>
                          <td className="muted">{formatDate(p.due_date)}</td>
                          <td className="muted">{p.paid_at ? formatDate(p.paid_at) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Downloads Page ───────────────────────────────────────────────────────────
const MODULES_INFO = [
  { key: "admin",    label: "Tavon Admin",    desc: "Painel administrativo completo",   pattern: /tavon-admin-setup/i,    color: "#6366f1", ext: "exe" },
  { key: "cardapio", label: "Tavon Cardápio", desc: "Cardápio digital para mesas/QR",   pattern: /tavon-cardapio-setup/i, color: "#10b981", ext: "exe" },
  { key: "garcom",   label: "Tavon Garçom",   desc: "App para garçons e atendimento",   pattern: /tavon-garcom-setup/i,   color: "#f59e0b", ext: "exe" },
  { key: "cozinha",  label: "Tavon Cozinha",  desc: "Monitor de pedidos para cozinha",  pattern: /tavon-cozinha-setup/i,  color: "#ef4444", ext: "exe" },
  { key: "caixa",    label: "Tavon Caixa",    desc: "Controle de caixa e pagamentos",   pattern: /tavon-caixa-setup/i,    color: "#3b82f6", ext: "exe" },
  { key: "cardapio-apk", label: "Tavon Cardápio", desc: "Android — cardápio para tablets/celulares", pattern: /tavon-cardapio.*\.apk/i, color: "#10b981", ext: "apk" },
];

function DownloadsPage() {
  const [downloads, setDownloads] = useState<Record<string, { url: string; version: string; name: string; size?: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://api.github.com/repos/renezit0/tavon/releases?per_page=30");
      if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
      const releases: any[] = await res.json();
      const found: Record<string, { url: string; version: string; name: string; size?: number }> = {};

      for (const release of releases) {
        if (release.draft) continue;
        for (const asset of (release.assets || [])) {
          for (const mod of MODULES_INFO) {
            if (!found[mod.key] && mod.pattern.test(asset.name) && asset.name.endsWith(`.${mod.ext}`)) {
              found[mod.key] = {
                url: asset.browser_download_url,
                version: release.tag_name,
                name: asset.name,
                size: asset.size,
              };
            }
          }
        }
        if (Object.keys(found).length === MODULES_INFO.length) break;
      }

      setDownloads(found);
      setLastCheck(new Date());
    } catch (err: any) {
      setError(err.message || "Erro ao buscar releases no GitHub");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function formatSize(bytes?: number) {
    if (!bytes) return "";
    return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Downloads</div>
          <div className="page-subtitle">Última versão de cada módulo publicada no GitHub</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href="https://github.com/renezit0/tavon/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            <ExternalLink size={14} />
            Todas as versões
          </a>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14} />
            Atualizar
          </button>
        </div>
      </div>

      {lastCheck && (
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
          Última verificação: {lastCheck.toLocaleTimeString("pt-BR")}
        </p>
      )}

      {loading ? (
        <Loader label="Buscando releases no GitHub..." />
      ) : error ? (
        <div className="section-card">
          <div className="empty-state">
            <AlertCircle size={40} />
            <p>{error}</p>
            <button className="btn btn-primary" onClick={load}><RefreshCw size={14} />Tentar novamente</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {MODULES_INFO.map((mod) => {
            const dl = downloads[mod.key];
            return (
              <div key={mod.key} className="section-card" style={{ padding: 0, overflow: "hidden" }}>
                {/* Color bar */}
                <div style={{ height: 4, background: mod.color, borderRadius: "10px 10px 0 0" }} />
                <div style={{ padding: "20px 22px 22px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{mod.label}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{mod.desc}</div>
                    </div>
                    {dl && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: mod.color,
                        background: `${mod.color}18`, borderRadius: 6, padding: "2px 8px",
                        whiteSpace: "nowrap", marginLeft: 8,
                      }}>
                        {dl.version}
                      </span>
                    )}
                  </div>

                  {dl ? (
                    <>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, fontFamily: "monospace" }}>
                        {dl.name}
                        {dl.size ? <span style={{ marginLeft: 8 }}>· {formatSize(dl.size)}</span> : ""}
                      </div>
                      <a
                        href={dl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ width: "100%", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      >
                        <Download size={14} />
                        Baixar {mod.ext === "apk" ? "APK (.apk)" : "instalador (.exe)"}
                      </a>
                    </>
                  ) : (
                    <div style={{
                      marginTop: 14, padding: "10px 14px", borderRadius: 8,
                      background: "var(--surface2)", fontSize: 12, color: "var(--muted)",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <AlertCircle size={13} />
                      Nenhuma release encontrada
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Universal installer note */}
      {!loading && !error && (
        <div className="section-card" style={{ marginTop: 16 }}>
          <div className="section-card-header">
            <span className="section-card-title">Instalador universal (PowerShell)</span>
          </div>
          <div style={{ padding: "0 20px 18px" }}>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, lineHeight: 1.6 }}>
              O instalador universal permite selecionar e instalar múltiplos módulos de uma vez.
              Baixe o script e execute no PowerShell do Windows como administrador.
            </p>
            <a
              href="https://github.com/renezit0/tavon/releases/latest/download/Tavon-Install.ps1"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
              style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Download size={14} />
              Baixar Tavon-Install.ps1
            </a>
          </div>
        </div>
      )}
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
    valid: "Válida", invalid: "Inválida", expired: "Expirada", suspended: "Suspensa",
  };
  const validationResultClass: Record<string, string> = {
    valid: "badge badge-active", invalid: "badge badge-expired", expired: "badge badge-expired", suspended: "badge badge-suspended",
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
        <Loader />
      ) : stats ? (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon blue"><Users size={18} /></div>
              <div className="stat-number">{stats.clients.total}</div>
              <div className="stat-label">Total de clientes</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><CheckCircle size={18} /></div>
              <div className="stat-number">{stats.licenses.active}</div>
              <div className="stat-label">Licenças ativas</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red"><Clock size={18} /></div>
              <div className="stat-number">{stats.licenses.expired}</div>
              <div className="stat-label">Licenças expiradas</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow"><Key size={18} /></div>
              <div className="stat-number">{stats.licenses.total}</div>
              <div className="stat-label">Total de licenças</div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-card-header">
              <span className="section-card-title">Validações recentes</span>
            </div>
            {stats.recent_validations.length === 0 ? (
              <div className="empty-state"><BarChart3 size={40} /><p>Nenhuma validação registrada ainda</p></div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Chave</th><th>Módulo</th><th>IP</th><th>Resultado</th><th>Data/Hora</th></tr>
                  </thead>
                  <tbody>
                    {stats.recent_validations.map((v: any) => (
                      <tr key={v.id}>
                        <td><span className="license-key-text">{v.license_key}</span></td>
                        <td><ModuleBadge module={v.module || "—"} /></td>
                        <td className="muted">{v.ip || "—"}</td>
                        <td>
                          <span className={validationResultClass[v.result] || "badge badge-inactive"}>
                            {validationResultLabel[v.result] || v.result}
                          </span>
                        </td>
                        <td className="muted">{new Date(v.validated_at).toLocaleString("pt-BR")}</td>
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
          name: form.name, email: form.email,
          phone: form.phone || null, company: form.company || null,
          notes: form.notes || null, active: form.active,
        });
      } else {
        await api.createClient({
          name: form.name, email: form.email,
          phone: form.phone || undefined, company: form.company || undefined,
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
          <button type="button" className="btn-icon" onClick={onClose}><X size={16} /></button>
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
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" form="client-form" className="btn btn-primary" disabled={loading}>
            {loading ? <><div className="spinner" />Salvando...</> : client ? "Salvar alterações" : "Criar cliente"}
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
  const [pwClient, setPwClient] = useState<any>(null);

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

  function openCreate() { setEditClient(null); setModalOpen(true); }
  function openEdit(client: any) { setEditClient(client); setModalOpen(true); }
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
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} />Novo cliente</button>
      </div>

      <div className="search-row">
        <div className="search-input-wrap">
          <Search size={14} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, e-mail ou empresa..." />
        </div>
        <select className="filter-select" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <button className="btn btn-ghost" onClick={load}><RefreshCw size={14} /></button>
      </div>

      <div className="section-card">
        {loading ? (
          <Loader />
        ) : clients.length === 0 ? (
          <div className="empty-state"><Users size={48} /><p>Nenhum cliente encontrado</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Nome</th><th>E-mail</th><th>Empresa</th><th>Status</th><th>Cadastrado em</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td className="muted">{c.email}</td>
                    <td className="muted">{c.company || "—"}</td>
                    <td><ClientActiveBadge active={c.active} /></td>
                    <td className="muted">{formatDate(c.created_at)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn-icon" title="Editar" onClick={() => openEdit(c)}><Edit2 size={14} /></button>
                        <button className="btn-icon" title="Senha portal" onClick={() => setPwClient(c)} style={{ color: "var(--primary)" }}>
                          <Lock size={14} />
                        </button>
                        <button className="btn-icon danger" title="Excluir" onClick={() => setDeleteTarget(c)}><Trash2 size={14} /></button>
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
        <ClientModal client={editClient} onClose={() => { setModalOpen(false); setEditClient(null); }} onSaved={handleSaved} />
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
      {pwClient && (
        <SetPasswordModal
          client={pwClient}
          onClose={() => setPwClient(null)}
          onSaved={() => { setPwClient(null); toast("Senha do portal definida com sucesso!", "success"); }}
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
          status: form.status, started_at: form.started_at,
          expires_at: form.expires_at || null, max_devices: Number(form.max_devices), notes: form.notes || null,
        });
        onSaved();
      } else {
        const created = await api.createLicense({
          client_id: Number(form.client_id), module: form.module, status: form.status,
          started_at: form.started_at, expires_at: form.expires_at || null,
          max_devices: Number(form.max_devices), notes: form.notes || undefined,
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
    if (createdKey) navigator.clipboard.writeText(createdKey).catch(() => {});
  }

  if (createdKey) {
    return (
      <>
        <div className="modal-backdrop" onClick={() => onSaved(createdKey)} />
        <div className="tvn-modal">
          <div className="tvn-modal-header">
            <h3>Licença criada!</h3>
            <button className="btn-icon" onClick={() => onSaved(createdKey)}><X size={16} /></button>
          </div>
          <div className="tvn-modal-body">
            <div className="success-screen">
              <div className="success-icon"><CheckCircle size={28} /></div>
              <h4>Licença gerada com sucesso</h4>
              <p>Guarde esta chave — ela será usada para ativar o software no cliente.</p>
              <div className="key-display">{createdKey}</div>
              <button className="btn btn-primary" onClick={copyKey}><Copy size={14} />Copiar chave</button>
            </div>
          </div>
          <div className="tvn-modal-footer">
            <button className="btn btn-ghost" onClick={() => onSaved(createdKey)}>Fechar</button>
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
          <button type="button" className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="tvn-modal-body">
          <form id="license-form" onSubmit={handleSubmit}>
            {error && <div className="inline-error">{error}</div>}
            {!license && (
              <div className="field">
                <label>Cliente *</label>
                <select value={form.client_id} onChange={(e) => set("client_id", e.target.value)} required>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id.toString()}>{c.name} {c.company ? `(${c.company})` : ""}</option>
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
              <input type="number" min="1" value={form.max_devices} onChange={(e) => set("max_devices", e.target.value)} />
            </div>
            <div className="field">
              <label>Observações</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notas opcionais..." />
            </div>
          </form>
        </div>
        <div className="tvn-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" form="license-form" className="btn btn-primary" disabled={loading || (!license && clients.length === 0)}>
            {loading ? <><div className="spinner" style={{ borderTopColor: "#061210" }} />Salvando...</> : license ? "Salvar alterações" : "Criar licença"}
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
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadLicenses(); loadClients(); }, [loadLicenses, loadClients]);

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
    toast(createdKey ? "Licença criada com sucesso!" : "Licença atualizada!", "success");
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
          <Plus size={15} />Nova licença
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
        <button className="btn btn-ghost" onClick={loadLicenses}><RefreshCw size={14} /></button>
      </div>

      <div className="section-card">
        {loading ? (
          <Loader />
        ) : licenses.length === 0 ? (
          <div className="empty-state"><Key size={48} /><p>Nenhuma licença encontrada</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Chave</th><th>Cliente</th><th>Módulo</th><th>Status</th><th>Início</th><th>Expiração</th><th>Disp.</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {licenses.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="license-key-cell">
                        <span className="license-key-text" title={l.license_key}>
                          {l.license_key.length > 22 ? l.license_key.substring(0, 22) + "…" : l.license_key}
                        </span>
                        <button className="btn-icon" title="Copiar chave" onClick={() => copyKey(l.license_key)} style={{ padding: 3 }}>
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{l.client_name}</div>
                      {l.client_company && <div style={{ fontSize: 12, color: "var(--muted)" }}>{l.client_company}</div>}
                    </td>
                    <td><ModuleBadge module={l.module} /></td>
                    <td><StatusBadge status={l.status} /></td>
                    <td className="muted">{formatDate(l.started_at)}</td>
                    <td className="muted">
                      {l.expires_at ? (
                        <span style={{ color: l.status === "expired" ? "var(--danger)" : undefined }}>{formatDate(l.expires_at)}</span>
                      ) : (
                        <span style={{ color: "var(--primary)", fontSize: 12 }}>Vitalícia</span>
                      )}
                    </td>
                    <td className="muted">{l.max_devices}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn-icon" title="Editar" onClick={() => { setEditLicense(l); setModalOpen(true); }}><Edit2 size={14} /></button>
                        <button className="btn-icon danger" title="Excluir" onClick={() => setDeleteTarget(l)}><Trash2 size={14} /></button>
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
        <LicenseModal license={editLicense} clients={clients} onClose={() => { setModalOpen(false); setEditLicense(null); }} onSaved={handleSaved} />
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

// ─── Admin Modal ──────────────────────────────────────────────────────────────
function AdminModal({
  admin,
  onClose,
  onSaved,
}: {
  admin?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: admin?.name || "",
    email: admin?.email || "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!admin && form.password.length < 6) {
      setError("Senha deve ter ao menos 6 caracteres");
      return;
    }
    if (form.password && form.password !== form.confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      if (admin) {
        const data: any = { name: form.name, email: form.email };
        if (form.password) data.password = form.password;
        await api.updateAdmin(admin.id, data);
      } else {
        await api.createAdmin({ name: form.name, email: form.email, password: form.password });
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar administrador");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="tvn-modal">
        <div className="tvn-modal-header">
          <h3>{admin ? "Editar administrador" : "Novo administrador"}</h3>
          <button type="button" className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="tvn-modal-body">
          <form id="admin-form" onSubmit={handleSubmit}>
            {error && <div className="inline-error">{error}</div>}
            <div className="field">
              <label>Nome *</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome completo" required />
            </div>
            <div className="field">
              <label>E-mail *</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="admin@tavon.com.br" required />
            </div>
            <div className="field">
              <label>{admin ? "Nova senha (deixe em branco para não alterar)" : "Senha *"}</label>
              <PasswordInput
                value={form.password}
                onChange={(v) => set("password", v)}
                placeholder={admin ? "Nova senha (opcional)" : "Mínimo 6 caracteres"}
                required={!admin}
                autoComplete="new-password"
              />
            </div>
            {form.password && (
              <div className="field">
                <label>Confirmar senha *</label>
                <PasswordInput
                  value={form.confirmPassword}
                  onChange={(v) => set("confirmPassword", v)}
                  placeholder="Repita a senha"
                  required
                  autoComplete="new-password"
                />
              </div>
            )}
          </form>
        </div>
        <div className="tvn-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" form="admin-form" className="btn btn-primary" disabled={loading}>
            {loading ? <><div className="spinner" />Salvando...</> : admin ? "Salvar alterações" : "Criar administrador"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Admins Page ──────────────────────────────────────────────────────────────
function AdminsPage({ toast, currentAdmin }: { toast: (msg: string, type?: "success" | "error") => void; currentAdmin: Admin | null }) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listAdmins();
      setAdmins(data);
    } catch (err: any) {
      toast(err.message || "Erro ao carregar administradores", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteAdmin(deleteTarget.id);
      toast("Administrador excluído", "success");
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast(err.message || "Erro ao excluir", "error");
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleSaved() {
    setModalOpen(false);
    setEditAdmin(null);
    toast(editAdmin ? "Administrador atualizado!" : "Administrador criado!", "success");
    load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Administradores</div>
          <div className="page-subtitle">Gerencie os usuários com acesso ao painel</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditAdmin(null); setModalOpen(true); }}>
          <Plus size={15} />Novo admin
        </button>
      </div>

      <div className="section-card">
        {loading ? (
          <Loader />
        ) : admins.length === 0 ? (
          <div className="empty-state"><Shield size={48} /><p>Nenhum administrador encontrado</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Nome</th><th>E-mail</th><th>Criado em</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>
                      {a.name}
                      {currentAdmin?.id === a.id && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>(você)</span>
                      )}
                    </td>
                    <td className="muted">{a.email}</td>
                    <td className="muted">{formatDate(a.created_at)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn-icon" title="Editar" onClick={() => { setEditAdmin(a); setModalOpen(true); }}><Edit2 size={14} /></button>
                        <button
                          className="btn-icon danger"
                          title="Excluir"
                          onClick={() => setDeleteTarget(a)}
                          disabled={currentAdmin?.id === a.id}
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
        <AdminModal admin={editAdmin} onClose={() => { setModalOpen(false); setEditAdmin(null); }} onSaved={handleSaved} />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Excluir administrador"
          message={`Tem certeza que deseja excluir "${deleteTarget.name}"? Esta ação não pode ser desfeita.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────
function PaymentModal({
  payment,
  clients,
  onClose,
  onSaved,
}: {
  payment?: any;
  clients: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    client_id: payment?.client_id?.toString() || (clients[0]?.id?.toString() || ""),
    description: payment?.description || "",
    amount: payment?.amount?.toString() || "",
    status: payment?.status || "pending",
    due_date: payment?.due_date ? payment.due_date.split("T")[0] : today,
    notes: payment?.notes || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = {
        client_id: Number(form.client_id),
        description: form.description,
        amount: Number(form.amount),
        status: form.status,
        due_date: form.due_date || null,
        notes: form.notes || null,
      };
      if (payment) {
        await api.updatePayment(payment.id, data);
      } else {
        await api.createPayment(data);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar pagamento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="tvn-modal">
        <div className="tvn-modal-header">
          <h3>{payment ? "Editar pagamento" : "Novo pagamento"}</h3>
          <button type="button" className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="tvn-modal-body">
          <form id="payment-form" onSubmit={handleSubmit}>
            {error && <div className="inline-error">{error}</div>}
            <div className="field">
              <label>Cliente *</label>
              <select value={form.client_id} onChange={(e) => set("client_id", e.target.value)} required disabled={!!payment}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id.toString()}>{c.name} {c.company ? `(${c.company})` : ""}</option>
                ))}
                {clients.length === 0 && <option value="">Nenhum cliente disponível</option>}
              </select>
            </div>
            <div className="field">
              <label>Descrição *</label>
              <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Ex: Mensalidade maio/2025" required />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Valor (R$) *</label>
                <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0,00" required />
              </div>
              <div className="field">
                <label>Vencimento</label>
                <input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="overdue">Vencido</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div className="field">
              <label>Observações</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notas opcionais..." />
            </div>
          </form>
        </div>
        <div className="tvn-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" form="payment-form" className="btn btn-primary" disabled={loading || clients.length === 0}>
            {loading ? <><div className="spinner" />Salvando...</> : payment ? "Salvar alterações" : "Registrar pagamento"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Payments Page ────────────────────────────────────────────────────────────
function PaymentsPage({ toast }: { toast: (msg: string, type?: "success" | "error") => void }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<number | null>(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (clientFilter) params.client_id = Number(clientFilter);
      const data = await api.listPayments(params);
      setPayments(data);
    } catch (err: any) {
      toast(err.message || "Erro ao carregar pagamentos", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientFilter, toast]);

  const loadClients = useCallback(async () => {
    try {
      const data = await api.listClients();
      setClients(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadPayments(); loadClients(); }, [loadPayments, loadClients]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deletePayment(deleteTarget.id);
      toast("Pagamento excluído", "success");
      setDeleteTarget(null);
      loadPayments();
    } catch (err: any) {
      toast(err.message || "Erro ao excluir", "error");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function markAsPaid(payment: any) {
    setMarkingPaid(payment.id);
    try {
      await api.updatePayment(payment.id, { ...payment, status: "paid" });
      toast("Pagamento marcado como pago!", "success");
      loadPayments();
    } catch (err: any) {
      toast(err.message || "Erro ao atualizar", "error");
    } finally {
      setMarkingPaid(null);
    }
  }

  function handleSaved() {
    setModalOpen(false);
    setEditPayment(null);
    toast(editPayment ? "Pagamento atualizado!" : "Pagamento registrado!", "success");
    loadPayments();
  }

  // Summary
  const totalPending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
  const totalOverdue = payments.filter((p) => p.status === "overdue").reduce((s, p) => s + Number(p.amount), 0);
  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Pagamentos</div>
          <div className="page-subtitle">Controle financeiro dos clientes</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditPayment(null); setModalOpen(true); }}>
          <Plus size={15} />Novo pagamento
        </button>
      </div>

      {/* Summary */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon yellow"><Clock size={18} /></div>
          <div className="stat-number" style={{ fontSize: 20 }}>{formatCurrency(totalPending)}</div>
          <div className="stat-label">Pendente</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><AlertCircle size={18} /></div>
          <div className="stat-number" style={{ fontSize: 20 }}>{formatCurrency(totalOverdue)}</div>
          <div className="stat-label">Vencido</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle size={18} /></div>
          <div className="stat-number" style={{ fontSize: 20 }}>{formatCurrency(totalPaid)}</div>
          <div className="stat-label">Recebido (filtro atual)</div>
        </div>
      </div>

      <div className="search-row">
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="paid">Pago</option>
          <option value="overdue">Vencido</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <select className="filter-select" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
          <option value="">Todos os clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={loadPayments}><RefreshCw size={14} /></button>
      </div>

      <div className="section-card">
        {loading ? (
          <Loader />
        ) : payments.length === 0 ? (
          <div className="empty-state"><CreditCard size={48} /><p>Nenhum pagamento encontrado</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Cliente</th><th>Descrição</th><th>Valor</th><th>Status</th><th>Vencimento</th><th>Pago em</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.client_name || "—"}</td>
                    <td className="muted">{p.description}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                    <td><PaymentStatusBadge status={p.status} /></td>
                    <td className="muted">
                      {p.due_date ? (
                        <span style={{ color: p.status === "overdue" ? "var(--danger)" : undefined }}>
                          {formatDate(p.due_date)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="muted">{p.paid_at ? formatDate(p.paid_at) : "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        {(p.status === "pending" || p.status === "overdue") && (
                          <button
                            className="btn-icon"
                            title="Marcar como pago"
                            onClick={() => markAsPaid(p)}
                            disabled={markingPaid === p.id}
                            style={{ color: "var(--primary)" }}
                          >
                            {markingPaid === p.id ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <CheckSquare size={14} />}
                          </button>
                        )}
                        <button className="btn-icon" title="Editar" onClick={() => { setEditPayment(p); setModalOpen(true); }}><Edit2 size={14} /></button>
                        <button className="btn-icon danger" title="Excluir" onClick={() => setDeleteTarget(p)}><Trash2 size={14} /></button>
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
        <PaymentModal payment={editPayment} clients={clients} onClose={() => { setModalOpen(false); setEditPayment(null); }} onSaved={handleSaved} />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Excluir pagamento"
          message={`Tem certeza que deseja excluir o pagamento "${deleteTarget.description}"?`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}

// ─── Demo Requests Page ────────────────────────────────────────────────────────
function DemoPage({ toast }: { toast: (msg: string, type?: "success" | "error") => void }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("");

  useEffect(() => {
    api.listDemos().then(setRequests).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: number, status: string) {
    try {
      const updated = await api.updateDemo(id, status);
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast("Status atualizado");
    } catch (e: any) { toast(e.message, "error"); }
  }

  async function deleteReq(id: number) {
    if (!confirm("Remover esta solicitação?")) return;
    try {
      await api.deleteDemo(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast("Solicitação removida");
    } catch (e: any) { toast(e.message, "error"); }
  }

  const statusLabel: Record<string, string> = { new: "Novo", contacted: "Contatado", closed: "Encerrado" };
  const filtered = filter ? requests.filter((r) => r.status === filter) : requests;
  const newCount = requests.filter((r) => r.status === "new").length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">
            Solicitações de Demo
            {newCount > 0 && (
              <span style={{ marginLeft: 10, fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "var(--primary-dim)", color: "var(--primary)" }}>
                {newCount} novo{newCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="page-subtitle">{requests.length} solicitação(ões) recebida(s) pelo site</div>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">Todas</option>
          <option value="new">Novos</option>
          <option value="contacted">Contatados</option>
          <option value="closed">Encerrados</option>
        </select>
      </div>

      <div className="section-card">
        {loading ? (
          <Loader />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <MessageSquare size={48} />
            <p>Nenhuma solicitação encontrada</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome / Empresa</th>
                  <th>E-mail / Telefone</th>
                  <th>Mensagem</th>
                  <th>Status</th>
                  <th>Recebido em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div>{r.name || <span style={{ color: "var(--muted)" }}>—</span>}</div>
                      {r.company && <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.company}</div>}
                    </td>
                    <td>
                      <div>
                        <a href={`mailto:${r.email}`} style={{ color: "var(--primary)", textDecoration: "none" }}>
                          {r.email}
                        </a>
                      </div>
                      {r.phone && <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.phone}</div>}
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      <span title={r.message || ""} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.message || <span style={{ color: "var(--muted)" }}>—</span>}
                      </span>
                    </td>
                    <td>
                      <select
                        value={r.status}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                        className="filter-select"
                        style={{ fontSize: 12, padding: "3px 8px" }}
                      >
                        <option value="new">Novo</option>
                        <option value="contacted">Contatado</option>
                        <option value="closed">Encerrado</option>
                      </select>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>{formatDate(r.created_at)}</td>
                    <td>
                      <button className="btn-icon danger" onClick={() => deleteReq(r.id)} title="Remover">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem("tvn_license_token") || "");
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [portalToken, setPortalToken] = useState<string>(() => localStorage.getItem("tvn_portal_token") || "");
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

  function handleLogin(newToken: string, role: "admin" | "client", user: any) {
    if (role === "admin") {
      setToken(newToken);
      setAdmin(user);
      setPage("dashboard");
    } else {
      setPortalToken(newToken);
    }
  }

  function handleAdminLogout() {
    localStorage.removeItem("tvn_license_token");
    setToken("");
    setAdmin(null);
    setPage("dashboard");
  }

  function handlePortalLogout() {
    localStorage.removeItem("tvn_portal_token");
    setPortalToken("");
  }

  function navigate(p: Page) {
    setPage(p);
    setSidebarOpen(false);
  }

  // ── Client portal session ──
  if (portalToken) {
    return (
      <>
        <ClientPortalPage token={portalToken} onLogout={handlePortalLogout} />
        <ToastContainer toasts={toasts} remove={removeToast} />
      </>
    );
  }

  // ── Not logged in ──
  if (!token) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <ToastContainer toasts={toasts} remove={removeToast} />
      </>
    );
  }

  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard",       icon: <BarChart3 size={16} /> },
    { id: "clients",   label: "Clientes",         icon: <Users size={16} /> },
    { id: "licenses",  label: "Licenças",          icon: <Key size={16} /> },
    { id: "payments",  label: "Pagamentos",        icon: <CreditCard size={16} /> },
    { id: "admins",    label: "Administradores",   icon: <Shield size={16} /> },
    { id: "downloads", label: "Downloads",         icon: <Download size={16} /> },
    { id: "demos",     label: "Demos",             icon: <MessageSquare size={16} /> },
  ];

  return (
    <div className="app">
      {/* Topbar */}
      <header className="topbar">
        <button className="topbar-hamburger" onClick={() => setSidebarOpen(true)} title="Menu">
          <Menu size={18} />
        </button>
        <div className="topbar-logo">
          <span className="mark-tavon topbar-wordmark" aria-label="Tavon">TA<span className="wm-v-stack"><span className="wm-fork">^</span><span className="wm-v">v</span></span>ON</span>
          <span className="topbar-label">Licenças</span>
        </div>
        <div className="topbar-right">
          {admin && <span className="topbar-admin">{admin.name || admin.email}</span>}
          <a href="/" className="btn btn-ghost" style={{ padding: "0 12px", minHeight: 36, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }} title="Página inicial">
            <Home size={14} />
          </a>
          <button className="theme-toggle" onClick={toggleTheme} title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="btn btn-ghost" onClick={handleAdminLogout} style={{ padding: "0 12px", minHeight: 36 }}>
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
        {page === "payments"  && <PaymentsPage toast={toast} />}
        {page === "admins"    && <AdminsPage toast={toast} currentAdmin={admin} />}
        {page === "downloads" && <DownloadsPage />}
        {page === "demos"     && <DemoPage toast={toast} />}
      </main>

      <ToastContainer toasts={toasts} remove={removeToast} />
    </div>
  );
}
