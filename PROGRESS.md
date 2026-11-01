# PROGRESS — Cockpit Yannlf3

Fichier de reprise : dans une nouvelle conversation, dis « lis PROGRESS.md du repo YannLf3/Dashboard ».

## État au 1er novembre 2026 — V1 livrée

- [x] Socle : Vanilla JS (modules ES), sans build, GitHub Pages, PWA, thème clair/sombre
- [x] Stockage : mode local (localStorage) + mode cloud Supabase (auth email/mot de passe, RLS, triggers)
- [x] M1 Checklist légale (61 points, sources officielles, progression sauvegardée)
- [x] M2 Simulateur (TJM libre, catalogue réseau social, délai réel, alertes TVA et fonctions légales, export devis)
- [x] M3 Devis / factures / acomptes / solde / avoirs, numérotation `NNNN_JJMMAA`, PDF jsPDF, paiements, retards
- [x] M4 Finances : plafonds, URSSAF mensuel (ACRE), impôt estimé, échéances
- [x] M5 Modèles : CGV, contrat + cession, DPA RGPD, PV, relance, mise en demeure, rétractation, mentions, confidentialité
- [x] Extras : clients (SIREN auto), projets & chrono, livre des recettes (CSV/PDF), sauvegarde JSON

## Décisions

- Numérotation reprise après `0001_010926` (paramètre « dernier numéro émis hors dashboard » = 1)
- Avoirs : série `AV0001_JJMMAA` ; devis : `D0001_JJMMAA`
- Catégorie par défaut : BNC (25,6 % en 2026) — à confirmer sur l'espace URSSAF
- Une table générique `records(collection, id, data jsonb)` : simple, un seul jeu de règles RLS
- Mention TVA basculée automatiquement vers l'art. L.233-3 du CIBS pour les factures du 01/01/2027

## À faire par Yann

1. Activer GitHub Pages (README §2)
2. Remplir Paramètres : SIRET, adresse, date de début d'activité, IBAN, catégorie BNC/BIC
3. Créer le projet Supabase et coller les clés (README §3), puis fermer les inscriptions
4. Si cliente particulière : choisir un médiateur de la consommation
5. Relire et compléter les CGV, puis cocher la checklist

## Idées V2

- Export Factur-X / envoi via plateforme agréée (obligatoire en émission B2B au 01/09/2027)
- Relances automatiques par email (Edge Function Supabase)
- Historique des versions de devis, signature électronique
- Tests unitaires des calculs (`shared.js`, `legal.js`) avec `node --test`
