(function () {
var $ = function (i) { return document.getElementById(i) }, rows = [], cur = null, imgs = [], busy = 0;
var CAT = [["p", "Pièces fonctionnelles"], ["d", "Déco et cadeaux"], ["m", "Maquettes"], ["s", "Sur mesure"]];
var ST = [["in_stock", "En stock"], ["on_order", "Sur commande"], ["out", "Rupture de stock"]];
function msg(t, bad) { var m = $("msg"); m.textContent = t || ""; m.className = bad ? "bad" : "" }
function mk(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e }
function opts(sel, list) { list.forEach(function (o) { var e = mk("option", null, o[1]); e.value = o[0]; sel.appendChild(e) }) }
function api(path, method, obj) {
  return fetch(path, { method: method || "GET", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Ham3d": "1" }, body: obj ? JSON.stringify(obj) : undefined })
    .then(function (r) { return r.json().catch(function () { return {} }).then(function (j) { if (!r.ok) { var e = new Error(j.error || "Erreur (" + r.status + ")"); e.status = r.status; throw e } return j }) });
}
function show(admin) { $("lg").hidden = admin; $("ap").hidden = !admin; $("out").hidden = !admin; if (admin) load() }
function load() {
  api("/api/products?_=" + Date.now()).then(function (r) { rows = r; list() }).catch(function (e) { msg(e.message, 1) });
}
function money(r) { return r.price == null ? "Sur devis" : (r.price_from ? "À partir de " : "") + r.price + " MAD" }
function list() {
  var ls = $("ls"); ls.textContent = "";
  if (!rows.length) { ls.textContent = "Aucun produit pour le moment. Cliquez sur « Ajouter un produit »."; return }
  rows.forEach(function (r) {
    var li = mk("div", "it"), im = mk("img"); im.alt = ""; if (r.images && r.images[0]) im.src = r.images[0]; li.appendChild(im);
    var tx = mk("div", "tx"); tx.appendChild(mk("b", null, r.name_fr));
    tx.appendChild(mk("small", null, money(r) + " · " + (CAT.filter(function (c) { return c[0] == r.category })[0] || [0, ""])[1] + " · " + (r.images || []).length + " photo(s)")); li.appendChild(tx);
    var s = mk("select"); opts(s, ST); s.value = r.stock_status; s.setAttribute("aria-label", "Stock");
    s.onchange = function () { save(Object.assign({}, r, { stock_status: s.value }), true) }; li.appendChild(s);
    var be = mk("button", null, "Modifier"); be.type = "button"; be.onclick = function () { form(r) }; li.appendChild(be);
    var bd = mk("button", "dn", "Supprimer"); bd.type = "button"; bd.onclick = function () { del(r) }; li.appendChild(bd);
    ls.appendChild(li);
  });
}
function save(o, quiet) {
  msg("Enregistrement…");
  return (o.id ? api("/api/admin/product", "PUT", o) : api("/api/admin/product", "POST", o)).then(function () { msg("Enregistré ✓"); load() }).catch(function (e) { msg(e.message, 1); if (e.status == 401) show(false); load() });
}
function del(r) {
  if (!confirm("Supprimer « " + r.name_fr + " » et ses photos ? Cette action est définitive.")) return;
  api("/api/admin/product?id=" + encodeURIComponent(r.id), "DELETE").then(function () { msg("Produit supprimé ✓"); load() }).catch(function (e) { msg(e.message, 1) });
}
function photos() {
  var box = $("ph"); box.textContent = "";
  imgs.forEach(function (u, i) {
    var t = mk("div", "pt"), im = mk("img"); im.src = u; im.alt = ""; t.appendChild(im);
    if (i == 0) t.appendChild(mk("small", null, "Principale"));
    var a = mk("div");
    [["◀", -1], ["▶", 1]].forEach(function (d) { var b = mk("button", null, d[0]); b.type = "button"; b.disabled = i + d[1] < 0 || i + d[1] >= imgs.length; b.onclick = function () { var x = imgs.splice(i, 1)[0]; imgs.splice(i + d[1], 0, x); photos() }; a.appendChild(b) });
    var x = mk("button", "dn", "✕"); x.type = "button"; x.title = "Retirer"; x.onclick = function () { imgs.splice(i, 1); photos() }; a.appendChild(x);
    t.appendChild(a); box.appendChild(t);
  });
}
function form(r) {
  cur = r || null; imgs = r ? (r.images || []).slice() : []; $("dt").textContent = r ? "Modifier le produit" : "Ajouter un produit";
  $("f_cat").value = r ? r.category : "p"; $("f_stock").value = r ? r.stock_status : "in_stock";
  [["nfr", "name_fr"], ["nen", "name_en"], ["nar", "name_ar"], ["dfr", "desc_fr"], ["den", "desc_en"], ["dar", "desc_ar"], ["mat", "material"], ["lead", "lead_time"]].forEach(function (p) { $("f_" + p[0]).value = r && r[p[1]] || "" });
  $("f_price").value = r && r.price != null ? r.price : ""; $("f_from").checked = !!(r && r.price_from); $("f_sort").value = r ? r.sort_order : 0;
  $("up").textContent = ""; photos(); $("dg").showModal();
}
function shrink(file) {
  return new Promise(function (res, rej) {
    var im = new Image(), u = URL.createObjectURL(file);
    im.onload = function () {
      var k = Math.min(1, 1400 / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      c.toBlob(function (b) { if (!b) return rej(new Error("Image illisible")); if (b.size > 2.8e6) c.toBlob(function (b2) { res(b2 || b) }, "image/webp", .6); else res(b) }, "image/webp", .85);
    };
    im.onerror = function () { rej(new Error("Image illisible : " + file.name)) }; im.src = u;
  });
}
function b64(b) { return new Promise(function (res) { var f = new FileReader(); f.onload = function () { res(String(f.result).split(",")[1]) }; f.readAsDataURL(b) }) }
$("fi").onchange = function () {
  var fs = [].slice.call(this.files); this.value = ""; if (!fs.length) return;
  if (imgs.length + fs.length > 8) return msg("8 photos maximum par produit.", 1);
  var n = 0; busy++; $("sv").disabled = true; msg("");
  fs.reduce(function (p, f) {
    return p.then(function () {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 20e6) throw new Error("Fichier refusé (JPG, PNG ou WebP, 20 Mo max) : " + f.name);
      $("up").textContent = "Envoi de la photo " + (++n) + "/" + fs.length + "…";
      return shrink(f).then(b64).then(function (d) { return api("/api/admin/upload", "POST", { data: d }) }).then(function (r) { imgs.push(r.url); photos() });
    });
  }, Promise.resolve()).catch(function (e) { msg(e.message, 1) }).then(function () { busy--; $("up").textContent = ""; $("sv").disabled = busy > 0 });
};
$("ef").onsubmit = function (e) {
  e.preventDefault(); if (busy) return;
  var o = { category: $("f_cat").value, stock_status: $("f_stock").value, name_fr: $("f_nfr").value, name_en: $("f_nen").value, name_ar: $("f_nar").value, desc_fr: $("f_dfr").value, desc_en: $("f_den").value, desc_ar: $("f_dar").value,
    material: $("f_mat").value, lead_time: $("f_lead").value, price: $("f_price").value === "" ? null : Number($("f_price").value), price_from: $("f_from").checked, sort_order: Number($("f_sort").value) || 0, images: imgs };
  if (cur) o.id = cur.id; $("sv").disabled = true;
  save(o).then(function () { $("dg").close() }).then(function () { $("sv").disabled = false });
};
$("cc").onclick = function () { $("dg").close() }; $("add").onclick = function () { form(null) };
opts($("f_cat"), CAT); opts($("f_stock"), ST);
$("lg").onsubmit = function (e) {
  e.preventDefault(); msg("Connexion…");
  api("/api/auth", "POST", { email: $("em").value, password: $("pw").value }).then(function () { $("pw").value = ""; msg(""); show(true) }).catch(function (er) { msg(er.message, 1) });
};
$("out").onclick = function () { api("/api/auth", "DELETE").then(function () { rows = []; show(false) }) };
api("/api/auth").then(function (r) { show(!!r.admin) }).catch(function (e) { msg(e.message, 1) });
})();
