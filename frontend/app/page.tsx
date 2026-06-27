"use client";

import { useCallback, useEffect, useState } from "react";
import { graphql, DASHBOARD_QUERY, SETTINGS_QUERY } from "@/app/lib/graphql";
import { applyBrandColors, applyDarkMode } from "@/app/lib/theme";
import { TAB_TITLES } from "@/app/lib/constants";

import Login from "@/app/components/organisms/Login";
import Dashboard from "@/app/components/organisms/Dashboard";
import Suppliers from "@/app/components/organisms/Suppliers";
import Buyers from "@/app/components/organisms/Buyers";
import PurchaseOrders from "@/app/components/organisms/PurchaseOrders";
import Cutting from "@/app/components/organisms/Cutting";
import Stitching from "@/app/components/organisms/Stitching";
import FinishedProducts from "@/app/components/organisms/FinishedProducts";
import SalesOrders from "@/app/components/organisms/SalesOrders";
import Credit from "@/app/components/organisms/Credit";
import Returns from "@/app/components/organisms/Returns";
import Employees from "@/app/components/organisms/Employees";
import Warehouses from "@/app/components/organisms/Warehouses";
import Notifications from "@/app/components/organisms/Notifications";
import Settings from "@/app/components/organisms/Settings";

import type { AppSettings, Tab } from "@/app/types";

// Tabs visible to each role; admins/managers see everything
const ADMIN_ONLY: Tab[] = ["employees", "settings"];
const MANAGEMENT: Tab[] = ["employees", "suppliers", "buyers", "purchase_orders", "raw_cloth", "readymade_stock", "cutting", "stitching", "finished_products", "sales_orders", "credit", "returns", "warehouses", "settings"];
const CUTTING_MASTER_TABS: Tab[] = ["dashboard", "cutting", "notifications"];
const TAILOR_TABS: Tab[] = ["dashboard", "stitching", "notifications"];
const STORE_KEEPER_TABS: Tab[] = ["dashboard", "raw_cloth", "readymade_stock", "finished_products", "notifications"];
const AUDITOR_TABS: Tab[] = ["dashboard", "suppliers", "buyers", "purchase_orders", "raw_cloth", "readymade_stock", "finished_products", "sales_orders", "credit", "returns", "notifications"];

const ALL_TABS: Tab[] = [
  "dashboard", "suppliers", "buyers", "purchase_orders",
  "raw_cloth", "readymade_stock", "cutting", "stitching",
  "finished_products", "sales_orders", "credit", "returns",
  "employees", "warehouses", "notifications", "settings",
];

const TAB_ICONS: Record<Tab, string> = {
  dashboard: "◎", suppliers: "⬇", buyers: "⬆", purchase_orders: "📋",
  raw_cloth: "🧵", readymade_stock: "👗", cutting: "✂", stitching: "🪡",
  finished_products: "🏷", sales_orders: "💰", credit: "📊", returns: "↩",
  employees: "👥", warehouses: "🏭", notifications: "🔔", settings: "⚙",
};

function getVisibleTabs(role: string): Tab[] {
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER") return ALL_TABS;
  if (role === "CUTTING_MASTER") return CUTTING_MASTER_TABS;
  if (role === "TAILOR") return TAILOR_TABS;
  if (role === "STORE_KEEPER") return STORE_KEEPER_TABS;
  if (role === "AUDITOR") return AUDITOR_TABS;
  return ["dashboard", "notifications"];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppData = Record<string, any>;

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [publicSettings, setPublicSettings] = useState<Partial<AppSettings> | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => { applyDarkMode(darkMode); }, [darkMode]);
  useEffect(() => {
    if (data?.systemSettings) applyBrandColors(data.systemSettings);
  }, [data?.systemSettings]);

  // Load public settings (for login page branding)
  useEffect(() => {
    graphql<{ systemSettings: AppSettings }>(SETTINGS_QUERY)
      .then(r => setPublicSettings(r.systemSettings))
      .catch(() => {});
    const t = localStorage.getItem("jwt");
    if (t) { setToken(t); } else { setLoading(false); }
  }, []);

  const loadData = useCallback(async (jwt: string) => {
    setLoading(true); setError("");
    try {
      const result = await graphql<AppData>(DASHBOARD_QUERY, {}, jwt);
      setData(result);
    } catch (e: unknown) {
      if (e instanceof Error && e.message.toLowerCase().includes("not authenticated")) {
        localStorage.removeItem("jwt"); setToken(null);
      } else {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (token) loadData(token); }, [token, loadData]);

  function handleLogin(jwt: string) { localStorage.setItem("jwt", jwt); setToken(jwt); }
  function handleLogout() { localStorage.removeItem("jwt"); setToken(null); setData(null); }

  const mutate = useCallback(async (query: string, variables: Record<string, unknown>) => {
    if (!token) throw new Error("Not authenticated");
    await graphql(query, variables, token);
    await loadData(token);
  }, [token, loadData]);

  if (!token || (!data && loading)) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg)" }}>
        {loading ? (
          <div style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</div>
        ) : (
          <Login onLogin={handleLogin} />
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 12 }}>
        <div style={{ color: "#f44336", fontSize: 15 }}>{error}</div>
        <button onClick={() => token && loadData(token)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer" }}>Retry</button>
        <button onClick={handleLogout} style={{ fontSize: 13, color: "var(--muted)", border: "none", background: "none", cursor: "pointer" }}>Log out</button>
      </div>
    );
  }

  const profile = data?.employeeProfile;
  const role: string = profile?.role || "STORE_KEEPER";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";
  const isStoreKeeper = role === "STORE_KEEPER";
  const isCuttingMaster = role === "CUTTING_MASTER";
  const isTailor = role === "TAILOR";

  const visibleTabs = getVisibleTabs(role);
  const currentTab: Tab = visibleTabs.includes(tab) ? tab : visibleTabs[0];

  const unreadCount = (data?.notifications || []).filter((n: { read: boolean }) => !n.read).length;
  const cuttingMasters = (data?.employees || []).filter((e: { role: string }) => e.role === "CUTTING_MASTER");
  const tailors = (data?.employees || []).filter((e: { role: string }) => e.role === "TAILOR");

  const SIDEBAR_WIDTH = sidebarOpen ? 220 : 56;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside style={{
        width: SIDEBAR_WIDTH, flexShrink: 0, position: "fixed", inset: "0 auto 0 0",
        background: "var(--primary)", color: "#fff", display: "flex", flexDirection: "column",
        transition: "width 0.2s", overflow: "hidden", zIndex: 10,
      }}>
        <div style={{ padding: "18px 12px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #ffffff22" }}>
          {sidebarOpen && <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.3 }}>
            {data?.systemSettings?.appName || "GarmentERP"}
          </div>}
          <button onClick={() => setSidebarOpen(o => !o)}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18, padding: 4, marginLeft: sidebarOpen ? 0 : "auto", marginRight: "auto" }}>
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {visibleTabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: sidebarOpen ? "9px 16px" : "9px", justifyContent: sidebarOpen ? "flex-start" : "center",
              background: currentTab === t ? "#ffffff22" : "none",
              border: "none", color: "#fff", cursor: "pointer",
              fontWeight: currentTab === t ? 700 : 400, fontSize: 14,
              borderLeft: currentTab === t ? "3px solid #fff" : "3px solid transparent",
              transition: "background 0.15s",
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{TAB_ICONS[t]}</span>
              {sidebarOpen && (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {TAB_TITLES[t]}
                  {t === "notifications" && unreadCount > 0 && (
                    <span style={{ background: "#f44336", color: "#fff", borderRadius: 99, fontSize: 10, padding: "1px 6px", fontWeight: 700 }}>{unreadCount}</span>
                  )}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px", borderTop: "1px solid #ffffff22" }}>
          {sidebarOpen && (
            <div style={{ fontSize: 12, color: "#ffffff99", marginBottom: 8 }}>
              {profile?.username} · {role.replace(/_/g, " ")}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setDarkMode(d => !d)}
              style={{ background: "none", border: "1px solid #ffffff44", color: "#fff", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer" }}>
              {darkMode ? "☀" : "☾"}
            </button>
            {sidebarOpen && (
              <button onClick={handleLogout}
                style={{ flex: 1, background: "none", border: "1px solid #ffffff44", color: "#fff", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>
                Log Out
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: SIDEBAR_WIDTH, flex: 1, minWidth: 0, transition: "margin-left 0.2s" }}>
        {/* Topbar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 5,
          background: "var(--paper)", borderBottom: "1px solid var(--border)",
          padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{TAB_TITLES[currentTab]}</h1>
          <button onClick={() => token && loadData(token)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 12px", fontSize: 13, cursor: "pointer", color: "var(--muted)" }}>
            ↺ Refresh
          </button>
        </div>

        {/* Tab content */}
        {currentTab === "dashboard" && (
          <Dashboard stats={data?.dashboardStats} profile={data?.employeeProfile} />
        )}
        {currentTab === "suppliers" && (
          <Suppliers suppliers={data?.suppliers || []} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} isManager={isManager} onMutate={mutate} />
        )}
        {currentTab === "buyers" && (
          <Buyers buyers={data?.buyers || []} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} isManager={isManager} onMutate={mutate} />
        )}
        {currentTab === "purchase_orders" && (
          <PurchaseOrders
            orders={data?.purchaseOrders || []}
            suppliers={data?.suppliers || []}
            warehouses={data?.warehouseLocations || []}
            isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} isManager={isManager}
            onMutate={mutate}
          />
        )}
        {currentTab === "raw_cloth" && (
          <div style={{ padding: 24 }}>
            <h2 style={{ margin: "0 0 20px" }}>Raw Cloth Batches <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 16 }}>({(data?.rawClothBatches || []).length} batches)</span></h2>
            <div style={{ background: "var(--paper)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg)", fontSize: 12, color: "var(--muted)", textAlign: "left" }}>
                    {["Batch", "Category", "Color", "Total m", "Available m", "Cost/m", "Bin", "Warehouse", "Received"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.rawClothBatches || []).map((b: AppData) => (
                    <tr key={b.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 600 }}>{b.batchNumber}</td>
                      <td style={{ padding: "12px 14px" }}>{b.clothCategory?.name}</td>
                      <td style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                        {b.clothColor?.hexCode && <span style={{ width: 14, height: 14, borderRadius: 3, background: b.clothColor.hexCode, display: "inline-block" }} />}
                        {b.clothColor?.name}
                      </td>
                      <td style={{ padding: "12px 14px" }}>{b.totalMeters}m</td>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: b.availableMeters < 5 ? "#f44336" : "inherit" }}>{b.availableMeters}m</td>
                      <td style={{ padding: "12px 14px" }}>₹{b.costPerMeter}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted)" }}>{b.binLocation || "—"}</td>
                      <td style={{ padding: "12px 14px" }}>{b.warehouse?.name}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13 }}>{b.receivedDate ? new Date(b.receivedDate).toLocaleDateString("en-IN") : "—"}</td>
                    </tr>
                  ))}
                  {!(data?.rawClothBatches?.length) && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No raw cloth batches</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {currentTab === "readymade_stock" && (
          <div style={{ padding: 24 }}>
            <h2 style={{ margin: "0 0 20px" }}>Readymade Stock</h2>
            <div style={{ background: "var(--paper)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg)", fontSize: 12, color: "var(--muted)", textAlign: "left" }}>
                    {["Item Type", "Color", "Size", "Received", "Available", "Cost", "Warehouse"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.readymadeStock || []).map((s: AppData) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 600 }}>{s.itemType?.name}</td>
                      <td style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                        {s.clothColor?.hexCode && <span style={{ width: 14, height: 14, borderRadius: 3, background: s.clothColor.hexCode, display: "inline-block" }} />}
                        {s.clothColor?.name || "—"}
                      </td>
                      <td style={{ padding: "12px 14px" }}>{s.size || "—"}</td>
                      <td style={{ padding: "12px 14px" }}>{s.quantityReceived} pcs</td>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: s.quantityAvailable < 5 ? "#f44336" : "inherit" }}>{s.quantityAvailable} pcs</td>
                      <td style={{ padding: "12px 14px" }}>₹{s.costPrice}</td>
                      <td style={{ padding: "12px 14px" }}>{s.warehouse?.name}</td>
                    </tr>
                  ))}
                  {!(data?.readymadeStock?.length) && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No readymade stock</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {currentTab === "cutting" && (
          <Cutting
            assignments={data?.cuttingAssignments || []}
            batches={data?.rawClothBatches || []}
            cuttingMasters={cuttingMasters}
            itemTypes={data?.itemTypes || []}
            isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} isManager={isManager} isCuttingMaster={isCuttingMaster}
            onMutate={mutate}
          />
        )}
        {currentTab === "stitching" && (
          <Stitching
            jobs={data?.stitchingJobs || []}
            assignments={data?.cuttingAssignments || []}
            tailors={tailors}
            isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} isManager={isManager} isTailor={isTailor}
            onMutate={mutate}
          />
        )}
        {currentTab === "finished_products" && (
          <FinishedProducts
            products={data?.finishedProducts || []}
            isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} isManager={isManager} isStoreKeeper={isStoreKeeper}
            onMutate={mutate}
          />
        )}
        {currentTab === "sales_orders" && (
          <SalesOrders
            orders={data?.salesOrders || []}
            isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} isManager={isManager}
            onMutate={mutate}
          />
        )}
        {currentTab === "credit" && (
          <Credit
            credits={data?.creditTransactions || []}
            isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} isManager={isManager}
            onMutate={mutate}
          />
        )}
        {currentTab === "returns" && (
          <Returns
            buyerReturns={data?.buyerReturns || []}
            supplierReturns={data?.supplierReturns || []}
          />
        )}
        {currentTab === "employees" && (
          <Employees
            employees={data?.employees || []}
            warehouses={data?.warehouseLocations || []}
            isSuperAdmin={isSuperAdmin} isAdmin={isAdmin}
            currentUserId={profile?.id || ""}
            onMutate={mutate}
          />
        )}
        {currentTab === "warehouses" && (
          <Warehouses
            warehouses={data?.warehouseLocations || []}
            isSuperAdmin={isSuperAdmin} isAdmin={isAdmin}
            onMutate={mutate}
          />
        )}
        {currentTab === "notifications" && (
          <Notifications
            notifications={data?.notifications || []}
            onMutate={mutate}
          />
        )}
        {currentTab === "settings" && (
          <Settings
            settings={data?.systemSettings || {}}
            isSuperAdmin={isSuperAdmin}
            onMutate={mutate}
          />
        )}
      </main>
    </div>
  );
}
