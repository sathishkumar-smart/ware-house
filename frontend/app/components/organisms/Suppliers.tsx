"use client";
import { useState } from "react";
import type { Supplier } from "@/app/types";
import { SUPPLY_TYPE_LABELS } from "@/app/lib/constants";

interface Props { suppliers: Supplier[]; isSuperAdmin: boolean; isAdmin: boolean; onMutate: (q: string, v: Record<string, unknown>) => Promise<void> }

const empty = (): Partial<Supplier> => ({ name: "", contactPerson: "", email: "", phone: "", whatsapp: "", address: "", city: "", state: "", gstin: "", supplyType: "RAW_CLOTH", creditDays: 0, notes: "" });

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: color + "22", color }}>{label}</span>;
}

export default function Suppliers({ suppliers, isSuperAdmin, isAdmin, onMutate }: Props) {
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canEdit = isSuperAdmin || isAdmin;
  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.contactPerson?.toLowerCase().includes(search.toLowerCase()));

  async function save() {
    if (!editing) return;
    setLoading(true); setError("");
    try {
      const m = isNew
        ? `mutation C($name:String!,$cp:String,$email:String,$phone:String,$wa:String,$addr:String,$city:String,$state:String,$gstin:String,$st:String,$cd:Int,$notes:String){createSupplier(name:$name,contactPerson:$cp,email:$email,phone:$phone,whatsapp:$wa,address:$addr,city:$city,state:$state,gstin:$gstin,supplyType:$st,creditDays:$cd,notes:$notes){supplier{id}}}`
        : `mutation U($id:ID!,$name:String,$cp:String,$email:String,$phone:String,$wa:String,$addr:String,$city:String,$state:String,$gstin:String,$st:String,$cd:Int,$notes:String,$active:Boolean){updateSupplier(id:$id,name:$name,contactPerson:$cp,email:$email,phone:$phone,whatsapp:$wa,address:$addr,city:$city,state:$state,gstin:$gstin,supplyType:$st,creditDays:$cd,notes:$notes,active:$active){supplier{id}}}`;
      await onMutate(m, { id: editing.id, name: editing.name, cp: editing.contactPerson, email: editing.email, phone: editing.phone, wa: editing.whatsapp, addr: editing.address, city: editing.city, state: editing.state, gstin: editing.gstin, st: editing.supplyType, cd: editing.creditDays, notes: editing.notes, active: editing.active });
      setEditing(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  const input = (label: string, field: keyof Supplier, type = "text") => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
      {label}
      <input type={type} value={editing?.[field] as string ?? ""} onChange={e => setEditing(p => ({ ...p, [field]: e.target.value }))}
        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
    </label>
  );

  const SUPPLY_COLORS: Record<string, string> = { RAW_CLOTH: "#2196f3", READYMADE: "#9c27b0", BOTH: "#4caf50" };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Suppliers <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 16 }}>({suppliers.length})</span></h2>
        {canEdit && <button onClick={() => { setIsNew(true); setEditing(empty()); setError(""); }}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>+ Add Supplier</button>}
      </div>
      <input placeholder="Search suppliers…" value={search} onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16, width: "100%", maxWidth: 360, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14, boxSizing: "border-box" }} />

      {/* Form modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--paper)", borderRadius: 16, padding: 32, width: 520, maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 20px" }}>{isNew ? "Add Supplier" : "Edit Supplier"}</h3>
            {error && <div style={{ color: "#f44", marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {input("Company Name *", "name")}
              {input("Contact Person", "contactPerson")}
              {input("Email", "email", "email")}
              {input("Phone", "phone", "tel")}
              {input("WhatsApp", "whatsapp", "tel")}
              {input("GSTIN", "gstin")}
              {input("City", "city")}
              {input("State", "state")}
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, marginTop: 14 }}>
              Address
              <textarea value={editing.address ?? ""} onChange={e => setEditing(p => ({ ...p, address: e.target.value }))}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14, resize: "vertical", minHeight: 60 }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                Supply Type
                <select value={editing.supplyType ?? "RAW_CLOTH"} onChange={e => setEditing(p => ({ ...p, supplyType: e.target.value }))}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}>
                  {Object.entries(SUPPLY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                Credit Days
                <input type="number" value={editing.creditDays ?? 0} onChange={e => setEditing(p => ({ ...p, creditDays: +e.target.value }))}
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

      {/* Table */}
      <div style={{ background: "var(--paper)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg)", fontSize: 12, color: "var(--muted)", textAlign: "left" }}>
              {["Supplier", "Contact", "Phone", "Type", "GSTIN", ""].map(h => (
                <th key={h} style={{ padding: "10px 16px", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} style={{ borderBottom: "1px solid var(--border)", opacity: s.active ? 1 : 0.5 }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  {s.city && <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.city}, {s.state}</div>}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div>{s.contactPerson}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.email}</div>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>{s.phone}</td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge label={SUPPLY_TYPE_LABELS[s.supplyType] || s.supplyType} color={SUPPLY_COLORS[s.supplyType] || "#666"} />
                </td>
                <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)" }}>{s.gstin || "—"}</td>
                <td style={{ padding: "12px 16px" }}>
                  {canEdit && <button onClick={() => { setIsNew(false); setEditing(s); setError(""); }}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 13 }}>Edit</button>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No suppliers found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
