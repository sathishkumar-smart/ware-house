"use client";
import { useState } from "react";
import type { PurchaseOrder, Supplier, WarehouseLocation, ClothCategory, ClothColor, ItemType } from "@/app/types";
import { PO_STATUS_LABELS, STATUS_BADGE_COLORS } from "@/app/lib/constants";
import { formatMoney, formatDateShort } from "@/app/lib/formatters";

interface Props {
  orders: PurchaseOrder[]; suppliers: Supplier[]; warehouses: WarehouseLocation[]
  categories: ClothCategory[]; colors: ClothColor[]; itemTypes: ItemType[]
  isAdmin: boolean; isSuperAdmin: boolean; isManager: boolean
  onMutate: (q: string, v: Record<string, unknown>) => Promise<void>
}

function Badge({ s }: { s: string }) {
  return <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: (STATUS_BADGE_COLORS[s] || "#888") + "22", color: STATUS_BADGE_COLORS[s] || "#888" }}>{PO_STATUS_LABELS[s] || s}</span>;
}

export default function PurchaseOrders({ orders, suppliers, warehouses, categories, colors, itemTypes, isAdmin, isSuperAdmin, isManager, onMutate }: Props) {
  const [detail, setDetail] = useState<PurchaseOrder | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canEdit = isSuperAdmin || isAdmin || isManager;
  const filtered = orders.filter(o =>
    (o.poNumber.toLowerCase().includes(search.toLowerCase()) || o.supplier.name.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || o.status === statusFilter)
  );

  async function updateStatus(id: string, status: string) {
    setLoading(true); setError("");
    try {
      await onMutate(`mutation U($id:ID!,$s:String!){updatePurchaseOrderStatus(id:$id,status:$s){purchaseOrder{id status}}}`, { id, s: status });
      setDetail(d => d ? { ...d, status } : null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  const STATUSES = ["DRAFT", "PLACED", "DISPATCHED", "RECEIVED", "VERIFIED", "CANCELLED"];
  const PO_NEXT: Record<string, string> = { DRAFT: "PLACED", PLACED: "DISPATCHED", DISPATCHED: "RECEIVED", RECEIVED: "VERIFIED" };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Purchase Orders <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 16 }}>({orders.length})</span></h2>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <input placeholder="Search PO number or supplier…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{PO_STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {/* Detail panel */}
      {detail && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}>
          <div style={{ background: "var(--paper)", width: "min(560px, 100vw)", height: "100vh", overflowY: "auto", padding: 28, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{detail.poNumber}</div>
                <div style={{ color: "var(--muted)", fontSize: 14 }}>{detail.supplier.name}</div>
              </div>
              <button onClick={() => { setDetail(null); setError(""); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>×</button>
            </div>
            {error && <div style={{ color: "#f44", marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <Badge s={detail.status} />
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Ordered: {formatDateShort(detail.orderDate)}</span>
              {detail.expectedDelivery && <span style={{ fontSize: 13, color: "var(--muted)" }}>Expected: {formatDateShort(detail.expectedDelivery)}</span>}
            </div>
            <div style={{ marginBottom: 16, fontSize: 14 }}>
              <strong>Warehouse:</strong> {detail.warehouse.name} &nbsp;|&nbsp; <strong>Total:</strong> {formatMoney(detail.totalAmount)}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Items</div>
              {detail.items.map((item, i) => (
                <div key={i} style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 14px", marginBottom: 8, fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>{item.itemKind === "RAW_CLOTH" ? `${item.clothCategory?.name} — ${item.clothColor?.name}` : (item.itemType?.name || item.itemName)}</div>
                  {item.itemKind === "RAW_CLOTH"
                    ? <div style={{ color: "var(--muted)" }}>{item.orderedMeters}m ordered · {item.receivedMeters}m received · ₹{item.unitPrice}/m</div>
                    : <div style={{ color: "var(--muted)" }}>{item.orderedQuantity} pcs ordered · {item.receivedQuantity} received · ₹{item.unitPrice}/pc {item.size && `· ${item.size}`}</div>}
                  <div style={{ color: "var(--accent)", fontWeight: 600 }}>{formatMoney(item.totalPrice)}</div>
                </div>
              ))}
            </div>
            {canEdit && PO_NEXT[detail.status] && (
              <button onClick={() => updateStatus(detail.id, PO_NEXT[detail.status])} disabled={loading}
                style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>
                {loading ? "Updating…" : `Mark as ${PO_STATUS_LABELS[PO_NEXT[detail.status]]}`}
              </button>
            )}
            {canEdit && detail.status !== "CANCELLED" && detail.status !== "VERIFIED" && (
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
              {["PO Number", "Supplier", "Type", "Date", "Total", "Status", ""].map(h => (
                <th key={h} style={{ padding: "10px 16px", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{o.poNumber}</td>
                <td style={{ padding: "12px 16px" }}>{o.supplier.name}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)" }}>{o.orderType.replace("_", " ")}</td>
                <td style={{ padding: "12px 16px", fontSize: 13 }}>{formatDateShort(o.orderDate)}</td>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{formatMoney(o.totalAmount)}</td>
                <td style={{ padding: "12px 16px" }}><Badge s={o.status} /></td>
                <td style={{ padding: "12px 16px" }}>
                  <button onClick={() => { setDetail(o); setError(""); }}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 13 }}>View</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No purchase orders</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
