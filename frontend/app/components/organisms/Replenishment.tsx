"use client";

import { useState } from "react";
import Empty from "@/app/components/atoms/Empty";
import { formatDateShort } from "@/app/lib/formatters";
import { STATUS_LABELS, REPLENISHMENT_STATUSES, NEXT_STATUS } from "@/app/lib/constants";
import type { ReplenishmentRequest } from "@/app/types";

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "draft", SENT: "info", ACKNOWLEDGED: "neutral",
  PARTIALLY_RECEIVED: "warning", COMPLETED: "success", CANCELLED: "danger",
};

export default function Replenishment({
  requests,
  canUpdate,
  onUpdateStatus,
}: {
  requests: ReplenishmentRequest[];
  canUpdate: boolean;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState("ALL");
  const visible = filter === "ALL" ? requests : requests.filter(r => r.status === filter);

  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div><h3>Replenishment requests</h3><p>{requests.length} total requests</p></div>
      </div>
      <div className="filter-bar">
        {["ALL", ...REPLENISHMENT_STATUSES].map(s => {
          const count = s === "ALL" ? requests.length : requests.filter(r => r.status === s).length;
          return (
            <button
              key={s}
              className={filter === s ? "filter-btn active" : "filter-btn"}
              onClick={() => setFilter(s)}
            >
              {s === "ALL" ? "All" : (STATUS_LABELS[s] ?? s)} <span className="chip">{count}</span>
            </button>
          );
        })}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Product</th><th>Vendor</th><th>Warehouse</th>
              <th>Qty</th><th>Expected</th><th>Status</th><th>Email sent</th>
              {canUpdate && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>{visible.map(req => (
            <tr key={req.id}>
              <td>{formatDateShort(req.createdAt)}</td>
              <td><strong>{req.product.name}</strong><small>{req.product.sku}</small></td>
              <td>{req.vendor.name}</td>
              <td><span className="status neutral">{req.warehouse.code}</span></td>
              <td><strong>{req.quantity}</strong></td>
              <td>{req.expectedDate || "—"}</td>
              <td>
                <span className={`status ${STATUS_CLASS[req.status] || "neutral"}`}>
                  {STATUS_LABELS[req.status] ?? req.status}
                </span>
              </td>
              <td>{req.sentAt ? formatDateShort(req.sentAt) : "—"}</td>
              {canUpdate && (
                <td>
                  {NEXT_STATUS[req.status] && (
                    <div className="row-actions">
                      <button onClick={() => onUpdateStatus(req.id, NEXT_STATUS[req.status])}>
                        Mark {STATUS_LABELS[NEXT_STATUS[req.status]] ?? NEXT_STATUS[req.status]}
                      </button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}</tbody>
        </table>
        {!visible.length && <Empty text="No replenishment requests found." />}
      </div>
    </section>
  );
}
