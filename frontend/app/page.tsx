"use client";

import { useCallback, useEffect, useState } from "react";
import { graphql, DASHBOARD_QUERY, SETTINGS_QUERY } from "@/app/lib/graphql";
import { applyBrandColors, applyDarkMode } from "@/app/lib/theme";
import { ROLE_LABELS, TAB_TITLES } from "@/app/lib/constants";

import Login from "@/app/components/organisms/Login";
import Dashboard from "@/app/components/organisms/Dashboard";
import Inventory from "@/app/components/organisms/Inventory";
import Movements from "@/app/components/organisms/Movements";
import Returns from "@/app/components/organisms/Returns";
import Damages from "@/app/components/organisms/Damages";
import Vendors from "@/app/components/organisms/Vendors";
import Warehouses from "@/app/components/organisms/Warehouses";
import Employees from "@/app/components/organisms/Employees";
import Replenishment from "@/app/components/organisms/Replenishment";
import Notifications from "@/app/components/organisms/Notifications";
import Settings from "@/app/components/organisms/Settings";
import WarehouseModal from "@/app/components/organisms/WarehouseModal";
import ConfirmDialog from "@/app/components/molecules/ConfirmDialog";
import ResetPasswordDialog from "@/app/components/molecules/ResetPasswordDialog";

import type { AppSettings, WarehouseData, Tab, Modal, ConfirmState } from "@/app/types";

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

  // ── Auth gates ──────────────────────────────────────────────────────────────

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

  // ── Role flags ──────────────────────────────────────────────────────────────

  const role = data.employeeProfile.role;
  const cfg = data.systemSettings;
  const unreadCount = data.notifications.filter(n => !n.read).length;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const isAdminOrManager = role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";

  // ── Shell ───────────────────────────────────────────────────────────────────

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
                {key === "damages" && data.dashboardStats.damagedUnits > 0 && (
                  <b>{data.dashboardStats.damagedUnits}</b>
                )}
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
            <button
              className="icon-button"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleDark}
              style={{ fontSize: 20, border: "1px solid var(--line)", borderRadius: 8, padding: "8px 12px" }}
            >
              {darkMode ? "☀" : "☾"}
            </button>
            {tab === "inventory"    && <button className="secondary-button" onClick={() => setModal("stock")}>Update stock</button>}
            {tab === "inventory"    && <button className="primary-button" onClick={() => setModal("product")}>＋ New product</button>}
            {tab === "vendors"      && <button className="primary-button" onClick={() => setModal("vendor")}>＋ Add vendor</button>}
            {tab === "returns"      && <button className="primary-button" onClick={() => setModal("return")}>＋ Log return</button>}
            {tab === "damages"      && <button className="primary-button" onClick={() => setModal("damage")}>＋ Report damage</button>}
            {tab === "replenishment" && isAdminOrManager && <button className="primary-button" onClick={() => setModal("replenish")}>＋ Request stock</button>}
            {tab === "warehouses"   && isAdmin && <button className="primary-button" onClick={() => setModal("warehouse")}>＋ Add warehouse</button>}
            {tab === "employees"    && isAdmin && <button className="primary-button" onClick={() => setModal("employee")}>＋ Add employee</button>}
          </div>
        </header>

        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        <div className="page-content">
          {tab === "dashboard"     && <Dashboard data={data} setTab={setTab} openModal={setModal} />}
          {tab === "inventory"     && <Inventory products={data.products} search={search} />}
          {tab === "movements"     && <Movements movements={data.stockMovements} />}
          {tab === "returns"       && <Returns items={data.returns} />}
          {tab === "damages"       && (
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
          {tab === "vendors"       && <Vendors vendors={data.vendors} />}
          {tab === "warehouses"    && (
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
          {tab === "employees"     && (
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

      {/* ── Modals & Dialogs ── */}
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
          onSubmit={async newPassword => {
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
