"use client";
import { useEffect } from "react";

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
  zIndex?: number;
}

export default function Modal({ title, subtitle, onClose, children, footer, width = 520, zIndex = 100 }: ModalProps) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex,
        background: "rgba(10,20,15,0.55)",
        backdropFilter: "blur(6px)",
        overflowY: "auto",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 16px 60px",
      }}
    >
      <div style={{
        width: "100%",
        maxWidth: width,
        background: "var(--paper)",
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)",
        border: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 24px",
          borderBottom: "1px solid var(--line)",
          borderRadius: "16px 16px 0 0",
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)", letterSpacing: -0.2 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: "1px solid var(--line)",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--muted)", fontSize: 18, flexShrink: 0,
              transition: "background 0.15s",
            }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: "14px 24px 20px",
            borderTop: "1px solid var(--line)",
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
