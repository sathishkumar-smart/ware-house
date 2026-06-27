"use client";
import type { Notification } from "@/app/types";
import { formatDateShort } from "@/app/lib/formatters";

interface Props {
  notifications: Notification[]
  onMutate: (q: string, v: Record<string, unknown>) => Promise<void>
}

export default function Notifications({ notifications, onMutate }: Props) {
  const unread = notifications.filter(n => !n.read);

  async function markAll() {
    await onMutate(`mutation{markNotificationsRead{ok}}`, {});
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>
          Notifications
          {unread.length > 0 && <span style={{ marginLeft: 10, padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: "var(--primary)", color: "#fff" }}>{unread.length}</span>}
        </h2>
        {unread.length > 0 && (
          <button onClick={markAll} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 13 }}>
            Mark all read
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 680 }}>
        {notifications.map(n => (
          <div key={n.id} style={{
            background: n.read ? "var(--paper)" : "var(--primary)0d",
            border: `1px solid ${n.read ? "var(--border)" : "var(--primary)44"}`,
            borderRadius: 10, padding: "14px 18px",
            borderLeft: n.read ? "3px solid transparent" : "3px solid var(--primary)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ fontWeight: n.read ? 400 : 700, fontSize: 14 }}>{n.message}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>{formatDateShort(n.createdAt)}</div>
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>No notifications</div>
        )}
      </div>
    </div>
  );
}
