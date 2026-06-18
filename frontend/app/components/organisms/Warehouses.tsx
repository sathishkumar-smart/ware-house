import Empty from "@/app/components/atoms/Empty";
import type { WarehouseLocation } from "@/app/types";

export default function Warehouses({
  warehouses,
  canAdd,
  onAdd,
  onToggle,
}: {
  warehouses: WarehouseLocation[];
  canAdd: boolean;
  onAdd: () => void;
  onToggle: (id: string, active: boolean, name: string) => void;
}) {
  const activeCount = warehouses.filter(w => w.active).length;
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div>
          <h3>Warehouse locations</h3>
          <p>{warehouses.length} total · {activeCount} active · {warehouses.length - activeCount} inactive</p>
        </div>
        {canAdd && <button className="primary-button" onClick={onAdd}>＋ Add warehouse</button>}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th><th>Name</th><th>City</th><th>State</th><th>Pincode</th>
              <th>Status</th>{canAdd && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>{warehouses.map(wh => (
            <tr key={wh.id}>
              <td><code style={{ fontSize: 11, fontWeight: 700 }}>{wh.code}</code></td>
              <td><strong>{wh.name}</strong></td>
              <td>{wh.city || "—"}</td>
              <td>{wh.state || "—"}</td>
              <td>{wh.pincode || "—"}</td>
              <td>
                <span className={wh.active ? "status success" : "status neutral"}>
                  {wh.active ? "Active" : "Inactive"}
                </span>
              </td>
              {canAdd && (
                <td>
                  <div className="row-actions">
                    <button
                      className={wh.active ? "danger" : ""}
                      onClick={() => onToggle(wh.id, !wh.active, wh.name)}
                    >
                      {wh.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}</tbody>
        </table>
        {!warehouses.length && <Empty text="No warehouses added yet." />}
      </div>
    </section>
  );
}
