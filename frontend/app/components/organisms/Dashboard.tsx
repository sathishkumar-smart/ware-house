"use client";
import { useState } from "react";
import { X } from "lucide-react";
import type { DashboardStats, Employee } from "@/app/types";
import { formatMoney } from "@/app/lib/formatters";

interface RawBatch { id: string; batchNumber: string; availableMeters: number; clothCategory: { name: string }; clothColor: { name: string; hexCode?: string }; warehouse: { name: string } }
interface ReadymadeItem { id: string; quantityAvailable: number; size: string; itemType: { name: string }; warehouse: { name: string } }

const LOW_RAW_THRESHOLD = 50;   // metres
const LOW_RMD_THRESHOLD = 10;   // pieces

function StatCard({ label, value, sub, color = "var(--primary)" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "18px 22px", borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "var(--fg)" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function AlertRow({ icon, title, sub, color }: { icon: string; title: string; sub: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

export default function Dashboard({
  stats, profile, rawBatches = [], readymadeStock = [],
}: {
  stats?: DashboardStats; profile?: Employee;
  rawBatches?: RawBatch[]; readymadeStock?: ReadymadeItem[];
}) {
  const [alertsDismissed, setAlertsDismissed] = useState(false);

  if (!stats || !profile) {
    return <div style={{ padding: 28, color: "var(--muted)" }}>Loading dashboard…</div>;
  }

  const lowRaw = rawBatches.filter(b => b.availableMeters > 0 && b.availableMeters < LOW_RAW_THRESHOLD);
  const outRaw = rawBatches.filter(b => b.availableMeters <= 0);
  const lowRmd = readymadeStock.filter(r => r.quantityAvailable > 0 && r.quantityAvailable < LOW_RMD_THRESHOLD);
  const outRmd = readymadeStock.filter(r => r.quantityAvailable <= 0);

  const totalAlerts = lowRaw.length + outRaw.length + lowRmd.length + outRmd.length;

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Welcome back, {profile.username}</h1>
        <div style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>
          {profile.role.replace(/_/g, " ")} · {(profile.locations ?? []).map(l => l.name).join(", ") || "All locations"}
        </div>
      </div>

      {/* ─── Low stock alerts ─────────────────────────────────────────── */}
      {totalAlerts > 0 && !alertsDismissed && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", gap: 6 }}>
            <span>⚠ Stock Alerts</span>
            <span style={{ background: "#f59e0b", color: "#fff", borderRadius: 99, fontSize: 10, padding: "1px 7px", fontWeight: 700 }}>{totalAlerts}</span>
            <button
              onClick={() => setAlertsDismissed(true)}
              title="Dismiss alerts"
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#b45309", display: "flex", alignItems: "center", padding: 4, borderRadius: 6 }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ background: "var(--paper)", border: "1px solid #f59e0b55", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(245,158,11,0.08)" }}>
            <div style={{ background: "#fffbeb", padding: "10px 14px", borderBottom: "1px solid #f59e0b44", fontSize: 12, color: "#92400e", fontWeight: 600 }}>
              Low stock threshold: raw cloth &lt; {LOW_RAW_THRESHOLD}m · readymade &lt; {LOW_RMD_THRESHOLD} pcs
            </div>
            {outRaw.map(b => (
              <AlertRow key={b.id} icon="🚨" color="#dc2626"
                title={`OUT OF STOCK: ${b.clothCategory.name} — ${b.clothColor.name}`}
                sub={`${b.batchNumber} · ${b.warehouse.name} · 0m remaining`} />
            ))}
            {lowRaw.map(b => (
              <AlertRow key={b.id} icon="⚠️" color="#b45309"
                title={`Low raw cloth: ${b.clothCategory.name} — ${b.clothColor.name}`}
                sub={`${b.batchNumber} · ${b.warehouse.name} · ${b.availableMeters.toFixed(1)}m remaining`} />
            ))}
            {outRmd.map(r => (
              <AlertRow key={r.id} icon="🚨" color="#dc2626"
                title={`OUT OF STOCK: ${r.itemType.name}${r.size ? ` · ${r.size}` : ""}`}
                sub={`${r.warehouse.name} · 0 pcs remaining`} />
            ))}
            {lowRmd.map(r => (
              <AlertRow key={r.id} icon="⚠️" color="#b45309"
                title={`Low readymade stock: ${r.itemType.name}${r.size ? ` · ${r.size}` : ""}`}
                sub={`${r.warehouse.name} · ${r.quantityAvailable} pcs remaining`} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Stats grids ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>Inventory Snapshot</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Raw Cloth Available" value={`${(stats.totalRawMeters ?? 0).toFixed(1)} m`}
          color={lowRaw.length > 0 || outRaw.length > 0 ? "#f59e0b" : "var(--primary)"} />
        <StatCard label="Finished Pieces" value={stats.totalFinishedPieces ?? 0}
          sub={`${stats.inhousePieces ?? 0} stitched · ${stats.readymadePieces ?? 0} imported`} />
        <StatCard label="Suppliers" value={stats.totalSuppliers ?? 0} />
        <StatCard label="Buyers" value={stats.totalBuyers ?? 0} />
      </div>

      <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>Active Operations</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Purchase Orders" value={stats.activePurchaseOrders ?? 0} color="#2196f3" />
        <StatCard label="Sales Orders" value={stats.activeSalesOrders ?? 0} color="#9c27b0" />
        <StatCard label="Cutting In Progress" value={stats.cuttingInProgress ?? 0} color="#ff9800" />
        <StatCard label="Stitching In Progress" value={stats.stitchingInProgress ?? 0} color="#ff9800" />
      </div>

      <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>Revenue & Credit</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
        <StatCard label="Revenue This Month" value={formatMoney(stats.revenueThisMonth ?? 0)} color="var(--accent)" />
        <StatCard label="Revenue This Year" value={formatMoney(stats.revenueThisYear ?? 0)} color="var(--accent)" />
        <StatCard label="Credit Outstanding" value={formatMoney(stats.creditOutstanding ?? 0)}
          color={(stats.creditOutstanding ?? 0) > 0 ? "#f44336" : "#4caf50"} />
      </div>
    </div>
  );
}
