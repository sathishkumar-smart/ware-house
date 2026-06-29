"use client";
import type { Notification } from "@/app/types";
import { formatDateShort } from "@/app/lib/formatters";

interface Props {
  notifications: Notification[]
  onMutate: (q: string, v: Record<string, unknown>) => Promise<void>
  onNavigate?: (tab: string) => void
}

const LEVEL_COLORS: Record<string, string> = {
  INFO: "#3b82f6",
  WARNING: "#f59e0b",
  CRITICAL: "#ef4444",
};

const LEVEL_ICONS: Record<string, string> = {
  INFO: "ℹ",
  WARNING: "⚠",
  CRITICAL: "🚨",
};

export default function Notifications({ notifications, onMutate, onNavigate }: Props) {
  const unread = notifications.filter(n => !n.read);

  async function markAll() {
    await onMutate(`mutation{markNotificationsRead(markAll:true){count}}`, {});
  }

  async function markOne(id: string) {
    await onMutate(`mutation M($ids:[ID]){markNotificationsRead(ids:$ids){count}}`, { ids: [id] });
  }

  async function handleClick(n: Notification) {
    if (!n.read) await markOne(n.id);
    if (n.link && onNavigate) onNavigate(n.link);
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          Notifications
          {unread.length > 0 && (
            <span style={{ marginLeft: 10, padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: "var(--primary)", color: "#fff" }}>
              {unread.length}
            </span>
          )}
        </h2>
        {unread.length > 0 && (
          <button onClick={markAll} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 13 }}>
            Mark all read
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 720 }}>
        {notifications.map(n => {
          const color = LEVEL_COLORS[n.level] || "#3b82f6";
          const clickable = !n.read || !!n.link;
          return (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                background: n.read ? "var(--paper)" : `${color}0a`,
                border: `1px solid ${n.read ? "var(--border)" : color + "33"}`,
                borderLeft: `4px solid ${n.read ? "var(--border)" : color}`,
                borderRadius: 10, padding: "14px 18px",
                cursor: clickable ? "pointer" : "default",
                display: "flex", gap: 14, alignItems: "flex-start",
                transition: "opacity 0.15s",
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{LEVEL_ICONS[n.level] || "ℹ"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontWeight: n.read ? 500 : 700, fontSize: 14, color: "var(--fg)" }}>{n.title}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    {!n.read && (
                      <button
                        onClick={async e => { e.stopPropagation(); await markOne(n.id); }}
                        style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--muted)" }}>
                        Mark read
                      </button>
                    )}
                    <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{formatDateShort(n.createdAt)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }}>{n.message}</div>
                {n.link && (
                  <div style={{ fontSize: 11, color: color, marginTop: 6, fontWeight: 600 }}>
                    → {n.link.replace(/_/g, " ")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {notifications.length === 0 && (
          <div style={{ textAlign: "center", padding: 64, color: "var(--muted)", fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
            All caught up — no notifications
          </div>
        )}
      </div>
    </div>
  );
}
