/* ---------------------------------------------------------
   Formats français (montants, dates) + calculs de dates.
   Les dates sont stockées en texte ISO "AAAA-MM-JJ" : c'est
   triable, sans fuseau horaire, et lisible dans la base.
   --------------------------------------------------------- */

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const eur0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

export const money = (n) => eur.format(round2(n));
export const money0 = (n) => eur0.format(Math.round(Number(n) || 0));
export const number = (n) => num.format(Number(n) || 0);
export const pct = (r, digits = 1) => `${num.format(Math.round((Number(r) || 0) * 100 * 10 ** digits) / 10 ** digits)} %`;

/* Arrondi au centime : on travaille en euros mais on arrondit
   systématiquement pour éviter 0.1 + 0.2 = 0.30000000000000004 */
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const todayISO = () => toISO(new Date());
export function toISO(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function parseISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(iso, n) { const d = parseISO(iso); d.setDate(d.getDate() + Number(n || 0)); return toISO(d); }
export function endOfMonth(y, m /* 1-12 */) { return toISO(new Date(y, m, 0)); }
export function daysBetween(aISO, bISO) { return Math.round((parseISO(bISO) - parseISO(aISO)) / 86400000); }

export function date(iso, opts) {
  if (!iso) return '—';
  return parseISO(iso).toLocaleDateString('fr-FR', opts || { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export const dateLong = (iso) => date(iso, { day: 'numeric', month: 'long', year: 'numeric' });
export const monthName = (m /* 1-12 */) => new Date(2026, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short' });
export const monthLong = (m /* 1-12 */) => new Date(2026, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long' });
/* « de mars », mais « d’avril », « d’août », « d’octobre » */
export const deMonth = (m) => { const n = monthLong(m); return /^[aeiouy]/i.test(n) ? `d’${n}` : `de ${n}`; };

/* "010926" pour le 01/09/2026 : format de ta numérotation */
export function ddmmyy(iso) { const [y, m, d] = iso.split('-'); return `${d}${m}${y.slice(2)}`; }

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

/* Version sans caractères spéciaux pour les PDF (les polices
   standard de jsPDF ne connaissent pas l'espace fine insécable
   utilisée par Intl en français). */
export function pdfSafe(s) {
  return String(s ?? '')
    .replace(/[    ]/g, ' ')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/−/g, '-')
    .replace(/[≤]/g, '<=').replace(/[≥]/g, '>=')
    .replace(/[^\x00-\xFF€…–—•ŒœŸ]/g, '');
}
export const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
