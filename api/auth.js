const h = require("../lib/ham.js");
module.exports = async function (req, res) {
  const ce = h.cfgError(); if (ce) return h.send(res, 500, { error: ce });
  if (req.method === "GET") return h.send(res, 200, { admin: h.isAdmin(req) });
  if (!h.mutOk(req)) return h.send(res, 403, { error: "Requête refusée." });
  if (req.method === "DELETE") { h.setSession(res, "", 0); return h.send(res, 200, { ok: true }); }
  if (req.method === "POST") {
    const k = h.ip(req); if (h.blocked(k)) return h.send(res, 429, { error: "Trop de tentatives. Réessayez dans 15 minutes." });
    const b = h.body(req);
    const e = h.safeEq(String(b.email || "").trim().toLowerCase(), h.env("ADMIN_EMAIL").toLowerCase());
    const p = h.safeEq(String(b.password || ""), h.env("ADMIN_PASSWORD"));
    if (!(e && p)) { h.fail(k); await h.sleep(700); return h.send(res, 401, { error: "E-mail ou mot de passe incorrect." }); }
    h.okLogin(k); h.setSession(res, h.makeToken(), 8 * 3600); return h.send(res, 200, { ok: true });
  }
  res.setHeader("Allow", "GET, POST, DELETE"); return h.send(res, 405, { error: "Méthode non autorisée." });
};
