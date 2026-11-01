/* ---------------------------------------------------------
   Accueil : jauge de conformité + chiffres clés + à faire
   --------------------------------------------------------- */
import { store } from '../core/store.js';
import { html, icon } from '../core/dom.js';
import { money0, date, todayISO, daysBetween } from '../core/format.js';
import { PHASES, TAGS, ALL_ITEMS } from '../data/checklist.js';
import { LEGAL } from '../data/legal.js';
import { phaseProgress, globalProgress, isResolved } from './checklist.js';
import { receiptsList, balance, overdueInvoices } from './shared.js';
import { upcomingDeadlines } from './deadlines.js';

export const title = 'Accueil';

/* Jauge circulaire : un arc par phase de la checklist,
   rempli selon la progression de la phase. */
function gauge() {
  const R = 88, C = 2 * Math.PI * R, GAP = 6;
  const total = ALL_ITEMS.length;
  let offset = 0;
  const arcs = PHASES.map((p) => {
    const len = (p.items.length / total) * C - GAP;
    const fill = Math.max(0, len * phaseProgress(p).ratio);
    const a = html`
      <circle class="seg-bg" cx="105" cy="105" r="${R}" stroke-width="14" stroke-dasharray="${len} ${C}" stroke-dashoffset="${-offset}"></circle>
      <circle class="seg-arc" cx="105" cy="105" r="${R}" stroke-width="14" stroke-dasharray="${fill} ${C}" stroke-dashoffset="${-offset}" stroke-linecap="butt"></circle>`;
    offset += len + GAP;
    return a;
  });
  const g = globalProgress();
  return html`<div class="gauge" role="img" aria-label="Conformité : ${Math.round(g.ratio * 100)} % des points traités">
    <svg viewBox="0 0 210 210" aria-hidden="true">${arcs}</svg>
    <div class="center"><div><b>${Math.round(g.ratio * 100)}<small style="font-size:1.1rem">%</small></b><span>conformité</span></div></div>
  </div>`;
}

export async function render(root) {
  const s = store.settings;
  const today = todayISO();
  const year = today.slice(0, 4);
  const cashed = receiptsList({ year }).reduce((a, r) => a + r.amount, 0);
  const invoices = store.list('documents').filter((d) => d.kind === 'facture' && d.status === 'emise');
  const toCash = invoices.reduce((a, d) => a + Math.max(0, balance(d)), 0);
  const late = overdueInvoices();
  const lateAmount = late.reduce((a, d) => a + balance(d), 0);
  const ceiling = LEGAL.microCeiling.services;
  const vatBase = LEGAL.vatFranchise.services.base;
  const deadlines = upcomingDeadlines({ horizonDays: 60 }).slice(0, 6);

  const missing = [];
  if (!s.identity.siret) missing.push('ton SIRET');
  if (!s.identity.address) missing.push('ton adresse');
  if (!s.regime.creationDate) missing.push('ta date de début d’activité');
  const todo = ALL_ITEMS.filter((it) => it.tag === 'obligatoire' && !isResolved(it.id)).slice(0, 4);
  const drafts = store.list('documents').filter((d) => d.status === 'brouillon');
  const hello = new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir';

  root.innerHTML = String(html`
    <header class="page-head">
      <div>
        <h1>${hello} ${s.identity.firstName}</h1>
        <p>${date(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <div class="actions">
        <a class="btn" href="#/simulateur">${icon('calc')}Simuler un projet</a>
        <a class="btn" href="#/documents/new?kind=devis">${icon('plus')}Nouveau devis</a>
        <a class="btn primary" href="#/documents/new?kind=facture">${icon('plus')}Nouvelle facture</a>
      </div>
    </header>

    ${missing.length ? html`<div class="callout warn" style="margin-bottom:20px">${icon('alert')}<p>Pour émettre des documents conformes, renseigne ${missing.join(', ')} dans <a href="#/parametres">Paramètres</a>.</p></div>` : ''}

    <div class="stack">
      <section class="panel hero">
        ${gauge()}
        <div class="stack" style="gap:14px">
          <div>
            <h2>Ta conformité légale</h2>
            <p class="muted small" style="margin:4px 0 0">Chaque arc représente une étape de la checklist.</p>
          </div>
          <div class="phase-legend">
            ${PHASES.map((p) => { const pr = phaseProgress(p); return html`<a href="#/checklist?phase=${p.id}"><span>${p.title}</span><span class="muted num">${pr.done}/${pr.total}</span><div class="meter"><i style="--v:${Math.round(pr.ratio * 100)}%"></i></div></a>`; })}
          </div>
        </div>
      </section>

      <section class="grid grid-4">
        <div class="panel kpi"><span class="l">Encaissé en ${year}</span><span class="v">${money0(cashed)}</span><span class="s">${Math.round((cashed / ceiling) * 100)} % du plafond micro</span></div>
        <div class="panel kpi"><span class="l">À encaisser</span><span class="v">${money0(toCash)}</span><span class="s">${invoices.filter((d) => balance(d) > 0).length} facture(s) ouverte(s)</span></div>
        <div class="panel kpi"><span class="l">En retard</span><span class="v" style="${late.length ? 'color:var(--danger)' : ''}">${money0(lateAmount)}</span><span class="s">${late.length} facture(s)</span></div>
        <div class="panel kpi"><span class="l">Marge avant TVA</span><span class="v">${money0(Math.max(0, vatBase - cashed))}</span><span class="s">seuil de franchise ${money0(vatBase)}</span></div>
      </section>

      <div class="grid grid-2">
        <section class="panel">
          <header><h2>Prochaines échéances</h2><a class="small" href="#/finances">Tout voir</a></header>
          ${deadlines.length ? html`<ul class="list">${deadlines.map((d) => html`
            <li><span class="date">${date(d.date)}</span><span style="flex:1">${d.href ? html`<a href="${d.href}">${d.label}</a>` : d.label}</span>
            <span class="badge ${d.tone}">${d.date < today ? 'Dépassée' : daysBetween(today, d.date) === 0 ? 'Aujourd’hui' : `J−${daysBetween(today, d.date)}`}</span></li>`)}</ul>`
          : html`<p class="empty">Rien dans les 60 prochains jours.</p>`}
        </section>
        <section class="panel">
          <header><h2>À traiter</h2><a class="small" href="#/checklist?filtre=afaire">Checklist</a></header>
          <ul class="list">
            ${late.map((d) => html`<li><span class="badge danger">Retard</span><a href="#/documents/${d.id}" style="flex:1">Relancer la facture ${d.number}</a></li>`)}
            ${drafts.slice(0, 3).map((d) => html`<li><span class="badge">Brouillon</span><a href="#/documents/${d.id}" style="flex:1">${d.title || 'Document sans titre'}</a></li>`)}
            ${todo.map((it) => html`<li><span class="badge ${TAGS[it.tag].tone}">${TAGS[it.tag].label}</span><a href="#/checklist?filtre=afaire" style="flex:1">${it.title}</a></li>`)}
            ${!late.length && !drafts.length && !todo.length ? html`<li class="muted">Tout est à jour.</li>` : ''}
          </ul>
        </section>
      </div>
    </div>`);
}

