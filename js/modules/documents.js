/* ---------------------------------------------------------
   M3 — Liste des devis, factures et avoirs
   --------------------------------------------------------- */
import { store, byDateDesc, clientName } from '../core/store.js';
import { html, icon } from '../core/dom.js';
import { date, money } from '../core/format.js';
import { totals, stateBadge, KIND_LABEL, balance } from './shared.js';

export const title = 'Devis & factures';

export async function render(root, { query }) {
  const tab = query.type || 'tous';
  const clientId = query.client || '';
  const docs = store.list('documents')
    .filter((d) => tab === 'tous' || d.kind === tab)
    .filter((d) => !clientId || d.clientId === clientId)
    .sort((a, b) => (a.status === 'brouillon') - (b.status === 'brouillon') || byDateDesc('issueDate')(a, b) || String(b.number).localeCompare(String(a.number)));
  const qs = (t) => `#/documents?type=${t}${clientId ? `&client=${clientId}` : ''}`;
  const tabs = [['tous', 'Tous'], ['devis', 'Devis'], ['facture', 'Factures'], ['avoir', 'Avoirs']];

  root.innerHTML = String(html`
    <header class="page-head">
      <div>
        <h1>Devis & factures</h1>
        <p>Un document reste modifiable tant qu’il est en brouillon. Une fois émis, il reçoit son numéro et devient figé : on corrige une facture par un avoir.</p>
      </div>
      <div class="actions">
        <a class="btn" href="#/documents/new?kind=devis${clientId ? `&client=${clientId}` : ''}">${icon('plus')}Nouveau devis</a>
        <a class="btn primary" href="#/documents/new?kind=facture${clientId ? `&client=${clientId}` : ''}">${icon('plus')}Nouvelle facture</a>
      </div>
    </header>
    ${clientId ? html`<p class="row" style="margin-bottom:12px">Filtré sur <strong>${clientName(clientId)}</strong> <a href="#/documents?type=${tab}">Retirer le filtre</a></p>` : ''}
    <nav class="tabs" aria-label="Type de document">${tabs.map(([v, l]) => html`<a href="${qs(v)}" ${tab === v ? html`aria-current="page"` : ''}>${l}</a>`)}</nav>
    <section class="panel">
      ${docs.length ? html`<div class="table-wrap"><table>
        <thead><tr><th>Numéro</th><th>Type</th><th>Client</th><th>Objet</th><th>Date</th><th class="r">Montant</th><th class="r">Reste dû</th><th>État</th></tr></thead>
        <tbody>${docs.map((d) => html`
          <tr class="clickable" data-href="#/documents/${d.id}">
            <td class="num"><a href="#/documents/${d.id}">${d.number || 'Brouillon'}</a></td>
            <td>${d.kind === 'facture' && d.isDeposit ? 'Acompte' : KIND_LABEL[d.kind]}</td>
            <td>${d.client?.name || clientName(d.clientId)}</td>
            <td>${d.title || '—'}</td>
            <td class="num">${date(d.issueDate)}</td>
            <td class="r num">${money(d.kind === 'avoir' ? -totals(d).due : totals(d).due)}</td>
            <td class="r num">${d.kind === 'facture' && d.status === 'emise' ? money(Math.max(0, balance(d))) : '—'}</td>
            <td>${stateBadge(d)}</td>
          </tr>`)}</tbody></table></div>`
      : html`<div class="empty"><p>Aucun document ici.</p><a class="btn primary" href="#/simulateur">${icon('calc')}Partir d’une simulation</a></div>`}
    </section>`);

  root.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-href]');
    if (tr && !e.target.closest('a')) location.hash = tr.dataset.href;
  });
}
