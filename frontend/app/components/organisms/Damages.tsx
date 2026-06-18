import Empty from "@/app/components/atoms/Empty";
import { formatDateShort } from "@/app/lib/formatters";
import type { Damage } from "@/app/types";

const STATUS_CLASS: Record<string, string> = {
  QUARANTINED: "warning", RETURNED: "info", DISPOSED: "neutral", RESOLVED: "success",
};

export default function Damages({
  items,
  onAdd,
  canResolve,
  onResolve,
}: {
  items: Damage[];
  onAdd: () => void;
  canResolve: boolean;
  onResolve: (id: string) => void;
}) {
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div><h3>Damaged goods</h3><p>Units removed from usable stock and held for resolution</p></div>
        <button className="primary-button" onClick={onAdd}>＋ Report damage</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Product</th><th>Warehouse</th><th>Qty</th>
              <th>Reference</th><th>Reason</th><th>Status</th>
              {canResolve && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>{items.map(item => (
            <tr key={item.id}>
              <td>{formatDateShort(item.createdAt)}</td>
              <td><strong>{item.product.name}</strong><small>{item.product.sku}</small></td>
              <td>{item.warehouse?.name || "—"}</td>
              <td>{item.quantity}</td>
              <td>{item.reference || "—"}</td>
              <td>{item.reason}</td>
              <td>
                <span className={`status ${STATUS_CLASS[item.status] || "neutral"}`}>
                  {item.status}
                </span>
              </td>
              {canResolve && (
                <td>
                  {item.status === "QUARANTINED" && (
                    <div className="row-actions">
                      <button onClick={() => onResolve(item.id)}>Resolve</button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}</tbody>
        </table>
        {!items.length && <Empty text="No damage reports yet." />}
      </div>
    </section>
  );
}
