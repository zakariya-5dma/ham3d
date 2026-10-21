"use strict";
const crypto = require("crypto");
const CATS = ["p", "d", "m", "s"], STOCK = ["in_stock", "on_order", "out"], BUCKET = "product-images", MAX_IMGS = 8;
const env = k => (process.env[k] || "").trim();
const base = () => env("SUPABASE_URL").replace(/\/+$/, "");
function cfgError() {
  const miss = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "ADMIN_EMAIL", "ADMIN_PASSWORD", "SESSION_SECRET"].filter(k => !env(k));
  if (miss.length) return "Variables d'environnement manquantes : " + miss.join(", ");
  if (env("ADMIN_PASSWORD").length < 10) return "ADMIN_PASSWORD doit contenir au moins 10 caractères.";
  if (env("SESSION_SECRET").length < 24) return "SESSION_SECRET doit contenir au moins 24 caractères.";
  return null;
}
function send(res, code, obj, extra) {
  res.statusCode = code; res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store"); if (extra) for (const k in extra) res.setHeader(k, extra[k]);
  res.end(JSON.stringify(obj));
}
function body(req) {
  const b = req.body;
  if (b && typeof b === "object" && !Buffer.isBuffer(b)) return b;
  if (typeof b === "string") { try { return JSON.parse(b) } catch (e) {} }
  return {};
}
const sign = s => crypto.createHmac("sha256", env("SESSION_SECRET")).update(s).digest("base64url");
function makeToken() {
  const p = Buffer.from(JSON.stringify({ exp: Date.now() + 8 * 3600e3, n: crypto.randomBytes(8).toString("hex") })).toString("base64url");
  return p + "." + sign(p);
}
function tokenOk(t) {
  const i = (t || "").indexOf("."); if (i < 1) return false;
  const p = t.slice(0, i), sg = t.slice(i + 1), e = sign(p);
  if (sg.length !== e.length || !crypto.timingSafeEqual(Buffer.from(sg), Buffer.from(e))) return false;
  try { return JSON.parse(Buffer.from(p, "base64url").toString()).exp > Date.now() } catch (e) { return false }
}
function cookie(req, name) {
  const m = (req.headers.cookie || "").split(/;\s*/).find(c => c.indexOf(name + "=") === 0);
  return m ? m.slice(name.length + 1) : "";
}
const isAdmin = req => !cfgError() && tokenOk(cookie(req, "ham3d_session"));
const setSession = (res, tok, age) => res.setHeader("Set-Cookie", "ham3d_session=" + tok + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + age);
function safeEq(a, b) {
  const h = v => crypto.createHash("sha256").update(String(v)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
}
function mutOk(req) {
  if (req.headers["x-ham3d"] !== "1") return false;
  const o = req.headers.origin;
  if (o) { try { if (new URL(o).host !== req.headers.host) return false } catch (e) { return false } }
  return true;
}
const tries = new Map();
const ip = req => String(req.headers["x-forwarded-for"] || "x").split(",")[0].trim();
const blocked = k => { const t = tries.get(k); return !!t && t.n >= 8 && Date.now() - t.t < 15 * 60e3 };
const fail = k => { const t = tries.get(k); tries.set(k, { n: (t && Date.now() - t.t < 15 * 60e3 ? t.n : 0) + 1, t: Date.now() }) };
const okLogin = k => tries.delete(k);
const sleep = ms => new Promise(r => setTimeout(r, ms));
function sb(path, opt) {
  opt = opt || {}; const key = env("SUPABASE_SECRET_KEY");
  return fetch(base() + path, { method: opt.method || "GET", headers: Object.assign({ apikey: key, Authorization: "Bearer " + key }, opt.headers || {}), body: opt.body });
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pubPrefix = () => base() + "/storage/v1/object/public/" + BUCKET + "/";
const imgPath = u => u.slice(pubPrefix().length);
const delImages = urls => Promise.all((urls || []).filter(u => typeof u === "string" && u.indexOf(pubPrefix()) === 0).map(u => sb("/storage/v1/object/" + BUCKET + "/" + imgPath(u), { method: "DELETE" }).catch(() => {})));
const str = (v, max) => { v = v == null ? "" : String(v).trim(); return v.length > max ? null : v };
function clean(b) {
  const o = {};
  for (const [k, m] of [["name_fr", 150], ["name_en", 150], ["name_ar", 150], ["desc_fr", 2000], ["desc_en", 2000], ["desc_ar", 2000], ["material", 120], ["lead_time", 120]]) {
    const v = str(b[k], m); if (v === null) return { error: "Texte trop long : " + k }; o[k] = v || null;
  }
  if (!o.name_fr) return { error: "Le nom (français) est obligatoire." };
  if (CATS.indexOf(b.category) < 0) return { error: "Catégorie invalide." }; o.category = b.category;
  if (STOCK.indexOf(b.stock_status) < 0) return { error: "Statut de stock invalide." }; o.stock_status = b.stock_status;
  let pr = b.price;
  if (pr === null || pr === undefined || pr === "") o.price = null;
  else { pr = Number(pr); if (!isFinite(pr) || pr < 0 || pr > 1e7) return { error: "Prix invalide." }; o.price = Math.round(pr * 100) / 100 }
  o.price_from = !!b.price_from;
  const so = parseInt(b.sort_order, 10); o.sort_order = isFinite(so) ? Math.max(-9999, Math.min(9999, so)) : 0;
  const im = Array.isArray(b.images) ? b.images : [];
  if (im.length > MAX_IMGS) return { error: "8 photos maximum par produit." };
  for (const u of im) if (typeof u !== "string" || u.indexOf(pubPrefix() + "products/") !== 0 || !/^[A-Za-z0-9._\/-]+$/.test(imgPath(u)) || imgPath(u).indexOf("..") >= 0) return { error: "Photo invalide." };
  o.images = im; return { row: o };
}
const FIELDS = ["id", "category", "name_fr", "name_en", "name_ar", "desc_fr", "desc_en", "desc_ar", "material", "lead_time", "price", "price_from", "stock_status", "images", "sort_order"];
const pub = r => { const o = {}; FIELDS.forEach(k => o[k] = r[k]); return o };
module.exports = { BUCKET, env, base, cfgError, send, body, makeToken, isAdmin, setSession, safeEq, mutOk, ip, blocked, fail, okLogin, sleep, sb, UUID, delImages, pubPrefix, clean, pub };
