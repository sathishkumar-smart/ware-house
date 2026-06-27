"use client";
import { useState } from "react";
import type { Employee, WarehouseLocation } from "@/app/types";
import { ROLE_LABELS } from "@/app/lib/constants";

interface Props {
  employees: Employee[]; warehouses: WarehouseLocation[]
  isSuperAdmin: boolean; isAdmin: boolean; currentUserId: string
  onMutate: (q: string, v: Record<string, unknown>) => Promise<void>
}

const ROLES = Object.keys(ROLE_LABELS);
const ROLE_COLORS: Record<string, string> = { SUPER_ADMIN: "#8b0000", ADMIN: "#1b5e20", MANAGER: "#0d47a1", STORE_KEEPER: "#4a148c", CUTTING_MASTER: "#e65100", TAILOR: "#006064", AUDITOR: "#455a64" };

function RoleBadge({ role }: { role: string }) {
  return <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: (ROLE_COLORS[role] || "#555") + "22", color: ROLE_COLORS[role] || "#555", border: `1px solid ${(ROLE_COLORS[role] || "#555")}44` }}>{ROLE_LABELS[role] || role}</span>;
}

export default function Employees({ employees, warehouses, isSuperAdmin, isAdmin, currentUserId, onMutate }: Props) {
  const [editing, setEditing] = useState<Partial<Employee> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [newPass, setNewPass] = useState(""); const [showResetFor, setShowResetFor] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState(""); const [resetPw2, setResetPw2] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canEdit = isSuperAdmin || isAdmin;
  const filtered = employees.filter(e => e.username.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase()));

  const canEditEmployee = (e: Employee) => {
    if (!canEdit) return false;
    if (e.role === "SUPER_ADMIN" && !isSuperAdmin) return false;
    if (e.role === "ADMIN" && !isSuperAdmin) return false;
    return true;
  };

  async function save() {
    if (!editing) return;
    setLoading(true); setError("");
    try {
      if (isNew) {
        await onMutate(
          `mutation C($u:String!,$p:String!,$r:String!,$wids:[ID!]!,$email:String,$phone:String){createEmployee(username:$u,password:$p,role:$r,warehouseIds:$wids,email:$email,phone:$phone){employee{id}}}`,
          { u: editing.username, p: newPass, r: editing.role, wids: editing.locations?.map(l => l.id) || [], email: editing.email, phone: editing.phone }
        );
      } else {
        await onMutate(
          `mutation U($id:ID!,$r:String,$phone:String,$email:String,$active:Boolean,$wids:[ID!]){updateEmployee(id:$id,role:$r,phone:$phone,email:$email,active:$active,warehouseIds:$wids){employee{id}}}`,
          { id: editing.id, r: editing.role, phone: editing.phone, email: editing.email, active: editing.active, wids: editing.locations?.map(l => l.id) }
        );
      }
      setEditing(null); setNewPass("");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  async function resetPassword() {
    if (!showResetFor || resetPw !== resetPw2) { setError("Passwords do not match"); return; }
    if (resetPw.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    try {
      await onMutate(`mutation R($id:ID!,$pw:String!){resetEmployeePassword(id:$id,newPassword:$pw){ok}}`, { id: showResetFor, pw: resetPw });
      setShowResetFor(null); setResetPw(""); setResetPw2("");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  const inp = (label: string, val: string, onChange: (v: string) => void, type = "text") => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
      {label}
      <input type={type} value={val} onChange={e => onChange(e.target.value)}
        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }} />
    </label>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Employees <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 16 }}>({employees.length})</span></h2>
        {canEdit && <button onClick={() => { setIsNew(true); setEditing({ username: "", email: "", phone: "", role: "STORE_KEEPER", active: true, locations: [] }); setNewPass(""); setError(""); }}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>+ Add Employee</button>}
      </div>
      <input placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16, width: "100%", maxWidth: 360, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14, boxSizing: "border-box" }} />

      {/* Reset password modal */}
      {showResetFor && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--paper)", borderRadius: 16, padding: 32, width: 380, border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 20px" }}>Reset Password</h3>
            {error && <div style={{ color: "#f44", marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {inp("New Password", resetPw, setResetPw, "password")}
              {inp("Confirm Password", resetPw2, setResetPw2, "password")}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={resetPassword} disabled={loading} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {loading ? "Resetting…" : "Reset Password"}
              </button>
              <button onClick={() => { setShowResetFor(null); setError(""); }} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--paper)", borderRadius: 16, padding: 32, width: 500, maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 20px" }}>{isNew ? "Add Employee" : "Edit Employee"}</h3>
            {error && <div style={{ color: "#f44", marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {isNew && inp("Username *", editing.username || "", v => setEditing(p => ({ ...p, username: v })))}
              {isNew && inp("Password *", newPass, setNewPass, "password")}
              {inp("Email", editing.email || "", v => setEditing(p => ({ ...p, email: v }), "email"))}
              {inp("Phone", editing.phone || "", v => setEditing(p => ({ ...p, phone: v }), "tel"))}
              <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                Role *
                <select value={editing.role || "STORE_KEEPER"} onChange={e => setEditing(p => ({ ...p, role: e.target.value }))}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}>
                  {ROLES.filter(r => r !== "SUPER_ADMIN" || isSuperAdmin).filter(r => r !== "ADMIN" || isSuperAdmin).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                Assigned Warehouses
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {warehouses.map(w => {
                    const checked = editing.locations?.some(l => l.id === w.id) || false;
                    return (
                      <label key={w.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                        <input type="checkbox" checked={checked} onChange={e => {
                          setEditing(p => ({
                            ...p,
                            locations: e.target.checked ? [...(p?.locations || []), w] : (p?.locations || []).filter(l => l.id !== w.id),
                          }));
                        }} />
                        {w.name} <span style={{ fontSize: 11, color: "var(--muted)" }}>({w.locationType})</span>
                      </label>
                    );
                  })}
                </div>
              </label>
              {!isNew && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <input type="checkbox" checked={editing.active ?? true} onChange={e => setEditing(p => ({ ...p, active: e.target.checked }))} />
                  Active
                </label>
              )}
            </div>
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
              {["Employee", "Role", "Phone", "Locations", "Status", ""].map(h => (
                <th key={h} style={{ padding: "10px 14px", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} style={{ borderBottom: "1px solid var(--border)", opacity: e.active ? 1 : 0.5 }}>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ fontWeight: 600 }}>{e.username}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{e.email}</div>
                </td>
                <td style={{ padding: "12px 14px" }}><RoleBadge role={e.role} /></td>
                <td style={{ padding: "12px 14px", fontSize: 13 }}>{e.phone || "—"}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted)" }}>{e.locations.map(l => l.name).join(", ") || "All"}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ fontSize: 12, color: e.active ? "#4caf50" : "#f44336", fontWeight: 600 }}>{e.active ? "Active" : "Inactive"}</span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  {canEditEmployee(e) && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setIsNew(false); setEditing(e); setError(""); }}
                        style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 12 }}>Edit</button>
                      <button onClick={() => { setShowResetFor(e.id); setError(""); }}
                        style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 12 }}>Reset PW</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No employees found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
