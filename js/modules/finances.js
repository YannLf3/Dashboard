/* ---------------------------------------------------------
   M4 — Finances : plafonds, URSSAF mensuel, impôt, échéances
   --------------------------------------------------------- */
import { store } from '../core/store.js';
import { html, raw, icon, toast, downloadFile } from '../core/dom.js';
import { money, money0, pct, date, todayISO, monthName, round2 } from '../core/format.js';
import { LEGAL, chargesFor, socialRateFor, cfpRateFor, ACTIVITY_LABELS } from '../data/legal.js';
import { receiptsList, revenueByMonth } from './shared.js';
import { urssafMonths, upcomingDeadlines } from './deadlines.js';
import { toCSV } from './receipts.js';
import { go } from '../core/router.js';

export const title = 'Finances & URSSAF';

function meter(label, value, max, { warnAt = 0.8, note = '' } = {}) {
  const r = max ? value / max : 0;
  const tone = r >= 1 ? 'danger' : r >= warnAt ? 'warn' : '';
  return html`<div class="meter-row">
    <header><span>${label}</span><span class="num">${money0(value)} / ${money0(max)} <span class="muted">(${Math.round(r * 100)} %)</span></span></header>
    <div class="meter ${tone}"><i style="--v:${Math.min(100, r * 100)}%"></i></div>
    ${note ? html`<small class="muted">${note}</small>` : ''}
  </div>`;
}

export async function render(root, { query }) {
  const s = store.settings;
  const today = todayISO();
  const years = [...new Set([today.slice(0, 4), ...store.list('payments').map((p) => p.date.slice(0, 4))])].sort().reverse();
  const year = Number(query.annee || years[0]);
  const rows = receiptsList({ year });
  const total = round2(rows.reduce((a, r) => a + r.amount, 0));
  const months = revenueByMonth(year);
  const maxM = Math.max(...months, 1);

  // Cotisations par mois : calculées encaissement par encaissement (taux ACRE selon la date)
  const chargesByMonth = Array.from({ length: 12 }, () => ({ social: 0, cfp: 0, vl: 0, total: 0 }));
  rows.forEach((r) => { const c = chargesFor(s, r.amount, r.date); const m = chargesByMonth[Number(r.date.slice(5, 7)) - 1]; Object.keys(m).forEach((k) => { m[k] += c[k]; }); });
  const decl = urssafMonths(year);
  const yearCharges = chargesByMonth.reduce((a, c) => a + c.total, 0);
  const allowance = LEGAL.taxAllowance[s.regime.activity] ?? 0.34;
  const goal = Number(s.goals.yearlyRevenue) || 0;
  const vat = LEGAL.vatFranchise.services;
  const deadlines = upcomingDeadlines({ horizonDays: 365 });

  root.innerHTML = String(html`
    <header class="page-head">
      <div><h1>Finances & URSSAF ${year}</h1><p>Tout est calculé sur le chiffre d’affaires <strong>encaissé</strong> (règle du régime micro), d’après les paiements enregistrés.</p></div>
      <div class="actions">
        <select aria-label="Année" id="year" style="width:auto">${years.map((y) => html`<option ${Number(y) === year ? raw('selected') : ''}>${y}</option>`)}</select>
        <a class="btn" href="https://www.autoentrepreneur.urssaf.fr" target="_blank" rel="noopener">Espace URSSAF</a>
      </div>
    </header>

    ${!s.regime.creationDate ? html`<div class="callout warn" style="margin-bottom:20px">${icon('alert')}<p>Renseigne ta date de début d’activité dans <a href="#/parametres">Paramètres</a> pour calculer l’ACRE et les mois à déclarer.</p></div>` : ''}

    <div class="stack">
      <div class="grid grid-2">
        <section class="panel stack" style="gap:16px">
          <h2>Plafonds ${year}</h2>
          ${meter('Plafond du régime micro (services)', total, LEGAL.microCeiling.services, { note: 'Au-delà deux années de suite, tu sors du régime micro.' })}
          ${s.regime.vatFranchise ? html`
            ${meter('Seuil de franchise de TVA', total, vat.base, { note: 'Dépassé sur une année : TVA à facturer à partir du 1er janvier suivant.' })}
            ${meter('Seuil majoré de TVA', total, vat.major, { warnAt: 0.9, note: 'Dépassé : TVA à facturer dès le jour du dépassement.' })}` : html`<p class="small muted">Tu factures la TVA (franchise désactivée dans les paramètres).</p>`}
          ${goal ? meter('Objectif annuel', total, goal, { warnAt: 2 }) : html`<p class="small muted">Fixe un objectif de CA dans <a href="#/parametres">Paramètres</a> pour le suivre ici.</p>`}
        </section>
        <section class="panel">
          <h2>Encaissements par mois</h2>
          <div class="bars" role="img" aria-label="Encaissements mensuels ${year}">
            ${months.map((v, i) => html`<div class="bar ${year === Number(today.slice(0, 4)) && i + 1 === Number(today.slice(5, 7)) ? 'now' : ''}" title="${monthName(i + 1)} : ${money(v)}"><i style="--h:${Math.max(0, (v / maxM) * 100)}%"></i><span>${monthName(i + 1).slice(0, 3)}</span></div>`)}
          </div>
          <div class="grid grid-3" style="margin-top:16px">
            <div class="kpi"><span class="l">Encaissé</span><span class="v">${money0(total)}</span></div>
            <div class="kpi"><span class="l">Cotisations estimées</span><span class="v">${money0(yearCharges)}</span></div>
            <div class="kpi"><span class="l">Net estimé</span><span class="v">${money0(total - yearCharges)}</span></div>
          </div>
        </section>
      </div>

      <section class="panel">
        <header>
          <div><h2>Déclarations URSSAF mensuelles</h2><p class="small muted" style="margin:4px 0 0">${ACTIVITY_LABELS[s.regime.activity]} · taux actuel ${pct(socialRateFor(s, today))} + CFP ${pct(cfpRateFor(s), 2)}. Déclare même un mois à 0 €, avant la fin du mois suivant. Ta toute première échéance peut couvrir plusieurs mois : suis la date indiquée dans ton espace URSSAF.</p></div>
          <button class="btn sm" id="csv">${icon('download')}CSV</button>
        </header>
        <div class="table-wrap"><table>
          <thead><tr><th>Mois</th><th class="r">CA encaissé</th><th class="r">Cotisations</th><th class="r">CFP</th>${s.regime.versementLiberatoire ? html`<th class="r">Impôt (VL)</th>` : ''}<th class="r">Total à payer</th><th>Échéance</th><th>Déclaré</th></tr></thead>
          <tbody>${decl.map((m) => { const c = chargesByMonth[m.month - 1]; const late = m.closed && !m.declared && m.deadline < today; return html`
            <tr>
              <td>${monthName(m.month)} ${m.year}${m.current ? html` <span class="badge info">En cours</span>` : ''}</td>
              <td class="r num">${money(m.amount)}</td><td class="r num">${money(c.social)}</td><td class="r num">${money(c.cfp)}</td>
              ${s.regime.versementLiberatoire ? html`<td class="r num">${money(c.vl)}</td>` : ''}
              <td class="r num"><strong>${money(c.total)}</strong></td>
              <td class="num">${date(m.deadline)} ${late ? html`<span class="badge danger">En retard</span>` : ''}</td>
              <td><input type="checkbox" data-decl="${m.id}" ${m.declared ? raw('checked') : ''} ${m.closed ? '' : raw('disabled')} aria-label="Déclaré pour ${monthName(m.month)}"></td>
            </tr>`; })}</tbody>
        </table></div>
      </section>

      <div class="grid grid-2">
        <section class="panel">
          <h2>Impôt sur le revenu ${year}</h2>
          ${s.regime.versementLiberatoire ? html`<p>Versement libératoire : ton impôt est payé chaque mois avec tes cotisations (colonne VL).</p>` : html`
            <div class="total-line"><span>CA encaissé ${year}</span><span class="num">${money(total)}</span></div>
            <div class="total-line"><span>Abattement forfaitaire (${Math.round(allowance * 100)} %)</span><span class="num">−${money(total * allowance)}</span></div>
            <div class="total-line big"><span>Revenu imposable estimé</span><span class="num">${money0(total * (1 - allowance))}</span></div>
            <p class="small muted" style="margin-top:8px">À reporter au printemps ${year + 1} : déclare ton CA brut sur la 2042-C-PRO, l’administration applique l’abattement. Le montant d’impôt dépend de ton foyer fiscal.</p>`}
        </section>
        <section class="panel">
          <h2>Échéances des 12 prochains mois</h2>
          ${deadlines.length ? html`<ul class="list">${deadlines.slice(0, 10).map((d) => html`<li><span class="date">${date(d.date)}</span><span style="flex:1">${d.href ? html`<a href="${d.href}">${d.label}</a>` : d.label}</span><span class="badge ${d.tone}">${d.date < today ? 'Dépassée' : 'À venir'}</span></li>`)}</ul>` : html`<p class="empty">Aucune échéance.</p>`}
        </section>
      </div>
    </div>`);

  root.querySelector('#year').addEventListener('change', (e) => { location.hash = `#/finances?annee=${e.target.value}`; });
  root.addEventListener('change', async (e) => {
    const id = e.target.dataset.decl;
    if (!id) return;
    try {
      await store.save('declarations', { id, declared: e.target.checked, declaredAt: e.target.checked ? new Date().toISOString() : '', amountDeclared: decl.find((m) => m.id === id)?.amount });
      toast(e.target.checked ? 'Déclaration notée' : 'Déclaration décochée');
      go(location.hash || '#/finances');
    } catch (err) { toast(err.message, 'error'); }
  });
  root.querySelector('#csv').addEventListener('click', () => {
    downloadFile(`urssaf-${year}.csv`, toCSV(decl.map((m) => { const c = chargesByMonth[m.month - 1]; return [`${monthName(m.month)} ${m.year}`, m.amount, round2(c.social), round2(c.cfp), round2(c.total), date(m.deadline), m.declared ? 'oui' : 'non'].map((v) => String(v).replace('.', ',')); }), ['Mois', 'CA encaissé', 'Cotisations', 'CFP', 'Total', 'Échéance', 'Déclaré']), 'text/csv;charset=utf-8');
  });
}
