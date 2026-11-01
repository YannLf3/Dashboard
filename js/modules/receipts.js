/* ---------------------------------------------------------
   Livre des recettes (obligatoire pour tout micro-entrepreneur)
   Généré à partir des paiements enregistrés sur les factures.
   --------------------------------------------------------- */
import { store } from '../core/store.js';
import { html, raw, icon, toast, downloadFile } from '../core/dom.js';
import { date, money, todayISO } from '../core/format.js';
import { receiptsList, METHODS } from './shared.js';
import { receiptsPDF } from '../lib/pdf.js';

export const title = 'Livre des recettes';

/* CSV « à la française » : séparateur ; et BOM UTF-8 pour qu'Excel
   affiche correctement les accents. */
export function toCSV(rows, headers) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '﻿' + [headers.map(cell).join(';'), ...rows.map((r) => r.map(cell).join(';'))].join('\r\n');
}

export async function render(root, { query }) {
  const years = [...new Set([todayISO().slice(0, 4), ...store.list('payments').map((p) => p.date.slice(0, 4))])].sort().reverse();
  const year = query.annee || years[0];
  const rows = receiptsList({ year });
  const total = rows.reduce((s, r) => s + r.amount, 0);

  root.innerHTML = String(html`
    <header class="page-head">
      <div><h1>Livre des recettes ${year}</h1><p>Registre chronologique de tes encaissements, obligatoire. Il se remplit quand tu enregistres un paiement sur une facture ; un remboursement (avoir) vient en négatif.</p></div>
      <div class="actions">
        <select aria-label="Année" onchange="location.hash='#/recettes?annee='+this.value" style="width:auto">${years.map((y) => html`<option ${y === year ? raw('selected') : ''}>${y}</option>`)}</select>
        <button class="btn" id="csv">${icon('download')}CSV</button>
        <button class="btn primary" id="pdf">${icon('download')}PDF</button>
      </div>
    </header>
    <section class="panel">
      ${rows.length ? html`<div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Pièce</th><th>Client</th><th>Nature</th><th>Mode</th><th class="r">Montant</th></tr></thead>
        <tbody>${rows.map((r) => html`<tr><td class="num">${date(r.date)}</td><td><a href="#/documents/${r.documentId}">${r.number}</a></td><td>${r.client}</td><td>${r.nature}</td><td>${METHODS[r.method] || r.method}</td><td class="r num">${money(r.amount)}</td></tr>`)}</tbody>
        <tfoot><tr><td colspan="5">Total ${year}</td><td class="r num">${money(total)}</td></tr></tfoot>
      </table></div>`
      : html`<div class="empty"><p>Aucun encaissement en ${year}.</p><a class="btn" href="#/documents?type=facture">Voir les factures</a></div>`}
    </section>`);

  root.querySelector('#csv').addEventListener('click', () => {
    downloadFile(`livre-des-recettes-${year}.csv`, toCSV(rows.map((r) => [date(r.date), r.number, r.client, r.nature, METHODS[r.method] || r.method, String(r.amount).replace('.', ',')]), ['Date', 'Pièce', 'Client', 'Nature', 'Mode de règlement', 'Montant']), 'text/csv;charset=utf-8');
  });
  root.querySelector('#pdf').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try { await receiptsPDF(rows, year); } catch (err) { toast(err.message, 'error'); } finally { e.target.disabled = false; }
  });
}
