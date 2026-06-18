import Empty from "@/app/components/atoms/Empty";
import { formatDateShort } from "@/app/lib/formatters";
import type { ReturnItem } from "@/app/types";

export default function Returns({ items }: { items: ReturnItem[] }) {
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div><h3>Product returns</h3><p>Customer returns and stock sent back to vendors</p></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Product</th><th>Warehouse</th><th>Direction</th>
              <th>Condition</th><th>Qty</th><th>Vendor</th><th>Reason</th><th>Status</th>
            </tr>
          </thead>
          <tbody>{items.map(item => (
            <tr key={item.id}>
              <td>{formatDateShort(item.createdAt)}</td>
              <td><strong>{item.product.name}</strong><small>{item.product.sku}</small></td>
              <td>{item.warehouse?.name || "—"}</td>
              <td>{item.returnType}</td>
              <td>{item.condition}</td>
              <td>{item.quantity}</td>
              <td>{item.vendor?.name || "—"}</td>
              <td>{item.reason}</td>
              <td><span className="status success">{item.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
        {!items.length && <Empty text="No returns logged yet." />}
      </div>
    </section>
  );
}
