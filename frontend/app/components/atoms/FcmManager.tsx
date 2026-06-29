"use client";
/**
 * Null-rendering client component that initialises Firebase Cloud Messaging
 * once the user is authenticated. Mount it anywhere inside the authenticated
 * layout — it renders nothing visible.
 *
 * On logout, dispatch window.dispatchEvent(new Event("fcm:logout")) to
 * remove the token from the backend.
 */
import { useEffect } from "react";

interface Props {
  isAuthenticated: boolean;
}

export default function FcmManager({ isAuthenticated }: Props) {
  useEffect(() => {
    if (!isAuthenticated) return;

    // Lazy-import so Firebase code is never bundled on the server
    let cancelled = false;
    import("@/app/lib/fcm").then(({ initFCM }) => {
      if (!cancelled) initFCM();
    });

    const handleLogout = () => {
      import("@/app/lib/fcm").then(({ removeFCMToken }) => removeFCMToken());
    };
    window.addEventListener("fcm:logout", handleLogout);

    return () => {
      cancelled = true;
      window.removeEventListener("fcm:logout", handleLogout);
    };
  }, [isAuthenticated]);

  return null;
}
