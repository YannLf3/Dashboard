/* ---------------------------------------------------------
   Checklist légale du micro-entrepreneur dev web.
   Vérifiée le 1er novembre 2026. Ce n'est pas un avis juridique :
   chaque point renvoie à sa source pour vérification.
   tag : obligatoire | recommandé | b2c | b2b | cliente (obligation
   de ta cliente que tu dois intégrer techniquement et lui signaler)
   --------------------------------------------------------- */

const SRC = {
  annuaire: { label: 'Annuaire des entreprises', url: 'https://annuaire-entreprises.data.gouv.fr' },
  urssaf: { label: 'autoentrepreneur.urssaf.fr', url: 'https://www.autoentrepreneur.urssaf.fr' },
  impots: { label: 'impots.gouv.fr (espace professionnel)', url: 'https://www.impots.gouv.fr/professionnel' },
  facture: { label: 'Service Public : mentions obligatoires', url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F31808' },
  tva: { label: 'Service Public : franchise en base de TVA', url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F21746' },
  cfe: { label: 'Service Public : CFE', url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F23547' },
  retard: { label: 'Service Public : pénalités de retard', url: 'https://entreprendre.service-public.gouv.fr/vosdroits/F23211' },
  mediation: { label: 'Liste officielle des médiateurs', url: 'https://www.economie.gouv.fr/mediation-conso' },
  rgpd: { label: 'RGPD (texte officiel)', url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj' },
  dsa: { label: 'Digital Services Act (texte officiel)', url: 'https://eur-lex.europa.eu/eli/reg/2022/2065/oj' },
  cnilDev: { label: 'CNIL : guide RGPD du développeur', url: 'https://www.cnil.fr/fr/guide-rgpd-du-developpeur' },
  cnilCookies: { label: 'CNIL : cookies et traceurs', url: 'https://www.cnil.fr/fr/cookies-et-autres-traceurs' },
  apple: { label: 'App Store : contenus générés par les utilisateurs', url: 'https://developer.apple.com/app-store/review/guidelines/#user-generated-content' },
  einvoice: { label: 'impots.gouv : facturation électronique', url: 'https://www.impots.gouv.fr/facturation-electronique-et-plateformes-agreees' },
  cibs: { label: 'Nouvelle mention TVA (CIBS)', url: 'https://www.legifiscal.fr/actualites-fiscales/4613-mention-facture-changement-article-exoneration-tva-autoentrepreneurs.html' },
  acre: { label: 'Décret ACRE 2026', url: 'https://www.legifiscal.fr/actualites-fiscales/4422-publication-decret-reduisant-exoneration-acre-createurs-repreneurs-entreprise.html' },
};

export const PHASES = [
  {
    id: 'statut', title: 'Ton statut', intro: 'À faire une fois, puis à vérifier chaque année.',
    items: [
      { id: 'siret', tag: 'obligatoire', title: 'Vérifier que ton SIRET est actif', why: 'Il figure sur chaque devis et facture. Une erreur rend la facture irrégulière.', how: 'Cherche ton nom sur l’Annuaire des entreprises : statut « en activité », code APE, adresse. Recopie-les dans Paramètres.', source: SRC.annuaire, link: '#/parametres' },
      { id: 'categorie', tag: 'obligatoire', title: 'Identifier ta catégorie : BNC ou BIC', why: 'Elle fixe ton taux de cotisations (25,6 % en BNC, 21,2 % en BIC services en 2026) et ton abattement d’impôt.', how: 'Dans ton espace URSSAF ou sur ton avis de situation INSEE, regarde la nature d’activité. « Libérale » = BNC (cas le plus fréquent pour un développeur web). Règle-la dans Paramètres.', source: SRC.urssaf, link: '#/parametres' },
      { id: 'tva', tag: 'obligatoire', title: 'Confirmer que tu es en franchise de TVA', why: 'Par défaut, un micro-entrepreneur ne facture pas de TVA tant que son CA reste sous 37 500 € (services). La mention « TVA non applicable » est alors obligatoire sur tes factures.', how: 'Si tu n’as jamais demandé à payer la TVA, tu es en franchise. Le dashboard ajoute la bonne mention automatiquement et surveille le seuil.', source: SRC.tva, link: '#/finances' },
      { id: 'vl', tag: 'recommandé', title: 'Anticiper ton impôt (pas de versement libératoire)', why: 'Sans versement libératoire, ton impôt est calculé l’année suivante sur ta déclaration de revenus, après un abattement de 34 % (BNC).', how: 'Mets de côté chaque mois une part de tes encaissements. L’onglet Finances estime ton revenu imposable.', link: '#/finances' },
      { id: 'acre', tag: 'recommandé', title: 'Noter tes dates d’ACRE', why: 'L’ACRE réduit tes cotisations la première année. Pour une création à partir du 1er juillet 2026, la réduction n’est plus que de 25 % (contre 50 % avant).', how: 'Renseigne ta date de début d’activité dans Paramètres : le dashboard calcule le taux réduit et sa date de fin. Vérifie-la sur ton attestation URSSAF.', source: SRC.acre, link: '#/parametres' },
      { id: 'compte', tag: 'obligatoire', title: 'Utiliser ton compte bancaire dédié', why: 'Obligatoire dès que ton CA dépasse 10 000 € deux années de suite. Il sépare clairement tes flux pro et perso.', how: 'Fais encaisser tous tes clients sur ce compte et indique son IBAN sur tes factures (Paramètres).' },
      { id: 'espace-impots', tag: 'obligatoire', title: 'Créer ton espace professionnel impots.gouv.fr', why: 'C’est là que tu reçois et payes ta CFE, et que tu échanges avec ton service des impôts.', how: 'impots.gouv.fr > Espace professionnel > Créer mon espace (avec ton SIRET).', source: SRC.impots },
      { id: 'cfe-decl', tag: 'obligatoire', title: 'Déposer ta déclaration initiale de CFE', why: 'Tu es exonéré de CFE l’année de ta création, puis ta base est réduite de moitié la 2e année. La déclaration 1447-C-SD est à faire avant le 31 décembre de l’année de création.', how: 'Dans ton espace professionnel impots.gouv (messagerie ou formulaire en ligne).', source: SRC.cfe },
      { id: 'cgv', tag: 'obligatoire', title: 'Rédiger tes conditions générales de vente', why: 'Tu dois les communiquer à tout client professionnel qui les demande (art. L441-1 C. com.), et elles portent tes règles de paiement, de retard et de propriété intellectuelle.', how: 'Génère-les dans Modèles de documents, relis-les, puis joins-les à chaque devis.', link: '#/modeles/cgv' },
      { id: 'mediateur', tag: 'b2c', title: 'Adhérer à un médiateur de la consommation', why: 'Obligatoire dès que tu travailles pour un particulier (art. L612-1 C. conso), sous peine d’amende administrative. C’est payant : compare les tarifs.', how: 'Choisis un médiateur dans la liste officielle, puis indique son nom et son site dans Paramètres : ils apparaîtront sur tes CGV et factures B2C.', source: SRC.mediation, link: '#/parametres' },
      { id: 'rcpro', tag: 'recommandé', title: 'Décider pour la RC Pro', why: 'Facultative pour un développeur web. Depuis 2022, ton patrimoine personnel est protégé en EI, mais un litige peut coûter cher sur un projet sensible (sécurité, données).', how: 'Sans assurance : limite ta responsabilité dans tes CGV et ton contrat (plafond = montant payé), c’est gratuit. Réévalue quand ton CA augmente.', link: '#/modeles/contrat' },
      { id: 'site-legal', tag: 'obligatoire', title: 'Mentions légales et confidentialité sur ton site pro', why: 'Tout site professionnel doit identifier son éditeur et son hébergeur (LCEN). Un formulaire de contact collecte des données personnelles (RGPD).', how: 'Génère les deux textes dans Modèles de documents et publie-les sur pro.yannleflohic.fr.', link: '#/modeles/mentions' },
      { id: 'numerotation', tag: 'obligatoire', title: 'Numérotation continue et conservation 10 ans', why: 'Chaque facture a un numéro unique dans une suite chronologique sans trou. Factures et justificatifs se conservent 10 ans.', how: 'Le dashboard attribue le numéro à l’émission et fige la facture. Télécharge chaque PDF et fais une sauvegarde mensuelle.', source: SRC.facture, link: '#/parametres' },
      { id: 'livre', tag: 'obligatoire', title: 'Tenir ton livre des recettes', why: 'Registre obligatoire de tes encaissements, dans l’ordre chronologique : date, client, nature, montant, mode de paiement, référence de la facture.', how: 'Il se remplit tout seul quand tu enregistres un paiement sur une facture. Exporte-le en PDF chaque année.', link: '#/recettes' },
      { id: 'vigilance', tag: 'b2b', title: 'Savoir fournir ton attestation de vigilance', why: 'Pour tout contrat de 5 000 € HT ou plus, ton client pro doit te la demander à la signature puis tous les 6 mois.', how: 'Téléchargeable gratuitement dans ton espace autoentrepreneur.urssaf.fr.', source: SRC.urssaf },
    ],
  },
  {
    id: 'avant', title: 'Avant de signer', intro: 'Pour chaque nouveau client.',
    items: [
      { id: 'type-client', tag: 'obligatoire', title: 'Savoir si le client est un particulier ou un professionnel', why: 'Les règles changent : rétractation, médiateur, pénalités. Attention : un professionnel de 5 salariés au plus, pour un projet hors de son cœur de métier signé à distance, bénéficie aussi du droit de rétractation (art. L221-3 C. conso).', how: 'Renseigne le type dans la fiche client : devis et factures adaptent leurs mentions.', link: '#/clients' },
      { id: 'verif-client', tag: 'b2b', title: 'Vérifier l’entreprise cliente', why: 'Évite les impayés et donne le SIREN, obligatoire sur tes factures B2B à partir de septembre 2027.', how: 'Saisis le SIREN dans la fiche client : le dashboard récupère nom et adresse sur l’annuaire officiel.', source: SRC.annuaire, link: '#/clients' },
      { id: 'besoin', tag: 'recommandé', title: 'Faire valider le périmètre par écrit', why: 'Ce qui n’est pas écrit n’est pas inclus. C’est ta protection contre les demandes qui s’ajoutent sans être payées.', how: 'Liste les fonctionnalités incluses et exclues (le simulateur te sert de base), et fais-la valider par email avant le devis.', link: '#/simulateur' },
      { id: 'devis', tag: 'recommandé', title: 'Envoyer un devis détaillé et daté', why: 'Signé, il vaut contrat : prix, délais, acompte, durée de validité.', how: 'Crée-le depuis le simulateur, finalise-le, puis envoie le PDF.', link: '#/simulateur' },
      { id: 'cgv-jointes', tag: 'obligatoire', title: 'Faire accepter tes CGV avant la signature', why: 'Des CGV découvertes après coup ne s’appliquent pas.', how: 'Joins-les au devis et fais écrire « J’accepte les CGV jointes » à côté de la signature.', link: '#/modeles/cgv' },
      { id: 'contrat', tag: 'recommandé', title: 'Signer un contrat avec cession de droits d’auteur', why: 'Sans cession écrite, tu restes propriétaire du code. La cession n’est valable que si chaque droit cédé, son étendue, sa destination, le lieu et la durée sont précisés (art. L131-3 CPI).', how: 'Utilise le modèle de contrat : la cession prend effet au paiement complet.', link: '#/modeles/contrat' },
      { id: 'retractation', tag: 'b2c', title: 'Particulier : informer du droit de rétractation de 14 jours', why: 'Contrat conclu à distance : le client peut se rétracter pendant 14 jours. Sans information, ce délai est prolongé de 12 mois.', how: 'Joins le formulaire de rétractation au devis. Si le client veut que tu commences tout de suite, fais-le demander par écrit.', link: '#/modeles/retractation' },
      { id: 'acompte', tag: 'recommandé', title: 'Encaisser un acompte avant de commencer', why: 'Il réduit ton risque d’impayé. Tout acompte reçu donne lieu à une facture d’acompte.', how: 'Après signature du devis, crée une facture d’acompte depuis le devis.', link: '#/documents' },
      { id: 'dpa', tag: 'obligatoire', title: 'Signer un contrat de sous-traitance RGPD si tu accèdes aux données', why: 'Dès que tu héberges, maintiens ou manipules les données des utilisateurs, tu es sous-traitant au sens de l’art. 28 RGPD : un contrat écrit est obligatoire.', how: 'Utilise le modèle et annexe-le au contrat de prestation.', source: SRC.rgpd, link: '#/modeles/dpa' },
      { id: 'comptes-cliente', tag: 'recommandé', title: 'Ouvrir les comptes techniques au nom de la cliente', why: 'Apple Developer, Google Play, nom de domaine, hébergement et base de données lui appartiennent : tu évites d’avancer des frais et de rester responsable de ses services.', how: 'Elle crée les comptes et t’invite comme membre ou développeur.' },
      { id: 'planning', tag: 'recommandé', title: 'Vérifier que le délai est tenable', why: 'Le simulateur convertit les jours en semaines réelles selon ton temps disponible. Un délai irréaliste est la première source de conflit.', how: 'Indique ton temps disponible par semaine dans Paramètres et annonce la date calculée.', link: '#/simulateur' },
    ],
  },
  {
    id: 'projet', title: 'Pendant le projet', intro: 'Obligations du réseau social : tu les intègres techniquement et tu les signales à ta cliente, responsable légale de la plateforme.',
    items: [
      { id: 'privacy', tag: 'cliente', title: 'Protection des données dès la conception', why: 'Collecter le minimum, pour des finalités claires, avec des durées de conservation définies (art. 25 RGPD).', how: 'Documente chaque donnée collectée et pourquoi. Le guide CNIL du développeur est la référence.', source: SRC.cnilDev },
      { id: 'aipd', tag: 'cliente', title: 'Analyse d’impact (AIPD) probablement nécessaire', why: 'Un réseau social traite des données à grande échelle et souvent du profilage : la CNIL attend une analyse d’impact avant la mise en ligne.', how: 'La cliente la porte ; tu lui fournis la description technique (données, flux, sécurité, hébergement).', source: SRC.rgpd },
      { id: 'hebergement', tag: 'cliente', title: 'Héberger les données dans l’Union européenne', why: 'Les transferts hors UE doivent être encadrés (chapitre V RGPD). Un hébergement UE simplifie tout.', how: 'Choisis une région UE pour l’API, la base et le stockage des médias.' },
      { id: 'securite', tag: 'cliente', title: 'Sécurité adaptée au risque', why: 'Obligation de sécurité (art. 32 RGPD), et exigence « Zero-Trust » du projet.', how: 'Mots de passe hachés (Argon2 ou bcrypt), HTTPS partout, 2FA, jetons courts, limitation de débit, journal d’audit, principe du moindre privilège.', source: SRC.cnilDev },
      { id: 'age', tag: 'cliente', title: 'Âge minimum et consentement parental', why: 'En France, un mineur ne peut consentir seul au traitement de ses données qu’à partir de 15 ans ; en dessous, l’accord d’un parent est nécessaire.', how: 'Prévois un contrôle d’âge à l’inscription. Fais vérifier par la cliente l’état d’application de la loi de 2023 sur la majorité numérique.' },
      { id: 'cookies', tag: 'cliente', title: 'Consentement aux cookies et traceurs', why: 'Aucun traceur non essentiel avant consentement ; refuser doit être aussi simple qu’accepter.', how: 'Préfère une mesure d’audience exemptée de consentement et évite les SDK publicitaires.', source: SRC.cnilCookies },
      { id: 'droits', tag: 'cliente', title: 'Export des données et suppression du compte', why: 'Droits d’accès, de portabilité et d’effacement (art. 15 à 20 RGPD). Apple impose aussi la suppression du compte depuis l’app.', how: 'Prévois « Télécharger mes données » et « Supprimer mon compte » dans les réglages de l’app.', source: SRC.rgpd },
      { id: 'signalement', tag: 'cliente', title: 'Signalement des contenus illicites', why: 'Tout hébergeur doit permettre de signaler un contenu illicite et traiter les signalements (art. 16 DSA, LCEN).', how: 'Bouton « Signaler » sur chaque publication, commentaire et profil, avec accusé de réception.', source: SRC.dsa },
      { id: 'moderation', tag: 'cliente', title: 'Décisions de modération motivées', why: 'Chaque retrait ou restriction doit être expliqué à l’utilisateur (art. 17 DSA). Les micro et petites entreprises ont des obligations allégées (art. 19).', how: 'Back-office de modération avec motif, date et historique de chaque décision.', source: SRC.dsa },
      { id: 'contact', tag: 'cliente', title: 'Points de contact et CGU', why: 'Un point de contact unique pour les autorités et les utilisateurs (art. 11-12 DSA), et des CGU qui expliquent les règles de modération (art. 14).', how: 'Page Contact et CGU accessibles depuis l’app ; la rédaction juridique revient à la cliente.', source: SRC.dsa },
      { id: 'mentions-app', tag: 'cliente', title: 'Mentions légales de la plateforme', why: 'Éditeur, directeur de la publication et hébergeur doivent être identifiés (LCEN).', how: 'Écran « Mentions légales » dans l’app et sur le site.' },
      { id: 'logs', tag: 'cliente', title: 'Conserver les données de connexion', why: 'Les hébergeurs conservent les données d’identification et de connexion pour les réquisitions judiciaires (décret n° 2021-1362).', how: 'Journalise IP, date et identifiant de connexion, conserve-les 1 an, accès restreint.' },
      { id: 'stores', tag: 'cliente', title: 'Règles des stores pour les contenus des utilisateurs', why: 'Apple et Google refusent les apps sociales sans filtrage, signalement, blocage d’utilisateurs et contact.', how: 'Intègre ces 4 fonctions avant la première soumission.', source: SRC.apple },
      { id: 'licences', tag: 'obligatoire', title: 'Vérifier les licences du code et des ressources', why: 'Une librairie GPL, une police ou une image sans licence peuvent bloquer la cession de droits à la cliente.', how: 'Liste les dépendances et leurs licences (MIT, Apache : OK) dans la documentation de livraison.' },
      { id: 'avenants', tag: 'recommandé', title: 'Chaque demande hors périmètre = un devis complémentaire', why: 'Sans trace écrite, le travail en plus n’est pas payé et les délais dérapent.', how: 'Réponds par email avec le chiffrage avant de coder, puis fais un nouveau devis.', link: '#/simulateur' },
    ],
  },
  {
    id: 'livraison', title: 'À la livraison', intro: 'Clôturer proprement pour être payé.',
    items: [
      { id: 'pv', tag: 'recommandé', title: 'Faire signer un procès-verbal de recette', why: 'Il prouve la livraison conforme, déclenche la facture de solde et le début de la garantie.', how: 'Génère le PV, liste les réserves éventuelles et fais-le signer.', link: '#/modeles/pv' },
      { id: 'solde', tag: 'obligatoire', title: 'Émettre la facture de solde', why: 'Elle reprend le total du devis et déduit les acomptes déjà facturés.', how: 'Depuis le devis accepté : « Facture de solde ».', link: '#/documents' },
      { id: 'remise', tag: 'recommandé', title: 'Remettre code, accès et documentation', why: 'La cliente doit pouvoir faire maintenir son app par quelqu’un d’autre.', how: 'Transfère les dépôts Git sur son compte, documente l’installation et le déploiement.' },
      { id: 'cession', tag: 'recommandé', title: 'Cession des droits effective au paiement complet', why: 'Tant que le solde n’est pas payé, la cession n’a pas lieu : c’est ton levier en cas d’impayé.', how: 'Vérifie la clause du contrat avant de transférer les dépôts.', link: '#/modeles/contrat' },
      { id: 'garantie', tag: 'recommandé', title: 'Fixer la période de corrections et proposer la maintenance', why: 'Sépare la correction de bugs (incluse, durée limitée) des évolutions et de la maintenance (payantes).', how: 'Propose un devis de maintenance mensuelle distinct.', link: '#/simulateur' },
      { id: 'portfolio', tag: 'recommandé', title: 'Obtenir l’accord pour citer le projet', why: 'Tu ne peux pas montrer le projet d’un client sans son autorisation.', how: 'Clause « référence commerciale » dans le contrat, ou accord écrit par email.' },
    ],
  },
  {
    id: 'paiement', title: 'Paiement', intro: 'Jusqu’au dernier euro encaissé.',
    items: [
      { id: 'encaisser', tag: 'obligatoire', title: 'Enregistrer chaque paiement à sa réception', why: 'Ton CA à déclarer à l’URSSAF est celui ENCAISSÉ, pas facturé.', how: 'Ouvre la facture et « Enregistrer un paiement » : le livre des recettes et la déclaration du mois se mettent à jour.', link: '#/documents' },
      { id: 'relance', tag: 'recommandé', title: 'Relancer dès l’échéance', why: 'Entre professionnels, les pénalités et l’indemnité de 40 € sont dues dès le lendemain de l’échéance, sans rappel.', how: 'Le dashboard signale les retards et calcule les pénalités ; utilise le modèle de relance.', source: SRC.retard, link: '#/modeles/relance' },
      { id: 'demeure', tag: 'recommandé', title: 'Mise en demeure si l’impayé persiste', why: 'Étape préalable à l’injonction de payer devant le tribunal.', how: 'Envoie-la en recommandé avec accusé de réception.', link: '#/modeles/mise-en-demeure' },
      { id: 'archive', tag: 'obligatoire', title: 'Archiver le dossier 10 ans', why: 'Devis, contrat, factures, PV et échanges importants te protègent en cas de litige ou de contrôle.', how: 'Range les PDF dans un dossier par client et garde la sauvegarde JSON du dashboard.', link: '#/parametres' },
    ],
  },
  {
    id: 'recurrent', title: 'Chaque mois, chaque année', intro: 'Tes rendez-vous fixes.',
    items: [
      { id: 'decl-mensuelle', tag: 'obligatoire', title: 'Déclarer ton CA à l’URSSAF chaque mois, même à 0 €', why: 'Déclaration mensuelle au plus tard le dernier jour du mois suivant. Un oubli entraîne une pénalité.', how: 'L’onglet Finances calcule le montant encaissé du mois et les cotisations estimées.', source: SRC.urssaf, link: '#/finances' },
      { id: 'plafonds', tag: 'obligatoire', title: 'Surveiller tes plafonds', why: 'Micro : 83 600 € de CA services par an. TVA : au-delà de 41 250 €, tu factures la TVA dès le jour du dépassement.', how: 'Jauges en temps réel dans Finances, avec alerte à 80 %.', source: SRC.tva, link: '#/finances' },
      { id: 'ir', tag: 'obligatoire', title: 'Déclarer ton CA dans ta déclaration de revenus', why: 'Au printemps, sur la déclaration 2042-C-PRO, avec l’abattement forfaitaire de 34 % (BNC).', how: 'Le total annuel est dans Finances et dans le livre des recettes.', source: SRC.impots, link: '#/finances' },
      { id: 'cfe', tag: 'obligatoire', title: 'Payer la CFE avant le 15 décembre', why: 'À partir de ta 2e année d’activité. L’avis est disponible en ligne en novembre.', how: 'Espace professionnel impots.gouv.fr.', source: SRC.cfe },
      { id: 'sauvegarde', tag: 'recommandé', title: 'Exporter une sauvegarde du dashboard chaque mois', why: 'Une copie hors ligne de toutes tes données, en plus de Supabase.', how: 'Paramètres > Sauvegarde > Exporter.', link: '#/parametres' },
      { id: 'maj-legales', tag: 'recommandé', title: 'Revoir les chiffres légaux chaque 1er janvier', why: 'Taux, seuils et mentions changent souvent.', how: 'Mets à jour js/data/legal.js (sources indiquées dans le fichier).' },
    ],
  },
  {
    id: '2027', title: 'Préparer 2027', intro: 'Facturation électronique et nouvelles mentions.',
    items: [
      { id: 'reception-efacture', tag: 'obligatoire', title: 'Pouvoir recevoir des factures électroniques', why: 'Depuis le 1er septembre 2026, toutes les entreprises doivent pouvoir recevoir des factures électroniques, via une plateforme agréée.', how: 'Choisis une plateforme agréée (plusieurs offres gratuites pour les micro-entreprises) et rattache ton SIREN.', source: SRC.einvoice },
      { id: 'cibs', tag: 'obligatoire', title: 'Nouvelle mention TVA au 1er janvier 2027', why: '« TVA non applicable, art. L.233-3 du CIBS » remplace la référence à l’article 293 B. L’ancienne reste tolérée jusqu’au 30 juin 2028.', how: 'Automatique : le dashboard choisit la mention selon la date de la facture.', source: SRC.cibs },
      { id: 'emission-efacture', tag: 'obligatoire', title: 'Émettre tes factures B2B en électronique au 1er septembre 2027', why: 'Un PDF ne suffira plus entre professionnels : la facture devra passer par une plateforme agréée. Les ventes aux particuliers feront l’objet d’un e-reporting.', how: 'Au printemps 2027, choisis ta plateforme pour l’émission ; tu pourras y reprendre tes clients et ta numérotation.', source: SRC.einvoice },
      { id: 'mentions-2027', tag: 'obligatoire', title: 'Nouvelles mentions : SIREN client et nature des opérations', why: 'Obligatoires pour les micro-entreprises en septembre 2027.', how: 'Déjà gérées : renseigne le SIREN de tes clients pros.', source: SRC.facture, link: '#/clients' },
    ],
  },
];

export const TAGS = {
  'obligatoire': { label: 'Obligatoire', tone: 'danger' },
  'recommandé': { label: 'Recommandé', tone: 'info' },
  'b2c': { label: 'Si client particulier', tone: 'warn' },
  'b2b': { label: 'Si client pro', tone: 'warn' },
  'cliente': { label: 'Obligation de ta cliente', tone: '' },
};

export const ALL_ITEMS = PHASES.flatMap((p) => p.items.map((it) => ({ ...it, phase: p.id })));
