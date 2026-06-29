"use client";
import { useState } from "react";
import type { StitchingJob, CuttingAssignment, Employee } from "@/app/types";
import { STITCHING_STATUS_LABELS, STATUS_BADGE_COLORS } from "@/app/lib/constants";
import { formatDateShort } from "@/app/lib/formatters";
import Modal from "@/app/components/atoms/Modal";

interface Props {
  jobs: StitchingJob[]; assignments: CuttingAssignment[]; tailors: Employee[]
  isAdmin: boolean; isSuperAdmin: boolean; isManager: boolean; isTailor: boolean
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
      {STITCHING_STATUS_LABELS[s] || s}
    </span>
  );
}

export default function Stitching({ jobs, assignments, tailors, isAdmin, isSuperAdmin, isManager, isTailor, onMutate }: Props) {
  const [selected, setSelected] = useState<StitchingJob | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ assignmentId: "", tailorId: "", pieces: "", notes: "" });
  const [upd, setUpd] = useState({ status: "", piecesCompleted: 0, piecesRejected: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const canAssign = isSuperAdmin || isAdmin || isManager;
  const canUpdate = canAssign || isTailor;
  const q = search.toLowerCase();
  const filtered = jobs.filter(j =>
    (!statusFilter || j.status === statusFilter) &&
    (!q || j.tailor.username.toLowerCase().includes(q) ||
      j.cuttingAssignment.itemType.name.toLowerCase().includes(q))
  );
  const readyAssignments = assignments.filter(a => a.status === "COMPLETED" && a.piecesCompleted > 0);

  async function createJob() {
    setLoading(true); setError("");
    try {
      await onMutate(
        `mutation C($a:ID!,$t:ID!,$p:Int!,$notes:String){createStitchingJob(cuttingAssignmentId:$a,tailorId:$t,piecesAssigned:$p,notes:$notes){job{id}}}`,
        { a: form.assignmentId, t: form.tailorId, p: +form.pieces, notes: form.notes }
      );
      setShowForm(false); setForm({ assignmentId: "", tailorId: "", pieces: "", notes: "" });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  async function saveUpdate() {
    if (!selected) return;
    setLoading(true); setError("");
    try {
      await onMutate(
        `mutation U($id:ID!,$status:String,$pc:Int,$pr:Int){updateStitchingJob(id:$id,status:$status,piecesCompleted:$pc,piecesRejected:$pr){job{id status}}}`,
        {
          id: selected.id,
          status: upd.status || undefined,
          pc: Number.isFinite(Number(upd.piecesCompleted)) ? Number(upd.piecesCompleted) : undefined,
          pr: Number.isFinite(Number(upd.piecesRejected)) ? Number(upd.piecesRejected) : undefined,
        }
      );
      setSelected(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Stitching Jobs</h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>{jobs.length} total jobs</p>
        </div>
        {canAssign && (
          <button onClick={() => { setShowForm(true); setError(""); }} className="primary-button">
            + New Job
          </button>
        )}
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input placeholder="Search tailor or item type…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...I, flex: 1, minWidth: 200, width: "auto" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...I, width: "auto", minWidth: 180 }}>
          <option value="">All statuses</option>
          {Object.entries(STITCHING_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {showForm && (
        <Modal
          title="New Stitching Job"
          subtitle="Assign cut pieces to a tailor for stitching"
          onClose={() => { setShowForm(false); setError(""); }}
          width={480}
          footer={
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={createJob} disabled={loading || !form.assignmentId || !form.tailorId} style={BTN_PRI}>
                {loading ? "Creating…" : "Create Job"}
              </button>
              <button onClick={() => { setShowForm(false); setError(""); }} style={BTN_SEC}>Cancel</button>
            </div>
          }
        >
          {error && <div style={{ background: "#fff0ef", border: "1px solid #f1cbc8", color: "#8d3e39", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={LBL}>Cutting Assignment *
              <select value={form.assignmentId} onChange={e => setForm(p => ({ ...p, assignmentId: e.target.value }))} style={I}>
                <option value="">Select…</option>
                {readyAssignments.map(a => <option key={a.id} value={a.id}>{a.assignmentNumber} — {a.itemType.name} ({a.piecesCompleted} pieces ready)</option>)}
              </select>
            </label>
            <label style={LBL}>Tailor *
              <select value={form.tailorId} onChange={e => setForm(p => ({ ...p, tailorId: e.target.value }))} style={I}>
                <option value="">Select…</option>
                {tailors.map(t => <option key={t.id} value={t.id}>{t.username}</option>)}
              </select>
            </label>
            <label style={LBL}>Pieces Assigned *
              <input type="number" value={form.pieces} placeholder="0"
                onChange={e => setForm(p => ({ ...p, pieces: e.target.value }))} style={I} />
            </label>
            <label style={LBL}>Notes
              <input value={form.notes} placeholder="Optional notes…"
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={I} />
            </label>
          </div>
        </Modal>
      )}

      {selected && (
        <Modal
          title={`Update: ${selected.jobNumber}`}
          subtitle={`${selected.cuttingAssignment.itemType.name} · ${selected.piecesAssigned} pieces → ${selected.tailor.username}`}
          onClose={() => { setSelected(null); setError(""); }}
          width={440}
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
              <select value={upd.status || selected.status} onChange={e => setUpd(p => ({ ...p, status: e.target.value }))} style={I}>
                {Object.entries(STITCHING_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {([["Pieces Completed", "piecesCompleted"], ["Pieces Rejected", "piecesRejected"]] as [string, string][]).map(([label, field]) => (
                <label key={field} style={LBL}>{label}
                  <input type="number"
                    value={(upd as unknown as Record<string, number>)[field] || 0}
                    onChange={e => setUpd(p => ({ ...p, [field]: +e.target.value }))} style={I} />
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
              {["Job", "Item Type", "Tailor", "Assigned", "Done", "Rejected", "Date", "Status", ""].map(h => (
                <th key={h} style={{ padding: "11px 16px", fontWeight: 700, fontSize: 10, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", borderBottom: "1px solid var(--line)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(j => (
              <tr key={j.id} style={{ borderBottom: "1px solid var(--panel-border)" }}>
                <td style={{ padding: "13px 16px", fontWeight: 700, fontSize: 13 }}>{j.jobNumber}</td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{j.cuttingAssignment.itemType.name}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600 }}>{j.tailor.username}</td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{j.piecesAssigned}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, color: j.piecesCompleted > 0 ? "var(--primary)" : "var(--muted)" }}>{j.piecesCompleted}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: j.piecesRejected > 0 ? "#b95c56" : "var(--muted)" }}>{j.piecesRejected}</td>
                <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--muted)" }}>{formatDateShort(j.assignedDate)}</td>
                <td style={{ padding: "13px 16px" }}><Badge s={j.status} /></td>
                <td style={{ padding: "13px 16px" }}>
                  {canUpdate && (
                    <button
                      onClick={() => { setSelected(j); setUpd({ status: j.status, piecesCompleted: Number(j.piecesCompleted) || 0, piecesRejected: Number(j.piecesRejected) || 0 }); setError(""); }}
                      style={{ padding: "5px 14px", borderRadius: 7, border: "1px solid var(--line)", background: "var(--paper)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                    >Update</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} style={{ padding: "56px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No stitching jobs</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
