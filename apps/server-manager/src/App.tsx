import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ChevronRight,
  CircleDot,
  Database,
  ExternalLink,
  Globe,
  LayoutDashboard,
  Play,
  RefreshCw,
  Save,
  ScrollText,
  Server,
  Settings2,
  Square,
  Trash2,
  Wifi
} from "lucide-react";

declare global {
  interface Window {
    tavonServer: {
      start: () => Promise<void>;
      stop: () => Promise<void>;
      restart: () => Promise<void>;
      getStatus: () => Promise<{ status: string; uptime: number }>;
      getLogs: () => Promise<LogEntry[]>;
      clearLogs: () => Promise<void>;
      getConfig: () => Promise<ServerConfig>;
      saveConfig: (cfg: ServerConfig) => Promise<void>;
      openBrowser: (port: number) => Promise<void>;
      getLocalIp: () => Promise<string>;
      onStatus: (cb: (data: { status: string; uptime: number }) => void) => () => void;
      onLog: (cb: (entry: LogEntry) => void) => () => void;
    };
  }
}

type ServerStatus = "stopped" | "starting" | "running" | "error" | "external";

type LogEntry = {
  level: "info" | "warn" | "error";
  msg: string;
  time: string;
};

type ServerConfig = {
  port: number;
  host: string;
  storage: "memory" | "mysql";
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  jwtSecret: string;
  autoStart: boolean;
  externalMode: boolean;
  externalUrl: string;
};

type Tab = "dashboard" | "config" | "logs";

const isDesktop = Boolean(window.tavonServer);

function formatUptime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function StatusPill({ status }: { status: ServerStatus }) {
  const map: Record<ServerStatus, { label: string; cls: string }> = {
    stopped:  { label: "Parado",    cls: "pill-stopped" },
    starting: { label: "Iniciando", cls: "pill-starting" },
    running:  { label: "Rodando",   cls: "pill-running" },
    error:    { label: "Erro",      cls: "pill-error" },
    external: { label: "Externo",   cls: "pill-external" }
  };
  const { label, cls } = map[status] ?? map.stopped;
  return <span className={`status-pill ${cls}`}><CircleDot size={11} />{label}</span>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [status, setStatus] = useState<ServerStatus>("stopped");
  const [uptime, setUptime] = useState(0);
  const [localIp, setLocalIp] = useState("127.0.0.1");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [draft, setDraft] = useState<ServerConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    if (!isDesktop) { setReady(true); return; }
    window.tavonServer.getStatus().then((s) => {
      setStatus(s.status as ServerStatus);
      setUptime(s.uptime);
    });
    window.tavonServer.getLogs().then(setLogs);
    Promise.all([
      window.tavonServer.getConfig(),
      new Promise((r) => setTimeout(r, 3500))
    ]).then(([cfg]) => {
      setConfig(cfg as any);
      setDraft(cfg as any);
      setReady(true);
    });
    window.tavonServer.getLocalIp().then(setLocalIp);

    const offStatus = window.tavonServer.onStatus((s) => {
      setStatus(s.status as ServerStatus);
      setUptime(s.uptime);
    });
    const offLog = window.tavonServer.onLog((entry) => {
      setLogs((prev) => [...prev.slice(-399), entry]);
    });
    return () => { offStatus(); offLog(); };
  }, []);

  useEffect(() => {
    if (autoScrollRef.current) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  async function handleStart() { await window.tavonServer.start(); }
  async function handleStop()  { await window.tavonServer.stop(); }
  async function handleRestart() { await window.tavonServer.restart(); }

  async function handleSave() {
    if (!draft) return;
    await window.tavonServer.saveConfig(draft);
    setConfig(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleClearLogs() {
    await window.tavonServer.clearLogs();
    setLogs([]);
  }

  function update(field: keyof ServerConfig, value: unknown) {
    setDraft((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  const port = config?.port ?? 3333;

  if (!ready) {
    return (
      <div className="loader-splash">
        <div className="loader-inner">
          <div className="loader-stroke">
            <svg viewBox="-62 340 1028 410" preserveAspectRatio="xMidYMid meet">
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
          <div className="loader-bars">
            <span /><span /><span /><span /><span /><span /><span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="mark-tavon">
            T<span className="wm-v-stack"><span className="wm-fork">^</span><span className="wm-v">v</span></span>N
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.5 }}>Server</span>
        </div>

        <nav className="sidebar-nav">
          {([
            ["dashboard", "Dashboard", LayoutDashboard],
            ["config",    "Configuração", Settings2],
            ["logs",      "Logs",       ScrollText]
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <StatusPill status={status} />
        </div>
      </aside>

      {/* Main */}
      <main className="content">

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div className="section">
            <h1 className="section-title">Dashboard</h1>

            <div className="status-card">
              <div className="status-card-left">
                <StatusPill status={status} />
                {status === "running" && (
                  <span className="uptime-label">
                    <Activity size={13} /> Uptime: {formatUptime(uptime)}
                  </span>
                )}
              </div>
              <div className="action-row">
                {status === "stopped" || status === "error" ? (
                  <button className="btn-primary" onClick={handleStart}>
                    <Play size={15} /> Iniciar
                  </button>
                ) : status === "running" ? (
                  <>
                    <button className="btn-ghost" onClick={handleRestart}>
                      <RefreshCw size={14} /> Reiniciar
                    </button>
                    <button className="btn-danger" onClick={handleStop}>
                      <Square size={14} /> Parar
                    </button>
                  </>
                ) : status === "starting" ? (
                  <button className="btn-ghost" disabled>
                    <RefreshCw size={14} className="spin" /> Aguarde...
                  </button>
                ) : null}
              </div>
            </div>

            {status === "running" && (
              <div className="info-grid">
                <div className="info-card">
                  <Globe size={16} />
                  <div>
                    <small>Endereço local</small>
                    <strong>http://localhost:{port}</strong>
                  </div>
                  <button className="btn-icon" onClick={() => window.tavonServer.openBrowser(port)} title="Abrir no navegador">
                    <ExternalLink size={14} />
                  </button>
                </div>

                <div className="info-card">
                  <Wifi size={16} />
                  <div>
                    <small>Rede local</small>
                    <strong>http://{localIp}:{port}</strong>
                  </div>
                </div>

                <div className="info-card">
                  <Database size={16} />
                  <div>
                    <small>Armazenamento</small>
                    <strong>{config?.storage === "mysql" ? `MySQL — ${config.dbHost}` : "Memória (demo)"}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="quicklog-panel">
              <div className="panel-heading">
                <span>Últimas mensagens</span>
                <button className="tab-link" onClick={() => setTab("logs")}>
                  Ver tudo <ChevronRight size={13} />
                </button>
              </div>
              <div className="quicklog-list">
                {logs.slice(-8).map((e, i) => (
                  <div key={i} className={`log-line ${e.level}`}>
                    <span className="log-time">{e.time.slice(11, 19)}</span>
                    <span>{e.msg}</span>
                  </div>
                ))}
                {logs.length === 0 && <p className="empty">Nenhum log ainda.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIG ── */}
        {tab === "config" && draft && (
          <div className="section">
            <h1 className="section-title">Configuração</h1>

            <div className="config-panel">
              <h3>Modo de operação</h3>
              <div className="toggle-option">
                <label>
                  <input
                    type="radio"
                    checked={!draft.externalMode}
                    onChange={() => update("externalMode", false)}
                  />
                  <span>
                    <strong>Servidor local</strong>
                    <small>Roda o backend nesta máquina</small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    checked={draft.externalMode}
                    onChange={() => update("externalMode", true)}
                  />
                  <span>
                    <strong>Servidor externo</strong>
                    <small>Conecta a um backend remoto</small>
                  </span>
                </label>
              </div>

              {draft.externalMode ? (
                <div className="field-group">
                  <label>URL do servidor externo</label>
                  <input
                    type="url"
                    placeholder="https://api.seudominio.com"
                    value={draft.externalUrl}
                    onChange={(e) => update("externalUrl", e.target.value)}
                  />
                </div>
              ) : (
                <>
                  <div className="field-row">
                    <div className="field-group">
                      <label>Porta</label>
                      <input
                        type="number"
                        value={draft.port}
                        min={1024}
                        max={65535}
                        onChange={(e) => update("port", Number(e.target.value))}
                      />
                    </div>
                    <div className="field-group">
                      <label>Host</label>
                      <input
                        type="text"
                        value={draft.host}
                        onChange={(e) => update("host", e.target.value)}
                      />
                    </div>
                  </div>

                  <h3>Banco de dados</h3>
                  <div className="toggle-option">
                    <label>
                      <input
                        type="radio"
                        checked={draft.storage === "memory"}
                        onChange={() => update("storage", "memory")}
                      />
                      <span>
                        <strong>Memória (demo)</strong>
                        <small>Dados em RAM — reiniciar apaga tudo</small>
                      </span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        checked={draft.storage === "mysql"}
                        onChange={() => update("storage", "mysql")}
                      />
                      <span>
                        <strong>MySQL</strong>
                        <small>Dados persistentes em banco relacional</small>
                      </span>
                    </label>
                  </div>

                  {draft.storage === "mysql" && (
                    <div className="mysql-config">
                      <div className="field-row">
                        <div className="field-group">
                          <label>Host do banco</label>
                          <input
                            type="text"
                            placeholder="localhost"
                            value={draft.dbHost}
                            onChange={(e) => update("dbHost", e.target.value)}
                          />
                        </div>
                        <div className="field-group narrow">
                          <label>Porta</label>
                          <input
                            type="number"
                            value={draft.dbPort}
                            onChange={(e) => update("dbPort", Number(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="field-group">
                        <label>Nome do banco</label>
                        <input
                          type="text"
                          placeholder="tavon"
                          value={draft.dbName}
                          onChange={(e) => update("dbName", e.target.value)}
                        />
                      </div>
                      <div className="field-row">
                        <div className="field-group">
                          <label>Usuário</label>
                          <input
                            type="text"
                            placeholder="root"
                            value={draft.dbUser}
                            onChange={(e) => update("dbUser", e.target.value)}
                          />
                        </div>
                        <div className="field-group">
                          <label>Senha</label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={draft.dbPassword}
                            onChange={(e) => update("dbPassword", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <h3>Avançado</h3>
                  <div className="field-group">
                    <label>JWT Secret</label>
                    <input
                      type="text"
                      value={draft.jwtSecret}
                      onChange={(e) => update("jwtSecret", e.target.value)}
                    />
                    <small className="field-hint">Chave usada para assinar tokens de autenticação</small>
                  </div>

                  <div className="toggle-row">
                    <input
                      type="checkbox"
                      id="autoStart"
                      checked={draft.autoStart}
                      onChange={(e) => update("autoStart", e.target.checked)}
                    />
                    <label htmlFor="autoStart">
                      <strong>Iniciar servidor automaticamente</strong>
                      <small>Ao abrir o Tavon Server, o backend inicia sozinho</small>
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="save-row">
              <button className="btn-primary" onClick={handleSave}>
                <Save size={15} />
                {saved ? "Salvo!" : "Salvar configuração"}
              </button>
              {saved && status === "running" && (
                <button className="btn-ghost" onClick={handleRestart}>
                  <RefreshCw size={14} /> Reiniciar para aplicar
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── LOGS ── */}
        {tab === "logs" && (
          <div className="section logs-section">
            <div className="logs-header">
              <h1 className="section-title">Logs do servidor</h1>
              <div className="logs-actions">
                <label className="autoscroll-label">
                  <input
                    type="checkbox"
                    checked={autoScrollRef.current}
                    onChange={(e) => { autoScrollRef.current = e.target.checked; }}
                  />
                  Auto-scroll
                </label>
                <button className="btn-ghost small" onClick={handleClearLogs}>
                  <Trash2 size={13} /> Limpar
                </button>
              </div>
            </div>
            <div className="log-console">
              {logs.map((e, i) => (
                <div key={i} className={`log-line ${e.level}`}>
                  <span className="log-time">{e.time.slice(11, 23)}</span>
                  <span className={`log-level ${e.level}`}>{e.level.toUpperCase()}</span>
                  <span className="log-msg">{e.msg}</span>
                </div>
              ))}
              {logs.length === 0 && <p className="empty">Nenhum log. Inicie o servidor para ver as mensagens.</p>}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
