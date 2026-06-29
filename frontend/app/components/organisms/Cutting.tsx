"use client";
import { useState } from "react";
import type { CuttingAssignment, Employee, RawClothBatch, ItemType } from "@/app/types";
import { CUTTING_STATUS_LABELS, STATUS_BADGE_COLORS } from "@/app/lib/constants";
import { formatDateShort } from "@/app/lib/formatters";
import Modal from "@/app/components/atoms/Modal";

interface Props {
  assignments: CuttingAssignment[]; batches: RawClothBatch[]
  cuttingMasters: Employee[]; itemTypes: ItemType[]
  isAdmin: boolean; isSuperAdmin: boolean; isManager: boolean; isCuttingMaster: boolean
  onMutate: (q: string, v: Record<string, unknown>) => Promise<void>
}

const I: React.CSSProperties = {
  padding: "10px 13px", borderRadius: 9, border: "1px solid var(--line)",
  background: "var(--input-bg)", color: "var(--ink)", fontSize: 14, width: "100%", outline: "none",
};
const BTN_PRI: React.CSSProperties = {
  flex: 1, padding: "11px 0", borderRadius: 9, border: "none",
  background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14,
};
const BTN_SEC: React.CSSProperties = {
  flex: 1, padding: "11px 0", borderRadius: 9, border: "1px solid var(--line)",
  background: "transparent", color: "var(--ink)", cursor: "pointer", fontSize: 14,
};
const LBL: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 5,
  fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.4, textTransform: "uppercase",
};

function Badge({ s }: { s: string }) {
  const color = STATUS_BADGE_COLORS[s] || "#888";
  return (
    <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: color + "22", color, border: `1px solid ${color}33` }}>
      {CUTTING_STATUS_LABELS[s] || s}
    </span>
  );
}

export default function Cutting({ assignments, batches, cuttingMasters, itemTypes, isAdmin, isSuperAdmin, isManager, isCuttingMaster, onMutate }: Props) {
  const [selected, setSelected] = useState<CuttingAssignment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ batchId: "", masterId: "", itemTypeId: "", meters: "", targetPieces: "", notes: "" });
  const [update, setUpdate] = useState({ piecesCompleted: 0, clothUsed: 0, clothWasted: 0, status: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const canAssign = isSuperAdmin || isAdmin || isManager;
  const canUpdate = canAssign || isCuttingMaster;
  const q = search.toLowerCase();
  const filtered = assignments.filter(a =>
    (!statusFilter || a.status === statusFilter) &&
    (!q || a.cuttingMaster.username.toLowerCase().includes(q) ||
      a.rawClothBatch.batchNumber.toLowerCase().includes(q) ||
      a.rawClothBatch.clothCategory.name.toLowerCase().includes(q) ||
      a.itemType.name.toLowerCase().includes(q))
  );

  async function createAssignment() {
    setLoading(true); setError("");
    try {
      await onMutate(
        `mutation C($b:ID!,$m:ID!,$t:ID!,$meters:Float!,$target:Int!,$notes:String){createCuttingAssignment(rawClothBatchId:$b,cuttingMasterId:$m,itemTypeId:$t,metersAssigned:$meters,targetPieces:$target,notes:$notes){assignment{id}}}`,
        { b: form.batchId, m: form.masterId, t: form.itemTypeId, meters: +form.meters, target: +form.targetPieces, notes: form.notes }
      );
      setShowForm(false);
      setForm({ batchId: "", masterId: "", itemTypeId: "", meters: "", targetPieces: "", notes: "" });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  async function saveUpdate() {
    if (!selected) return;
    setLoading(true); setError("");
    const pc = Number(update.piecesCompleted);
    const cu = Number(update.clothUsed);
    const cw = Number(update.clothWasted);
    try {
      await onMutate(
        `mutation U($id:ID!,$status:String,$pc:Int,$cu:Float,$cw:Float){updateCuttingAssignment(id:$id,status:$status,piecesCompleted:$pc,clothUsed:$cu,clothWasted:$cw){assignment{id status piecesCompleted}}}`,
        {
          id: selected.id,
          status: update.status || undefined,
          pc: Number.isFinite(pc) ? pc : undefined,
          cu: Number.isFinite(cu) ? cu : undefined,
          cw: Number.isFinite(cw) ? cw : undefined,
        }
      );
      setSelected(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  function sel(label: string, val: string, onChange: (v: string) => void, opts: { value: string; label: string }[]) {
    return (
      <label style={LBL}>{label}
        <select value={val} onChange={e => onChange(e.target.value)} style={I}>
          <option value="">Select…</option>
          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Cutting Assignments</h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>{assignments.length} total assignments</p>
        </div>
        {canAssign && (
          <button onClick={() => { setShowForm(true); setError(""); }} className="primary-button">
            + New Assignment
          </button>
        )}
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input placeholder="Search master, cloth or item…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...I, flex: 1, minWidth: 200, width: "auto" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...I, width: "auto", minWidth: 180 }}>
          <option value="">All statuses</option>
          {Object.entries(CUTTING_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {showForm && (
        <Modal
          title="New Cutting Assignment"
          subtitle="Assign cloth from a batch to a cutting master"
          onClose={() => { setShowForm(false); setError(""); }}
          width={520}
          footer={
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={createAssignment} disabled={loading || !form.batchId || !form.masterId || !form.itemTypeId} style={BTN_PRI}>
                {loading ? "Assigning…" : "Create Assignment"}
              </button>
              <button onClick={() => { setShowForm(false); setError(""); }} style={BTN_SEC}>Cancel</button>
            </div>
          }
        >
          {error && <div style={{ background: "#fff0ef", border: "1px solid #f1cbc8", color: "#8d3e39", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {sel("Raw Cloth Batch *", form.batchId, v => setForm(p => ({ ...p, batchId: v })),
              batches.map(b => ({ value: b.id, label: `${b.batchNumber} — ${b.clothCategory.name} ${b.clothColor.name} (${b.availableMeters}m available)` })))}
            {sel("Cutting Master *", form.masterId, v => setForm(p => ({ ...p, masterId: v })),
              cuttingMasters.map(m => ({ value: m.id, label: m.username })))}
            {sel("Item Type *", form.itemTypeId, v => setForm(p => ({ ...p, itemTypeId: v })),
              itemTypes.map(t => ({ value: t.id, label: t.name })))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <label style={LBL}>Meters Assigned *
                <input type="number" step="0.01" value={form.meters} placeholder="0.00"
                  onChange={e => setForm(p => ({ ...p, meters: e.target.value }))} style={I} />
              </label>
              <label style={LBL}>Target Pieces *
                <input type="number" value={form.targetPieces} placeholder="0"
                  onChange={e => setForm(p => ({ ...p, targetPieces: e.target.value }))} style={I} />
              </label>
            </div>
            <label style={LBL}>Notes
              <input value={form.notes} placeholder="Optional notes…"
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={I} />
            </label>
          </div>
        </Modal>
      )}

      {selected && (
        <Modal
          title={`Update: ${selected.assignmentNumber}`}
          subtitle={`${selected.itemType.name} · ${selected.metersAssigned}m · ${selected.targetPieces} target pieces`}
          onClose={() => { setSelected(null); setError(""); }}
          width={460}
          footer={
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveUpdate} disabled={loading} style={BTN_PRI}>
                {loading ? "Saving…" : "Save Update"}
              </button>
              <button onClick={() => { setSelected(null); setError(""); }} style={BTN_SEC}>Cancel</button>
            </div>
          }
        >
          {error && <div style={{ background: "#fff0ef", border: "1px solid #f1cbc8", color: "#8d3e39", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={LBL}>Status
              <select value={update.status || selected.status} onChange={e => setUpdate(p => ({ ...p, status: e.target.value }))} style={I}>
                {Object.entries(CUTTING_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              {([["Pieces Done", "piecesCompleted"], ["Cloth Used (m)", "clothUsed"], ["Wasted (m)", "clothWasted"]] as [string, string][]).map(([label, field]) => (
                <label key={field} style={LBL}>{label}
                  <input type="number" step="0.01"
                    value={(update as unknown as Record<string, number>)[field] || 0}
                    onChange={e => setUpdate(p => ({ ...p, [field]: +e.target.value }))} style={I} />
                </label>
              ))}
            </div>
          </div>
        </Modal>
      )}

      <div style={{ background: "var(--paper)", borderRadius: 12, border: "1px solid var(--line)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--th-bg)", textAlign: "left" }}>
              {["Assignment", "Item Type", "Master", "Meters", "Progress", "Date", "Status", ""].map(h => (
                <th key={h} style={{ padding: "11px 16px", fontWeight: 700, fontSize: 10, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", borderBottom: "1px solid var(--line)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} style={{ borderBottom: "1px solid var(--panel-border)" }}>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{a.assignmentNumber}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{a.targetPieces} pieces target</div>
                </td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{a.itemType.name}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600 }}>{a.cuttingMaster.username}</td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{a.metersAssigned}m</td>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ fontSize: 12, marginBottom: 5 }}>
                    {a.piecesCompleted} <span style={{ color: "var(--muted)" }}>/ {a.targetPieces}</span>
                  </div>
                  <div style={{ width: 80, height: 5, background: "var(--line)", borderRadius: 3 }}>
                    <div style={{ width: `${Math.min(100, (a.piecesCompleted / (a.targetPieces || 1)) * 100)}%`, height: "100%", background: "var(--primary)", borderRadius: 3 }} />
                  </div>
                </td>
                <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--muted)" }}>{formatDateShort(a.assignedDate)}</td>
                <td style={{ padding: "13px 16px" }}><Badge s={a.status} /></td>
                <td style={{ padding: "13px 16px" }}>
                  {canUpdate && (
                    <button
                      onClick={() => { setSelected(a); setUpdate({ piecesCompleted: Number(a.piecesCompleted) || 0, clothUsed: Number(a.clothUsed) || 0, clothWasted: Number(a.clothWasted) || 0, status: a.status }); setError(""); }}
                      style={{ padding: "5px 14px", borderRadius: 7, border: "1px solid var(--line)", background: "var(--paper)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                    >Update</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: "56px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No assignments found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
