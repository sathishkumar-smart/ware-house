"use client";
// Firebase app singleton — lazy-initialised, never on the server side.

import type { FirebaseApp } from "firebase/app";

let _app: FirebaseApp | null = null;

export async function getFirebaseApp(): Promise<FirebaseApp | null> {
  if (_app) return _app;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !projectId || !messagingSenderId || !appId) {
    return null;
  }

  const { initializeApp, getApps } = await import("firebase/app");
  const existing = getApps();
  if (existing.length > 0) {
    _app = existing[0];
    return _app;
  }

  _app = initializeApp({ apiKey, projectId, messagingSenderId, appId });
  return _app;
}
