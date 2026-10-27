import "server-only";
// Firebase Admin singleton. Credentials come from FIREBASE_SERVICE_ACCOUNT (JSON string)
// or Application Default Credentials. When neither exists we run in demo mode and the
// data layer uses the in-memory store (lib/db).
import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT?.trim() || process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim());
}

let app: App | undefined;

export function adminApp(): App {
  if (!isFirebaseAdminConfigured()) throw new Error("Firebase Admin is not configured");
  if (app) return app;
  if (getApps().length) return (app = getApps()[0]!);
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  app = initializeApp({
    credential: sa ? cert(JSON.parse(sa)) : applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || undefined,
  });
  return app;
}

export const adminAuth = () => getAuth(adminApp());

type FsDb = ReturnType<typeof getFirestore>;
const g = globalThis as unknown as { __roalFirestore?: FsDb };

export function adminDb(): FsDb {
  if (g.__roalFirestore) return g.__roalFirestore;
  const db = getFirestore(adminApp());
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // already initialised (HMR)
  }
  g.__roalFirestore = db;
  return db;
}
