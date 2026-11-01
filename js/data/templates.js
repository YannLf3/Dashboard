/* ---------------------------------------------------------
   M5 — Modèles de documents juridiques et commerciaux.
   Chaque modèle est une fonction qui reçoit le contexte
   (tes paramètres, le client, le document choisi) et renvoie
   un texte. Les [crochets] sont à compléter à la main.
   Modèles indicatifs : à relire, et à faire valider par un
   juriste pour les contrats à fort enjeu.
   --------------------------------------------------------- */
import { date, money, dateLong, todayISO } from '../core/format.js';
import { LEGAL } from './legal.js';

const who = (s) => `${s.identity.firstName} ${s.identity.lastName}, entrepreneur individuel (EI)${s.identity.tradeName ? `, exerçant sous le nom commercial « ${s.identity.tradeName} »` : ''}, domicilié ${s.identity.address || '[adresse]'}, ${s.identity.zip || '[CP]'} ${s.identity.city || '[ville]'}, SIRET ${s.identity.siret || '[SIRET]'}, email ${s.identity.email || '[email]'}`;
const clientWho = (c) => !c ? '[Nom du client], [adresse], [SIREN si professionnel]'
  : c.type === 'b2b' ? `${c.name}, ${c.address || '[adresse]'}, ${c.zip || ''} ${c.city || '[ville]'}, SIREN ${c.siren || '[SIREN]'}${c.contactName ? `, représentée par ${c.contactName}` : ', représentée par [nom et qualité du représentant]'}`
  : `${c.name}, demeurant ${c.address || '[adresse]'}, ${c.zip || ''} ${c.city || '[ville]'}`;
const vatLine = (s) => (s.regime.vatFranchise ? `Le Prestataire bénéficie de la franchise en base de TVA : les prix sont indiqués nets, ${todayISO() >= LEGAL.cibsSwitch ? 'TVA non applicable, art. L.233-3 du CIBS' : 'TVA non applicable, art. 293 B du CGI'}.` : `Les prix sont indiqués hors taxes ; la TVA au taux en vigueur (${s.regime.vatRate} %) s’y ajoute.`);
const mediator = (s) => (s.mediator.name ? `${s.mediator.name}${s.mediator.website ? `, ${s.mediator.website}` : ''}${s.mediator.address ? `, ${s.mediator.address}` : ''}` : '[nom, site internet et adresse du médiateur de la consommation]');

export const TEMPLATES = [
  {
    id: 'cgv', title: 'Conditions générales de vente', desc: 'Règles de paiement, retards, propriété intellectuelle, garantie. À joindre à chaque devis.', needs: ['version'],
    build: ({ s, version }) => {
      const b2b = version !== 'b2c', b2c = version !== 'b2b';
      let n = 0; const art = (t) => `\nARTICLE ${++n} — ${t}\n`;
      return `CONDITIONS GÉNÉRALES DE VENTE DE PRESTATIONS DE SERVICES
${b2b && b2c ? 'Applicables aux clients professionnels et particuliers' : b2b ? 'Applicables aux clients professionnels' : 'Applicables aux clients particuliers (consommateurs)'}
Version du ${dateLong(todayISO())}

Prestataire : ${who(s)}.
${art('Objet et champ d’application')}Les présentes conditions générales de vente (CGV) s’appliquent à toutes les prestations de conception, de développement, de maintenance et de conseil (sites web, applications web et mobiles) réalisées par le Prestataire. Elles sont communiquées avec chaque devis et prévalent sur tout autre document du client, sauf accord écrit contraire. Toute commande implique leur acceptation.
${art('Devis et commande')}Chaque prestation fait l’objet d’un devis détaillé, gratuit, valable pendant la durée qui y est indiquée. La commande est ferme à réception du devis daté et signé, portant la mention « Bon pour accord » et l’acceptation des présentes CGV, accompagné de l’acompte prévu. Le périmètre de la prestation est strictement celui décrit au devis.
${art('Prix')}Les prix sont ceux du devis accepté, calculés au forfait ou au temps passé (taux journalier). ${vatLine(s)} Les frais de services tiers (hébergement, nom de domaine, comptes développeur Apple et Google, licences, API payantes) ne sont pas inclus et restent à la charge du client, qui ouvre ces comptes à son nom.
${art('Modalités de paiement')}Un acompte de ${s.invoicing.depositPercent} % du montant du devis est exigé à la commande ; il donne lieu à une facture d’acompte. Le solde, et le cas échéant les échéances intermédiaires prévues au devis, sont facturés selon l’avancement. Les factures sont payables par virement bancaire dans un délai de ${s.invoicing.paymentTermsDays} jours à compter de leur date d’émission. Aucun escompte n’est accordé pour paiement anticipé.
${art('Retard de paiement')}${b2b ? `Clients professionnels : tout retard de paiement entraîne de plein droit, dès le lendemain de la date d’échéance et sans rappel préalable, des pénalités calculées au taux d’intérêt appliqué par la Banque centrale européenne à son opération de refinancement la plus récente, majoré de 10 points, ainsi qu’une indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 et D441-5 du Code de commerce). Une indemnité complémentaire peut être demandée sur justificatifs si les frais engagés sont supérieurs.\n` : ''}${b2c ? `Clients particuliers : en cas de retard de paiement, et après mise en demeure restée sans effet, les sommes dues portent intérêt au taux légal.\n` : ''}En cas de retard de paiement, le Prestataire peut suspendre l’exécution de ses prestations jusqu’au règlement complet, après en avoir informé le client par écrit.
${art('Obligations du client')}Le client fournit dans les délais convenus les contenus (textes, images, logos), informations, accès et validations nécessaires. Il garantit détenir les droits sur les contenus qu’il transmet. Il désigne un interlocuteur unique. Chaque étape soumise à validation (maquettes, versions de test) est réputée acceptée en l’absence de réponse sous 10 jours ouvrés. Les retards imputables au client décalent d’autant le planning.
${art('Modification du périmètre')}Toute demande ne figurant pas au devis (nouvelle fonctionnalité, modification d’une fonctionnalité validée) fait l’objet d’un devis complémentaire, qui doit être accepté avant sa réalisation.
${art('Livraison et recette')}À la livraison, le client dispose de 15 jours pour procéder à la recette et signaler par écrit les anomalies constatées par rapport au périmètre du devis. La recette est constatée par un procès-verbal. À défaut de réserves écrites dans ce délai ou en cas de mise en production par le client, la prestation est réputée acceptée sans réserve.
${art('Propriété intellectuelle')}Les développements spécifiques réalisés pour le client (code source, maquettes) sont des œuvres dont le Prestataire est l’auteur. Les droits patrimoniaux d’auteur sur ces développements (reproduction, représentation, adaptation, modification, traduction et commercialisation), pour le monde entier, pour toute la durée légale de protection et pour l’exploitation du projet décrit au devis, sont cédés au client à compter du paiement intégral du prix. Jusqu’au paiement intégral, le client bénéficie d’un simple droit d’usage pour les besoins de la recette. Restent exclus de la cession : les composants open source, régis par leur propre licence, et les outils, bibliothèques et savoir-faire génériques préexistants du Prestataire, sur lesquels le client reçoit une licence non exclusive, gratuite et perpétuelle, limitée à l’exploitation du projet.
${art('Garantie')}Le Prestataire corrige gratuitement les anomalies reproductibles signalées par écrit dans les 30 jours suivant la recette et relevant de ses développements. Sont exclues : les évolutions, les anomalies causées par une intervention du client ou d’un tiers, par une mise à jour des systèmes, navigateurs, stores ou services tiers, ou par un usage non conforme. La maintenance au-delà de cette période fait l’objet d’un devis distinct.
${art('Responsabilité')}Le Prestataire est tenu d’une obligation de moyens. ${b2b ? 'Envers les clients professionnels, sa responsabilité est limitée aux dommages directs et plafonnée au montant hors taxes effectivement payé au titre de la prestation concernée ; elle ne couvre pas les pertes d’exploitation, de chiffre d’affaires, de données ou d’image. ' : ''}Il n’est pas responsable des interruptions ou défaillances des services tiers (hébergeurs, stores, prestataires de paiement ou d’email), ni des contenus publiés par le client ou par les utilisateurs de la plateforme. Le client reste seul responsable de l’exploitation de son service et de ses obligations légales d’éditeur et d’hébergeur (mentions légales, CGU, modération, protection des données).
${art('Données personnelles')}Lorsque le Prestataire traite des données personnelles pour le compte du client (hébergement, maintenance, accès à la base de données), les parties signent un accord de sous-traitance conforme à l’article 28 du RGPD. Les données des clients du Prestataire sont traitées pour la gestion de la relation commerciale et conservées pendant la durée légale.
${art('Référence commerciale')}Sauf refus écrit du client, le Prestataire peut mentionner le nom du client et présenter visuellement la réalisation à titre de référence (portfolio, réseaux professionnels), sans divulguer d’informations confidentielles.
${b2c ? `${art('Droit de rétractation (clients particuliers)')}Lorsque le contrat est conclu à distance ou hors établissement, le client particulier dispose d’un délai de 14 jours à compter de sa conclusion pour se rétracter, sans avoir à motiver sa décision, en adressant au Prestataire le formulaire de rétractation joint ou toute déclaration dénuée d’ambiguïté. Le Prestataire rembourse les sommes versées au plus tard 14 jours après réception de la rétractation. Si le client demande expressément que la prestation commence avant la fin du délai de rétractation, il reste redevable du montant correspondant au service fourni jusqu’à sa rétractation. Ce droit bénéficie également aux professionnels employant cinq salariés au plus, pour un contrat conclu hors établissement n’entrant pas dans le champ de leur activité principale (art. L221-3 du Code de la consommation).
${art('Médiation de la consommation')}En cas de litige, le client particulier adresse d’abord une réclamation écrite au Prestataire. À défaut de solution dans un délai de deux mois, il peut recourir gratuitement au médiateur de la consommation : ${mediator(s)}.
` : ''}${art('Force majeure')}Aucune partie n’est responsable d’un manquement causé par un cas de force majeure au sens de l’article 1218 du Code civil. L’exécution est suspendue pendant la durée de l’empêchement.
${art('Droit applicable et litiges')}Les présentes CGV sont soumises au droit français. ${b2b ? `Pour les clients professionnels, tout litige non résolu à l’amiable relève des tribunaux du ressort du domicile du Prestataire. ` : ''}${b2c ? 'Pour les clients particuliers, le tribunal compétent est déterminé selon les règles légales.' : ''}`;
    },
  },
  {
    id: 'contrat', title: 'Contrat de prestation et cession de droits', desc: 'Contrat principal du projet, avec cession des droits d’auteur au paiement complet.', needs: ['client', 'devis'],
    build: ({ s, client, doc }) => `CONTRAT DE PRESTATION DE SERVICES ET DE CESSION DE DROITS D’AUTEUR

ENTRE LES SOUSSIGNÉS
${who(s)}, ci-après « le Prestataire »,
ET
${clientWho(client)}, ci-après « le Client ».

ARTICLE 1 — OBJET
Le Client confie au Prestataire ${doc?.title ? `la réalisation suivante : ${doc.title}` : 'la conception et le développement de [description du projet]'}, dans le périmètre décrit au devis n° ${doc?.number || '[numéro]'} du ${doc ? date(doc.issueDate) : '[date]'}.

ARTICLE 2 — DOCUMENTS CONTRACTUELS
Le contrat se compose, par ordre de priorité décroissant : le présent contrat, le devis accepté, les conditions générales de vente du Prestataire, le cahier des charges validé et, le cas échéant, l’accord de sous-traitance des données personnelles.

ARTICLE 3 — DURÉE ET PLANNING
Le contrat prend effet à sa signature et à la réception de l’acompte. Le planning indicatif est de [nombre] semaines. Il est ajusté en cas de retard de fourniture des éléments ou des validations du Client, ou de demande de modification du périmètre.

ARTICLE 4 — OBLIGATIONS DU PRESTATAIRE
Le Prestataire exécute la prestation avec soin, selon les règles de l’art, dans le cadre d’une obligation de moyens. Il informe le Client de l’avancement et l’alerte sur toute difficulté ou obligation réglementaire liée au projet dont il a connaissance (protection des données, modération des contenus, règles des stores), sans que cette information constitue un conseil juridique.

ARTICLE 5 — OBLIGATIONS DU CLIENT
Le Client fournit les contenus, accès et validations nécessaires dans les délais convenus. Il ouvre à son nom et à ses frais les comptes techniques du projet (hébergement, nom de domaine, Apple Developer, Google Play, services tiers) et y invite le Prestataire. Il demeure responsable, en qualité d’éditeur et d’hébergeur du service, de ses obligations légales (mentions légales, CGU, politique de confidentialité, modération, réponse aux réquisitions).

ARTICLE 6 — PRIX ET PAIEMENT
Le prix est de ${doc ? money(doc.__total ?? 0) : '[montant]'} ${s.regime.vatFranchise ? '(TVA non applicable)' : 'HT'}, payable selon l’échéancier suivant : ${doc?.depositPercent ? `${doc.depositPercent} % à la signature, ` : ''}[échéancier]. Les conditions de paiement et de retard sont celles des CGV.

ARTICLE 7 — RECETTE
La recette est réalisée conformément aux CGV et constatée par un procès-verbal signé par le Client.

ARTICLE 8 — CESSION DES DROITS D’AUTEUR
8.1 Sous réserve du paiement intégral du prix, le Prestataire cède au Client, à titre exclusif, les droits patrimoniaux d’auteur sur les développements spécifiques réalisés au titre du contrat (code source et code objet, maquettes, documentation), à savoir :
- le droit de reproduction, sur tout support ;
- le droit de représentation et de diffusion, par tout moyen, notamment sur internet et via les stores d’applications ;
- le droit d’adaptation, de modification, de correction, d’évolution et de traduction ;
- le droit de commercialisation et de mise à disposition aux utilisateurs.
8.2 Cette cession est consentie pour le monde entier, pour toute la durée légale de protection des droits d’auteur, pour l’exploitation du service ${doc?.title ? `« ${doc.title} »` : '[nom du service]'} et de ses évolutions (art. L131-3 du Code de la propriété intellectuelle).
8.3 Le prix de la cession est inclus dans le prix de l’article 6.
8.4 Restent exclus : les composants open source, régis par leur licence ; les outils, bibliothèques et savoir-faire génériques préexistants du Prestataire, sur lesquels le Client reçoit une licence non exclusive, gratuite et perpétuelle limitée à l’exploitation du service.
8.5 Jusqu’au paiement intégral, le Client ne dispose que d’un droit d’usage pour la recette ; le code source lui est remis à la date du paiement intégral.

ARTICLE 9 — GARANTIE ET MAINTENANCE
Le Prestataire corrige les anomalies signalées dans les 30 jours suivant la recette, dans les conditions des CGV. La maintenance ultérieure peut faire l’objet d’un contrat distinct.

ARTICLE 10 — RESPONSABILITÉ
La responsabilité du Prestataire est limitée aux dommages directs et plafonnée au montant effectivement payé au titre du contrat${client?.type === 'b2c' ? ', dans les limites autorisées par le droit de la consommation' : ''}.

ARTICLE 11 — CONFIDENTIALITÉ
Chaque partie garde confidentielles les informations non publiques reçues de l’autre, pendant le contrat et 3 ans après son terme.

ARTICLE 12 — DONNÉES PERSONNELLES
Lorsque le Prestataire accède aux données personnelles des utilisateurs du service, l’accord de sous-traitance annexé (art. 28 RGPD) s’applique.

ARTICLE 13 — RÉFÉRENCE COMMERCIALE
Le Client autorise le Prestataire à citer le projet à titre de référence, sauf opposition écrite.

ARTICLE 14 — RÉSILIATION
En cas de manquement grave d’une partie non réparé 15 jours après une mise en demeure par lettre recommandée, l’autre partie peut résilier le contrat. Les prestations réalisées jusqu’à la résiliation restent dues.

ARTICLE 15 — INDÉPENDANCE
Le Prestataire exerce en toute indépendance, sans lien de subordination avec le Client. Il organise librement son travail.

ARTICLE 16 — DROIT APPLICABLE
Le contrat est soumis au droit français. Les litiges sont réglés selon l’article « Droit applicable » des CGV.
${client?.type === 'b2c' || client?.smallBusiness ? `\nDROIT DE RÉTRACTATION : le Client dispose de 14 jours pour se rétracter (formulaire joint). [ ] Le Client demande expressément que la prestation commence avant la fin de ce délai et reconnaît devoir payer le service fourni en cas de rétractation.\n` : ''}
Fait en deux exemplaires, le [date], à [lieu].

Le Prestataire                                   Le Client
(signature)                                      (signature, précédée de « Lu et approuvé »)`,
  },
  {
    id: 'dpa', title: 'Accord de sous-traitance RGPD', desc: 'Obligatoire si tu héberges, maintiens ou accèdes aux données des utilisateurs (art. 28 RGPD).', needs: ['client'],
    build: ({ s, client }) => `ACCORD DE SOUS-TRAITANCE DE DONNÉES PERSONNELLES (ARTICLE 28 DU RGPD)

Entre ${clientWho(client)}, responsable du traitement, ci-après « le Responsable »,
et ${who(s)}, sous-traitant, ci-après « le Sous-traitant ».

1. OBJET
Le présent accord définit les conditions dans lesquelles le Sous-traitant traite des données personnelles pour le compte du Responsable dans le cadre du contrat de prestation relatif à [nom du service].

2. DESCRIPTION DU TRAITEMENT
- Nature des opérations : développement, hébergement de l’environnement de test, maintenance corrective, support technique, sauvegardes.
- Finalité : fourniture et exploitation du service [nom du service].
- Catégories de données : identification (nom, pseudonyme, email), données de connexion (adresse IP, horodatage), contenus publiés, messages, [autres].
- Personnes concernées : utilisateurs du service, [autres].
- Durée : durée du contrat de prestation.

3. OBLIGATIONS DU SOUS-TRAITANT
Le Sous-traitant s’engage à :
a) ne traiter les données que sur instruction documentée du Responsable, y compris pour les transferts hors Union européenne, et l’informer si une instruction lui paraît contraire à la réglementation ;
b) garantir la confidentialité des données et ne pas les utiliser à d’autres fins ;
c) mettre en œuvre les mesures de sécurité décrites en annexe (art. 32 RGPD) ;
d) ne recourir à un autre sous-traitant qu’avec l’autorisation écrite préalable du Responsable ; sont autorisés à ce jour : [hébergeur, région UE], [service d’email transactionnel], [stockage des médias] ;
e) aider le Responsable à répondre aux demandes d’exercice des droits des personnes ;
f) notifier au Responsable toute violation de données dans un délai maximal de 48 heures après en avoir pris connaissance, avec les informations utiles ;
g) aider le Responsable pour l’analyse d’impact et la consultation préalable de la CNIL, le cas échéant ;
h) au terme du contrat, restituer puis supprimer les données et leurs copies, sauf obligation légale de conservation ;
i) mettre à disposition les informations nécessaires pour démontrer le respect de ses obligations et permettre des audits raisonnables ;
j) tenir le registre des traitements effectués pour le compte du Responsable.

4. OBLIGATIONS DU RESPONSABLE
Le Responsable fournit les données nécessaires, documente ses instructions, informe les personnes concernées, veille au respect du RGPD (base légale, information, durées de conservation, analyse d’impact) et supervise le traitement.

5. DURÉE
Le présent accord s’applique pendant toute la durée du contrat de prestation et jusqu’à la suppression ou restitution des données.

ANNEXE — MESURES DE SÉCURITÉ
- Chiffrement des échanges (HTTPS/TLS) et des sauvegardes ;
- mots de passe hachés (Argon2 ou bcrypt), double authentification des comptes d’administration ;
- principe du moindre privilège, comptes nominatifs, journalisation des accès d’administration ;
- hébergement des données dans l’Union européenne ;
- sauvegardes régulières testées ;
- mises à jour de sécurité des dépendances ;
- environnements de test sans données réelles, ou pseudonymisées.

Fait le [date].
Le Responsable                                   Le Sous-traitant`,
  },
  {
    id: 'pv', title: 'Procès-verbal de recette', desc: 'À faire signer à la livraison : déclenche la facture de solde et la garantie.', needs: ['client', 'devis'],
    build: ({ s, client, doc }) => `PROCÈS-VERBAL DE RECETTE

Projet : ${doc?.title || '[nom du projet]'}
Devis de référence : n° ${doc?.number || '[numéro]'} du ${doc ? date(doc.issueDate) : '[date]'}
Prestataire : ${who(s)}
Client : ${clientWho(client)}
Date de livraison : [date]
Version livrée : [numéro de version, lien du dépôt ou du build]

Le Client déclare avoir testé les livrables suivants :
- [livrable 1]
- [livrable 2]

DÉCISION (cocher une case)
[ ] Recette prononcée SANS RÉSERVE.
[ ] Recette prononcée AVEC RÉSERVES. Le Prestataire corrige les points suivants sous [nombre] jours :
    1. [réserve]
    2. [réserve]
[ ] Recette REFUSÉE, pour les motifs suivants : [motifs]

La recette prononcée (avec ou sans réserves) marque le début de la période de garantie de 30 jours prévue aux CGV et rend exigible la facture de solde.

Fait le [date], en deux exemplaires.

Le Client                                        Le Prestataire
(nom, qualité, signature)                        (signature)`,
  },
  {
    id: 'relance', title: 'Relance de facture impayée', desc: 'Premier rappel courtois, à envoyer dès l’échéance dépassée.', needs: ['facture'],
    build: ({ s, client, doc }) => `Objet : Facture n° ${doc?.number || '[numéro]'} — rappel d’échéance

Bonjour${client?.contactName ? ` ${client.contactName}` : ''},

Sauf erreur de ma part, la facture n° ${doc?.number || '[numéro]'} du ${doc ? date(doc.issueDate) : '[date]'}, d’un montant de ${doc ? money(doc.__due ?? 0) : '[montant]'}, arrivée à échéance le ${doc ? date(doc.dueDate) : '[date]'}, reste à régler.

Pourriez-vous procéder au virement dans les meilleurs délais ?
IBAN : ${s.identity.iban || '[IBAN]'}${s.identity.bic ? ` — BIC : ${s.identity.bic}` : ''}
Référence à indiquer : ${doc?.number || '[numéro]'}
${client?.type === 'b2b' ? `\nJe vous rappelle que, conformément à nos conditions générales de vente et à l’article L441-10 du Code de commerce, tout retard de paiement entraîne des pénalités de retard ainsi qu’une indemnité forfaitaire de 40 € pour frais de recouvrement.\n` : ''}
Si le paiement a été effectué entre-temps, merci de ne pas tenir compte de ce message.

Bien cordialement,
${s.identity.firstName} ${s.identity.lastName}${s.identity.tradeName ? ` — ${s.identity.tradeName}` : ''}
${s.identity.phone || ''}`,
  },
  {
    id: 'mise-en-demeure', title: 'Mise en demeure de payer', desc: 'À envoyer en recommandé avec accusé de réception si la relance reste sans effet.', needs: ['facture'],
    build: ({ s, client, doc }) => `${s.identity.firstName} ${s.identity.lastName} EI${s.identity.tradeName ? ` (${s.identity.tradeName})` : ''}
${s.identity.address || '[adresse]'}
${s.identity.zip || ''} ${s.identity.city || '[ville]'}
SIRET ${s.identity.siret || '[SIRET]'}

${client?.name || '[Nom du client]'}
${client?.address || '[adresse]'}
${client?.zip || ''} ${client?.city || '[ville]'}

À ${s.identity.city || '[ville]'}, le ${dateLong(todayISO())}

LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION
Objet : Mise en demeure de payer — facture n° ${doc?.number || '[numéro]'}

Madame, Monsieur,

Malgré ma relance du [date de la relance], la facture n° ${doc?.number || '[numéro]'} du ${doc ? date(doc.issueDate) : '[date]'}, d’un montant de ${doc ? money(doc.__due ?? 0) : '[montant]'}, échue le ${doc ? date(doc.dueDate) : '[date]'}, demeure impayée.

Par la présente, je vous mets en demeure de régler cette somme sous 8 jours à compter de la réception de ce courrier${client?.type === 'b2b' ? `, majorée des pénalités de retard prévues à l’article L441-10 du Code de commerce (${doc?.__penalty ? money(doc.__penalty) : '[montant]'} à ce jour) et de l’indemnité forfaitaire pour frais de recouvrement de 40 €` : ', majorée des intérêts au taux légal à compter de la présente mise en demeure'}.

À défaut de paiement dans ce délai, je saisirai la juridiction compétente d’une requête en injonction de payer, sans autre avis.

Je vous prie d’agréer, Madame, Monsieur, mes salutations distinguées.

${s.identity.firstName} ${s.identity.lastName}`,
  },
  {
    id: 'retractation', title: 'Formulaire de rétractation', desc: 'Obligatoire pour un client particulier (contrat à distance ou hors établissement).', needs: [],
    build: ({ s }) => `INFORMATION SUR LE DROIT DE RÉTRACTATION

Vous avez le droit de vous rétracter du présent contrat sans donner de motif dans un délai de quatorze jours. Le délai de rétractation expire quatorze jours après le jour de la conclusion du contrat.

Pour exercer le droit de rétractation, vous devez nous notifier (${s.identity.firstName} ${s.identity.lastName} EI, ${s.identity.address || '[adresse]'}, ${s.identity.zip || ''} ${s.identity.city || '[ville]'}, ${s.identity.email || '[email]'}) votre décision au moyen d’une déclaration dénuée d’ambiguïté (par exemple, lettre envoyée par la poste ou courrier électronique). Vous pouvez utiliser le modèle de formulaire ci-dessous, mais ce n’est pas obligatoire.

En cas de rétractation, nous vous rembourserons tous les paiements reçus au plus tard quatorze jours à compter du jour où nous sommes informés de votre décision, par le même moyen de paiement que celui utilisé pour la transaction initiale.

Si vous avez demandé de commencer la prestation de services pendant le délai de rétractation, vous nous paierez un montant proportionnel à ce qui vous a été fourni jusqu’au moment où vous nous avez informé de votre rétractation.

MODÈLE DE FORMULAIRE DE RÉTRACTATION
(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)

À l’attention de ${s.identity.firstName} ${s.identity.lastName} EI, ${s.identity.address || '[adresse]'}, ${s.identity.zip || ''} ${s.identity.city || '[ville]'}, ${s.identity.email || '[email]'} :

Je/Nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat portant sur la prestation de services ci-dessous :

Commandé le (*) :
Nom du (des) consommateur(s) :
Adresse du (des) consommateur(s) :
Signature du (des) consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) :
Date :

(*) Rayez la mention inutile.`,
  },
  {
    id: 'mentions', title: 'Mentions légales de ton site', desc: 'Obligatoires sur pro.yannleflohic.fr et yannleflohic.fr (LCEN).', needs: [],
    build: ({ s }) => `MENTIONS LÉGALES

Éditeur du site
${s.identity.firstName} ${s.identity.lastName}, entrepreneur individuel (EI)${s.identity.tradeName ? ` — nom commercial : ${s.identity.tradeName}` : ''}
Adresse : ${s.identity.address || '[adresse]'}, ${s.identity.zip || ''} ${s.identity.city || '[ville]'}
SIRET : ${s.identity.siret || '[SIRET]'}
Email : ${s.identity.email || '[email]'} — Téléphone : ${s.identity.phone || '[téléphone]'}
${s.regime.vatFranchise ? 'TVA non applicable (franchise en base).' : 'N° de TVA intracommunautaire : [numéro]'}

Directeur de la publication
${s.identity.firstName} ${s.identity.lastName}

Hébergeur
[Raison sociale de l’hébergeur], [adresse], [téléphone].
(Pour Hostinger, reprends les coordonnées indiquées dans ses propres mentions légales.)

Propriété intellectuelle
Les contenus de ce site (textes, visuels, code) sont la propriété de l’éditeur, sauf mention contraire. Les réalisations clients sont présentées avec leur accord. Toute reproduction sans autorisation est interdite.

Données personnelles
Les données transmises via le formulaire de contact sont traitées selon la politique de confidentialité accessible sur ce site.`,
  },
  {
    id: 'confidentialite', title: 'Politique de confidentialité de ton site', desc: 'Pour ton formulaire de contact (RGPD).', needs: [],
    build: ({ s }) => `POLITIQUE DE CONFIDENTIALITÉ

Responsable du traitement
${s.identity.firstName} ${s.identity.lastName} EI, ${s.identity.address || '[adresse]'}, ${s.identity.zip || ''} ${s.identity.city || '[ville]'} — ${s.identity.email || '[email]'}.

Données collectées
Via le formulaire de contact : nom, adresse email, contenu du message, et toute information que vous choisissez de communiquer.

Finalités et bases légales
- Répondre à votre demande et, le cas échéant, établir un devis : mesures précontractuelles prises à votre demande (art. 6.1.b RGPD).
- Gérer la relation commerciale avec les clients : exécution du contrat et obligations légales (comptabilité).

Destinataires
Les données sont destinées uniquement à l’éditeur. Elles transitent par [hébergeur / service d’envoi d’emails], qui agit comme sous-traitant. Elles ne sont ni vendues ni cédées.

Durées de conservation
- Demandes de contact sans suite : 3 ans à compter du dernier échange.
- Données clients : durée de la relation commerciale, puis archivage selon les durées légales (10 ans pour les pièces comptables).

Vos droits
Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité. Écrivez à ${s.identity.email || '[email]'}. Vous pouvez aussi introduire une réclamation auprès de la CNIL (www.cnil.fr).

Cookies
Ce site ne dépose pas de cookies soumis à consentement. [À adapter si tu utilises une mesure d’audience ou des contenus tiers.]

Mise à jour : ${dateLong(todayISO())}.`,
  },
];

export const templateById = (id) => TEMPLATES.find((t) => t.id === id);
