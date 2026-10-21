# HAM3D – Site + Administration (Vercel + Supabase) — Guide pour débutant

Ce dossier contient TOUT le site : la partie publique (identique au design actuel) et la page **/admin**.
Aucune clé secrète n'est dans le navigateur : elles sont stockées dans Vercel et utilisées seulement par le serveur.

```
index.html            site public (design inchangé)           admin/index.html + admin.js   page /admin
assets/site.js        affichage des produits                  api/                          le "serveur" (4 petits programmes)
lib/ham.js            sécurité + accès base de données        supabase/setup.sql            à coller dans Supabase (étape 2)
vercel.json           en-têtes de sécurité                    README.md                     ce guide
```

## Comment ça marche (en 3 lignes)
- Produits = base de données **Supabase** (gratuite). Photos = stockage **Supabase Storage**. Tout reste après un redéploiement.
- /admin parle à de petits programmes Vercel (/api/…). Eux seuls connaissent la clé secrète Supabase et vérifient votre e-mail + mot de passe.
- Un visiteur peut seulement LIRE les produits. Toute modification sans connexion est refusée (erreur 401).

---
## ÉTAPE 1 – Regarder ce qui existe déjà (2 minutes)
Je n'ai pas accès à votre compte Vercel. Ouvrez vercel.com → votre projet HAM3D, puis notez :
1. **Settings → Environment Variables** : y a-t-il déjà des variables (SUPABASE…, DATABASE_URL, BLOB…) ?
2. **Storage** (menu du haut) : y a-t-il une base ou un Blob créés ?
3. **Settings → Git** : « Not connected » = pas de GitHub (c'est normal chez vous).
Si vous avez déjà un projet Supabase (créé avec la version précédente), **réutilisez-le** : le fichier setup.sql le met à niveau sans rien effacer.

## ÉTAPE 2 – Supabase (base de données + photos)
1. Allez sur **supabase.com** → créez un compte gratuit → **New project** (nom : ham3d, choisissez une région proche, notez le mot de passe de la base).
2. Menu de gauche **SQL Editor** → **New query** → ouvrez `supabase/setup.sql`, copiez tout, collez, cliquez **Run**. Résultat attendu : « Success ».
3. Menu **Storage** : vérifiez que le dossier (bucket) **product-images** existe.
4. Menu **Project Settings → API Keys** :
   - copiez le **Project URL** (ex. `https://abcdxyz.supabase.co`) ;
   - dans **Secret keys**, copiez la clé `sb_secret_…` (si vous ne voyez que « Legacy API Keys », prenez la clé **service_role**).
   ⚠️ Cette clé est SECRÈTE : ne la mettez jamais dans un fichier du site ni dans un message public.

## ÉTAPE 3 – Préparer vos 3 secrets
- `ADMIN_EMAIL` : votre e-mail d'administrateur.
- `ADMIN_PASSWORD` : un mot de passe long (16 caractères ou plus, minimum 10).
- `SESSION_SECRET` : une longue suite aléatoire de 40 caractères ou plus (utilisez le générateur de mot de passe de votre navigateur ou de bitwarden.com/password-generator). Gardez-la ailleurs aussi.

## ÉTAPE 4 – Déployer SANS GitHub (sans toucher à votre site actuel)
On crée un **nouveau projet** Vercel : votre site actuel reste intact, en ligne.

### Option A – Vercel Drop (aucun terminal)
1. Décompressez le ZIP, puis **ouvrez le dossier `ham3d-vercel`**. Vous devez voir DIRECTEMENT `index.html`, `api`, `admin`, `vercel.json`…
2. Allez sur **vercel.com/drop** et glissez **le contenu de ce dossier** (sélectionnez tous les fichiers/dossiers à l'intérieur et glissez-les), PAS le ZIP ni le dossier parent. Choisissez votre équipe, nommez le projet **ham3d-admin**, cliquez **Deploy**.
3. Le site s'ouvre sur une adresse du type `ham3d-admin.vercel.app`. Normal : /admin dit « Variables d'environnement manquantes » tant que l'étape 5 n'est pas faite.
⚠️ La documentation de Vercel Drop ne parle pas explicitement du dossier `api` (les petits programmes serveur). Si après l'étape 5 l'adresse `/api/products` donne une erreur 404, utilisez l'option B.

### Option B – Vercel CLI (si l'option A ne prend pas en charge `api`)
1. Installez **Node.js (version LTS)** depuis nodejs.org.
2. Ouvrez un terminal DANS le dossier du projet (Windows : clic droit dans le dossier → « Ouvrir dans le terminal »).
3. Tapez `npx vercel` : connectez-vous (e-mail), répondez **Y** à « Set up and deploy », choisissez **Create a new project**, nom **ham3d-admin**, puis Entrée à toutes les autres questions.
4. Ajoutez les variables (étape 5) avec `npx vercel env add NOM production` (il demande la valeur), puis `npx vercel --prod`.

## ÉTAPE 5 – Variables d'environnement dans Vercel
Vercel → votre projet **ham3d-admin** → **Settings** → **Environment Variables** → pour chacune : **Key**, **Value**, environnement **Production** coché, **Add** (cochez « Sensitive » si proposé).

| Key | Value |
|---|---|
| `SUPABASE_URL` | le Project URL de l'étape 2 |
| `SUPABASE_SECRET_KEY` | la clé `sb_secret_…` (ou service_role) |
| `ADMIN_EMAIL` | votre e-mail admin |
| `ADMIN_PASSWORD` | votre mot de passe admin |
| `SESSION_SECRET` | la longue suite aléatoire |

**Important :** les variables ne s'appliquent qu'aux NOUVEAUX déploiements. Ensuite : onglet **Deployments** → le dernier déploiement → menu **⋯** → **Redeploy** (ou, avec la CLI : `npx vercel --prod`).

## ÉTAPE 6 – Tester (checklist)
Remplacez `VOTRE-SITE` par l'adresse du nouveau projet.
- [ ] `VOTRE-SITE/` : le site HAM3D s'affiche comme avant (3 emplacements « Produit à venir »).
- [ ] `VOTRE-SITE/api/products` affiche `[]` (liste vide) et non une erreur.
- [ ] `VOTRE-SITE/admin` : écran de connexion. Un mauvais mot de passe affiche « E-mail ou mot de passe incorrect ».
- [ ] Connexion avec vos identifiants : liste vide + bouton « Ajouter un produit ».
- [ ] **Ajout** : nom, prix, description, catégorie, stock, 2 photos → Enregistrer. Le produit apparaît dans la liste (« 2 photo(s) »).
- [ ] **Affichage public** : rechargez `VOTRE-SITE/` : le produit est visible avec sa photo ; au clic, la galerie montre les 2 photos.
- [ ] **Modification** : changez le prix, retirez une photo (✕), changez le stock en « Rupture » → le site public affiche « Indisponible ».
- [ ] **Persistance** : Deployments → Redeploy → le produit existe toujours.
- [ ] **Suppression** : Supprimer → disparaît du site et de la liste.
- [ ] **Sécurité** : ouvrez `/admin` dans une fenêtre privée : on demande la connexion. Après « Déconnexion », un rechargement redemande la connexion.

## ÉTAPE 7 – Mettre ce nouveau site à la place de l'ancien (quand tout est validé)
1. Ancien projet → **Settings → Domains** : notez votre domaine, puis retirez-le (Remove).
2. Nouveau projet **ham3d-admin** → **Settings → Domains** → ajoutez ce domaine.
Retour en arrière : faites l'inverse. L'ancien projet n'est jamais supprimé par ce guide.

## Mises à jour futures
Vos produits se gèrent sur /admin, sans toucher aux fichiers. Pour modifier le site lui-même : dans le tableau de bord Vercel, déposez le dossier mis à jour sur le projet (le projet garde ses variables).

## Sécurité – ce qui est en place
- Clé secrète uniquement dans les variables Vercel (jamais dans le navigateur). Base de données fermée au public (RLS) : seul le serveur y accède.
- Connexion : cookie signé HttpOnly + Secure + SameSite=Strict, durée 8 h ; protection contre le détournement (en-tête obligatoire + vérification de l'origine) ; 8 mauvaises tentatives = blocage 15 min (par serveur, au mieux).
- Photos : seulement JPG/PNG/WebP vérifiés par leur contenu, 3 Mo max, compressées automatiquement. Textes affichés sans exécuter de code. En-têtes de sécurité (CSP…) dans vercel.json.
- Pour changer le mot de passe : modifiez `ADMIN_PASSWORD` dans Vercel puis Redeploy.

## Limites à connaître
- Un seul compte administrateur. Les 5 services restent dans le texte du site (comme avant) ; seuls les produits sont gérés dans /admin.
- Si vous annulez un ajout après avoir envoyé des photos, ces photos restent dans Supabase Storage (supprimables à la main).
- Offre gratuite Supabase : un projet inactif ~1 semaine peut être mis en pause (réactivation en un clic). Faites des sauvegardes si l'activité grandit.
- Commandes : toujours via WhatsApp (0708020863). Pas de panier ni de paiement en ligne.

## Problèmes fréquents
- « Variables d'environnement manquantes » : une variable est absente/mal écrite, ou vous n'avez pas fait **Redeploy** après l'avoir ajoutée.
- « Base de données indisponible » : mauvaise URL/clé Supabase, ou setup.sql pas exécuté.
- /api/… en 404 : le dossier `api` n'a pas été pris en compte → utilisez l'option B (CLI).
- Photo refusée : JPG, PNG ou WebP uniquement.
- **Erreur 404 sur /admin** : testez ces 3 adresses (remplacez VOTRE-SITE) :
  - `VOTRE-SITE/` → 404 ? Le dossier a été déposé avec un dossier parent en trop (ou Vercel vous a demandé « Root (/) »). Re-déposez le CONTENU du dossier, de façon à avoir `index.html` à la racine.
  - `VOTRE-SITE/admin/` (avec le `/` final) → doit afficher la connexion. Si oui mais pas `/admin` sans `/`, utilisez toujours `/admin/`.
  - `VOTRE-SITE/api/products` → 404 ? Le dossier `api` n'est pas pris en compte : utilisez l'option B (CLI).
  - Vérifiez aussi que vous regardez le NOUVEAU projet (ham3d-admin), pas l'ancien : l'ancien site n'a pas de page /admin.
