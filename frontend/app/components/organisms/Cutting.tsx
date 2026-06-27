"use client";
import { useState } from "react";
import type { CuttingAssignment, Employee, RawClothBatch, ItemType } from "@/app/types";
import { CUTTING_STATUS_LABELS, STATUS_BADGE_COLORS } from "@/app/lib/constants";
import { formatDateShort } from "@/app/lib/formatters";

interface Props {
  assignments: CuttingAssignment[]; batches: RawClothBatch[]
  cuttingMasters: Employee[]; itemTypes: ItemType[]
  isAdmin: boolean; isSuperAdmin: boolean; isManager: boolean; isCuttingMaster: boolean
  onMutate: (q: string, v: Record<string, unknown>) => Promise<void>
}

function Badge({ s }: { s: string }) {
  return <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: (STATUS_BADGE_COLORS[s] || "#888") + "22", color: STATUS_BADGE_COLORS[s] || "#888" }}>{CUTTING_STATUS_LABELS[s] || s}</span>;
}

export default function Cutting({ assignments, batches, cuttingMasters, itemTypes, isAdmin, isSuperAdmin, isManager, isCuttingMaster, onMutate }: Props) {
  const [selected, setSelected] = useState<CuttingAssignment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ batchId: "", masterId: "", itemTypeId: "", meters: 0, targetPieces: 0, notes: "" });
  const [update, setUpdate] = useState({ piecesCompleted: 0, clothUsed: 0, clothWasted: 0, status: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const canAssign = isSuperAdmin || isAdmin || isManager;
  const canUpdate = canAssign || isCuttingMaster;
  const filtered = assignments.filter(a => !statusFilter || a.status === statusFilter);

  async function createAssignment() {
    setLoading(true); setError("");
    try {
      await onMutate(
        `mutation C($b:ID!,$m:ID!,$t:ID!,$meters:Float!,$target:Int!,$notes:String){createCuttingAssignment(rawClothBatchId:$b,cuttingMasterId:$m,itemTypeId:$t,metersAssigned:$meters,targetPieces:$target,notes:$notes){assignment{id}}}`,
        { b: form.batchId, m: form.masterId, t: form.itemTypeId, meters: form.meters, target: form.targetPieces, notes: form.notes }
      );
      setShowForm(false);
      setForm({ batchId: "", masterId: "", itemTypeId: "", meters: 0, targetPieces: 0, notes: "" });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  async function saveUpdate() {
    if (!selected) return;
    setLoading(true); setError("");
    try {
      await onMutate(
        `mutation U($id:ID!,$status:String,$pc:Int,$cu:Float,$cw:Float){updateCuttingAssignment(id:$id,status:$status,piecesCompleted:$pc,clothUsed:$cu,clothWasted:$cw){assignment{id status piecesCompleted}}}`,
        { id: selected.id, status: update.status || undefined, pc: update.piecesCompleted || undefined, cu: update.clothUsed || undefined, cw: update.clothWasted || undefined }
      );
      setSelected(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  const sel = (label: string, val: string, onChange: (v: string) => void, opts: { value: string; label: string }[]) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
      {label}
      <select value={val} onChange={e => onChange(e.target.value)}
        style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}>
        <option value="">Select…</option>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Cutting Assignments <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 16 }}>({assignments.length})</span></h2>
        {canAssign && <button onClick={() => { setShowForm(true); setError(""); }}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>+ New Assignment</button>}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}>
          <option value="">All statuses</option>
          {Object.entries(CUTTING_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--paper)", borderRadius: 16, padding: 32, width: 480, border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 20px" }}>New Cutting Assignment</h3>
            {error && <div style={{ color: "#f44", marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {sel("Raw Cloth Batch *", form.batchId, v => setForm(p => ({ ...p, batchId: v })),
                batches.map(b => ({ value: b.id, label: `${b.batchNumber} — ${b.clothCategory.name} ${b.clothColor.name} (${b.availableMeters}m left)` })))}
              {sel("Cutting Master *", form.masterId, v => setForm(p => ({ ...p, masterId: v })),
                cuttingMasters.map(m => ({ value: m.id, label: m.username })))}
              {sel("Item Type *", form.itemTypeId, v => setForm(p => ({ ...p, itemTypeId: v })),
                itemTypes.map(t => ({ value: t.id, label: t.name })))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                  Meters Assigned *
                  <input type="number" step="0.01" value={form.meters} onChange={e => setForm(p => ({ ...p, meters: +e.target.value }))}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
                </label>
                <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                  Target Pieces *
                  <input type="number" value={form.targetPieces} onChange={e => setForm(p => ({ ...p, targetPieces: +e.target.value }))}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
                </label>
              </div>
              <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                Notes
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={createAssignment} disabled={loading || !form.batchId || !form.masterId || !form.itemTypeId}
                style={{ flex: 1, padding: "11px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {loading ? "Assigning…" : "Assign"}
              </button>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Update panel */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--paper)", borderRadius: 16, padding: 32, width: 420, border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 4px" }}>{selected.assignmentNumber}</h3>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 20px" }}>{selected.itemType.name} · {selected.metersAssigned}m · {selected.targetPieces} pieces target</p>
            {error && <div style={{ color: "#f44", marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                Status
                <select value={update.status || selected.status} onChange={e => setUpdate(p => ({ ...p, status: e.target.value }))}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}>
                  {Object.entries(CUTTING_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              {[["Pieces Completed", "piecesCompleted"], ["Cloth Used (m)", "clothUsed"], ["Cloth Wasted (m)", "clothWasted"]].map(([label, field]) => (
                <label key={field} style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                  {label}
                  <input type="number" step="0.01" value={(update as Record<string, number>)[field] || 0}
                    onChange={e => setUpdate(p => ({ ...p, [field]: +e.target.value }))}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={saveUpdate} disabled={loading}
                style={{ flex: 1, padding: "11px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {loading ? "Saving…" : "Update"}
              </button>
              <button onClick={() => { setSelected(null); setError(""); }} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "var(--paper)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg)", fontSize: 12, color: "var(--muted)", textAlign: "left" }}>
              {["Assignment", "Item Type", "Master", "Meters", "Pieces", "Progress", "Date", "Status", ""].map(h => (
                <th key={h} style={{ padding: "10px 14px", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 14px", fontWeight: 600, fontSize: 13 }}>{a.assignmentNumber}</td>
                <td style={{ padding: "12px 14px" }}>{a.itemType.name}</td>
                <td style={{ padding: "12px 14px", fontSize: 13 }}>{a.cuttingMaster.username}</td>
                <td style={{ padding: "12px 14px", fontSize: 13 }}>{a.metersAssigned}m</td>
                <td style={{ padding: "12px 14px", fontSize: 13 }}>{a.targetPieces} target</td>
                <td style={{ padding: "12px 14px", fontSize: 13 }}>
                  <div>{a.piecesCompleted} / {a.targetPieces}</div>
                  <div style={{ width: 80, height: 4, background: "var(--border)", borderRadius: 2, marginTop: 4 }}>
                    <div style={{ width: `${Math.min(100, (a.piecesCompleted / (a.targetPieces || 1)) * 100)}%`, height: "100%", background: "var(--primary)", borderRadius: 2 }} />
                  </div>
                </td>
                <td style={{ padding: "12px 14px", fontSize: 13 }}>{formatDateShort(a.assignedDate)}</td>
                <td style={{ padding: "12px 14px" }}><Badge s={a.status} /></td>
                <td style={{ padding: "12px 14px" }}>
                  {canUpdate && <button onClick={() => { setSelected(a); setUpdate({ piecesCompleted: a.piecesCompleted, clothUsed: a.clothUsed, clothWasted: a.clothWasted, status: a.status }); setError(""); }}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 13 }}>Update</button>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No assignments</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
