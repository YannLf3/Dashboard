/* ---------------------------------------------------------
   Logique métier partagée : totaux, états, numérotation,
   mentions légales, encaissements.
   Aucune interface ici : uniquement des fonctions « pures »
   faciles à tester et à réutiliser dans plusieurs écrans.
   --------------------------------------------------------- */
import { store } from '../core/store.js';
import { round2, todayISO, ddmmyy, addDays, date, money } from '../core/format.js';
import { html } from '../core/dom.js';
import { LEGAL, vatMention } from '../data/legal.js';

export const KIND_LABEL = { devis: 'Devis', facture: 'Facture', avoir: 'Avoir' };
export const METHODS = { virement: 'Virement', carte: 'Carte bancaire', cheque: 'Chèque', especes: 'Espèces', autre: 'Autre' };
export const UNITS = ['jour', 'heure', 'forfait', 'unité', 'mois'];

/* ---------- Totaux ---------- */
export function lineTotal(l) { return round2((Number(l.qty) || 0) * (Number(l.unitPrice) || 0)); }
export function totals(doc, settings = store.settings) {
  const ht = round2((doc.lines || []).reduce((s, l) => s + lineTotal(l), 0));
  const vatOn = doc.seller ? !doc.seller.vatFranchise : !settings.regime.vatFranchise;
  const rate = vatOn ? Number(doc.seller?.vatRate ?? settings.regime.vatRate) / 100 : 0;
  const vat = round2(ht * rate);
  const ttc = round2(ht + vat);
  // Acomptes déjà facturés, déduits sur la facture de solde
  const deducted = round2((doc.deductions || []).reduce((s, d) => s + Number(d.amount || 0), 0));
  return { ht, vat, ttc, vatOn, rate, deducted, due: round2(ttc - deducted) };
}

/* ---------- Paiements & soldes ---------- */
export const paymentsOf = (docId) => store.list('payments').filter((p) => p.documentId === docId);
export const paidAmount = (docId) => round2(paymentsOf(docId).reduce((s, p) => s + Number(p.amount || 0), 0));
export const creditNotesOf = (factureId) => store.list('documents').filter((d) => d.kind === 'avoir' && d.relatedId === factureId && d.status === 'emise');

export function balance(facture) {
  const credited = creditNotesOf(facture.id).reduce((s, a) => s + totals(a).due, 0);
  return round2(totals(facture).due - credited - paidAmount(facture.id));
}

/* État affiché d'un document (calculé, jamais stocké) */
export function docState(doc) {
  const today = todayISO();
  if (doc.status === 'brouillon' || !doc.status) return { key: 'brouillon', label: 'Brouillon', tone: '' };
  if (doc.kind === 'devis') {
    if (doc.status === 'accepte') return { key: 'accepte', label: 'Accepté', tone: 'ok' };
    if (doc.status === 'refuse') return { key: 'refuse', label: 'Refusé', tone: 'danger' };
    if (doc.validUntil && doc.validUntil < today) return { key: 'expire', label: 'Expiré', tone: 'warn' };
    return { key: 'envoye', label: 'Envoyé', tone: 'info' };
  }
  if (doc.kind === 'avoir') return { key: 'emise', label: 'Émis', tone: 'info' };
  const due = balance(doc);
  const total = totals(doc).due;
  if (due <= 0.004) return { key: 'payee', label: creditNotesOf(doc.id).length && paidAmount(doc.id) === 0 ? 'Annulée (avoir)' : 'Payée', tone: 'ok' };
  if (doc.dueDate && doc.dueDate < today) return { key: 'retard', label: `En retard`, tone: 'danger' };
  if (due < total) return { key: 'partielle', label: 'Paiement partiel', tone: 'warn' };
  return { key: 'attente', label: 'À encaisser', tone: 'info' };
}
export const stateBadge = (doc) => { const s = docState(doc); return html`<span class="badge ${s.tone}">${s.label}</span>`; };

export const overdueInvoices = () => store.list('documents').filter((d) => d.kind === 'facture' && docState(d).key === 'retard');

/* ---------- Numérotation ----------
   Règle : numéro unique, suite chronologique CONTINUE, sans trou.
   Le numéro n'est attribué qu'à l'émission : supprimer un brouillon
   ne crée donc jamais de trou dans la série.
   Format conservé : 0002_JJMMAA (factures), AV0001_JJMMAA, D0001_JJMMAA. */
const PREFIX = { facture: '', avoir: 'AV', devis: 'D' };
export function nextNumber(kind, issueISO, settings = store.settings) {
  const used = store.list('documents').filter((d) => d.kind === kind && d.seq).map((d) => d.seq);
  const floor = kind === 'facture' ? Number(settings.invoicing.lastInvoiceSeq || 0) : 0;
  const seq = Math.max(floor, ...used, 0) + 1;
  return { seq, number: `${PREFIX[kind]}${String(seq).padStart(4, '0')}_${ddmmyy(issueISO)}` };
}
/* Dernière date d'émission de la série : une nouvelle facture ne peut pas être antérieure */
export function lastIssueDate(kind, settings = store.settings) {
  const dates = store.list('documents').filter((d) => d.kind === kind && d.seq).map((d) => d.issueDate);
  if (kind === 'facture' && settings.invoicing.lastInvoiceDate) dates.push(settings.invoicing.lastInvoiceDate);
  return dates.sort().at(-1) || '';
}

/* ---------- Vérifications avant émission ---------- */
export function emissionProblems(doc, settings = store.settings) {
  const p = [];
  const id = settings.identity;
  if (!id.firstName || !id.lastName) p.push('Ton nom et prénom (Paramètres)');
  if (!id.address || !id.zip || !id.city) p.push('Ton adresse complète (Paramètres)');
  if (!id.siret) p.push('Ton numéro SIRET (Paramètres)');
  const c = store.get('clients', doc.clientId);
  if (!c) p.push('Un client');
  else {
    if (!c.name) p.push('Le nom du client');
    if (!c.address || !c.city) p.push('L’adresse du client');
  }
  if (!(doc.lines || []).some((l) => l.label && Number(l.qty) && Number(l.unitPrice))) p.push('Au moins une ligne complète');
  if (doc.kind !== 'devis' && totals(doc).due <= 0) p.push('Un montant à payer positif');
  if (doc.kind === 'avoir' && doc.relatedId) {
    const f = store.get('documents', doc.relatedId);
    const already = creditNotesOf(doc.relatedId).filter((a) => a.id !== doc.id).reduce((s, a) => s + totals(a).due, 0);
    if (f && totals(doc).due > totals(f).due - already + 0.004) p.push('Un avoir qui ne dépasse pas le montant restant de la facture d’origine');
  }
  if (!doc.issueDate) p.push('La date d’émission');
  if (doc.kind === 'facture' && !doc.dueDate) p.push('La date d’échéance');
  if (doc.kind === 'facture' && !doc.serviceDate && !doc.servicePeriod) p.push('La date ou période de la prestation');
  if (doc.kind === 'avoir' && !doc.relatedId) p.push('La facture d’origine');
  if (doc.kind !== 'devis') {
    const last = lastIssueDate(doc.kind, settings);
    if (last && doc.issueDate < last) p.push(`Une date d’émission ≥ ${date(last)} (ordre chronologique de la série)`);
    if (doc.issueDate > todayISO()) p.push('Une date d’émission qui n’est pas dans le futur');
  }
  return p;
}
export function emissionWarnings(doc) {
  const w = [];
  const c = store.get('clients', doc.clientId);
  if (c?.type === 'b2b' && !c.siren) w.push('Le SIREN du client professionnel n’est pas renseigné (obligatoire sur les factures à partir de septembre 2027, recommandé dès maintenant).');
  if (c?.type === 'b2c' && !store.settings.mediator.name) w.push('Client particulier : tu dois adhérer à un médiateur de la consommation et l’indiquer dans tes CGV.');
  return w;
}

/* ---------- Mentions légales du document ---------- */
export function sellerSnapshot(settings = store.settings) {
  const { identity: id, regime: r } = settings;
  return {
    displayName: `${id.firstName} ${id.lastName} EI`.trim(),
    tradeName: id.tradeName, address: id.address, zip: id.zip, city: id.city,
    email: id.email, phone: id.phone, website: id.website, siret: id.siret, ape: id.ape,
    iban: id.iban, bic: id.bic, bankName: id.bankName,
    vatFranchise: r.vatFranchise, vatRate: r.vatRate,
  };
}
export function clientSnapshot(clientId) {
  const c = store.get('clients', clientId);
  return c ? { name: c.name, type: c.type, smallBusiness: Boolean(c.smallBusiness), contactName: c.contactName, siren: c.siren, vatNumber: c.vatNumber, address: c.address, zip: c.zip, city: c.city, country: c.country, email: c.email } : null;
}

export function buildMentions(doc, settings = store.settings) {
  const client = doc.client || clientSnapshot(doc.clientId) || {};
  const b2b = client.type === 'b2b';
  const m = [];
  m.push('Nature des opérations : prestations de services.');
  const vm = doc.seller ? (doc.seller.vatFranchise ? vatMention({ regime: { vatFranchise: true } }, doc.issueDate || todayISO()) : '') : vatMention(settings, doc.issueDate || todayISO());
  if (vm) m.push(vm + '.');
  if (doc.kind === 'devis') {
    m.push(`Devis gratuit, valable jusqu’au ${date(doc.validUntil)}.`);
    if (Number(doc.depositPercent)) m.push(`Un acompte de ${doc.depositPercent} % est demandé à la signature ; les travaux débutent à sa réception.`);
    if (!b2b || client.smallBusiness) m.push('Contrat conclu à distance ou hors établissement : vous disposez d’un délai de rétractation de 14 jours à compter de la signature (formulaire de rétractation joint). Si vous demandez expressément que la prestation commence avant la fin de ce délai, vous devrez payer la part déjà réalisée en cas de rétractation.');
    m.push('Les droits d’auteur sur les livrables sont cédés au client dans les conditions du contrat, après paiement intégral.');
    return m;
  }
  if (doc.kind === 'avoir') {
    const f = store.get('documents', doc.relatedId);
    m.push(`Avoir se rapportant à la facture n° ${f?.number || '—'} du ${date(f?.issueDate)}.`);
    return m;
  }
  m.push(`Date d’échéance : ${date(doc.dueDate)}.`);
  if (b2b) {
    m.push('Pas d’escompte pour paiement anticipé.');
    m.push('En cas de retard de paiement : pénalités au taux de la BCE (opération de refinancement la plus récente) majoré de 10 points, exigibles le jour suivant l’échéance, et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 et D441-5 du Code de commerce).');
  } else {
    m.push('En cas de retard de paiement, des intérêts au taux légal pourront être appliqués après mise en demeure.');
    const med = settings.mediator;
    if (med?.name) m.push(`Médiateur de la consommation : ${med.name}${med.website ? ` (${med.website})` : ''}.`);
  }
  if (settings.invoicing.extraMention) m.push(settings.invoicing.extraMention);
  return m;
}

/* ---------- Encaissements (livre des recettes) ---------- */
export function receiptsList({ year } = {}) {
  return store.list('payments')
    .map((p) => {
      const d = store.get('documents', p.documentId);
      const sign = d?.kind === 'avoir' ? -1 : 1; // un remboursement d'avoir vient en négatif
      return {
        id: p.id, date: p.date, amount: round2(sign * Number(p.amount || 0)), method: p.method,
        number: d?.number || '—', client: d?.client?.name || store.get('clients', d?.clientId)?.name || '—',
        nature: d?.title || (d?.lines || []).map((l) => l.label).filter(Boolean).join(', ') || 'Prestation de services',
        documentId: p.documentId, note: p.note,
      };
    })
    .filter((r) => !year || String(r.date).startsWith(String(year)))
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function revenueByMonth(year) {
  const months = Array(12).fill(0);
  receiptsList({ year }).forEach((r) => { months[Number(r.date.slice(5, 7)) - 1] += r.amount; });
  return months.map(round2);
}

/* ---------- Création de documents ---------- */
export function newDocument(kind, extra = {}) {
  const s = store.settings;
  const issueDate = todayISO();
  return {
    kind, status: 'brouillon', title: '', clientId: '', projectId: '',
    issueDate,
    dueDate: kind === 'facture' ? addDays(issueDate, s.invoicing.paymentTermsDays) : '',
    validUntil: kind === 'devis' ? addDays(issueDate, s.invoicing.quoteValidityDays) : '',
    serviceDate: '', servicePeriod: '',
    depositPercent: kind === 'devis' ? s.invoicing.depositPercent : '',
    isDeposit: false,
    lines: [{ label: '', detail: '', qty: 1, unit: 'jour', unitPrice: s.pricing.tjm }],
    notes: '', relatedId: '',
    ...extra,
  };
}

export const moneySigned = (doc, n) => money(doc.kind === 'avoir' ? -n : n);
export { LEGAL };
