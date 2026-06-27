"use client";
import { useState } from "react";
import type { CreditTransaction } from "@/app/types";
import { CREDIT_STATUS_LABELS, STATUS_BADGE_COLORS } from "@/app/lib/constants";
import { formatMoney, formatDateShort } from "@/app/lib/formatters";

interface Props {
  credits: CreditTransaction[]; isAdmin: boolean; isSuperAdmin: boolean; isManager: boolean
  onMutate: (q: string, v: Record<string, unknown>) => Promise<void>
}

function Badge({ s }: { s: string }) {
  return <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: (STATUS_BADGE_COLORS[s] || "#888") + "22", color: STATUS_BADGE_COLORS[s] || "#888" }}>{CREDIT_STATUS_LABELS[s] || s}</span>;
}

export default function Credit({ credits, isAdmin, isSuperAdmin, isManager, onMutate }: Props) {
  const [detail, setDetail] = useState<CreditTransaction | null>(null);
  const [payForm, setPayForm] = useState({ amount: 0, method: "CASH", reference: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const canEdit = isSuperAdmin || isAdmin || isManager;
  const filtered = credits.filter(c => !statusFilter || c.status === statusFilter);
  const totalOutstanding = credits.filter(c => c.status !== "SETTLED").reduce((s, c) => s + c.amountDue, 0);

  async function recordPayment() {
    if (!detail) return;
    setLoading(true); setError("");
    try {
      await onMutate(
        `mutation P($id:ID!,$amount:Float!,$method:String,$ref:String,$notes:String){recordCreditPayment(creditId:$id,amount:$amount,paymentMethod:$method,reference:$ref,notes:$notes){credit{id status amountPaid amountDue}}}`,
        { id: detail.id, amount: payForm.amount, method: payForm.method, ref: payForm.reference, notes: payForm.notes }
      );
      setDetail(null);
      setPayForm({ amount: 0, method: "CASH", reference: "", notes: "" });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Credit Tracking</h2>
        {totalOutstanding > 0 && (
          <div style={{ background: "#f4433620", color: "#f44336", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: 15 }}>
            ₹ {formatMoney(totalOutstanding)} outstanding
          </div>
        )}
      </div>
      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
        style={{ marginBottom: 16, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}>
        <option value="">All statuses</option>
        {Object.entries(CREDIT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>

      {detail && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--paper)", borderRadius: 16, padding: 32, width: 480, maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{detail.buyer.name}</div>
                <div style={{ color: "var(--muted)", fontSize: 14 }}>{detail.salesOrder.orderNumber}</div>
              </div>
              <button onClick={() => { setDetail(null); setError(""); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            {error && <div style={{ color: "#f44", marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <div style={{ background: "var(--bg)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, fontSize: 14 }}>
                <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Total</div><div style={{ fontWeight: 700 }}>{formatMoney(detail.totalAmount)}</div></div>
                <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Paid</div><div style={{ fontWeight: 700, color: "#4caf50" }}>{formatMoney(detail.amountPaid)}</div></div>
                <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Due</div><div style={{ fontWeight: 700, color: "#f44336" }}>{formatMoney(detail.amountDue)}</div></div>
              </div>
            </div>
            {detail.payments.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Payment History</div>
                {detail.payments.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <div>
                      <div>{formatDateShort(p.paymentDate)} · {p.paymentMethod}</div>
                      {p.reference && <div style={{ fontSize: 12, color: "var(--muted)" }}>Ref: {p.reference}</div>}
                    </div>
                    <div style={{ fontWeight: 700, color: "#4caf50" }}>{formatMoney(p.amount)}</div>
                  </div>
                ))}
              </div>
            )}
            {canEdit && detail.status !== "SETTLED" && (
              <>
                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Record Payment</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                    Amount
                    <input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: +e.target.value }))}
                      style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
                  </label>
                  <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                    Method
                    <select value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}
                      style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}>
                      {["CASH", "UPI", "NEFT", "CHEQUE", "OTHER"].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                    Reference (UTR / Cheque No.)
                    <input value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))}
                      style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
                  </label>
                  <button onClick={recordPayment} disabled={loading || payForm.amount <= 0}
                    style={{ padding: "11px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                    {loading ? "Recording…" : "Record Payment"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ background: "var(--paper)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg)", fontSize: 12, color: "var(--muted)", textAlign: "left" }}>
              {["Buyer", "Order", "Total", "Paid", "Due", "Due Date", "Status", ""].map(h => (
                <th key={h} style={{ padding: "10px 14px", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 14px", fontWeight: 600 }}>{c.buyer.name}</td>
                <td style={{ padding: "12px 14px", fontSize: 13 }}>{c.salesOrder.orderNumber}</td>
                <td style={{ padding: "12px 14px" }}>{formatMoney(c.totalAmount)}</td>
                <td style={{ padding: "12px 14px", color: "#4caf50" }}>{formatMoney(c.amountPaid)}</td>
                <td style={{ padding: "12px 14px", fontWeight: 700, color: c.amountDue > 0 ? "#f44336" : "var(--muted)" }}>{formatMoney(c.amountDue)}</td>
                <td style={{ padding: "12px 14px", fontSize: 13 }}>{c.dueDate ? formatDateShort(c.dueDate) : "—"}</td>
                <td style={{ padding: "12px 14px" }}><Badge s={c.status} /></td>
                <td style={{ padding: "12px 14px" }}>
                  <button onClick={() => { setDetail(c); setError(""); }}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 13 }}>
                    {canEdit && c.status !== "SETTLED" ? "Pay" : "View"}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No credit transactions</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
