import Empty from "@/app/components/atoms/Empty";
import { formatDateShort } from "@/app/lib/formatters";
import type { Movement } from "@/app/types";

export default function Movements({ movements }: { movements: Movement[] }) {
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div><h3>Stock movement ledger</h3><p>Every change to available inventory</p></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Product</th><th>Warehouse</th><th>Type</th>
              <th>Reference</th><th>Change</th><th>Balance</th><th>Notes</th>
            </tr>
          </thead>
          <tbody>{movements.map(item => (
            <tr key={item.id}>
              <td>{formatDateShort(item.createdAt)}</td>
              <td><strong>{item.product.name}</strong><small>{item.product.sku}</small></td>
              <td>{item.warehouse?.name || "—"}</td>
              <td><span className="status neutral">{item.movementType.replaceAll("_", " ")}</span></td>
              <td>{item.reference || "—"}</td>
              <td className={item.quantity > 0 ? "positive" : "negative"}>
                {item.quantity > 0 ? "+" : ""}{item.quantity}
              </td>
              <td>{item.newStock}</td>
              <td>{item.notes || "—"}</td>
            </tr>
          ))}</tbody>
        </table>
        {!movements.length && <Empty text="Stock movements will appear here." />}
      </div>
    </section>
  );
}
