"use client";
import type { DashboardStats, Employee } from "@/app/types";
import { formatMoney } from "@/app/lib/formatters";

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

export default function Dashboard({ stats, profile }: { stats: DashboardStats; profile: Employee }) {
  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Welcome back, {profile.username}</h1>
        <div style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>
          {profile.role.replace(/_/g, " ")} · {profile.locations.map(l => l.name).join(", ") || "All locations"}
        </div>
      </div>

      <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>Inventory Snapshot</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Raw Cloth Available" value={`${stats.totalRawMeters.toFixed(1)} m`} />
        <StatCard label="Finished Pieces" value={stats.totalFinishedPieces}
          sub={`${stats.inhousePieces} stitched · ${stats.readymadePieces} imported`} />
        <StatCard label="Suppliers" value={stats.totalSuppliers} />
        <StatCard label="Buyers" value={stats.totalBuyers} />
      </div>

      <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>Active Operations</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Purchase Orders" value={stats.activePurchaseOrders} color="#2196f3" />
        <StatCard label="Sales Orders" value={stats.activeSalesOrders} color="#9c27b0" />
        <StatCard label="Cutting In Progress" value={stats.cuttingInProgress} color="#ff9800" />
        <StatCard label="Stitching In Progress" value={stats.stitchingInProgress} color="#ff9800" />
      </div>

      <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>Revenue & Credit</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
        <StatCard label="Revenue This Month" value={formatMoney(stats.revenueThisMonth)} color="var(--accent)" />
        <StatCard label="Revenue This Year" value={formatMoney(stats.revenueThisYear)} color="var(--accent)" />
        <StatCard label="Credit Outstanding" value={formatMoney(stats.creditOutstanding)}
          color={stats.creditOutstanding > 0 ? "#f44336" : "#4caf50"} />
      </div>
    </div>
  );
}
