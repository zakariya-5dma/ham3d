const crypto = require("crypto");
const h = require("../../lib/ham.js");
function kind(b) {
  if (b.length > 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return ["webp", "image/webp"];
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return ["jpg", "image/jpeg"];
  if (b.length > 8 && b[0] === 0x89 && b.toString("latin1", 1, 4) === "PNG") return ["png", "image/png"];
  return null;
}
module.exports = async function (req, res) {
  if (h.cfgError()) return h.send(res, 500, { error: h.cfgError() });
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return h.send(res, 405, { error: "Méthode non autorisée." }); }
  if (!h.isAdmin(req)) return h.send(res, 401, { error: "Connexion requise." });
  if (!h.mutOk(req)) return h.send(res, 403, { error: "Requête refusée." });
  try {
    const d = h.body(req).data; if (typeof d !== "string" || !d) return h.send(res, 400, { error: "Image manquante." });
    const buf = Buffer.from(d, "base64");
    if (buf.length > 3e6) return h.send(res, 413, { error: "Image trop lourde (3 Mo max)." });
    const k = kind(buf); if (!k) return h.send(res, 400, { error: "Format refusé : JPG, PNG ou WebP seulement." });
    const path = "products/" + crypto.randomUUID() + "." + k[0];
    const r = await h.sb("/storage/v1/object/" + h.BUCKET + "/" + path, { method: "POST", headers: { "Content-Type": k[1], "Cache-Control": "max-age=31536000" }, body: buf });
    if (!r.ok) return h.send(res, 502, { error: "Envoi de l'image impossible." });
    return h.send(res, 201, { url: h.pubPrefix() + path });
  } catch (e) { return h.send(res, 500, { error: "Erreur serveur." }); }
};
