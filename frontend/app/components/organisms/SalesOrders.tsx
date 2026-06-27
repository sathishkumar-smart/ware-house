"use client";
import { useState } from "react";
import type { SalesOrder } from "@/app/types";
import { SO_STATUS_LABELS, STATUS_BADGE_COLORS, PAYMENT_MODE_LABELS } from "@/app/lib/constants";
import { formatMoney, formatDateShort } from "@/app/lib/formatters";

interface Props {
  orders: SalesOrder[]; isAdmin: boolean; isSuperAdmin: boolean; isManager: boolean
  onMutate: (q: string, v: Record<string, unknown>) => Promise<void>
}

function Badge({ s, label }: { s: string; label?: string }) {
  return <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: (STATUS_BADGE_COLORS[s] || "#888") + "22", color: STATUS_BADGE_COLORS[s] || "#888" }}>{label || SO_STATUS_LABELS[s] || s}</span>;
}

const SO_NEXT: Record<string, string> = { REQUESTED: "PROCESSING", PROCESSING: "READY", READY: "DISPATCHED", DISPATCHED: "DELIVERED" };

export default function SalesOrders({ orders, isAdmin, isSuperAdmin, isManager, onMutate }: Props) {
  const [detail, setDetail] = useState<SalesOrder | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canEdit = isSuperAdmin || isAdmin || isManager;
  const filtered = orders.filter(o =>
    (o.orderNumber.toLowerCase().includes(search.toLowerCase()) || o.buyer.name.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || o.status === statusFilter)
  );

  async function updateStatus(id: string, status: string) {
    setLoading(true); setError("");
    try {
      await onMutate(`mutation U($id:ID!,$s:String!){updateSalesOrderStatus(id:$id,status:$s){salesOrder{id status}}}`, { id, s: status });
      setDetail(d => d ? { ...d, status } : null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Sales Orders <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 16 }}>({orders.length})</span></h2>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <input placeholder="Search order number or buyer…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}>
          <option value="">All statuses</option>
          {Object.entries(SO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {detail && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}>
          <div style={{ background: "var(--paper)", width: "min(560px, 100vw)", height: "100vh", overflowY: "auto", padding: 28, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{detail.orderNumber}</div>
                <div style={{ color: "var(--muted)", fontSize: 14 }}>{detail.buyer.name}</div>
              </div>
              <button onClick={() => { setDetail(null); setError(""); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>×</button>
            </div>
            {error && <div style={{ color: "#f44", marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <Badge s={detail.status} />
              <Badge s={detail.paymentMode} label={PAYMENT_MODE_LABELS[detail.paymentMode]} />
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Ordered: {formatDateShort(detail.orderDate)}</span>
            </div>
            <div style={{ background: "var(--bg)", borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Subtotal</div><div style={{ fontWeight: 600 }}>{formatMoney(detail.subtotal)}</div></div>
                <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Discount</div><div style={{ fontWeight: 600 }}>{formatMoney(detail.discount)}</div></div>
                <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Total</div><div style={{ fontWeight: 700, fontSize: 16 }}>{formatMoney(detail.totalAmount)}</div></div>
                {detail.amountDue > 0 && <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Due</div><div style={{ fontWeight: 700, color: "#f44336" }}>{formatMoney(detail.amountDue)}</div></div>}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Items</div>
              {detail.items.map((item, i) => (
                <div key={i} style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 14px", marginBottom: 8, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.finishedProduct.itemType.name}</div>
                    <div style={{ color: "var(--muted)" }}>{item.finishedProduct.sku} · {item.quantity} pcs × {formatMoney(item.unitPrice)}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: "var(--accent)" }}>{formatMoney(item.totalPrice)}</div>
                </div>
              ))}
            </div>
            {canEdit && SO_NEXT[detail.status] && (
              <button onClick={() => updateStatus(detail.id, SO_NEXT[detail.status])} disabled={loading}
                style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>
                {loading ? "Updating…" : `Mark as ${SO_STATUS_LABELS[SO_NEXT[detail.status]]}`}
              </button>
            )}
            {canEdit && !["DELIVERED", "CANCELLED"].includes(detail.status) && (
              <button onClick={() => updateStatus(detail.id, "CANCELLED")} disabled={loading}
                style={{ width: "100%", padding: "9px", borderRadius: 8, border: "1px solid #f44336", background: "none", color: "#f44336", cursor: "pointer", fontSize: 13 }}>
                Cancel Order
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ background: "var(--paper)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg)", fontSize: 12, color: "var(--muted)", textAlign: "left" }}>
              {["Order", "Buyer", "Date", "Total", "Paid", "Due", "Payment", "Status", ""].map(h => (
                <th key={h} style={{ padding: "10px 14px", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 14px", fontWeight: 600 }}>{o.orderNumber}</td>
                <td style={{ padding: "12px 14px" }}>{o.buyer.name}</td>
                <td style={{ padding: "12px 14px", fontSize: 13 }}>{formatDateShort(o.orderDate)}</td>
                <td style={{ padding: "12px 14px", fontWeight: 600 }}>{formatMoney(o.totalAmount)}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, color: "#4caf50" }}>{formatMoney(o.amountPaid)}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, color: o.amountDue > 0 ? "#f44336" : "var(--muted)" }}>{formatMoney(o.amountDue)}</td>
                <td style={{ padding: "12px 14px" }}><Badge s={o.paymentMode} label={PAYMENT_MODE_LABELS[o.paymentMode]} /></td>
                <td style={{ padding: "12px 14px" }}><Badge s={o.status} /></td>
                <td style={{ padding: "12px 14px" }}>
                  <button onClick={() => { setDetail(o); setError(""); }}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 13 }}>View</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No sales orders</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
