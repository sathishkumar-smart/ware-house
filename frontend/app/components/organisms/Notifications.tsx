"use client";

import { useState } from "react";
import Empty from "@/app/components/atoms/Empty";
import { formatDate } from "@/app/lib/formatters";
import type { NotificationItem } from "@/app/types";

export default function Notifications({
  items,
  onMarkRead,
}: {
  items: NotificationItem[];
  onMarkRead: (ids?: string[], all?: boolean) => Promise<void>;
}) {
  const [filter, setFilter] = useState("ALL");
  const visible =
    filter === "ALL" ? items
    : filter === "UNREAD" ? items.filter(n => !n.read)
    : items.filter(n => n.level === filter);
  const unread = items.filter(n => !n.read);

  return (
    <section className="panel">
      <div className="panel-head">
        <div><h3>Notifications</h3><p>{unread.length} unread</p></div>
        {unread.length > 0 && (
          <button className="secondary-button" onClick={() => onMarkRead(undefined, true)}>
            Mark all as read
          </button>
        )}
      </div>
      <div className="notif-filter-bar">
        {["ALL", "UNREAD", "INFO", "WARNING", "CRITICAL"].map(f => (
          <button
            key={f}
            className={filter === f ? "notif-filter-btn active" : "notif-filter-btn"}
            onClick={() => setFilter(f)}
          >
            {f === "UNREAD" ? "Unread" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <div className="notif-list">
        {visible.length ? visible.map(n => (
          <div key={n.id} className={n.read ? "notif-card" : "notif-card unread"}>
            <div className={`notif-dot ${n.level}`} />
            <div className="notif-body">
              <strong>{n.title}</strong>
              <p>{n.message}</p>
              <time>{formatDate(n.createdAt)}</time>
            </div>
            {!n.read && (
              <button
                className="text-button"
                style={{ whiteSpace: "nowrap" }}
                onClick={() => onMarkRead([n.id])}
              >
                Mark read
              </button>
            )}
          </div>
        )) : <Empty text="No notifications." />}
      </div>
    </section>
  );
}
