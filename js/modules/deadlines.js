/* ---------------------------------------------------------
   Calcul des échéances (URSSAF, CFE, impôts, factures, devis…)
   à partir des données et des paramètres. Rien n'est stocké :
   tout est recalculé à chaque affichage.
   --------------------------------------------------------- */
import { store } from '../core/store.js';
import { todayISO, endOfMonth, addDays, deMonth } from '../core/format.js';
import { defaultAcreEnd, LEGAL } from '../data/legal.js';
import { revenueByMonth, docState, balance } from './shared.js';

export const declarationId = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
export const isDeclared = (y, m) => Boolean(store.get('declarations', declarationId(y, m))?.declared);

/* Mois à déclarer : de la création (ou janvier) jusqu'au mois précédent */
export function urssafMonths(year) {
  const s = store.settings;
  const today = todayISO();
  const [ty, tm] = today.split('-').map(Number);
  const start = s.regime.creationDate && s.regime.creationDate.startsWith(String(year)) ? Number(s.regime.creationDate.slice(5, 7)) : 1;
  if (s.regime.creationDate && Number(s.regime.creationDate.slice(0, 4)) > year) return [];
  const rev = revenueByMonth(year);
  const out = [];
  for (let m = start; m <= 12; m++) {
    const deadline = m === 12 ? endOfMonth(year + 1, 1) : endOfMonth(year, m + 1);
    const closed = year < ty || (year === ty && m < tm);
    out.push({ year, month: m, id: declarationId(year, m), amount: rev[m - 1], deadline, closed, current: year === ty && m === tm, declared: isDeclared(year, m) });
  }
  return out;
}

export function upcomingDeadlines({ horizonDays = 150 } = {}) {
  const s = store.settings;
  const today = todayISO();
  const limit = addDays(today, horizonDays);
  const y = Number(today.slice(0, 4));
  const list = [];
  const push = (d) => { if (d.date <= limit) list.push(d); };

  // URSSAF : mois clos non déclarés (en retard ou à venir), à partir du début d'activité
  if (s.regime.creationDate) [y - 1, y].forEach((yy) => urssafMonths(yy).filter((m) => m.closed && !m.declared).forEach((m) => {
    push({ date: m.deadline, label: `Déclarer le CA ${deMonth(m.month)} ${m.year} à l’URSSAF`, tone: m.deadline < today ? 'danger' : 'warn', href: '#/finances' });
  }));
  // Déclaration du mois en cours (à faire le mois prochain)
  const [, tm] = today.split('-').map(Number);
  push({ date: tm === 12 ? endOfMonth(y + 1, 1) : endOfMonth(y, tm + 1), label: `Déclarer le CA ${deMonth(tm)} ${y}`, tone: 'info', href: '#/finances' });

  const creationYear = Number((s.regime.creationDate || '').slice(0, 4)) || null;
  if (creationYear === y && !store.get('checklist', 'cfe-decl')?.done) push({ date: `${y}-12-31`, label: 'Déposer la déclaration initiale de CFE (1447-C-SD)', tone: 'warn', href: '#/checklist' });
  if (creationYear && creationYear < y) push({ date: `${y}-12-15`, label: 'Payer la CFE', tone: 'warn' });
  [y, y + 1].filter((yy) => `${yy}-05-20` >= today).forEach((yy) => push({ date: `${yy}-05-20`, label: `Déclaration de revenus ${yy} (2042-C-PRO) — date exacte annoncée par impots.gouv`, tone: 'info', approx: true }));
  if (s.regime.acre && s.regime.creationDate) {
    const end = s.regime.acreEndDate || defaultAcreEnd(s.regime.creationDate);
    if (end >= today) push({ date: end, label: 'Fin de l’ACRE : ton taux de cotisations remonte', tone: 'info', href: '#/parametres' });
  }
  if (today < LEGAL.cibsSwitch) push({ date: LEGAL.cibsSwitch, label: 'Nouvelle mention TVA (CIBS) — appliquée automatiquement', tone: 'info' });
  if (today < LEGAL.einvoicing.emissionMicro) push({ date: LEGAL.einvoicing.emissionMicro, label: 'Facturation électronique B2B obligatoire en émission', tone: 'warn', href: '#/checklist' });

  // Factures à échéance, devis qui expirent
  store.list('documents').forEach((d) => {
    if (d.kind === 'facture' && d.status === 'emise' && balance(d) > 0) {
      const st = docState(d);
      push({ date: d.dueDate, label: `Échéance facture ${d.number}`, tone: st.key === 'retard' ? 'danger' : 'info', href: `#/documents/${d.id}` });
    }
    if (d.kind === 'devis' && d.status === 'envoye' && d.validUntil >= today) push({ date: d.validUntil, label: `Fin de validité du devis ${d.number}`, tone: 'info', href: `#/documents/${d.id}` });
  });

  return list.sort((a, b) => a.date.localeCompare(b.date));
}
