import Empty from "@/app/components/atoms/Empty";
import { ROLE_LABELS } from "@/app/lib/constants";
import type { Employee, WarehouseLocation } from "@/app/types";

export default function Employees({
  employees,
  warehouses,
  canManage,
  isSuperAdmin,
  onAdd,
  onToggle,
  onResetPassword,
}: {
  employees: Employee[];
  warehouses: WarehouseLocation[];
  canManage: boolean;
  isSuperAdmin: boolean;
  onAdd: () => void;
  onToggle: (id: string, active: boolean, name: string) => void;
  onResetPassword: (id: string, name: string) => void;
}) {
  void warehouses;
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div><h3>Team members</h3><p>{employees.length} registered employees</p></div>
        {canManage && <button className="primary-button" onClick={onAdd}>＋ Add employee</button>}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Username</th><th>Email</th><th>Role</th><th>Phone</th>
              <th>Warehouses</th><th>Status</th>{canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>{employees.map(emp => {
            const canEditThis = emp.role === "SUPER_ADMIN" ? isSuperAdmin : canManage;
            return (
              <tr key={emp.id}>
                <td><strong>{emp.username}</strong></td>
                <td>{emp.email || "—"}</td>
                <td>
                  <span className={`role-badge ${emp.role}`}>{ROLE_LABELS[emp.role] || emp.role}</span>
                </td>
                <td>{emp.phone || "—"}</td>
                <td>
                  {emp.locations.length
                    ? emp.locations.map(l => (
                        <span key={l.id} className="status neutral" style={{ marginRight: 4 }}>{l.code}</span>
                      ))
                    : "—"}
                </td>
                <td>
                  <span className={emp.active ? "status success" : "status neutral"}>
                    {emp.active ? "Active" : "Inactive"}
                  </span>
                </td>
                {canManage && (
                  <td>
                    {canEditThis ? (
                      <div className="row-actions">
                        <button onClick={() => onResetPassword(emp.id, emp.username)}>
                          Reset password
                        </button>
                        <button
                          className={emp.active ? "danger" : ""}
                          onClick={() => onToggle(emp.id, !emp.active, emp.username)}
                        >
                          {emp.active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 9, color: "var(--muted)", padding: "0 4px" }}>Protected</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}</tbody>
        </table>
        {!employees.length && <Empty text="No employees added yet." />}
      </div>
    </section>
  );
}
