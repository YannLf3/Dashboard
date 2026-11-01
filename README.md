# Cockpit Yannlf3

Tableau de bord gratuit pour piloter une micro-entreprise de développement web en restant dans les clous légaux :
checklist de conformité, simulateur de prix, devis / factures / avoirs conformes, livre des recettes,
déclarations URSSAF, plafonds, modèles de contrats.

**En ligne :** https://yannlf3.github.io/Dashboard/

> Chiffres légaux vérifiés le 1er novembre 2026 (sources dans `js/data/legal.js`).
> Outil d'aide, pas un avis juridique.

---

## Les modules

| Écran | Ce qu'il fait |
|---|---|
| **Accueil** | Jauge de conformité (un arc par étape de la checklist), chiffres clés, prochaines échéances, choses à traiter. |
| **Checklist légale** (M1) | 61 points en 7 étapes : statut, avant signature, obligations du réseau social, livraison, paiement, récurrent, 2027. Chaque point : pourquoi, comment, source officielle. |
| **Simulateur de prix** (M2) | Catalogue de fonctionnalités d'un réseau social, TJM libre, gestion de projet, imprévus, remise. Calcule prix, cotisations, net, délai réel selon tes heures dispo, échéancier, alertes (fonctions légales oubliées, seuil TVA). Transforme la simulation en devis. |
| **Devis & factures** (M3) | Brouillon modifiable → émission avec numéro continu (`0002_JJMMAA` après ta `0001_010926`), document figé, mentions adaptées pro / particulier, factures d'acompte et de solde, avoirs, paiements, retards et pénalités, PDF. |
| **Finances & URSSAF** (M4) | Plafond micro (83 600 €), seuils TVA (37 500 / 41 250 €), encaissements par mois, déclaration URSSAF de chaque mois avec cotisations (ACRE incluse), impôt estimé, échéances sur 12 mois. |
| **Modèles** (M5) | CGV, contrat avec cession de droits, sous-traitance RGPD, PV de recette, relance, mise en demeure, rétractation, mentions légales, politique de confidentialité. Modifiables, exportables en PDF. |
| **Clients** | Pro ou particulier, remplissage automatique par SIREN (annuaire officiel). |
| **Projets & temps** | Chrono, saisie du temps, comparaison avec l'estimation, TJM réel. |
| **Livre des recettes** | Obligatoire. Rempli automatiquement par les paiements. Export CSV et PDF. |
| **Paramètres** | Identité, régime, facturation, médiateur, TJM, disponibilité, sauvegarde / import JSON. |

---

## 1. Lancer en local

Les modules JavaScript (`import`) ne fonctionnent pas en ouvrant `index.html` directement : il faut un petit serveur.

```bash
cd Dashboard
npx serve .          # ou : python3 -m http.server 8000
```

Sans configuration Supabase, l'app tourne en **mode local** : les données restent dans le navigateur.

## 2. Mettre en ligne sur GitHub Pages (gratuit)

1. Sur GitHub : **Settings → Pages**.
2. *Source* : **Deploy from a branch**, branche `main`, dossier `/ (root)` → **Save**.
3. Après 1 à 2 minutes : https://yannlf3.github.io/Dashboard/

Le fichier `.nojekyll` dit à GitHub de servir les fichiers tels quels.

## 3. Activer la synchronisation Mac / iPhone / iPad (Supabase, gratuit)

1. Crée un compte sur [supabase.com](https://supabase.com), puis **New project** :
   région **Europe (Paris ou Francfort)**, garde le mot de passe de la base dans ton gestionnaire.
2. **SQL Editor → New query** : colle le contenu de `supabase/schema.sql` → **Run**.
3. **Authentication → URL Configuration** :
   *Site URL* = `https://yannlf3.github.io/Dashboard/`, ajoute la même adresse dans *Redirect URLs*.
4. **Project Settings → API** (ou *API Keys*) : copie la **Project URL** et la clé **anon / publishable**
   dans `js/config.js`, puis commit et push.
   La clé `service_role` / *secret* ne doit **jamais** aller dans le code.
5. Ouvre le site → **Créer mon compte** → confirme l'email → connecte-toi.
6. Ferme la porte : **Authentication → Sign In / Providers → désactive « Allow new users to sign up »**.
7. Si tu avais commencé en mode local : **Paramètres → Envoyer mes données locales vers Supabase**.

**Éviter la mise en pause** (projet gratuit inactif ~1 semaine) : ajoute deux secrets dans
**GitHub → Settings → Secrets and variables → Actions** : `SUPABASE_URL` et `SUPABASE_ANON_KEY`.
Le workflow `.github/workflows/keepalive.yml` fait alors une requête tous les 3 jours.

## 4. Installer comme une app

- **iPhone / iPad** : Safari → bouton Partager → **Sur l'écran d'accueil**.
- **Mac** : Safari → **Fichier → Ajouter au Dock** (ou Chrome → Installer).

---

## Architecture (pour comprendre et reproduire)

```
index.html               Coquille : barre latérale, zone principale, dialogue, toasts
css/app.css              Tokens de couleur (clair/sombre), composants, responsive
js/config.js             Clés Supabase + URLs des librairies CDN
js/main.js               Démarrage : thème, connexion, navigation
js/core/
  dom.js                 html`` (échappement XSS), dialogues, toasts, icônes
  format.js              Formats € et dates FR, calculs de dates
  db.js                  Adaptateurs de stockage : LocalAdapter / SupabaseAdapter
  store.js               Cache mémoire + règles métier (document émis = figé)
  router.js              Routeur par hash (#/factures/123) + chargement des écrans
js/data/
  legal.js               TOUS les chiffres légaux + sources (à revoir chaque 1er janvier)
  checklist.js           Contenu de la checklist
  features.js            Catalogue du simulateur
  templates.js           Textes des modèles juridiques
js/modules/              Un fichier par écran + shared.js (totaux, numérotation, mentions)
js/lib/pdf.js            Génération des PDF (jsPDF + autoTable)
supabase/schema.sql      Table, sécurité RLS, triggers
sw.js, manifest          PWA (installable, ouvrable hors ligne)
```

### Les concepts à retenir

- **Pattern adaptateur** (`db.js`) : l'app appelle `loadAll / put / remove` sans savoir si c'est
  `localStorage` ou Supabase. Changer de stockage = écrire un nouvel adaptateur, rien d'autre.
- **Row Level Security** (`schema.sql`) : la clé publique ne donne accès à rien ; Postgres ne renvoie
  que les lignes dont `user_id = auth.uid()`. C'est la base du Zero-Trust : on ne fait pas confiance au client.
- **Défense en profondeur** : la règle « facture émise = figée » est vérifiée dans `store.js` (interface)
  ET dans un trigger SQL (base). Même une requête bricolée ne peut pas modifier une facture émise.
- **Numéro attribué à l'émission** : supprimer un brouillon ne crée jamais de trou dans la série.
- **Snapshot** : à l'émission, tes infos et celles du client sont copiées dans le document.
  Changer d'adresse plus tard ne modifie pas une facture passée.
- **`html```** : toute valeur injectée est échappée (`<` devient `&lt;`) → pas d'injection de script.
- **Routeur par hash** : GitHub Pages ne sert que des fichiers ; le `#/...` reste côté navigateur.

## Mettre à jour les chiffres légaux

Tout est dans `js/data/legal.js` : plafonds, seuils TVA, taux de cotisations, ACRE, dates.
Vérifie-les chaque 1er janvier sur les sources indiquées, puis change `checkedOn`.

## Limites connues

- À partir du **1er septembre 2027**, tes factures B2B devront passer par une **plateforme agréée**
  (facturation électronique) : le PDF de ce dashboard ne suffira plus pour les clients pros.
- Les modèles juridiques sont indicatifs : fais relire les contrats à fort enjeu.
