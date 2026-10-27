"use client";
// Firebase client SDK (Auth only — all data goes through the server).
// When NEXT_PUBLIC_FIREBASE_API_KEY is absent the app runs in demo mode.
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type Auth,
} from "firebase/auth";

export const CLIENT_DEMO_MODE = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function clientAuth(): Auth {
  if (CLIENT_DEMO_MODE) throw new Error("Firebase is not configured (demo mode).");
  if (!app) app = getApps()[0] ?? initializeApp(config);
  if (!auth) auth = getAuth(app);
  return auth;
}

/** Turn a fresh Firebase sign-in into the server's httpOnly session cookie. */
async function exchangeSession(idToken: string, remember: boolean): Promise<void> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, remember }),
    credentials: "same-origin",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw Object.assign(new Error(data.error || "Could not start your session."), { code: "session/exchange-failed" });
  }
  // The server owns the session from here; drop the client copy.
  await fbSignOut(clientAuth()).catch(() => undefined);
}

export async function signInDemo(): Promise<void> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ demo: true }),
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error("Demo sign-in is not available.");
}

export async function signInWithGoogle(remember = true): Promise<void> {
  if (CLIENT_DEMO_MODE) return signInDemo();
  const a = clientAuth();
  await setPersistence(a, remember ? browserLocalPersistence : browserSessionPersistence);
  const cred = await signInWithPopup(a, new GoogleAuthProvider());
  await exchangeSession(await cred.user.getIdToken(), remember);
}

export async function signInWithEmail(
  email: string,
  password: string,
  opts: { create?: boolean; remember?: boolean; name?: string } = {}
): Promise<void> {
  if (CLIENT_DEMO_MODE) return signInDemo();
  const a = clientAuth();
  const remember = opts.remember ?? true;
  await setPersistence(a, remember ? browserLocalPersistence : browserSessionPersistence);
  const cred = opts.create
    ? await createUserWithEmailAndPassword(a, email, password)
    : await signInWithEmailAndPassword(a, email, password);
  if (opts.create && opts.name?.trim()) {
    await updateProfile(cred.user, { displayName: opts.name.trim() }).catch(() => undefined);
  }
  await exchangeSession(await cred.user.getIdToken(true), remember);
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (CLIENT_DEMO_MODE) return;
  await sendPasswordResetEmail(clientAuth(), email, {
    url: `${window.location.origin}/login`,
  });
}
