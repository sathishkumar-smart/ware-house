import Empty from "@/app/components/atoms/Empty";
import type { Vendor } from "@/app/types";

export default function Vendors({ vendors }: { vendors: Vendor[] }) {
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div><h3>Vendor directory</h3><p>Supplier contacts linked to your product catalog</p></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vendor</th><th>Contact person</th><th>Email</th><th>Phone</th><th>GSTIN</th>
            </tr>
          </thead>
          <tbody>{vendors.map(v => (
            <tr key={v.id}>
              <td><strong>{v.name}</strong></td>
              <td>{v.contactPerson || "—"}</td>
              <td>{v.email || "—"}</td>
              <td>{v.phone || "—"}</td>
              <td>{v.gstin ? <code style={{ fontSize: 10 }}>{v.gstin}</code> : "—"}</td>
            </tr>
          ))}</tbody>
        </table>
        {!vendors.length && <Empty text="No vendors added yet." />}
      </div>
    </section>
  );
}
