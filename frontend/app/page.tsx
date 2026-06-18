"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8000/graphql/";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppSettings = {
  appName: string;
  appSubtitle: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  defaultDarkMode: boolean;
  whatsappEnabled: boolean;
  whatsappFromNumber: string;
  alertEmail: string;
};

type Vendor = {
  id: string; name: string; contactPerson: string;
  email: string; phone: string; address: string; gstin: string;
};

type WarehouseLocation = {
  id: string; name: string; code: string; address: string;
  city: string; state: string; pincode: string;
  active: boolean; createdAt: string;
};

type Product = {
  id: string; name: string; sku: string; category: string;
  unitPrice: string; gstRate: string; hsnCode: string;
  currentStock: number; reorderLevel: number; location: string;
  isLowStock: boolean; vendor: Vendor | null;
};

type Movement = {
  id: string; movementType: string; quantity: number;
  previousStock: number; newStock: number; reference: string;
  notes: string; createdAt: string;
  product: Pick<Product, "name" | "sku">;
  warehouse: Pick<WarehouseLocation, "name" | "code"> | null;
};

type ReturnItem = {
  id: string; returnType: string; condition: string;
  quantity: number; status: string; reason: string;
  reference: string; createdAt: string;
  product: Pick<Product, "name" | "sku">;
  vendor: Pick<Vendor, "name"> | null;
  warehouse: Pick<WarehouseLocation, "name"> | null;
};

type Damage = {
  id: string; quantity: number; reason: string; status: string;
  reference: string; createdAt: string;
  product: Pick<Product, "name" | "sku">;
  warehouse: Pick<WarehouseLocation, "name"> | null;
};

type Employee = {
  id: string; role: string; phone: string; active: boolean;
  createdAt: string; username: string; email: string;
  locations: Pick<WarehouseLocation, "id" | "name" | "code">[];
};

type ReplenishmentRequest = {
  id: string; quantity: number; expectedDate: string | null;
  status: string; notes: string; createdAt: string; sentAt: string | null;
  product: Pick<Product, "name" | "sku">;
  vendor: Pick<Vendor, "name" | "email">;
  warehouse: Pick<WarehouseLocation, "name" | "code">;
};

type NotificationItem = {
  id: string; title: string; message: string;
  level: string; read: boolean; createdAt: string;
};

type Stats = {
  totalProducts: number; totalUnits: number; lowStockProducts: number;
  totalVendors: number; pendingReturns: number; damagedUnits: number;
  inventoryValue: number;
};

type WarehouseData = {
  me: string;
  dashboardStats: Stats;
  products: Product[];
  vendors: Vendor[];
  stockMovements: Movement[];
  returns: ReturnItem[];
  damagedProducts: Damage[];
  warehouseLocations: WarehouseLocation[];
  employeeProfile: { role: string };
  employees: Employee[];
  replenishmentRequests: ReplenishmentRequest[];
  notifications: NotificationItem[];
  systemSettings: AppSettings;
};

type Tab =
  | "dashboard" | "inventory" | "movements" | "returns"
  | "damages" | "vendors" | "warehouses" | "employees"
  | "replenishment" | "notifications" | "settings";

type Modal =
  | "product" | "vendor" | "stock" | "return" | "damage"
  | "replenish" | "employee" | "warehouse" | "resolve_damage"
  | null;

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
} | null;

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const DASHBOARD_QUERY = `
  query WarehouseDashboard {
    systemSettings { appName appSubtitle logoUrl primaryColor accentColor defaultDarkMode whatsappEnabled alertEmail }
    me
    employeeProfile { role }
    warehouseLocations { id name code address city state pincode active createdAt }
    dashboardStats { totalProducts totalUnits lowStockProducts totalVendors pendingReturns damagedUnits inventoryValue }
    products {
      id name sku category unitPrice gstRate hsnCode currentStock reorderLevel location isLowStock
      vendor { id name contactPerson email phone address gstin }
    }
    vendors { id name contactPerson email phone address gstin }
    stockMovements(limit: 50) {
      id movementType quantity previousStock newStock reference notes createdAt
      product { name sku }
      warehouse { name code }
    }
    returns(limit: 50) {
      id returnType condition quantity status reason reference createdAt
      product { name sku }
      vendor { name }
      warehouse { name }
    }
    damagedProducts(limit: 50) {
      id quantity reason status reference createdAt
      product { name sku }
      warehouse { name }
    }
    employees {
      id role phone active createdAt username email
      locations { id name code }
    }
    replenishmentRequests(limit: 50) {
      id quantity expectedDate status notes createdAt sentAt
      product { name sku }
      vendor { name email }
      warehouse { name code }
    }
    notifications { id title message level read createdAt }
  }
`;

const SETTINGS_QUERY = `
  query PublicSettings {
    systemSettings { appName appSubtitle logoUrl primaryColor accentColor defaultDarkMode }
  }
`;

async function graphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
): Promise<T> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `JWT ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors[0].message || "Something went wrong.");
  return payload.data;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(value));
}

function formatDateShort(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  }).format(new Date(value));
}

/** Apply brand colours from system settings (does NOT touch dark-mode vars) */
function applyBrandColors(cfg: Partial<AppSettings>) {
  const r = document.documentElement;
  if (cfg.primaryColor) r.style.setProperty("--primary", cfg.primaryColor);
  if (cfg.accentColor) r.style.setProperty("--accent", cfg.accentColor);
}

/**
 * Toggle dark / light mode by directly setting / removing CSS custom properties
 * on :root via inline styles. Inline styles on the root element have the highest
 * specificity and reliably override any stylesheet values.
 */
function applyDarkMode(dark: boolean) {
  const r = document.documentElement;
  if (dark) {
    r.style.setProperty("--ink",           "#dce8e1");
    r.style.setProperty("--muted",         "#7a9589");
    r.style.setProperty("--line",          "#243328");
    r.style.setProperty("--canvas",        "#0f1a14");
    r.style.setProperty("--paper",         "#172118");
    r.style.setProperty("--pale-green",    "#1a2d1e");
    r.style.setProperty("--th-bg",         "#1a2820");
    r.style.setProperty("--td-color",      "#c0d4c8");
    r.style.setProperty("--hover-bg",      "#1e2e24");
    r.style.setProperty("--input-bg",      "#1e2e24");
    r.style.setProperty("--topbar-bg",     "rgba(15,26,20,.92)");
    r.style.setProperty("--panel-border",  "#243328");
    r.style.setProperty("--modal-close-color", "#9fb8ac");
  } else {
    [
      "--ink","--muted","--line","--canvas","--paper","--pale-green",
      "--th-bg","--td-color","--hover-bg","--input-bg","--topbar-bg",
      "--panel-border","--modal-close-color",
    ].forEach(v => r.style.removeProperty(v));
  }
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Administrator",
  MANAGER: "Warehouse manager",
  INVENTORY_OPERATOR: "Inventory operator",
  AUDITOR: "Auditor",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACKNOWLEDGED: "Acknowledged",
  PARTIALLY_RECEIVED: "Partially received",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const REPLENISHMENT_STATUSES = [
  "DRAFT","SENT","ACKNOWLEDGED","PARTIALLY_RECEIVED","COMPLETED","CANCELLED",
];

const NEXT_STATUS: Record<string, string> = {
  DRAFT: "SENT",
  SENT: "ACKNOWLEDGED",
  ACKNOWLEDGED: "PARTIALLY_RECEIVED",
  PARTIALLY_RECEIVED: "COMPLETED",
};

const TAB_TITLES: Record<Tab, string> = {
  dashboard: "Overview", inventory: "Inventory", movements: "Stock activity",
  returns: "Returns", damages: "Damaged goods", vendors: "Vendors",
  warehouses: "Warehouses", employees: "Employees",
  replenishment: "Replenishment", notifications: "Notifications", settings: "Settings",
};

// ─── Confirmation dialog ──────────────────────────────────────────────────────

function ConfirmDialog({ state, onCancel }: { state: ConfirmState; onCancel: () => void }) {
  if (!state) return null;
  return (
    <div className="confirm-backdrop" onMouseDown={onCancel}>
      <div className="confirm-box" onMouseDown={e => e.stopPropagation()}>
        <h3>{state.title}</h3>
        <p>{state.message}</p>
        <div className="confirm-actions">
          <button className="secondary-button" onClick={onCancel}>Cancel</button>
          <button className="danger-btn" onClick={() => { state.onConfirm(); onCancel(); }}>
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordDialog({ name, onCancel, onSubmit }: {
  name: string;
  onCancel: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
}) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handle = async () => {
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { setErr("Passwords do not match."); return; }
    setBusy(true);
    try { await onSubmit(pw); } catch { setBusy(false); }
  };

  return (
    <div className="confirm-backdrop" onMouseDown={onCancel}>
      <div className="confirm-box" onMouseDown={e => e.stopPropagation()}>
        <h3>Reset password — {name}</h3>
        <p style={{ marginBottom: 12 }}>Set a new password for this account.</p>
        <label style={{ display: "block", marginBottom: 8 }}>
          New password
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setErr(""); }}
            placeholder="Min. 8 characters"
            style={{ width: "100%", marginTop: 4 }}
            autoFocus
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          Confirm password
          <input
            type="password"
            value={pw2}
            onChange={e => { setPw2(e.target.value); setErr(""); }}
            placeholder="Repeat password"
            style={{ width: "100%", marginTop: 4 }}
          />
        </label>
        {err && <p style={{ color: "#c0392b", fontSize: 12, marginBottom: 8 }}>{err}</p>}
        <div className="confirm-actions">
          <button className="secondary-button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="primary-button" onClick={handle} disabled={busy}>
            {busy ? "Saving…" : "Save password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<WarehouseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [modal, setModal] = useState<Modal>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [resetPw, setResetPw] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [publicSettings, setPublicSettings] = useState<Partial<AppSettings> | null>(null);

  // Sync dark mode → DOM + localStorage whenever state flips
  useEffect(() => {
    applyDarkMode(darkMode);
    localStorage.setItem("wh-dark", String(darkMode));
  }, [darkMode]);

  const toggleDark = useCallback(() => setDarkMode(prev => !prev), []);

  const requireConfirm = useCallback((cfg: Exclude<ConfirmState, null>) => {
    setConfirm(cfg);
  }, []);

  const loadDashboard = useCallback(async (authToken: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await graphql<WarehouseData>(DASHBOARD_QUERY, {}, authToken);
      setData(result);
      if (result.systemSettings) applyBrandColors(result.systemSettings);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load data.";
      setError(message);
      if (/inactive|credentials|signature|token|authenticated/i.test(message)) {
        localStorage.removeItem("wh-token");
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    graphql<{ systemSettings: AppSettings }>(SETTINGS_QUERY)
      .then(r => {
        setPublicSettings(r.systemSettings);
        applyBrandColors(r.systemSettings);
        const saved = localStorage.getItem("wh-dark");
        if (saved !== null) {
          const isDark = saved === "true";
          setDarkMode(isDark);
          applyDarkMode(isDark);
        } else if (r.systemSettings.defaultDarkMode) {
          setDarkMode(true);
          applyDarkMode(true);
        }
      })
      .catch(() => {});

    const savedToken = localStorage.getItem("wh-token");
    if (savedToken) {
      setToken(savedToken);
      loadDashboard(savedToken);
    } else {
      setLoading(false);
    }
  }, [loadDashboard]);

  const runMutation = useCallback(async (query: string, variables: Record<string, unknown>) => {
    if (!token) return;
    setError("");
    try {
      await graphql(query, variables, token);
      setModal(null);
      await loadDashboard(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred.";
      setError(message);
      // If the account became inactive or the token is invalid, log out gracefully
      if (/inactive|credentials|signature|token|authenticated/i.test(message)) {
        localStorage.removeItem("wh-token");
        setToken(null);
      }
    }
  }, [token, loadDashboard]);

  const logout = useCallback(() => {
    localStorage.removeItem("wh-token");
    setToken(null);
    setData(null);
  }, []);

  if (!token) {
    return (
      <Login
        settings={publicSettings}
        darkMode={darkMode}
        onToggleDark={toggleDark}
        onAuthenticated={t => {
          localStorage.setItem("wh-token", t);
          setToken(t);
          loadDashboard(t);
        }}
      />
    );
  }

  if (loading && !data) {
    return <div className="center-state"><span className="spinner" />Loading warehouse…</div>;
  }

  if (!data) {
    return (
      <div className="center-state">
        <p>{error || "The warehouse could not be loaded."}</p>
        <button className="primary-button" onClick={logout}>Back to login</button>
      </div>
    );
  }

  const role = data.employeeProfile.role;
  const cfg = data.systemSettings;
  const unreadCount = data.notifications.filter(n => !n.read).length;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const isAdminOrManager = role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="brand">
          {cfg?.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={cfg.logoUrl} alt="logo" className="brand-logo" />
            : <div className="brand-mark">{(cfg?.appName || "W").slice(0, 1).toUpperCase()}</div>}
          <div>
            <strong>{cfg?.appName || "Wareflow"}</strong>
            <span>{cfg?.appSubtitle || "Inventory OS"}</span>
          </div>
        </div>

        <nav>
          <p className="nav-label">Workspace</p>
          {(["dashboard","inventory","movements","returns","damages","vendors"] as Tab[]).map(key => {
            const icons: Record<string, string> = {
              dashboard:"⌂", inventory:"▦", movements:"⇄", returns:"↩", damages:"⚠", vendors:"♢",
            };
            const labels: Record<string, string> = {
              dashboard:"Overview", inventory:"Inventory", movements:"Stock activity",
              returns:"Returns", damages:"Damaged goods", vendors:"Vendors",
            };
            return (
              <button key={key} className={tab === key ? "nav-item active" : "nav-item"} onClick={() => setTab(key)}>
                <span>{icons[key]}</span>{labels[key]}
                {key === "damages" && data.dashboardStats.damagedUnits > 0 && <b>{data.dashboardStats.damagedUnits}</b>}
              </button>
            );
          })}

          {isAdminOrManager && (
            <>
              <p className="nav-label mt">Operations</p>
              <button className={tab === "replenishment" ? "nav-item active" : "nav-item"} onClick={() => setTab("replenishment")}>
                <span>✉</span>Replenishment
              </button>
              <button className={tab === "warehouses" ? "nav-item active" : "nav-item"} onClick={() => setTab("warehouses")}>
                <span>▣</span>Warehouses
              </button>
              <button className={tab === "employees" ? "nav-item active" : "nav-item"} onClick={() => setTab("employees")}>
                <span>⊞</span>Employees
              </button>
            </>
          )}

          <p className="nav-label mt">Account</p>
          <button className={tab === "notifications" ? "nav-item active" : "nav-item"} onClick={() => setTab("notifications")}>
            <span>◌</span>Notifications
            {unreadCount > 0 && <b>{unreadCount}</b>}
          </button>
          {isAdmin && (
            <button className={tab === "settings" ? "nav-item active" : "nav-item"} onClick={() => setTab("settings")}>
              <span>⚙</span>Settings
            </button>
          )}
        </nav>

        <div className="sidebar-foot">
          <div className="user-avatar">{data.me.slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{data.me}</strong>
            <span>{ROLE_LABELS[role] || role}</span>
          </div>
          <button title="Log out" onClick={() => requireConfirm({
            title: "Log out?",
            message: "You will be returned to the login screen.",
            confirmLabel: "Log out",
            onConfirm: logout,
          })}>↗</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Warehouse control</p>
            <h1>{TAB_TITLES[tab]}</h1>
          </div>
          <div className="topbar-actions">
            <div className="search-box">
              <span>⌕</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products or SKU" />
            </div>
            {/* Dark/light toggle — uses applyDarkMode directly for instant response */}
            <button
              className="icon-button"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleDark}
              style={{ fontSize: 20, border: "1px solid var(--line)", borderRadius: 8, padding: "8px 12px" }}
            >
              {darkMode ? "☀" : "☾"}
            </button>
            {tab === "inventory" && <button className="secondary-button" onClick={() => setModal("stock")}>Update stock</button>}
            {tab === "inventory" && <button className="primary-button" onClick={() => setModal("product")}>＋ New product</button>}
            {tab === "vendors" && <button className="primary-button" onClick={() => setModal("vendor")}>＋ Add vendor</button>}
            {tab === "returns" && <button className="primary-button" onClick={() => setModal("return")}>＋ Log return</button>}
            {tab === "damages" && <button className="primary-button" onClick={() => setModal("damage")}>＋ Report damage</button>}
            {tab === "replenishment" && isAdminOrManager && <button className="primary-button" onClick={() => setModal("replenish")}>＋ Request stock</button>}
            {tab === "warehouses" && isAdmin && <button className="primary-button" onClick={() => setModal("warehouse")}>＋ Add warehouse</button>}
            {tab === "employees" && isAdmin && <button className="primary-button" onClick={() => setModal("employee")}>＋ Add employee</button>}
          </div>
        </header>

        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        <div className="page-content">
          {tab === "dashboard" && <Dashboard data={data} setTab={setTab} openModal={setModal} />}
          {tab === "inventory" && <Inventory products={data.products} search={search} />}
          {tab === "movements" && <Movements movements={data.stockMovements} />}
          {tab === "returns" && <Returns items={data.returns} />}
          {tab === "damages" && (
            <Damages
              items={data.damagedProducts}
              onAdd={() => setModal("damage")}
              canResolve={isAdminOrManager}
              onResolve={id => {
                sessionStorage.setItem("resolve-damage-id", id);
                setModal("resolve_damage");
              }}
            />
          )}
          {tab === "vendors" && <Vendors vendors={data.vendors} />}
          {tab === "warehouses" && (
            <Warehouses
              warehouses={data.warehouseLocations}
              canAdd={isAdmin}
              onAdd={() => setModal("warehouse")}
              onToggle={(id, active, name) => requireConfirm({
                title: active ? `Activate "${name}"?` : `Deactivate "${name}"?`,
                message: active
                  ? `${name} will become visible in stock operations and employee assignments.`
                  : `${name} will be hidden from stock operations. All data is preserved — you can reactivate it anytime.`,
                confirmLabel: active ? "Yes, activate" : "Yes, deactivate",
                onConfirm: () => runMutation(
                  `mutation($id: ID!, $active: Boolean!) { updateWarehouseLocation(id: $id, active: $active) { warehouse { id } } }`,
                  { id, active },
                ),
              })}
            />
          )}
          {tab === "employees" && (
            <Employees
              employees={data.employees}
              warehouses={data.warehouseLocations}
              canManage={isAdmin}
              isSuperAdmin={isSuperAdmin}
              onAdd={() => setModal("employee")}
              onResetPassword={(id, name) => setResetPw({ id, name })}
              onToggle={(id, active, name) => requireConfirm({
                title: active ? `Activate "${name}"?` : `Deactivate "${name}"?`,
                message: active
                  ? `${name} will be able to log in and access the system.`
                  : `${name} will lose system access. Their history and records are preserved.`,
                confirmLabel: active ? "Yes, activate" : "Yes, deactivate",
                onConfirm: () => runMutation(
                  `mutation($id: ID!, $active: Boolean!) { updateEmployee(id: $id, active: $active) { employee { id } } }`,
                  { id, active },
                ),
              })}
            />
          )}
          {tab === "replenishment" && (
            <Replenishment
              requests={data.replenishmentRequests}
              canUpdate={isAdminOrManager}
              onUpdateStatus={async (id, status) => {
                await runMutation(
                  `mutation($id: ID!, $status: String!) { updateReplenishmentStatus(id: $id, status: $status) { request { id } } }`,
                  { id, status },
                );
              }}
            />
          )}
          {tab === "notifications" && (
            <Notifications
              items={data.notifications}
              onMarkRead={async (ids, all) => {
                await runMutation(
                  `mutation($ids: [ID], $markAll: Boolean) { markNotificationsRead(ids: $ids, markAll: $markAll) { count } }`,
                  { ids: ids ?? null, markAll: all ?? false },
                );
              }}
            />
          )}
          {tab === "settings" && isAdmin && (
            <Settings
              current={data.systemSettings}
              onSave={async fields => {
                await runMutation(
                  `mutation UpdateSettings(
                    $appName:String,$appSubtitle:String,$logoUrl:String,
                    $primaryColor:String,$accentColor:String,$defaultDarkMode:Boolean,
                    $whatsappEnabled:Boolean,$whatsappAccountSid:String,
                    $whatsappAuthToken:String,$whatsappFromNumber:String,$alertEmail:String
                  ) {
                    updateSystemSettings(
                      appName:$appName,appSubtitle:$appSubtitle,logoUrl:$logoUrl,
                      primaryColor:$primaryColor,accentColor:$accentColor,
                      defaultDarkMode:$defaultDarkMode,whatsappEnabled:$whatsappEnabled,
                      whatsappAccountSid:$whatsappAccountSid,whatsappAuthToken:$whatsappAuthToken,
                      whatsappFromNumber:$whatsappFromNumber,alertEmail:$alertEmail
                    ) { settings { appName primaryColor } }
                  }`,
                  fields,
                );
              }}
            />
          )}
        </div>
      </main>

      {modal && (
        <WarehouseModal
          kind={modal}
          products={data.products}
          vendors={data.vendors}
          warehouses={data.warehouseLocations}
          isSuperAdmin={isSuperAdmin}
          close={() => setModal(null)}
          submit={runMutation}
        />
      )}

      <ConfirmDialog state={confirm} onCancel={() => setConfirm(null)} />

      {resetPw && (
        <ResetPasswordDialog
          name={resetPw.name}
          onCancel={() => setResetPw(null)}
          onSubmit={async (newPassword) => {
            await runMutation(
              `mutation($id:ID!,$newPassword:String!){ resetEmployeePassword(id:$id,newPassword:$newPassword){ ok } }`,
              { id: resetPw.id, newPassword },
            );
            setResetPw(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

function Login({ settings, darkMode, onToggleDark, onAuthenticated }: {
  settings: Partial<AppSettings> | null;
  darkMode: boolean;
  onToggleDark: () => void;
  onAuthenticated: (token: string) => void;
}) {
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const appName = settings?.appName || "Wareflow";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "");
    const password = String(form.get("password") || "");
    try {
      if (registering) {
        const created = await graphql<{ createUser: { message: string } }>(
          `mutation Register($username: String!, $password: String!) { createUser(username: $username, password: $password) { message } }`,
          { username, password },
        );
        if (!/success/i.test(created.createUser.message)) throw new Error(created.createUser.message);
      }
      const result = await graphql<{ tokenAuth: { token: string } }>(
        `mutation Login($username: String!, $password: String!) { tokenAuth(username: $username, password: $password) { token } }`,
        { username, password },
      );
      onAuthenticated(result.tokenAuth.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand light">
          {settings?.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={settings.logoUrl} alt="logo" className="brand-logo" />
            : <div className="brand-mark">{appName.slice(0, 1).toUpperCase()}</div>}
          <div>
            <strong>{appName}</strong>
            <span>{settings?.appSubtitle || "Inventory OS"}</span>
          </div>
        </div>
        <div className="story-copy">
          <p className="eyebrow">Clarity from dock to dispatch</p>
          <h1>Know what you have.<br />Know where it went.</h1>
          <p>One calm workspace for stock, vendors, returns, and damaged goods — built for India.</p>
        </div>
        <div className="story-metric"><span>LIVE</span><p>Every movement leaves a traceable inventory record.</p></div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <p className="eyebrow">Welcome to {appName}</p>
          <h2>{registering ? "Create your workspace" : "Sign in to continue"}</h2>
          <p className="muted">{registering ? "Set up your warehouse operator account." : "Use your warehouse operator credentials."}</p>
          {error && <div className="form-error">{error}</div>}
          <label>Username<input name="username" required autoComplete="username" placeholder="e.g. sathish" /></label>
          <label>Password<input name="password" required minLength={8} type="password" autoComplete={registering ? "new-password" : "current-password"} placeholder="••••••••" /></label>
          <button className="primary-button login-button" disabled={busy}>{busy ? "Please wait…" : registering ? "Create account" : "Sign in"}</button>
          <button type="button" className="text-button" onClick={() => { setRegistering(!registering); setError(""); }}>
            {registering ? "Already have an account? Sign in" : "First time here? Create an account"}
          </button>
          <button
            type="button"
            style={{ marginTop: 16, width: "100%", border: "1px solid #ccc", borderRadius: 8, padding: "10px", background: "transparent", cursor: "pointer", color: "var(--muted)" }}
            onClick={onToggleDark}
          >
            {darkMode ? "☀ Switch to light mode" : "☾ Switch to dark mode"}
          </button>
        </form>
      </section>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ data, setTab, openModal }: {
  data: WarehouseData; setTab: (t: Tab) => void; openModal: (m: Modal) => void;
}) {
  const stats = data.dashboardStats;
  const cards: [string, string, string, string][] = [
    ["Inventory value",  formatMoney(stats.inventoryValue),              "Across all active stock",    "sage"],
    ["Units on hand",    stats.totalUnits.toLocaleString("en-IN"),       `${stats.totalProducts} active products`, "blue"],
    ["Low stock",        String(stats.lowStockProducts),                  "At or below reorder point",  "amber"],
    ["Damaged units",    String(stats.damagedUnits),                      "Currently quarantined",       "rose"],
  ];
  const lowStock = data.products.filter(p => p.isLowStock).slice(0, 5);

  return (
    <>
      <section className="welcome-row">
        <div>
          <h2>Good to see you, {data.me}.</h2>
          <p>Here is what needs attention across your warehouses today.</p>
        </div>
        <div className="date-chip">● Live inventory</div>
      </section>
      <section className="stat-grid">
        {cards.map(([label, value, detail, tone]) => (
          <article className={`stat-card ${tone}`} key={label}>
            <div><span>{label}</span><b>↗</b></div>
            <strong>{value}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </section>
      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <div><h3>Recent stock activity</h3><p>Latest inventory movements</p></div>
            <button className="text-button" onClick={() => setTab("movements")}>View all →</button>
          </div>
          <MovementsList movements={data.stockMovements.slice(0, 6)} />
        </article>
        <article className="panel">
          <div className="panel-head">
            <div><h3>Needs attention</h3><p>Products at reorder level</p></div>
            <span className="count-chip">{lowStock.length}</span>
          </div>
          {lowStock.length ? lowStock.map(p => (
            <div className="attention-item" key={p.id}>
              <div className="product-icon">{p.name.slice(0, 1)}</div>
              <div><strong>{p.name}</strong><span>{p.sku} · {p.location || "No location"}</span></div>
              <div className="stock-count"><strong>{p.currentStock}</strong><span>min {p.reorderLevel}</span></div>
            </div>
          )) : <Empty compact text="All products are above reorder point." />}
          <button className="wide-button" onClick={() => openModal("stock")}>Receive stock</button>
        </article>
      </section>
      <section className="quick-actions">
        <button onClick={() => openModal("stock")}><span>＋</span><div><strong>Receive stock</strong><small>Add an inbound delivery</small></div></button>
        <button onClick={() => openModal("return")}><span>↩</span><div><strong>Log a return</strong><small>Customer or vendor return</small></div></button>
        <button onClick={() => openModal("damage")}><span>!</span><div><strong>Report damage</strong><small>Quarantine damaged units</small></div></button>
        <button onClick={() => openModal("replenish")}><span>✉</span><div><strong>Request stock</strong><small>Email a replenishment request</small></div></button>
      </section>
    </>
  );
}

// ─── Inventory ────────────────────────────────────────────────────────────────

function Inventory({ products, search }: { products: Product[]; search: string }) {
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(p =>
      [p.name, p.sku, p.category, p.vendor?.name].some(v => v?.toLowerCase().includes(term)),
    );
  }, [products, search]);

  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div><h3>Product inventory</h3><p>{visible.length} active items</p></div>
        <div className="legend"><span /> Low stock</div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Category</th><th>Vendor</th><th>Location</th><th>Unit cost</th><th>GST %</th><th>On hand</th><th>Status</th></tr></thead>
          <tbody>{visible.map(p => (
            <tr key={p.id}>
              <td><strong>{p.name}</strong><small>{p.sku}</small></td>
              <td>{p.category || "—"}</td>
              <td>{p.vendor?.name || "—"}</td>
              <td>{p.location || "—"}</td>
              <td>{formatMoney(p.unitPrice)}</td>
              <td>{p.gstRate}%</td>
              <td><strong>{p.currentStock}</strong></td>
              <td><span className={p.isLowStock ? "status warning" : "status success"}>{p.isLowStock ? "Low stock" : "In stock"}</span></td>
            </tr>
          ))}</tbody>
        </table>
        {!visible.length && <Empty text="No products match this search." />}
      </div>
    </section>
  );
}

// ─── Movements ────────────────────────────────────────────────────────────────

function Movements({ movements }: { movements: Movement[] }) {
  return (
    <section className="panel table-panel">
      <div className="panel-head"><div><h3>Stock movement ledger</h3><p>Every change to available inventory</p></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Product</th><th>Warehouse</th><th>Type</th><th>Reference</th><th>Change</th><th>Balance</th><th>Notes</th></tr></thead>
          <tbody>{movements.map(item => (
            <tr key={item.id}>
              <td>{formatDateShort(item.createdAt)}</td>
              <td><strong>{item.product.name}</strong><small>{item.product.sku}</small></td>
              <td>{item.warehouse?.name || "—"}</td>
              <td><span className="status neutral">{item.movementType.replaceAll("_", " ")}</span></td>
              <td>{item.reference || "—"}</td>
              <td className={item.quantity > 0 ? "positive" : "negative"}>{item.quantity > 0 ? "+" : ""}{item.quantity}</td>
              <td>{item.newStock}</td>
              <td>{item.notes || "—"}</td>
            </tr>
          ))}</tbody>
        </table>
        {!movements.length && <Empty text="Stock movements will appear here." />}
      </div>
    </section>
  );
}

function MovementsList({ movements }: { movements: Movement[] }) {
  if (!movements.length) return <Empty compact text="No inventory activity yet." />;
  return (
    <div>
      {movements.map(item => (
        <div className="movement-item" key={item.id}>
          <div className={item.quantity > 0 ? "movement-icon in" : "movement-icon out"}>{item.quantity > 0 ? "↓" : "↑"}</div>
          <div><strong>{item.product.name}</strong><span>{item.movementType.replaceAll("_", " ")} · {formatDateShort(item.createdAt)}</span></div>
          <strong className={item.quantity > 0 ? "positive" : "negative"}>{item.quantity > 0 ? "+" : ""}{item.quantity}</strong>
        </div>
      ))}
    </div>
  );
}

// ─── Returns ──────────────────────────────────────────────────────────────────

function Returns({ items }: { items: ReturnItem[] }) {
  return (
    <section className="panel table-panel">
      <div className="panel-head"><div><h3>Product returns</h3><p>Customer returns and stock sent back to vendors</p></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Product</th><th>Warehouse</th><th>Direction</th><th>Condition</th><th>Qty</th><th>Vendor</th><th>Reason</th><th>Status</th></tr></thead>
          <tbody>{items.map(item => (
            <tr key={item.id}>
              <td>{formatDateShort(item.createdAt)}</td>
              <td><strong>{item.product.name}</strong><small>{item.product.sku}</small></td>
              <td>{item.warehouse?.name || "—"}</td>
              <td>{item.returnType}</td>
              <td>{item.condition}</td>
              <td>{item.quantity}</td>
              <td>{item.vendor?.name || "—"}</td>
              <td>{item.reason}</td>
              <td><span className="status success">{item.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
        {!items.length && <Empty text="No returns logged yet." />}
      </div>
    </section>
  );
}

// ─── Damages ──────────────────────────────────────────────────────────────────

function Damages({ items, onAdd, canResolve, onResolve }: {
  items: Damage[]; onAdd: () => void; canResolve: boolean; onResolve: (id: string) => void;
}) {
  const statusClass: Record<string, string> = {
    QUARANTINED: "warning", RETURNED: "info", DISPOSED: "neutral", RESOLVED: "success",
  };
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div><h3>Damaged goods</h3><p>Units removed from usable stock and held for resolution</p></div>
        <button className="primary-button" onClick={onAdd}>＋ Report damage</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Product</th><th>Warehouse</th><th>Qty</th><th>Reference</th><th>Reason</th><th>Status</th>{canResolve && <th>Actions</th>}</tr></thead>
          <tbody>{items.map(item => (
            <tr key={item.id}>
              <td>{formatDateShort(item.createdAt)}</td>
              <td><strong>{item.product.name}</strong><small>{item.product.sku}</small></td>
              <td>{item.warehouse?.name || "—"}</td>
              <td>{item.quantity}</td>
              <td>{item.reference || "—"}</td>
              <td>{item.reason}</td>
              <td><span className={`status ${statusClass[item.status] || "neutral"}`}>{item.status}</span></td>
              {canResolve && (
                <td>{item.status === "QUARANTINED" && (
                  <div className="row-actions"><button onClick={() => onResolve(item.id)}>Resolve</button></div>
                )}</td>
              )}
            </tr>
          ))}</tbody>
        </table>
        {!items.length && <Empty text="No damage reports yet." />}
      </div>
    </section>
  );
}

// ─── Vendors ──────────────────────────────────────────────────────────────────

function Vendors({ vendors }: { vendors: Vendor[] }) {
  return (
    <section className="panel table-panel">
      <div className="panel-head"><div><h3>Vendor directory</h3><p>Supplier contacts linked to your product catalog</p></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Vendor</th><th>Contact person</th><th>Email</th><th>Phone</th><th>GSTIN</th></tr></thead>
          <tbody>{vendors.map(v => (
            <tr key={v.id}>
              <td><strong>{v.name}</strong></td>
              <td>{v.contactPerson || "—"}</td>
              <td>{v.email || "—"}</td>
              <td>{v.phone || "—"}</td>
              <td>{v.gstin ? <code style={{ fontSize: 10 }}>{v.gstin}</code> : "—"}</td>
            </tr>
          ))}</tbody>
        </table>
        {!vendors.length && <Empty text="No vendors added yet." />}
      </div>
    </section>
  );
}

// ─── Warehouses ───────────────────────────────────────────────────────────────

function Warehouses({ warehouses, canAdd, onAdd, onToggle }: {
  warehouses: WarehouseLocation[];
  canAdd: boolean;
  onAdd: () => void;
  onToggle: (id: string, active: boolean, name: string) => void;
}) {
  const activeCount = warehouses.filter(w => w.active).length;
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div>
          <h3>Warehouse locations</h3>
          <p>{warehouses.length} total · {activeCount} active · {warehouses.length - activeCount} inactive</p>
        </div>
        {canAdd && <button className="primary-button" onClick={onAdd}>＋ Add warehouse</button>}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>City</th><th>State</th><th>Pincode</th><th>Status</th>{canAdd && <th>Actions</th>}</tr></thead>
          <tbody>{warehouses.map(wh => (
            <tr key={wh.id}>
              <td><code style={{ fontSize: 11, fontWeight: 700 }}>{wh.code}</code></td>
              <td><strong>{wh.name}</strong></td>
              <td>{wh.city || "—"}</td>
              <td>{wh.state || "—"}</td>
              <td>{wh.pincode || "—"}</td>
              <td><span className={wh.active ? "status success" : "status neutral"}>{wh.active ? "Active" : "Inactive"}</span></td>
              {canAdd && (
                <td>
                  <div className="row-actions">
                    <button
                      className={wh.active ? "danger" : ""}
                      onClick={() => onToggle(wh.id, !wh.active, wh.name)}
                    >
                      {wh.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}</tbody>
        </table>
        {!warehouses.length && <Empty text="No warehouses added yet." />}
      </div>
    </section>
  );
}

// ─── Employees ────────────────────────────────────────────────────────────────

function Employees({ employees, warehouses, canManage, isSuperAdmin, onAdd, onToggle, onResetPassword }: {
  employees: Employee[];
  warehouses: WarehouseLocation[];
  canManage: boolean;
  isSuperAdmin: boolean;
  onAdd: () => void;
  onToggle: (id: string, active: boolean, name: string) => void;
  onResetPassword: (id: string, name: string) => void;
}) {
  void warehouses;
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div><h3>Team members</h3><p>{employees.length} registered employees</p></div>
        {canManage && <button className="primary-button" onClick={onAdd}>＋ Add employee</button>}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Phone</th><th>Warehouses</th><th>Status</th>{canManage && <th>Actions</th>}</tr></thead>
          <tbody>{employees.map(emp => {
            // Regular ADMINs cannot touch SUPER_ADMIN accounts
            const canEditThis = emp.role === "SUPER_ADMIN" ? isSuperAdmin : canManage;
            return (
            <tr key={emp.id}>
              <td><strong>{emp.username}</strong></td>
              <td>{emp.email || "—"}</td>
              <td><span className={`role-badge ${emp.role}`}>{ROLE_LABELS[emp.role] || emp.role}</span></td>
              <td>{emp.phone || "—"}</td>
              <td>{emp.locations.length
                ? emp.locations.map(l => <span key={l.id} className="status neutral" style={{ marginRight: 4 }}>{l.code}</span>)
                : "—"}
              </td>
              <td><span className={emp.active ? "status success" : "status neutral"}>{emp.active ? "Active" : "Inactive"}</span></td>
              {canManage && (
                <td>
                  {canEditThis ? (
                    <div className="row-actions">
                      <button onClick={() => onResetPassword(emp.id, emp.username)}>
                        Reset password
                      </button>
                      <button
                        className={emp.active ? "danger" : ""}
                        onClick={() => onToggle(emp.id, !emp.active, emp.username)}
                      >
                        {emp.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 9, color: "var(--muted)", padding: "0 4px" }}>Protected</span>
                  )}
                </td>
              )}
            </tr>
          );})}</tbody>
        </table>
        {!employees.length && <Empty text="No employees added yet." />}
      </div>
    </section>
  );
}

// ─── Replenishment ────────────────────────────────────────────────────────────

function Replenishment({ requests, canUpdate, onUpdateStatus }: {
  requests: ReplenishmentRequest[];
  canUpdate: boolean;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState("ALL");
  const visible = filter === "ALL" ? requests : requests.filter(r => r.status === filter);

  const statusClass: Record<string, string> = {
    DRAFT: "draft", SENT: "info", ACKNOWLEDGED: "neutral",
    PARTIALLY_RECEIVED: "warning", COMPLETED: "success", CANCELLED: "danger",
  };

  return (
    <section className="panel table-panel">
      <div className="panel-head"><div><h3>Replenishment requests</h3><p>{requests.length} total requests</p></div></div>
      <div className="filter-bar">
        {["ALL", ...REPLENISHMENT_STATUSES].map(s => {
          const count = s === "ALL" ? requests.length : requests.filter(r => r.status === s).length;
          return (
            <button key={s} className={filter === s ? "filter-btn active" : "filter-btn"} onClick={() => setFilter(s)}>
              {s === "ALL" ? "All" : (STATUS_LABELS[s] ?? s)} <span className="chip">{count}</span>
            </button>
          );
        })}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Product</th><th>Vendor</th><th>Warehouse</th><th>Qty</th><th>Expected</th><th>Status</th><th>Email sent</th>{canUpdate && <th>Actions</th>}</tr></thead>
          <tbody>{visible.map(req => (
            <tr key={req.id}>
              <td>{formatDateShort(req.createdAt)}</td>
              <td><strong>{req.product.name}</strong><small>{req.product.sku}</small></td>
              <td>{req.vendor.name}</td>
              <td><span className="status neutral">{req.warehouse.code}</span></td>
              <td><strong>{req.quantity}</strong></td>
              <td>{req.expectedDate || "—"}</td>
              <td><span className={`status ${statusClass[req.status] || "neutral"}`}>{STATUS_LABELS[req.status] ?? req.status}</span></td>
              <td>{req.sentAt ? formatDateShort(req.sentAt) : "—"}</td>
              {canUpdate && (
                <td>{NEXT_STATUS[req.status] && (
                  <div className="row-actions">
                    <button onClick={() => onUpdateStatus(req.id, NEXT_STATUS[req.status])}>
                      Mark {STATUS_LABELS[NEXT_STATUS[req.status]] ?? NEXT_STATUS[req.status]}
                    </button>
                  </div>
                )}</td>
              )}
            </tr>
          ))}</tbody>
        </table>
        {!visible.length && <Empty text="No replenishment requests found." />}
      </div>
    </section>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

function Notifications({ items, onMarkRead }: {
  items: NotificationItem[];
  onMarkRead: (ids?: string[], all?: boolean) => Promise<void>;
}) {
  const [filter, setFilter] = useState("ALL");
  const visible = filter === "ALL" ? items
    : filter === "UNREAD" ? items.filter(n => !n.read)
    : items.filter(n => n.level === filter);
  const unread = items.filter(n => !n.read);

  return (
    <section className="panel">
      <div className="panel-head">
        <div><h3>Notifications</h3><p>{unread.length} unread</p></div>
        {unread.length > 0 && (
          <button className="secondary-button" onClick={() => onMarkRead(undefined, true)}>Mark all as read</button>
        )}
      </div>
      <div className="notif-filter-bar">
        {["ALL", "UNREAD", "INFO", "WARNING", "CRITICAL"].map(f => (
          <button key={f} className={filter === f ? "notif-filter-btn active" : "notif-filter-btn"} onClick={() => setFilter(f)}>
            {f === "UNREAD" ? "Unread" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <div className="notif-list">
        {visible.length ? visible.map(n => (
          <div key={n.id} className={n.read ? "notif-card" : "notif-card unread"}>
            <div className={`notif-dot ${n.level}`} />
            <div className="notif-body">
              <strong>{n.title}</strong>
              <p>{n.message}</p>
              <time>{formatDate(n.createdAt)}</time>
            </div>
            {!n.read && (
              <button className="text-button" style={{ whiteSpace: "nowrap" }} onClick={() => onMarkRead([n.id])}>
                Mark read
              </button>
            )}
          </div>
        )) : <Empty text="No notifications." />}
      </div>
    </section>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function Settings({ current, onSave }: {
  current: AppSettings;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [appName, setAppName] = useState(current.appName);
  const [appSubtitle, setAppSubtitle] = useState(current.appSubtitle);
  const [logoUrl, setLogoUrl] = useState(current.logoUrl || "");
  const [primaryColor, setPrimaryColor] = useState(current.primaryColor || "#173a2c");
  const [accentColor, setAccentColor] = useState(current.accentColor || "#d4932f");
  const [defaultDarkMode, setDefaultDarkMode] = useState(current.defaultDarkMode);
  const [alertEmail, setAlertEmail] = useState(current.alertEmail || "");
  const [whatsappEnabled, setWhatsappEnabled] = useState(current.whatsappEnabled);
  const [whatsappAccountSid, setWhatsappAccountSid] = useState("");
  const [whatsappAuthToken, setWhatsappAuthToken] = useState("");
  const [whatsappFromNumber, setWhatsappFromNumber] = useState(current.whatsappFromNumber || "");

  const handleSave = async () => {
    setBusy(true); setSaved(false); setError("");
    try {
      await onSave({
        appName, appSubtitle, logoUrl: logoUrl || null,
        primaryColor, accentColor, defaultDarkMode,
        alertEmail: alertEmail || null,
        whatsappEnabled,
        whatsappAccountSid: whatsappAccountSid || null,
        whatsappAuthToken: whatsappAuthToken || null,
        whatsappFromNumber: whatsappFromNumber || null,
      });
      applyBrandColors({ primaryColor, accentColor });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-page">
      {error && <div className="form-error">{error}</div>}
      {saved && <div className="form-error" style={{ background: "#e4efe7", borderColor: "#aaceb5", color: "#397153" }}>Settings saved successfully.</div>}

      {/* Branding */}
      <div className="settings-section">
        <div className="settings-section-head">
          <div><h3>Branding</h3><p>Customize your app name, logo, and colours. Changes apply live.</p></div>
        </div>
        <div className="settings-body">
          <div className="settings-grid">
            <label>App name<input value={appName} onChange={e => setAppName(e.target.value)} placeholder="Wareflow" /></label>
            <label>Subtitle / tagline<input value={appSubtitle} onChange={e => setAppSubtitle(e.target.value)} placeholder="Inventory OS" /></label>
          </div>
          <label>Logo URL <small style={{ fontWeight: 400, color: "var(--muted)" }}>(paste an image URL or base64 data URI)</small>
            <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
          </label>
          {logoUrl && (
            <div style={{ marginTop: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Logo preview" className="logo-preview" onError={e => (e.currentTarget.style.display = "none")} />
            </div>
          )}
          <div className="settings-grid" style={{ marginTop: 8 }}>
            <label>Primary colour (sidebar, buttons)
              <div className="color-row">
                <input type="color" value={primaryColor} onChange={e => {
                  setPrimaryColor(e.target.value);
                  document.documentElement.style.setProperty("--primary", e.target.value);
                }} />
                <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#173a2c" style={{ flex: 1 }} />
                <div className="color-preview" style={{ background: primaryColor }} />
              </div>
            </label>
            <label>Accent colour (badges, highlights)
              <div className="color-row">
                <input type="color" value={accentColor} onChange={e => {
                  setAccentColor(e.target.value);
                  document.documentElement.style.setProperty("--accent", e.target.value);
                }} />
                <input value={accentColor} onChange={e => setAccentColor(e.target.value)} placeholder="#d4932f" style={{ flex: 1 }} />
                <div className="color-preview" style={{ background: accentColor }} />
              </div>
            </label>
          </div>
          <div className="toggle-row" style={{ marginTop: 16 }}>
            <div><strong>Default dark mode</strong><span>New users who haven&apos;t toggled yet will start in dark mode</span></div>
            <label className="toggle">
              <input type="checkbox" checked={defaultDarkMode} onChange={e => setDefaultDarkMode(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Email alerts */}
      <div className="settings-section">
        <div className="settings-section-head">
          <div><h3>Email alerts</h3><p>Where to send low-stock and system notifications</p></div>
        </div>
        <div className="settings-body">
          <label>Alert email address
            <input type="email" value={alertEmail} onChange={e => setAlertEmail(e.target.value)} placeholder="inventory@yourcompany.com" />
          </label>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="settings-section">
        <div className="settings-section-head">
          <div>
            <h3>WhatsApp notifications (Twilio)</h3>
            <p>Send low-stock alerts and replenishment requests via WhatsApp Business API</p>
          </div>
        </div>
        <div className="settings-body">
          <div className="toggle-row">
            <div><strong>Enable WhatsApp</strong><span>Send messages via Twilio WhatsApp API</span></div>
            <label className="toggle">
              <input type="checkbox" checked={whatsappEnabled} onChange={e => setWhatsappEnabled(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
          {whatsappEnabled && (
            <>
              <div className="settings-grid">
                <label>Twilio Account SID
                  <input value={whatsappAccountSid} onChange={e => setWhatsappAccountSid(e.target.value)} placeholder="ACxxxxxxxxxx…" type="password" autoComplete="off" />
                </label>
                <label>Twilio Auth Token
                  <input value={whatsappAuthToken} onChange={e => setWhatsappAuthToken(e.target.value)} placeholder="Your auth token" type="password" autoComplete="off" />
                </label>
              </div>
              <label>From WhatsApp number
                <input value={whatsappFromNumber} onChange={e => setWhatsappFromNumber(e.target.value)} placeholder="+14155238886" />
              </label>
              <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 8 }}>
                Employees with a phone number starting with &quot;+&quot; receive WhatsApp alerts.
                Managers and Admins get low-stock alerts; vendor contacts get replenishment requests.
              </p>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="primary-button" style={{ padding: "11px 28px" }} onClick={handleSave} disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Empty({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={compact ? "empty compact" : "empty"}><span>◇</span><p>{text}</p></div>;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function WarehouseModal({ kind, products, vendors, warehouses, isSuperAdmin, close, submit }: {
  kind: Exclude<Modal, null>;
  products: Product[]; vendors: Vendor[]; warehouses: WarehouseLocation[];
  isSuperAdmin: boolean;
  close: () => void;
  submit: (query: string, variables: Record<string, unknown>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const titles: Record<string, [string, string]> = {
    product:       ["Add product",           "Create a new catalogue item"],
    vendor:        ["Add vendor",            "Create a supplier record"],
    stock:         ["Update stock",          "Receive, issue, or adjust inventory"],
    return:        ["Log a return",          "Track returned inventory"],
    damage:        ["Report damaged goods",  "Remove unusable units from available stock"],
    replenish:     ["Request replenishment", "Create and send a purchase request to the vendor"],
    employee:      ["Add employee",          "Create a team member account with role and warehouse access"],
    warehouse:     ["Add warehouse",         "Register a new warehouse location"],
    resolve_damage:["Resolve damage record", "Update the status of a quarantined damage report"],
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setError("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (kind === "product") {
        await submit(
          `mutation AddProduct($name:String!,$sku:String!,$category:String,$vendorId:ID,$unitPrice:String,$gstRate:String,$hsnCode:String,$initialStock:Int,$reorderLevel:Int,$location:String,$warehouseId:ID!) {
            createProduct(name:$name,sku:$sku,category:$category,vendorId:$vendorId,unitPrice:$unitPrice,gstRate:$gstRate,hsnCode:$hsnCode,initialStock:$initialStock,reorderLevel:$reorderLevel,location:$location,warehouseId:$warehouseId) { product { id } }
          }`,
          { ...form, initialStock: Number(form.initialStock), reorderLevel: Number(form.reorderLevel), vendorId: form.vendorId || null },
        );
      } else if (kind === "vendor") {
        await submit(
          `mutation AddVendor($name:String!,$contactPerson:String,$email:String,$phone:String,$address:String,$gstin:String) {
            createVendor(name:$name,contactPerson:$contactPerson,email:$email,phone:$phone,address:$address,gstin:$gstin) { vendor { id } }
          }`,
          form,
        );
      } else if (kind === "stock") {
        await submit(
          `mutation Stock($productId:ID!,$warehouseId:ID!,$movementType:String!,$quantity:Int!,$reference:String,$notes:String) {
            updateStock(productId:$productId,warehouseId:$warehouseId,movementType:$movementType,quantity:$quantity,reference:$reference,notes:$notes) { movement { id } }
          }`,
          { ...form, quantity: Number(form.quantity) },
        );
      } else if (kind === "return") {
        await submit(
          `mutation Return($productId:ID!,$warehouseId:ID!,$returnType:String!,$condition:String!,$quantity:Int!,$vendorId:ID,$reference:String,$reason:String!) {
            createReturn(productId:$productId,warehouseId:$warehouseId,returnType:$returnType,condition:$condition,quantity:$quantity,vendorId:$vendorId,reference:$reference,reason:$reason) { returnRecord { id } }
          }`,
          { ...form, quantity: Number(form.quantity), vendorId: form.vendorId || null },
        );
      } else if (kind === "damage") {
        await submit(
          `mutation Damage($productId:ID!,$warehouseId:ID!,$quantity:Int!,$reason:String!,$reference:String) {
            reportDamage(productId:$productId,warehouseId:$warehouseId,quantity:$quantity,reason:$reason,reference:$reference) { damage { id } }
          }`,
          { ...form, quantity: Number(form.quantity) },
        );
      } else if (kind === "replenish") {
        await submit(
          `mutation Replenish($productId:ID!,$warehouseId:ID!,$quantity:Int!,$expectedDate:Date,$notes:String,$sendNow:Boolean) {
            requestReplenishment(productId:$productId,warehouseId:$warehouseId,quantity:$quantity,expectedDate:$expectedDate,notes:$notes,sendNow:$sendNow) { emailSent whatsappSent request { id status } }
          }`,
          { ...form, quantity: Number(form.quantity), expectedDate: form.expectedDate || null, sendNow: true },
        );
      } else if (kind === "employee") {
        const warehouseIds = Array.from(
          (event.currentTarget.querySelectorAll('input[name="warehouseIds"]:checked') as NodeListOf<HTMLInputElement>),
        ).map(el => el.value);
        await submit(
          `mutation AddEmployee($username:String!,$password:String!,$email:String,$phone:String,$role:String!,$warehouseIds:[ID!]!) {
            createEmployee(username:$username,password:$password,email:$email,phone:$phone,role:$role,warehouseIds:$warehouseIds) { employee { id } }
          }`,
          { ...form, warehouseIds },
        );
      } else if (kind === "warehouse") {
        await submit(
          `mutation AddWarehouse($name:String!,$code:String!,$address:String,$city:String,$state:String,$pincode:String) {
            createWarehouseLocation(name:$name,code:$code,address:$address,city:$city,state:$state,pincode:$pincode) { warehouse { id } }
          }`,
          form,
        );
      } else if (kind === "resolve_damage") {
        const damageId = sessionStorage.getItem("resolve-damage-id") || "";
        await submit(
          `mutation ResolveDmg($id:ID!,$status:String!,$notes:String) {
            resolveDamage(id:$id,status:$status,notes:$notes) { damage { id } }
          }`,
          { id: damageId, status: form.status, notes: form.notes || "" },
        );
        sessionStorage.removeItem("resolve-damage-id");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this record.");
      setBusy(false);
    }
  };

  const activeWarehouses = warehouses.filter(w => w.active);

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Warehouse record</p>
            <h2>{titles[kind]?.[0]}</h2>
            <span>{titles[kind]?.[1]}</span>
          </div>
          <button onClick={close}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="form-error" style={{ margin: "12px 0 0" }}>{error}</div>}

          {kind === "product" && (
            <div className="form-grid">
              <label>Product name<input name="name" required placeholder="e.g. Packing tape" /></label>
              <label>SKU<input name="sku" required placeholder="PKG-001" /></label>
              <label>Category<input name="category" placeholder="Packaging" /></label>
              <label>Vendor<select name="vendorId"><option value="">No vendor</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
              <label>Unit cost (₹)<input name="unitPrice" type="number" min="0" step="0.01" defaultValue="0.00" /></label>
              <label>GST rate (%)<input name="gstRate" type="number" min="0" max="100" step="0.01" defaultValue="18" /></label>
              <label>HSN code<input name="hsnCode" placeholder="e.g. 3923" /></label>
              <label>Warehouse<select name="warehouseId" required><option value="">Choose warehouse</option>{activeWarehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}</select></label>
              <label>Storage location<input name="location" placeholder="Aisle A · Bin 12" /></label>
              <label>Opening stock<input name="initialStock" type="number" min="0" defaultValue="0" /></label>
              <label>Reorder level<input name="reorderLevel" type="number" min="0" defaultValue="10" /></label>
            </div>
          )}

          {kind === "vendor" && (
            <>
              <label>Vendor name<input name="name" required placeholder="Supplier company name" /></label>
              <div className="form-grid">
                <label>Contact person<input name="contactPerson" placeholder="Full name" /></label>
                <label>Phone (+91...)<input name="phone" placeholder="+91 98765 43210" /></label>
              </div>
              <label>Email<input name="email" type="email" placeholder="orders@supplier.com" /></label>
              <label>GSTIN<input name="gstin" maxLength={15} placeholder="29ABCDE1234F1Z5" /></label>
              <label>Address<textarea name="address" placeholder="Vendor address" /></label>
            </>
          )}

          {kind === "stock" && (
            <>
              <label>Product<select name="productId" required><option value="">Choose a product</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} ({p.currentStock} on hand)</option>)}</select></label>
              <label>Warehouse<select name="warehouseId" required><option value="">Choose warehouse</option>{activeWarehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}</select></label>
              <div className="form-grid">
                <label>Movement type<select name="movementType" required><option value="RECEIPT">Receive stock</option><option value="ISSUE">Issue stock</option><option value="ADJUSTMENT">Positive adjustment</option></select></label>
                <label>Quantity<input name="quantity" type="number" min="1" required defaultValue="1" /></label>
              </div>
              <label>Reference<input name="reference" placeholder="PO, invoice, or job number" /></label>
              <label>Notes<textarea name="notes" placeholder="Optional details" /></label>
            </>
          )}

          {kind === "return" && (
            <>
              <label>Product<select name="productId" required><option value="">Choose a product</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></label>
              <label>Warehouse<select name="warehouseId" required><option value="">Choose warehouse</option>{activeWarehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}</select></label>
              <div className="form-grid">
                <label>Return direction<select name="returnType"><option value="CUSTOMER">From customer</option><option value="VENDOR">To vendor</option></select></label>
                <label>Condition<select name="condition"><option value="RESTOCKABLE">Restockable</option><option value="DAMAGED">Damaged</option></select></label>
                <label>Quantity<input name="quantity" type="number" min="1" required defaultValue="1" /></label>
                <label>Vendor<select name="vendorId"><option value="">Product default vendor</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
              </div>
              <label>Reference<input name="reference" placeholder="RMA or order number" /></label>
              <label>Reason<textarea name="reason" required placeholder="Why is this stock being returned?" /></label>
            </>
          )}

          {kind === "damage" && (
            <>
              <label>Product<select name="productId" required><option value="">Choose a product</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></label>
              <label>Warehouse<select name="warehouseId" required><option value="">Choose warehouse</option>{activeWarehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}</select></label>
              <div className="form-grid">
                <label>Quantity<input name="quantity" type="number" min="1" required defaultValue="1" /></label>
                <label>Reference<input name="reference" placeholder="Incident or batch number" /></label>
              </div>
              <label>Damage details<textarea name="reason" required placeholder="Describe the damage and where it was found" /></label>
            </>
          )}

          {kind === "replenish" && (
            <>
              <label>Product<select name="productId" required><option value="">Choose a product</option>{products.filter(p => p.vendor).map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} ({p.currentStock} on hand)</option>)}</select></label>
              <label>Warehouse<select name="warehouseId" required><option value="">Choose warehouse</option>{activeWarehouses.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}</select></label>
              <div className="form-grid">
                <label>Required quantity<input name="quantity" type="number" min="1" required defaultValue="1" /></label>
                <label>Expected by<input name="expectedDate" type="date" /></label>
              </div>
              <label>Message to vendor<textarea name="notes" placeholder="Delivery instructions or purchase notes" /></label>
            </>
          )}

          {kind === "employee" && (
            <>
              <div className="form-grid">
                <label>Username<input name="username" required placeholder="e.g. ravi.kumar" /></label>
                <label>Password<input name="password" required minLength={8} type="password" placeholder="••••••••" /></label>
                <label>Email<input name="email" type="email" placeholder="ravi@company.com" /></label>
                <label>Phone (+91...)<input name="phone" placeholder="+91 98765 43210" /></label>
              </div>
              <label>Role<select name="role" required>
                <option value="INVENTORY_OPERATOR">Inventory Operator</option>
                <option value="MANAGER">Warehouse Manager</option>
                <option value="AUDITOR">Auditor (read-only)</option>
                <option value="ADMIN">Administrator</option>
                {isSuperAdmin && <option value="SUPER_ADMIN">Super Administrator</option>}
              </select></label>
              <label style={{ marginTop: 14 }}>Assign warehouses
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {activeWarehouses.map(wh => (
                    <label key={wh.id} style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, fontWeight: 400, fontSize: 12, color: "var(--ink)" }}>
                      <input type="checkbox" name="warehouseIds" value={wh.id} style={{ width: "auto", marginTop: 0 }} />
                      {wh.code} — {wh.name}
                    </label>
                  ))}
                </div>
              </label>
            </>
          )}

          {kind === "warehouse" && (
            <>
              <div className="form-grid">
                <label>Warehouse name<input name="name" required placeholder="Main Warehouse" /></label>
                <label>Code (unique)<input name="code" required placeholder="MAIN" style={{ textTransform: "uppercase" }} /></label>
                <label>City<input name="city" placeholder="Mumbai" /></label>
                <label>State<input name="state" placeholder="Maharashtra" /></label>
                <label>Pincode<input name="pincode" placeholder="400001" maxLength={6} /></label>
              </div>
              <label>Address<textarea name="address" placeholder="Full warehouse address" /></label>
            </>
          )}

          {kind === "resolve_damage" && (
            <>
              <label>New status<select name="status" required>
                <option value="RETURNED">Returned to vendor</option>
                <option value="DISPOSED">Disposed</option>
                <option value="RESOLVED">Resolved / restored</option>
              </select></label>
              <label>Resolution notes<textarea name="notes" placeholder="Describe what was done with the damaged stock" /></label>
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={close}>Cancel</button>
            <button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save record"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
