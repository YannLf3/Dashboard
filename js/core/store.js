/* ---------------------------------------------------------
   Store : cache mémoire de toutes les données + règles métier.
   Au démarrage on charge tout (quelques centaines de lignes au
   plus pour un freelance) ; ensuite les écrans lisent le cache
   de façon synchrone, et chaque écriture part en base.
   Les RÈGLES (facture émise = figée, numérotation) sont vérifiées
   ici ET dans Postgres (trigger) : défense en profondeur.
   --------------------------------------------------------- */
import { db } from './db.js';
import { uid, todayISO } from './format.js';

export const COLLECTIONS = ['settings', 'clients', 'projects', 'documents', 'payments', 'checklist', 'time', 'simulations', 'declarations', 'drafts'];

export const DEFAULT_SETTINGS = {
  id: 'main',
  identity: {
    firstName: 'Yann', lastName: 'Le Flohic', tradeName: 'Yannlf3',
    address: '', zip: '', city: '', email: '', phone: '', website: 'https://pro.yannleflohic.fr',
    siret: '', ape: '', iban: '', bic: '', bankName: '',
  },
  regime: {
    activity: 'bnc',          // 'bnc' | 'bic_services' | 'cipav'
    vatFranchise: true,
    vatRate: 20,
    versementLiberatoire: false,
    acre: true,
    creationDate: '',
    acreEndDate: '',
    socialRateOverride: '',   // vide = taux officiel 2026 de l'activité
    cfpRateOverride: '',
    declarationFrequency: 'mensuelle',
  },
  invoicing: {
    lastInvoiceSeq: 1,        // dernière facture émise HORS dashboard (0001_010926)
    lastInvoiceDate: '2026-09-01',
    paymentTermsDays: 30,
    depositPercent: 30,
    quoteValidityDays: 30,
    latePenaltyRate: 12.15,   // % annuel utilisé pour le CALCUL (BCE + 10 pts, à vérifier)
    extraMention: '',
  },
  mediator: { name: '', website: '', address: '' },
  pricing: { tjm: 250, hoursPerDay: 7, hoursPerWeek: 7.5, contingencyPct: 20, pmPct: 10 },
  goals: { yearlyRevenue: '' },
};

const state = Object.fromEntries(COLLECTIONS.map((c) => [c, []]));
const listeners = new Set();

export const store = {
  /* Lecture */
  list: (col) => state[col],
  get: (col, id) => state[col].find((r) => r.id === id),
  get settings() { return mergeDeep(structuredClone(DEFAULT_SETTINGS), state.settings[0] || {}); },

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  emit() { listeners.forEach((fn) => fn()); },

  async load() {
    const all = await db.loadAll();
    COLLECTIONS.forEach((c) => { state[c] = all[c] || []; });
  },

  /* Écriture générique (création ou mise à jour) */
  async save(col, record) {
    const now = new Date().toISOString();
    const prev = record.id ? store.get(col, record.id) : null;
    const next = { ...record, id: record.id || uid(), updatedAt: now, createdAt: record.createdAt || prev?.createdAt || now };
    if (col === 'documents') assertDocumentChange(prev, next);
    await db.put(col, next);
    const i = state[col].findIndex((r) => r.id === next.id);
    if (i >= 0) state[col][i] = next; else state[col].push(next);
    store.emit();
    return next;
  },

  async remove(col, id) {
    const prev = store.get(col, id);
    if (col === 'documents' && prev && isLocked(prev)) throw new Error('Un document émis ne peut pas être supprimé. Pour annuler une facture, émets un avoir.');
    await db.remove(col, id);
    state[col] = state[col].filter((r) => r.id !== id);
    store.emit();
  },

  async saveSettings(patch) {
    const merged = mergeDeep(store.settings, patch);
    return store.save('settings', { ...merged, id: 'main' });
  },

  /* Export / import complet (sauvegarde JSON) */
  exportAll() {
    return { app: 'cockpit-yannlf3', version: 1, exportedAt: new Date().toISOString(), data: structuredClone(state) };
  },
  async importAll(payload, { onProgress } = {}) {
    if (payload?.app !== 'cockpit-yannlf3') throw new Error('Ce fichier ne vient pas de ce dashboard.');
    let done = 0;
    const total = COLLECTIONS.reduce((n, c) => n + (payload.data[c]?.length || 0), 0);
    for (const c of COLLECTIONS) {
      for (const r of payload.data[c] || []) {
        await db.put(c, r); // import brut : on conserve les documents tels quels
        done++; onProgress?.(done, total);
      }
    }
    await store.load();
    store.emit();
  },
};

/* ---------- Règles des documents ---------- */
// Une facture ou un avoir est FIGÉ dès son émission : une facture émise ne se
// modifie pas et ne se supprime pas, elle se corrige par un avoir (BOFiP TVA).
// Un devis est figé dès qu'il est envoyé : le client a reçu CETTE version.
// Pour changer un devis envoyé, on le duplique en nouvelle version.
export function isLocked(doc) {
  return Boolean(doc && doc.status && doc.status !== 'brouillon');
}
// Champs de suivi qui peuvent encore évoluer après émission
const MUTABLE_AFTER_LOCK = ['status', 'sentAt', 'internalNote', 'updatedAt', 'signedAt', 'reminders'];

function assertDocumentChange(prev, next) {
  if (!prev || !isLocked(prev)) return;
  const strip = (d) => JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) => !MUTABLE_AFTER_LOCK.includes(k)).sort()));
  if (strip(prev) !== strip(next)) throw new Error('Ce document est émis : son contenu est figé. Crée un avoir (facture) ou un nouveau devis.');
  if (next.status === 'brouillon') throw new Error('Un document émis ne peut pas redevenir un brouillon.');
}

function mergeDeep(target, src) {
  for (const [k, v] of Object.entries(src || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) target[k] = mergeDeep(target[k] && typeof target[k] === 'object' ? target[k] : {}, v);
    else target[k] = v;
  }
  return target;
}

/* ---------- Requêtes utiles partagées ---------- */
export const byDateDesc = (field) => (a, b) => String(b[field] || '').localeCompare(String(a[field] || ''));
export const clientName = (id) => store.get('clients', id)?.name || 'Client supprimé';
export const yearOf = (iso) => Number(String(iso || todayISO()).slice(0, 4));
