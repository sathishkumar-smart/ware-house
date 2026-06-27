"use client";
import { useState } from "react";
import type { Buyer } from "@/app/types";
import { BUYER_TYPE_LABELS } from "@/app/lib/constants";
import { formatMoney } from "@/app/lib/formatters";

interface Props { buyers: Buyer[]; isAdmin: boolean; isSuperAdmin: boolean; onMutate: (q: string, v: Record<string, unknown>) => Promise<void> }

const BUYER_COLORS: Record<string, string> = { WHOLESALE: "#9c27b0", RETAIL: "#2196f3", EXPORT: "#4caf50" };

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: color + "22", color }}>{label}</span>;
}

export default function Buyers({ buyers, isAdmin, isSuperAdmin, onMutate }: Props) {
  const [editing, setEditing] = useState<Partial<Buyer> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canEdit = isSuperAdmin || isAdmin;
  const filtered = buyers.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || b.contactPerson?.toLowerCase().includes(search.toLowerCase()));

  async function save() {
    if (!editing) return;
    setLoading(true); setError("");
    try {
      const m = isNew
        ? `mutation C($name:String!,$cp:String,$email:String,$phone:String,$wa:String,$addr:String,$city:String,$state:String,$gstin:String,$bt:String,$cl:Float,$notes:String){createBuyer(name:$name,contactPerson:$cp,email:$email,phone:$phone,whatsapp:$wa,address:$addr,city:$city,state:$state,gstin:$gstin,buyerType:$bt,creditLimit:$cl,notes:$notes){buyer{id}}}`
        : `mutation U($id:ID!,$name:String,$cp:String,$email:String,$phone:String,$wa:String,$addr:String,$city:String,$state:String,$gstin:String,$bt:String,$cl:Float,$notes:String,$active:Boolean){updateBuyer(id:$id,name:$name,contactPerson:$cp,email:$email,phone:$phone,whatsapp:$wa,address:$addr,city:$city,state:$state,gstin:$gstin,buyerType:$bt,creditLimit:$cl,notes:$notes,active:$active){buyer{id}}}`;
      await onMutate(m, { id: editing.id, name: editing.name, cp: editing.contactPerson, email: editing.email, phone: editing.phone, wa: editing.whatsapp, addr: editing.address, city: editing.city, state: editing.state, gstin: editing.gstin, bt: editing.buyerType, cl: editing.creditLimit, notes: editing.notes, active: editing.active });
      setEditing(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  const inp = (label: string, field: keyof Buyer, type = "text") => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
      {label}
      <input type={type} value={editing?.[field] as string ?? ""} onChange={e => setEditing(p => ({ ...p, [field]: e.target.value }))}
        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
    </label>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Buyers <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 16 }}>({buyers.length})</span></h2>
        {canEdit && <button onClick={() => { setIsNew(true); setEditing({ name: "", contactPerson: "", email: "", phone: "", whatsapp: "", address: "", city: "", state: "", gstin: "", buyerType: "WHOLESALE", creditLimit: 0, notes: "" }); setError(""); }}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>+ Add Buyer</button>}
      </div>
      <input placeholder="Search buyers…" value={search} onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16, width: "100%", maxWidth: 360, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14, boxSizing: "border-box" }} />

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--paper)", borderRadius: 16, padding: 32, width: 520, maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 20px" }}>{isNew ? "Add Buyer" : "Edit Buyer"}</h3>
            {error && <div style={{ color: "#f44", marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {inp("Company / Name *", "name")} {inp("Contact Person", "contactPerson")}
              {inp("Email", "email", "email")} {inp("Phone", "phone", "tel")}
              {inp("WhatsApp", "whatsapp", "tel")} {inp("GSTIN", "gstin")}
              {inp("City", "city")} {inp("State", "state")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                Buyer Type
                <select value={editing.buyerType ?? "WHOLESALE"} onChange={e => setEditing(p => ({ ...p, buyerType: e.target.value }))}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}>
                  {Object.entries(BUYER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                Credit Limit (₹)
                <input type="number" value={editing.creditLimit ?? 0} onChange={e => setEditing(p => ({ ...p, creditLimit: +e.target.value }))}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
              </label>
            </div>
            {!isNew && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 14 }}>
                <input type="checkbox" checked={editing.active ?? true} onChange={e => setEditing(p => ({ ...p, active: e.target.checked }))} />
                Active
              </label>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={save} disabled={loading} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {loading ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditing(null)} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "var(--paper)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg)", fontSize: 12, color: "var(--muted)", textAlign: "left" }}>
              {["Buyer", "Contact", "Phone", "Type", "Credit Limit", ""].map(h => (
                <th key={h} style={{ padding: "10px 16px", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.id} style={{ borderBottom: "1px solid var(--border)", opacity: b.active ? 1 : 0.5 }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: 600 }}>{b.name}</div>
                  {b.city && <div style={{ fontSize: 12, color: "var(--muted)" }}>{b.city}, {b.state}</div>}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div>{b.contactPerson}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{b.email}</div>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>{b.phone}</td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge label={BUYER_TYPE_LABELS[b.buyerType] || b.buyerType} color={BUYER_COLORS[b.buyerType] || "#666"} />
                </td>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>{formatMoney(b.creditLimit)}</td>
                <td style={{ padding: "12px 16px" }}>
                  {canEdit && <button onClick={() => { setIsNew(false); setEditing(b); setError(""); }}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 13 }}>Edit</button>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No buyers found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
