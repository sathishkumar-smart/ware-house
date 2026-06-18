import Empty from "@/app/components/atoms/Empty";
import { formatMoney, formatDateShort } from "@/app/lib/formatters";
import type { WarehouseData, Tab, Modal, Movement } from "@/app/types";

function MovementsList({ movements }: { movements: Movement[] }) {
  if (!movements.length) return <Empty compact text="No inventory activity yet." />;
  return (
    <div>
      {movements.map(item => (
        <div className="movement-item" key={item.id}>
          <div className={item.quantity > 0 ? "movement-icon in" : "movement-icon out"}>
            {item.quantity > 0 ? "↓" : "↑"}
          </div>
          <div>
            <strong>{item.product.name}</strong>
            <span>{item.movementType.replaceAll("_", " ")} · {formatDateShort(item.createdAt)}</span>
          </div>
          <strong className={item.quantity > 0 ? "positive" : "negative"}>
            {item.quantity > 0 ? "+" : ""}{item.quantity}
          </strong>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({
  data,
  setTab,
  openModal,
}: {
  data: WarehouseData;
  setTab: (t: Tab) => void;
  openModal: (m: Modal) => void;
}) {
  const stats = data.dashboardStats;
  const cards: [string, string, string, string][] = [
    ["Inventory value",  formatMoney(stats.inventoryValue),        "Across all active stock",    "sage"],
    ["Units on hand",    stats.totalUnits.toLocaleString("en-IN"), `${stats.totalProducts} active products`, "blue"],
    ["Low stock",        String(stats.lowStockProducts),           "At or below reorder point",  "amber"],
    ["Damaged units",    String(stats.damagedUnits),               "Currently quarantined",       "rose"],
  ];
  const lowStock = data.products.filter(p => p.isLowStock).slice(0, 5);

  return (
    <>
      <section className="welcome-row">
        <div>
          <h2>Good to see you, {data.me}.</h2>
          <p>Here is what needs attention across your warehouses today.</p>
        </div>
        <div className="date-chip">● Live inventory</div>
      </section>

      <section className="stat-grid">
        {cards.map(([label, value, detail, tone]) => (
          <article className={`stat-card ${tone}`} key={label}>
            <div><span>{label}</span><b>↗</b></div>
            <strong>{value}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <div><h3>Recent stock activity</h3><p>Latest inventory movements</p></div>
            <button className="text-button" onClick={() => setTab("movements")}>View all →</button>
          </div>
          <MovementsList movements={data.stockMovements.slice(0, 6)} />
        </article>
        <article className="panel">
          <div className="panel-head">
            <div><h3>Needs attention</h3><p>Products at reorder level</p></div>
            <span className="count-chip">{lowStock.length}</span>
          </div>
          {lowStock.length ? lowStock.map(p => (
            <div className="attention-item" key={p.id}>
              <div className="product-icon">{p.name.slice(0, 1)}</div>
              <div><strong>{p.name}</strong><span>{p.sku} · {p.location || "No location"}</span></div>
              <div className="stock-count"><strong>{p.currentStock}</strong><span>min {p.reorderLevel}</span></div>
            </div>
          )) : <Empty compact text="All products are above reorder point." />}
          <button className="wide-button" onClick={() => openModal("stock")}>Receive stock</button>
        </article>
      </section>

      <section className="quick-actions">
        <button onClick={() => openModal("stock")}><span>＋</span><div><strong>Receive stock</strong><small>Add an inbound delivery</small></div></button>
        <button onClick={() => openModal("return")}><span>↩</span><div><strong>Log a return</strong><small>Customer or vendor return</small></div></button>
        <button onClick={() => openModal("damage")}><span>!</span><div><strong>Report damage</strong><small>Quarantine damaged units</small></div></button>
        <button onClick={() => openModal("replenish")}><span>✉</span><div><strong>Request stock</strong><small>Email a replenishment request</small></div></button>
      </section>
    </>
  );
}
