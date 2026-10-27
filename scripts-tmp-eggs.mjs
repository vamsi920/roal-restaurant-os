import fs from "fs";
import { initializeApp, cert } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
const env = Object.fromEntries(fs.readFileSync(".env.local","utf8").split("\n").filter(l=>l.includes("=")).map(l=>[l.slice(0,l.indexOf("=")), l.slice(l.indexOf("=")+1)]));
let sa = env.FIREBASE_SERVICE_ACCOUNT.trim(); if (sa.startsWith("'")||sa.startsWith('"')) sa = sa.slice(1,-1);
try { sa = JSON.parse(sa) } catch { sa = JSON.parse(Buffer.from(sa,"base64").toString()) }
initializeApp({ credential: cert(sa) });
const db = getFirestore();
const snap = await db.collection("agent_trials").get();
for (const d of snap.docs) { const r = d.data(); if (/egg/i.test(r.restaurant_name ?? r.source_input ?? "")) console.log(JSON.stringify({id:d.id, src:r.source_input, name:r.restaurant_name, web:r.profile?.website, cuisine:r.profile?.cuisine, menu_source:r.menu_source, steps:r.step_log, created:r.created_at}, null, 1)); }
console.log("total", snap.size);
