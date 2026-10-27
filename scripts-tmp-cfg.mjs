import fs from "fs";
import { initializeApp, cert } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
const env = Object.fromEntries(fs.readFileSync(".env.local","utf8").split("\n").filter(l=>l.includes("=")).map(l=>[l.slice(0,l.indexOf("=")), l.slice(l.indexOf("=")+1)]));
let sa = env.FIREBASE_SERVICE_ACCOUNT.trim(); if (sa.startsWith("'")||sa.startsWith('"')) sa = sa.slice(1,-1);
try { sa = JSON.parse(sa) } catch { sa = JSON.parse(Buffer.from(sa,"base64").toString()) }
initializeApp({ credential: cert(sa) });
const s = await getFirestore().collection("internal_config").get(); s.docs.forEach(d=>console.log(d.id, JSON.stringify(d.data())));
