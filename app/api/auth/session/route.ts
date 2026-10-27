import { NextResponse } from "next/server";
import { isAuthDemoMode, isFirebaseAuthConfigured } from "@/lib/auth/demo-mode";
import { getDb } from "@/lib/db";
import {
  DEMO_SESSION_COOKIE,
  DEMO_USER,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
} from "@/lib/auth/session-user";

export const runtime = "nodejs";

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Exchange a fresh Firebase ID token for an httpOnly session cookie.
 * Body: { idToken: string, remember?: boolean } — or { demo: true } in demo mode.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { idToken?: unknown; demo?: unknown; remember?: unknown };

  if (isAuthDemoMode()) {
    if (body.demo !== true) {
      return NextResponse.json({ error: "Demo mode: sign in with the demo account." }, { status: 400 });
    }
    // Demo workspace: seed the in-memory store once with a fictional restaurant so every
    // page has data. Never runs against Firestore. Sign-in still succeeds if seeding fails.
    let demoSeed: { seeded: boolean; restaurantId: string } | null = null;
    try {
      const db = getDb();
      if (db.backend === "memory") {
        const { seedDemoWorkspace } = await import("@/lib/demo/seed-demo-workspace");
        const result = await seedDemoWorkspace(db, { userId: DEMO_USER.id });
        demoSeed = { seeded: result.seeded, restaurantId: result.restaurantId };
      }
    } catch (e) {
      console.error("[auth session] demo seed failed", e instanceof Error ? e.message : e);
    }
    const res = NextResponse.json({
      ok: true,
      user: { id: DEMO_USER.id, email: DEMO_USER.email },
      demo: true,
      ...(demoSeed ? { demo_workspace: demoSeed } : {}),
    });
    res.cookies.set(DEMO_SESSION_COOKIE, DEMO_USER.id, cookieOptions(SESSION_MAX_AGE_SEC));
    return res;
  }

  if (!isFirebaseAuthConfigured()) {
    return NextResponse.json({ error: "Sign-in is not configured on this server." }, { status: 503 });
  }

  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  if (!idToken) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  try {
    const { adminAuth } = await import("@/lib/firebase/admin");
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    // Only mint sessions from a recent sign-in (Firebase guidance: 5 minutes).
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }
    const remember = body.remember !== false;
    const expiresIn = (remember ? SESSION_MAX_AGE_SEC : 24 * 60 * 60) * 1000;
    const session = await adminAuth().createSessionCookie(idToken, { expiresIn });
    const res = NextResponse.json({ ok: true, user: { id: decoded.uid, email: decoded.email ?? null } });
    res.cookies.set(SESSION_COOKIE, session, {
      ...cookieOptions(expiresIn / 1000),
      // "Remember me" off: browser-session cookie (no maxAge) on top of the 1-day server expiry.
      ...(remember ? {} : { maxAge: undefined }),
    });
    return res;
  } catch (e) {
    console.error("[auth session]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not verify your sign-in. Try again." }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(DEMO_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
