const h = require("../lib/ham.js");
module.exports = async function (req, res) {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return h.send(res, 405, { error: "Méthode non autorisée." }); }
  if (h.cfgError()) return h.send(res, 500, { error: "Site non configuré." });
  try {
    const r = await h.sb("/rest/v1/products?select=*&order=sort_order.asc,created_at.desc");
    if (!r.ok) return h.send(res, 502, { error: "Base de données indisponible." });
    const rows = (await r.json()).map(h.pub);
    return h.send(res, 200, rows, { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30" });
  } catch (e) { return h.send(res, 502, { error: "Base de données indisponible." }); }
};
