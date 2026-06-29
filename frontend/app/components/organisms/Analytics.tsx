"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from "recharts";

interface MonthlyRevenue { month: string; revenue: number; orderCount: number }
interface StockCategory { category: string; meters: number; pieces: number }
interface TopBuyer { buyerName: string; totalSpend: number; orderCount: number }
interface AnalyticsData {
  analyticsStats: {
    monthlyRevenue: MonthlyRevenue[]
    stockByCategory: StockCategory[]
    topBuyers: TopBuyer[]
  }
}

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#f97316", "#14b8a6"];

function fmtK(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--muted)", marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function Empty() {
  return <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)", fontSize: 13 }}>No data yet — create some orders to see analytics</div>;
}

const PERIODS = [
  { label: "Last 3 months", months: 3 },
  { label: "Last 6 months", months: 6 },
  { label: "Last 12 months", months: 12 },
];

export default function Analytics({ gql }: { gql: (q: string) => Promise<AnalyticsData> }) {
  const [data, setData] = useState<AnalyticsData["analyticsStats"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(12);

  useEffect(() => {
    gql(`{
      analyticsStats {
        monthlyRevenue { month revenue orderCount }
        stockByCategory { category meters pieces }
        topBuyers { buyerName totalSpend orderCount }
      }
    }`)
      .then(d => setData(d.analyticsStats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gql]);

  if (loading) {
    return <div style={{ padding: 40, color: "var(--muted)", textAlign: "center" }}>Loading analytics…</div>;
  }

  if (!data) {
    return <div style={{ padding: 40, color: "var(--muted)", textAlign: "center" }}>Failed to load analytics</div>;
  }

  const { monthlyRevenue, stockByCategory, topBuyers } = data;
  const revenueFiltered = [...monthlyRevenue].sort((a, b) => a.month.localeCompare(b.month)).slice(-period);
  const totalRevenue = revenueFiltered.reduce((s, m) => s + m.revenue, 0);
  const totalOrders = revenueFiltered.reduce((s, m) => s + m.orderCount, 0);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Analytics</h2>
        <div style={{ display: "flex", gap: 6 }}>
          {PERIODS.map(p => (
            <button key={p.months} onClick={() => setPeriod(p.months)}
              style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: period === p.months ? "var(--primary)" : "transparent",
                color: period === p.months ? "#fff" : "var(--ink)" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--muted)" }}>Revenue ({PERIODS.find(p => p.months === period)?.label})</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>₹{totalRevenue.toLocaleString("en-IN")}</div>
        </div>
        <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--muted)" }}>Orders ({PERIODS.find(p => p.months === period)?.label})</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{totalOrders}</div>
        </div>
      </div>

      {/* Monthly Revenue */}
      <Section title={`Monthly Revenue — ${PERIODS.find(p => p.months === period)?.label}`}>
        {revenueFiltered.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueFiltered} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "var(--muted)" }} width={56} />
              <Tooltip
                formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]}
                labelStyle={{ fontSize: 12, fontWeight: 700 }}
                contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--paper)", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#rev)" dot={{ r: 3, fill: "#6366f1" }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* Stock by Category */}
        <Section title="Stock by Category">
          {stockByCategory.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stockByCategory} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted)" }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: "var(--muted)" }} width={80} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--paper)", fontSize: 12 }}
                  formatter={(v, name) => [Number(v), String(name) === "meters" ? "Metres (cloth)" : "Pcs (readymade)"]}
                />
                <Bar dataKey="meters" fill="#3b82f6" name="meters" radius={[0, 4, 4, 0]} />
                <Bar dataKey="pieces" fill="#10b981" name="pieces" radius={[0, 4, 4, 0]} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => v === "meters" ? "Metres" : "Pieces"} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        {/* Top Buyers */}
        <Section title="Top Buyers by Revenue">
          {topBuyers.length === 0 ? <Empty /> : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={topBuyers} dataKey="totalSpend" nameKey="buyerName" outerRadius={75} innerRadius={40} paddingAngle={3}>
                    {topBuyers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--paper)", fontSize: 12 }}
                    formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Spend"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                {topBuyers.slice(0, 5).map((b, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.buyerName}</span>
                    <span style={{ fontWeight: 700, color: "var(--muted)" }}>{fmtK(b.totalSpend)}</span>
                    <span style={{ color: "var(--muted)", fontSize: 10 }}>({b.orderCount} orders)</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>
      </div>
    </div>
  );
}
