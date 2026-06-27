"use client";
import { useState } from "react";
import type { WarehouseLocation } from "@/app/types";

interface Props {
  warehouses: WarehouseLocation[]; isSuperAdmin: boolean; isAdmin: boolean
  onMutate: (q: string, v: Record<string, unknown>) => Promise<void>
}

const LOCATION_TYPES = [
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "STORE", label: "Retail Store" },
  { value: "PRODUCTION", label: "Production Floor" },
];
const TYPE_COLORS: Record<string, string> = { WAREHOUSE: "#1565c0", STORE: "#2e7d32", PRODUCTION: "#e65100" };

export default function Warehouses({ warehouses, isSuperAdmin, isAdmin, onMutate }: Props) {
  const [editing, setEditing] = useState<Partial<WarehouseLocation> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canEdit = isSuperAdmin || isAdmin;

  async function save() {
    if (!editing) return;
    setLoading(true); setError("");
    try {
      if (isNew) {
        await onMutate(
          `mutation C($name:String!,$code:String!,$type:String!,$addr:String,$city:String,$phone:String){createWarehouseLocation(name:$name,code:$code,locationType:$type,address:$addr,city:$city,phone:$phone){location{id}}}`,
          { name: editing.name, code: editing.code, type: editing.locationType, addr: editing.address, city: editing.city, phone: editing.phone }
        );
      } else {
        await onMutate(
          `mutation U($id:ID!,$name:String,$type:String,$addr:String,$city:String,$phone:String,$active:Boolean){updateWarehouseLocation(id:$id,name:$name,locationType:$type,address:$addr,city:$city,phone:$phone,active:$active){location{id}}}`,
          { id: editing.id, name: editing.name, type: editing.locationType, addr: editing.address, city: editing.city, phone: editing.phone, active: editing.active }
        );
      }
      setEditing(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  const inp = (label: string, val: string, onChange: (v: string) => void) => (
    <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
      {label}
      <input value={val} onChange={e => onChange(e.target.value)}
        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
    </label>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Locations <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 16 }}>({warehouses.length})</span></h2>
        {canEdit && <button onClick={() => { setIsNew(true); setEditing({ name: "", code: "", locationType: "WAREHOUSE", address: "", city: "", phone: "", active: true }); setError(""); }}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>+ Add Location</button>}
      </div>

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--paper)", borderRadius: 16, padding: 32, width: 460, border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 20px" }}>{isNew ? "Add Location" : "Edit Location"}</h3>
            {error && <div style={{ color: "#f44", marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {inp("Name *", editing.name || "", v => setEditing(p => ({ ...p, name: v })))}
              {isNew && inp("Code *", editing.code || "", v => setEditing(p => ({ ...p, code: v.toUpperCase() })))}
              <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                Type
                <select value={editing.locationType || "WAREHOUSE"} onChange={e => setEditing(p => ({ ...p, locationType: e.target.value }))}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}>
                  {LOCATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              {inp("City", editing.city || "", v => setEditing(p => ({ ...p, city: v })))}
              {inp("Phone", editing.phone || "", v => setEditing(p => ({ ...p, phone: v })))}
            </div>
            <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4, marginTop: 14 }}>
              Address
              <input value={editing.address || ""} onChange={e => setEditing(p => ({ ...p, address: e.target.value }))}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
            </label>
            {!isNew && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginTop: 14 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {warehouses.map(w => (
          <div key={w.id} style={{
            background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 12, padding: 20,
            borderTop: `3px solid ${TYPE_COLORS[w.locationType] || "#888"}`,
            opacity: w.active ? 1 : 0.5,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{w.name}</div>
                <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: "monospace" }}>{w.code}</div>
              </div>
              <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: (TYPE_COLORS[w.locationType] || "#888") + "22", color: TYPE_COLORS[w.locationType] || "#888" }}>
                {LOCATION_TYPES.find(t => t.value === w.locationType)?.label || w.locationType}
              </span>
            </div>
            {w.city && <div style={{ fontSize: 13, color: "var(--muted)" }}>{w.city}</div>}
            {w.address && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{w.address}</div>}
            {w.phone && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{w.phone}</div>}
            {canEdit && (
              <button onClick={() => { setIsNew(false); setEditing(w); setError(""); }}
                style={{ marginTop: 14, width: "100%", padding: "7px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 13 }}>Edit</button>
            )}
          </div>
        ))}
        {warehouses.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "var(--muted)" }}>No locations added yet</div>}
      </div>
    </div>
  );
}
