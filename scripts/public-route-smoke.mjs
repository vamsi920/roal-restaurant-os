#!/usr/bin/env node
const base = process.argv[2] ?? "http://localhost:3020";
const routes = [
  "/",
  "/pricing",
  "/blog",
  "/about",
  "/demo",
  "/contact",
  "/security",
  "/privacy",
  "/terms",
  "/login",
  "/signup",
];

for (const route of routes) {
  const url = `${base}${route}`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    const html = await res.text();
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    const serverErr = /statusCode.:500/.test(html) || /"statusCode":500/.test(html);
    const pass =
      res.status >= 200 &&
      res.status < 400 &&
      !serverErr &&
      title.length > 0 &&
      !title.includes("500");
    console.log(
      JSON.stringify({ route, status: res.status, title, pass, serverErr })
    );
  } catch (e) {
    console.log(JSON.stringify({ route, status: 0, title: "", pass: false, error: String(e) }));
  }
  await new Promise((r) => setTimeout(r, 800));
}
