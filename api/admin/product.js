const h = require("../../lib/ham.js");
const J = { "Content-Type": "application/json", Prefer: "return=representation" };
module.exports = async function (req, res) {
  if (h.cfgError()) return h.send(res, 500, { error: h.cfgError() });
  if (!h.isAdmin(req)) return h.send(res, 401, { error: "Connexion requise." });
  if (!h.mutOk(req)) return h.send(res, 403, { error: "Requête refusée." });
  try {
    const b = h.body(req);
    if (req.method === "POST") {
      const c = h.clean(b); if (c.error) return h.send(res, 400, { error: c.error });
      const r = await h.sb("/rest/v1/products", { method: "POST", headers: J, body: JSON.stringify(c.row) });
      if (!r.ok) return h.send(res, 502, { error: "Enregistrement impossible." });
      return h.send(res, 201, h.pub((await r.json())[0]));
    }
    if (req.method === "PUT") {
      if (!h.UUID.test(String(b.id || ""))) return h.send(res, 400, { error: "Identifiant invalide." });
      const c = h.clean(b); if (c.error) return h.send(res, 400, { error: c.error });
      const old = await h.sb("/rest/v1/products?id=eq." + b.id + "&select=images"); const oldRows = old.ok ? await old.json() : [];
      if (!oldRows.length) return h.send(res, 404, { error: "Produit introuvable." });
      const r = await h.sb("/rest/v1/products?id=eq." + b.id, { method: "PATCH", headers: J, body: JSON.stringify(c.row) });
      if (!r.ok) return h.send(res, 502, { error: "Enregistrement impossible." });
      const row = (await r.json())[0];
      await h.delImages((oldRows[0].images || []).filter(u => c.row.images.indexOf(u) < 0));
      return h.send(res, 200, h.pub(row));
    }
    if (req.method === "DELETE") {
      const id = new URL(req.url, "http://x").searchParams.get("id") || b.id;
      if (!h.UUID.test(String(id || ""))) return h.send(res, 400, { error: "Identifiant invalide." });
      const r = await h.sb("/rest/v1/products?id=eq." + id, { method: "DELETE", headers: J });
      if (!r.ok) return h.send(res, 502, { error: "Suppression impossible." });
      const rows = await r.json(); await h.delImages(rows.reduce((a, x) => a.concat(x.images || []), []));
      return h.send(res, 200, { ok: true, deleted: rows.length });
    }
    res.setHeader("Allow", "POST, PUT, DELETE"); return h.send(res, 405, { error: "Méthode non autorisée." });
  } catch (e) { return h.send(res, 500, { error: "Erreur serveur." }); }
};
