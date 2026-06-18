import { useMemo } from "react";
import Empty from "@/app/components/atoms/Empty";
import { formatMoney } from "@/app/lib/formatters";
import type { Product } from "@/app/types";

export default function Inventory({ products, search }: { products: Product[]; search: string }) {
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(p =>
      [p.name, p.sku, p.category, p.vendor?.name].some(v => v?.toLowerCase().includes(term)),
    );
  }, [products, search]);

  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div><h3>Product inventory</h3><p>{visible.length} active items</p></div>
        <div className="legend"><span /> Low stock</div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th><th>Category</th><th>Vendor</th><th>Location</th>
              <th>Unit cost</th><th>GST %</th><th>On hand</th><th>Status</th>
            </tr>
          </thead>
          <tbody>{visible.map(p => (
            <tr key={p.id}>
              <td><strong>{p.name}</strong><small>{p.sku}</small></td>
              <td>{p.category || "—"}</td>
              <td>{p.vendor?.name || "—"}</td>
              <td>{p.location || "—"}</td>
              <td>{formatMoney(p.unitPrice)}</td>
              <td>{p.gstRate}%</td>
              <td><strong>{p.currentStock}</strong></td>
              <td>
                <span className={p.isLowStock ? "status warning" : "status success"}>
                  {p.isLowStock ? "Low stock" : "In stock"}
                </span>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {!visible.length && <Empty text="No products match this search." />}
      </div>
    </section>
  );
}
