"use client";
import { useState } from "react";
import type { StitchingJob, CuttingAssignment, Employee } from "@/app/types";
import { STITCHING_STATUS_LABELS, STATUS_BADGE_COLORS } from "@/app/lib/constants";
import { formatDateShort } from "@/app/lib/formatters";

interface Props {
  jobs: StitchingJob[]; assignments: CuttingAssignment[]; tailors: Employee[]
  isAdmin: boolean; isSuperAdmin: boolean; isManager: boolean; isTailor: boolean
  onMutate: (q: string, v: Record<string, unknown>) => Promise<void>
}

function Badge({ s }: { s: string }) {
  return <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: (STATUS_BADGE_COLORS[s] || "#888") + "22", color: STATUS_BADGE_COLORS[s] || "#888" }}>{STITCHING_STATUS_LABELS[s] || s}</span>;
}

export default function Stitching({ jobs, assignments, tailors, isAdmin, isSuperAdmin, isManager, isTailor, onMutate }: Props) {
  const [selected, setSelected] = useState<StitchingJob | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ assignmentId: "", tailorId: "", pieces: 0, notes: "" });
  const [upd, setUpd] = useState({ status: "", piecesCompleted: 0, piecesRejected: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const canAssign = isSuperAdmin || isAdmin || isManager;
  const canUpdate = canAssign || isTailor;
  const filtered = jobs.filter(j => !statusFilter || j.status === statusFilter);

  const readyAssignments = assignments.filter(a => a.status === "COMPLETED" && a.piecesCompleted > 0);

  async function createJob() {
    setLoading(true); setError("");
    try {
      await onMutate(
        `mutation C($a:ID!,$t:ID!,$p:Int!,$notes:String){createStitchingJob(cuttingAssignmentId:$a,tailorId:$t,piecesAssigned:$p,notes:$notes){job{id}}}`,
        { a: form.assignmentId, t: form.tailorId, p: form.pieces, notes: form.notes }
      );
      setShowForm(false); setForm({ assignmentId: "", tailorId: "", pieces: 0, notes: "" });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  async function saveUpdate() {
    if (!selected) return;
    setLoading(true); setError("");
    try {
      await onMutate(
        `mutation U($id:ID!,$status:String,$pc:Int,$pr:Int){updateStitchingJob(id:$id,status:$status,piecesCompleted:$pc,piecesRejected:$pr){job{id status}}}`,
        { id: selected.id, status: upd.status || undefined, pc: upd.piecesCompleted || undefined, pr: upd.piecesRejected || undefined }
      );
      setSelected(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Stitching Jobs <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 16 }}>({jobs.length})</span></h2>
        {canAssign && <button onClick={() => { setShowForm(true); setError(""); }}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>+ New Job</button>}
      </div>
      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
        style={{ marginBottom: 16, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}>
        <option value="">All statuses</option>
        {Object.entries(STITCHING_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--paper)", borderRadius: 16, padding: 32, width: 460, border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 20px" }}>New Stitching Job</h3>
            {error && <div style={{ color: "#f44", marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                Cutting Assignment *
                <select value={form.assignmentId} onChange={e => setForm(p => ({ ...p, assignmentId: e.target.value }))}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}>
                  <option value="">Select…</option>
                  {readyAssignments.map(a => <option key={a.id} value={a.id}>{a.assignmentNumber} — {a.itemType.name} ({a.piecesCompleted} pieces)</option>)}
                </select>
              </label>
              <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                Tailor *
                <select value={form.tailorId} onChange={e => setForm(p => ({ ...p, tailorId: e.target.value }))}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}>
                  <option value="">Select…</option>
                  {tailors.map(t => <option key={t.id} value={t.id}>{t.username}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                Pieces Assigned *
                <input type="number" value={form.pieces} onChange={e => setForm(p => ({ ...p, pieces: +e.target.value }))}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
              </label>
              <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                Notes
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={createJob} disabled={loading || !form.assignmentId || !form.tailorId}
                style={{ flex: 1, padding: "11px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {loading ? "Creating…" : "Create Job"}
              </button>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--paper)", borderRadius: 16, padding: 32, width: 420, border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 4px" }}>{selected.jobNumber}</h3>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 20px" }}>
              {selected.cuttingAssignment.itemType.name} · {selected.piecesAssigned} pieces assigned to {selected.tailor.username}
            </p>
            {error && <div style={{ color: "#f44", marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                Status
                <select value={upd.status || selected.status} onChange={e => setUpd(p => ({ ...p, status: e.target.value }))}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}>
                  {Object.entries(STITCHING_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              {[["Pieces Completed", "piecesCompleted"], ["Pieces Rejected", "piecesRejected"]].map(([label, field]) => (
                <label key={field} style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                  {label}
                  <input type="number" value={(upd as Record<string, number>)[field] || 0}
                    onChange={e => setUpd(p => ({ ...p, [field]: +e.target.value }))}
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
              {["Job", "Item Type", "Tailor", "Assigned", "Done", "Rejected", "Date", "Status", ""].map(h => (
                <th key={h} style={{ padding: "10px 14px", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(j => (
              <tr key={j.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 14px", fontWeight: 600, fontSize: 13 }}>{j.jobNumber}</td>
                <td style={{ padding: "12px 14px" }}>{j.cuttingAssignment.itemType.name}</td>
                <td style={{ padding: "12px 14px", fontSize: 13 }}>{j.tailor.username}</td>
                <td style={{ padding: "12px 14px", fontSize: 13 }}>{j.piecesAssigned}</td>
                <td style={{ padding: "12px 14px", fontSize: 13 }}>{j.piecesCompleted}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, color: j.piecesRejected > 0 ? "#f44336" : "var(--muted)" }}>{j.piecesRejected}</td>
                <td style={{ padding: "12px 14px", fontSize: 13 }}>{formatDateShort(j.assignedDate)}</td>
                <td style={{ padding: "12px 14px" }}><Badge s={j.status} /></td>
                <td style={{ padding: "12px 14px" }}>
                  {canUpdate && <button onClick={() => { setSelected(j); setUpd({ status: j.status, piecesCompleted: j.piecesCompleted, piecesRejected: j.piecesRejected }); setError(""); }}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 13 }}>Update</button>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No stitching jobs</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
