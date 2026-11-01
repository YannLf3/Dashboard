/* ---------------------------------------------------------
   Catalogue de fonctionnalités d'un réseau social
   (app React Native + API Laravel). Fourchettes en jours
   pour un développeur seul. Ajuste-les avec ton expérience :
   le suivi du temps réel (Projets & temps) te dira si tu
   sous-estimes ou sur-estimes.
   legal: true = exigé par la loi ou par les stores.
   mvp: true = coché par défaut.
   --------------------------------------------------------- */
export const CATEGORIES = [
  { id: 'cadrage', label: 'Cadrage et conception', items: [
    { id: 'ateliers', label: 'Ateliers de cadrage et spécifications', desc: 'Parcours utilisateurs, user stories, périmètre validé par écrit.', min: 1.5, max: 3, mvp: true },
    { id: 'maquettes', label: 'Maquettes UX/UI (Figma)', desc: 'Écrans principaux, prototype cliquable, validation cliente.', min: 4, max: 8, mvp: true },
    { id: 'archi', label: 'Architecture technique et modèle de données', desc: 'Schéma de base, API, choix d’hébergement UE.', min: 1.5, max: 3, mvp: true },
  ] },
  { id: 'socle', label: 'Socle technique', items: [
    { id: 'setup', label: 'Initialisation des projets et environnements', desc: 'API Laravel, app React Native (TypeScript, NativeWind), Git, CI, staging.', min: 1.5, max: 3, mvp: true },
    { id: 'ds', label: 'Design system et composants', desc: 'Composants réutilisables, thème, accessibilité.', min: 2, max: 4, mvp: true },
    { id: 'api', label: 'Socle API', desc: 'Structure, gestion d’erreurs, validation, documentation OpenAPI.', min: 2, max: 3, mvp: true },
  ] },
  { id: 'comptes', label: 'Comptes et sécurité', items: [
    { id: 'auth', label: 'Inscription, connexion, mot de passe oublié', desc: 'Vérification d’email, hachage Argon2/bcrypt.', min: 3, max: 5, mvp: true },
    { id: 'oauth', label: 'Connexion Google et Apple', desc: 'Sign in with Apple est obligatoire sur iOS si un autre login social est proposé.', min: 1.5, max: 3 },
    { id: '2fa', label: 'Double authentification (2FA)', desc: 'Application TOTP, codes de secours.', min: 1.5, max: 3 },
    { id: 'age', label: 'Contrôle d’âge et consentement parental', desc: 'Âge à l’inscription, accord parental sous 15 ans.', min: 1.5, max: 4, mvp: true, legal: true },
    { id: 'zerotrust', label: 'Durcissement Zero-Trust', desc: 'Jetons courts et rotation, limitation de débit, journal d’audit, chiffrement des données sensibles, moindre privilège.', min: 4, max: 8, mvp: true },
    { id: 'sessions', label: 'Sessions et appareils connectés', desc: 'Liste des appareils, déconnexion à distance.', min: 1, max: 2 },
  ] },
  { id: 'social', label: 'Profils et relations', items: [
    { id: 'profil', label: 'Profil utilisateur', desc: 'Avatar, bio, édition, page profil.', min: 2, max: 3, mvp: true },
    { id: 'confidentialite', label: 'Paramètres de confidentialité', desc: 'Compte privé, visibilité des publications.', min: 1.5, max: 3, mvp: true },
    { id: 'follow', label: 'Abonnements ou amis', desc: 'Demandes, acceptation, listes.', min: 2, max: 4, mvp: true },
    { id: 'blocage', label: 'Blocage et masquage d’utilisateurs', desc: 'Exigé par l’App Store et Google Play.', min: 1, max: 2, mvp: true, legal: true },
  ] },
  { id: 'contenus', label: 'Contenus', items: [
    { id: 'posts', label: 'Publications texte', desc: 'Création, édition, suppression.', min: 2, max: 3, mvp: true },
    { id: 'medias', label: 'Photos et vidéos', desc: 'Upload, compression, miniatures, stockage UE.', min: 3, max: 6, mvp: true },
    { id: 'feed', label: 'Fil d’actualité', desc: 'Chronologique, pagination infinie, rafraîchissement.', min: 3, max: 5, mvp: true },
    { id: 'algo', label: 'Fil personnalisé (recommandations)', desc: 'Classement selon les interactions. Attention : profilage = obligations RGPD renforcées.', min: 5, max: 10 },
    { id: 'likes', label: 'Réactions', desc: 'J’aime, compteurs.', min: 1, max: 2, mvp: true },
    { id: 'commentaires', label: 'Commentaires et réponses', desc: '', min: 2, max: 4, mvp: true },
    { id: 'partage', label: 'Partage et republication', desc: '', min: 1, max: 2 },
    { id: 'recherche', label: 'Recherche (utilisateurs, hashtags)', desc: '', min: 2, max: 4 },
    { id: 'stories', label: 'Stories éphémères (24 h)', desc: '', min: 4, max: 7 },
  ] },
  { id: 'messagerie', label: 'Messagerie et temps réel', items: [
    { id: 'dm', label: 'Messages privés en temps réel', desc: 'WebSockets (Laravel Reverb), accusés de lecture.', min: 5, max: 8 },
    { id: 'groupes', label: 'Conversations de groupe', desc: '', min: 3, max: 5 },
    { id: 'e2ee', label: 'Chiffrement de bout en bout', desc: 'Gestion des clés par appareil : complexe, à réserver si indispensable.', min: 8, max: 15 },
  ] },
  { id: 'notifs', label: 'Notifications', items: [
    { id: 'inapp', label: 'Notifications dans l’app', desc: '', min: 2, max: 3, mvp: true },
    { id: 'push', label: 'Notifications push', desc: 'APNs (iOS) et FCM (Android), préférences.', min: 2, max: 4, mvp: true },
    { id: 'emails', label: 'Emails transactionnels', desc: 'Bienvenue, vérification, sécurité.', min: 1, max: 2, mvp: true },
  ] },
  { id: 'moderation', label: 'Modération et conformité', items: [
    { id: 'signalement', label: 'Signalement de contenus et de comptes', desc: 'Art. 16 DSA, LCEN ; exigé par les stores.', min: 2, max: 3, mvp: true, legal: true },
    { id: 'backoffice', label: 'Back-office de modération', desc: 'File de signalements, décisions motivées (art. 17 DSA), historique.', min: 4, max: 7, mvp: true, legal: true },
    { id: 'filtrage', label: 'Filtrage automatique', desc: 'Mots interdits, détection d’images sensibles via un service tiers.', min: 2, max: 5 },
    { id: 'rgpd', label: 'Outils RGPD', desc: 'Export de mes données, suppression du compte, gestion des consentements.', min: 2, max: 4, mvp: true, legal: true },
    { id: 'pages-legales', label: 'Intégration des pages légales', desc: 'CGU, confidentialité, mentions, cookies. La rédaction juridique n’est pas incluse.', min: 0.5, max: 1, mvp: true, legal: true },
    { id: 'logs', label: 'Journalisation légale des connexions', desc: 'Conservation 1 an, accès restreint (décret 2021-1362).', min: 1, max: 2, mvp: true, legal: true },
  ] },
  { id: 'admin', label: 'Administration', items: [
    { id: 'admin', label: 'Tableau de bord administrateur', desc: 'Utilisateurs, statistiques, actions.', min: 3, max: 5, mvp: true },
    { id: 'stats', label: 'Mesure d’audience respectueuse', desc: 'Sans cookies tiers, exemptée de consentement.', min: 1, max: 2 },
  ] },
  { id: 'plateformes', label: 'Plateformes et mise en ligne', items: [
    { id: 'mobile', label: 'Finitions iOS et Android', desc: 'Tests sur appareils, permissions, liens profonds.', min: 3, max: 5, mvp: true },
    { id: 'web', label: 'Version web responsive', desc: 'Accès depuis un navigateur.', min: 5, max: 10 },
    { id: 'stores', label: 'Publication App Store et Google Play', desc: 'Fiches, captures, conformité, allers-retours de validation.', min: 2, max: 4, mvp: true },
    { id: 'deploy', label: 'Déploiement et sauvegardes', desc: 'Production et préproduction, sauvegardes automatiques.', min: 2, max: 3, mvp: true },
  ] },
  { id: 'qualite', label: 'Qualité et livraison', items: [
    { id: 'tests', label: 'Tests automatisés', desc: 'API et parcours critiques de l’app.', min: 4, max: 8, mvp: true },
    { id: 'recette', label: 'Recette avec la cliente et corrections', desc: '', min: 3, max: 5, mvp: true },
    { id: 'docs', label: 'Documentation et passation', desc: 'Installation, déploiement, licences des dépendances.', min: 1.5, max: 3, mvp: true },
  ] },
];

export const ALL_FEATURES = CATEGORIES.flatMap((c) => c.items.map((f) => ({ ...f, category: c.id })));
export const midpoint = (f) => Math.round(((f.min + f.max) / 2) * 2) / 2;
