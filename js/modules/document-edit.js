/* ---------------------------------------------------------
   M3 — Éditeur de devis / facture / avoir
   Brouillon : tout est modifiable.
   Émission : numéro attribué + identités figées (snapshot) +
   mentions figées. Ensuite : paiements, relances, avoirs.
   --------------------------------------------------------- */
import { store, isLocked, clientName } from '../core/store.js';
import { html, raw, icon, onAction, toast, openDialog, confirmDialog } from '../core/dom.js';
import { money, date, todayISO, addDays, round2, daysBetween } from '../core/format.js';
import {
  KIND_LABEL, METHODS, UNITS, totals, lineTotal, newDocument, nextNumber, emissionProblems, emissionWarnings,
  sellerSnapshot, clientSnapshot, buildMentions, docState, stateBadge, balance, paymentsOf, creditNotesOf, moneySigned,
} from './shared.js';
import { clientForm } from './clients.js';
import { downloadDocumentPDF } from '../lib/pdf.js';
import { LEGAL } from '../data/legal.js';

export const title = 'Document';

function buildNew(q) {
  const s = store.settings;
  if (q.from) {
    const devis = store.get('documents', q.from);
    if (devis && q.mode === 'acompte') {
      const pct = Number(devis.depositPercent) || s.invoicing.depositPercent;
      const amount = round2(totals(devis).due * pct / 100);
      return newDocument('facture', {
        clientId: devis.clientId, projectId: devis.projectId, relatedId: devis.id, isDeposit: true,
        title: `Acompte — ${devis.title || `devis ${devis.number}`}`, serviceDate: todayISO(),
        lines: [{ label: `Acompte de ${pct} % sur le devis n° ${devis.number} du ${date(devis.issueDate)}`, detail: devis.title, qty: 1, unit: 'forfait', unitPrice: amount }],
      });
    }
    if (devis && q.mode === 'solde') {
      const deposits = store.list('documents').filter((d) => d.kind === 'facture' && d.isDeposit && d.relatedId === devis.id && d.status === 'emise');
      return newDocument('facture', {
        clientId: devis.clientId, projectId: devis.projectId, relatedId: devis.id,
        title: `Solde — ${devis.title || `devis ${devis.number}`}`, serviceDate: todayISO(),
        lines: structuredClone(devis.lines),
        deductions: deposits.map((f) => ({ label: `Acompte facturé (facture n° ${f.number} du ${date(f.issueDate)})`, amount: totals(f).due, invoiceId: f.id })),
      });
    }
  }
  if (q.credit) {
    const f = store.get('documents', q.credit);
    if (f) return newDocument('avoir', { clientId: f.clientId, projectId: f.projectId, relatedId: f.id, title: `Avoir sur la facture ${f.number}`, lines: structuredClone(f.lines), deductions: structuredClone(f.deductions || []), dueDate: '' });
  }
  if (q.dup) {
    const d = store.get('documents', q.dup);
    if (d) {
      const { id, number, seq, status, seller, client, mentions, emittedAt, sentAt, signedAt, createdAt, updatedAt, ...rest } = structuredClone(d);
      return { ...newDocument(d.kind), ...rest, title: `${d.title || ''} (nouvelle version)`.trim(), issueDate: todayISO(), validUntil: d.kind === 'devis' ? addDays(todayISO(), s.invoicing.quoteValidityDays) : '' };
    }
  }
  return newDocument(['devis', 'facture', 'avoir'].includes(q.kind) ? q.kind : 'facture', { clientId: q.client || '' });
}

export async function render(root, { id, query }) {
  let doc = id === 'new' ? buildNew(query) : structuredClone(store.get('documents', id) || null);
  if (!doc) { root.innerHTML = String(html`<div class="empty"><p>Document introuvable.</p><a class="btn" href="#/documents">Retour</a></div>`); return; }
  let dirty = false;

  const draw = () => (isLocked(doc) ? drawLocked() : drawEditor());
  const heading = () => {
    if (doc.kind === 'facture' && doc.isDeposit) return doc.id ? 'Facture d’acompte' : 'Nouvelle facture d’acompte';
    return doc.id ? KIND_LABEL[doc.kind] : { devis: 'Nouveau devis', facture: 'Nouvelle facture', avoir: 'Nouvel avoir' }[doc.kind];
  };

  /* ================= ÉDITEUR (brouillon) ================= */
  function drawEditor() {
    const clients = [...store.list('clients')].sort((a, b) => a.name.localeCompare(b.name));
    const isF = doc.kind === 'facture', isD = doc.kind === 'devis';
    root.innerHTML = String(html`
      <header class="page-head">
        <div>
          <a href="#/documents" class="small">${icon('back')} Devis & factures</a>
          <h1>${heading()} <span class="badge">Brouillon</span></h1>
          <p>Le numéro sera attribué à l’${isD ? 'envoi' : 'émission'}, dans la suite chronologique.</p>
        </div>
      </header>
      <div class="split">
        <form class="stack" id="docForm" novalidate>
          <section class="panel form">
            <div class="form-grid">
              <label class="field full"><span>Client</span>
                <div class="row" style="flex-wrap:nowrap">
                  <select name="clientId"><option value="">Choisir un client…</option>${clients.map((c) => html`<option value="${c.id}" ${doc.clientId === c.id ? raw('selected') : ''}>${c.name} (${c.type === 'b2b' ? 'pro' : 'particulier'})</option>`)}</select>
                  <button type="button" class="btn" data-action="newClient">${icon('plus')}Nouveau</button>
                </div>
              </label>
              <label class="field full"><span>Objet</span><input name="title" value="${doc.title}" placeholder="Ex. Développement de l’application réseau social — lot 1"></label>
              <label class="field"><span>Date d’émission</span><input type="date" name="issueDate" value="${doc.issueDate}"></label>
              ${isD ? html`<label class="field"><span>Valable jusqu’au</span><input type="date" name="validUntil" value="${doc.validUntil}"></label>` : ''}
              ${isF ? html`
                <label class="field"><span>Échéance de paiement</span><input type="date" name="dueDate" value="${doc.dueDate}"><small class="hint">Entre pros : 60 jours maximum après émission.</small></label>
                <label class="field"><span>Date de la prestation</span><input type="date" name="serviceDate" value="${doc.serviceDate}"></label>
                <label class="field"><span>…ou période de la prestation</span><input name="servicePeriod" value="${doc.servicePeriod}" placeholder="Ex. du 01/11 au 30/11/2026"></label>` : ''}
              ${isD ? html`<label class="field"><span>Acompte demandé (%)</span><input type="number" name="depositPercent" min="0" max="100" value="${doc.depositPercent}"></label>` : ''}
              ${isF ? html`<label class="check full"><input type="checkbox" name="isDeposit" ${doc.isDeposit ? raw('checked') : ''}><span>Facture d’acompte</span></label>` : ''}
            </div>
          </section>

          <section class="panel">
            <header><h2>Prestations</h2><button type="button" class="btn sm" data-action="addLine">${icon('plus')}Ajouter une ligne</button></header>
            <div class="table-wrap"><table class="lines-table">
              <thead><tr><th>Désignation</th><th class="qty">Qté</th><th class="unit">Unité</th><th class="price">Prix unit. HT</th><th class="r">Total</th><th></th></tr></thead>
              <tbody>${doc.lines.map((l, i) => html`
                <tr>
                  <td><input data-line="${i}" data-k="label" value="${l.label}" placeholder="Désignation" aria-label="Désignation ligne ${i + 1}">
                      <input data-line="${i}" data-k="detail" value="${l.detail || ''}" placeholder="Détail (facultatif)" style="margin-top:4px;font-size:.85rem" aria-label="Détail ligne ${i + 1}"></td>
                  <td class="qty"><input data-line="${i}" data-k="qty" type="number" step="0.25" value="${l.qty}" aria-label="Quantité"></td>
                  <td class="unit"><select data-line="${i}" data-k="unit" aria-label="Unité">${UNITS.map((u) => html`<option ${l.unit === u ? raw('selected') : ''}>${u}</option>`)}</select></td>
                  <td class="price"><input data-line="${i}" data-k="unitPrice" type="number" step="0.01" value="${l.unitPrice}" aria-label="Prix unitaire"></td>
                  <td class="r num" data-total="${i}">${money(lineTotal(l))}</td>
                  <td><button type="button" class="icon-btn" data-action="delLine" data-i="${i}" aria-label="Supprimer la ligne">${icon('trash')}</button></td>
                </tr>`)}</tbody>
            </table></div>
            ${doc.deductions?.length ? html`<p class="small muted" style="margin-top:10px">Déductions : ${doc.deductions.map((d) => `${d.label} (−${money(d.amount)})`).join(' · ')}</p>` : ''}
          </section>

          <section class="panel form">
            <label class="field"><span>Note visible sur le document (facultatif)</span><textarea name="notes" rows="3">${doc.notes}</textarea></label>
          </section>
        </form>

        <aside class="panel sticky stack" id="side" style="gap:14px"></aside>
      </div>`);
    drawSide();
  }

  function drawSide() {
    const side = root.querySelector('#side');
    if (!side) return;
    const t = totals(doc);
    const problems = emissionProblems(doc);
    const warns = emissionWarnings(doc);
    side.innerHTML = String(html`
      <h2>Total</h2>
      <div>
        <div class="total-line"><span>Total HT</span><span class="num">${money(t.ht)}</span></div>
        ${t.vatOn ? html`<div class="total-line"><span>TVA</span><span class="num">${money(t.vat)}</span></div>` : html`<div class="total-line"><span class="muted small">TVA non applicable (franchise)</span><span></span></div>`}
        ${t.deducted ? html`<div class="total-line"><span>Acomptes déduits</span><span class="num">−${money(t.deducted)}</span></div>` : ''}
        <div class="total-line big"><span>${doc.kind === 'facture' ? 'Net à payer' : 'Total'}</span><span class="num">${moneySigned(doc, t.due)}</span></div>
      </div>
      ${problems.length ? html`<div class="callout warn">${icon('alert')}<div><p><strong>Avant d’${doc.kind === 'devis' ? 'envoyer' : 'émettre'}, il manque :</strong></p><ul style="margin:6px 0 0;padding-left:18px">${problems.map((p) => html`<li>${p}</li>`)}</ul></div></div>`
      : html`<div class="callout ok">${icon('check')}<p>Toutes les mentions obligatoires sont réunies.</p></div>`}
      ${warns.map((w) => html`<div class="callout">${icon('info')}<p>${w}</p></div>`)}
      <div class="stack" style="gap:8px">
        <button class="btn" data-action="save">${icon('check')}Enregistrer le brouillon</button>
        <button class="btn" data-action="pdf">${icon('download')}Aperçu PDF (brouillon)</button>
        <button class="btn primary" data-action="emit" ${problems.length ? raw('disabled') : ''}>${icon(doc.kind === 'devis' ? 'send' : 'lock')}${doc.kind === 'devis' ? 'Finaliser le devis' : doc.kind === 'avoir' ? 'Émettre l’avoir' : 'Émettre la facture'}</button>
        ${doc.id ? html`<button class="btn ghost danger" data-action="delete">${icon('trash')}Supprimer le brouillon</button>` : ''}
      </div>`);
  }

  /* Synchronise le modèle `doc` avec le formulaire sans tout redessiner
     (sinon le champ en cours de saisie perdrait le focus). */
  root.addEventListener('input', (e) => {
    const el = e.target;
    if (isLocked(doc) || !el.closest('#docForm')) return;
    dirty = true;
    if (el.dataset.line !== undefined) {
      const l = doc.lines[Number(el.dataset.line)];
      l[el.dataset.k] = ['qty', 'unitPrice'].includes(el.dataset.k) ? Number(el.value) : el.value;
      const cell = root.querySelector(`[data-total="${el.dataset.line}"]`);
      if (cell) cell.textContent = money(lineTotal(l));
    } else if (el.name) {
      doc[el.name] = el.type === 'checkbox' ? el.checked : el.value;
      if (el.name === 'issueDate' && doc.kind === 'facture' && !doc.dueTouched) doc.dueDate = addDays(el.value, store.settings.invoicing.paymentTermsDays);
      if (el.name === 'issueDate' && doc.kind === 'devis') doc.validUntil = addDays(el.value, store.settings.invoicing.quoteValidityDays);
      if (el.name === 'dueDate') doc.dueTouched = true;
      if (['issueDate'].includes(el.name)) { const f = root.querySelector('[name="dueDate"],[name="validUntil"]'); if (f) f.value = doc.kind === 'devis' ? doc.validUntil : doc.dueDate; }
    }
    drawSide();
  });
  root.addEventListener('change', (e) => { if (e.target.name === 'clientId' || e.target.name === 'isDeposit') drawSide(); });

  async function saveDraft({ silent = false } = {}) {
    const { dueTouched, ...clean } = doc;
    const saved = await store.save('documents', clean);
    const wasNew = !doc.id;
    doc = { ...saved, dueTouched };
    dirty = false;
    if (wasNew) history.replaceState(null, '', `#/documents/${saved.id}`);
    if (!silent) toast('Brouillon enregistré');
    return saved;
  }

  async function emit() {
    const problems = emissionProblems(doc);
    if (problems.length) return;
    const { number, seq } = nextNumber(doc.kind, doc.issueDate);
    const isDevis = doc.kind === 'devis';
    const ok = await confirmDialog(
      isDevis
        ? `Le devis recevra le numéro ${number}. Il sera figé : pour le changer ensuite, tu créeras une nouvelle version.`
        : `${KIND_LABEL[doc.kind]} n° ${number} du ${date(doc.issueDate)} pour ${money(totals(doc).due)}. Une fois émise, elle ne pourra plus être modifiée ni supprimée (seulement corrigée par un avoir).`,
      { title: isDevis ? 'Finaliser le devis' : `Émettre ${doc.kind === 'avoir' ? 'l’avoir' : 'la facture'}`, ok: isDevis ? 'Finaliser' : 'Émettre' });
    if (!ok) return;
    const { dueTouched, ...clean } = doc;
    const final = { ...clean, number, seq, status: isDevis ? 'envoye' : 'emise', seller: sellerSnapshot(), client: clientSnapshot(doc.clientId), emittedAt: new Date().toISOString() };
    final.mentions = buildMentions(final);
    try {
      doc = await store.save('documents', final);
      history.replaceState(null, '', `#/documents/${doc.id}`);
      toast(`${KIND_LABEL[doc.kind]} ${doc.number} ${isDevis ? 'finalisé' : doc.kind === 'facture' ? 'émise' : 'émis'}`);
      draw();
    } catch (err) { toast(err.message, 'error'); }
  }

  /* ================= VUE FIGÉE (émis) ================= */
  function drawLocked() {
    doc = store.get('documents', doc.id) || doc;
    const t = totals(doc);
    const st = docState(doc);
    const c = doc.client || {};
    const pays = paymentsOf(doc.id).sort((a, b) => a.date.localeCompare(b.date));
    const credits = doc.kind === 'facture' ? creditNotesOf(doc.id) : [];
    const related = store.list('documents').filter((d) => d.relatedId === doc.id);
    const origin = doc.relatedId ? store.get('documents', doc.relatedId) : null;
    const due = doc.kind === 'facture' ? balance(doc) : 0;
    const today = todayISO();
    const late = doc.kind === 'facture' && st.key === 'retard';
    const daysLate = late ? daysBetween(doc.dueDate, today) : 0;
    const penalty = late && c.type === 'b2b' ? round2(due * (Number(store.settings.invoicing.latePenaltyRate) / 100) * daysLate / 365) : 0;

    root.innerHTML = String(html`
      <header class="page-head">
        <div>
          <a href="#/documents" class="small">${icon('back')} Devis & factures</a>
          <h1>${doc.kind === 'facture' && doc.isDeposit ? 'Facture d’acompte' : KIND_LABEL[doc.kind]} ${doc.number} ${stateBadge(doc)}</h1>
          <p>${c.name} · émis le ${date(doc.issueDate)}${doc.sentAt ? ` · envoyé le ${date(doc.sentAt.slice(0, 10))}` : ''}</p>
        </div>
        <div class="actions">
          <button class="btn primary" data-action="pdf">${icon('download')}Télécharger le PDF</button>
          ${!doc.sentAt ? html`<button class="btn" data-action="sent">${icon('send')}Marquer comme envoyé</button>` : ''}
        </div>
      </header>
      <div class="split">
        <div class="stack">
          <section class="panel">
            <div class="lock-banner small muted" style="margin-bottom:12px">${icon('lock')}<span>Document figé le ${date((doc.emittedAt || doc.updatedAt || '').slice(0, 10))}. Identités et mentions enregistrées telles qu’émises.</span></div>
            ${doc.title ? html`<h2 style="margin-bottom:10px">${doc.title}</h2>` : ''}
            <div class="table-wrap"><table>
              <thead><tr><th>Désignation</th><th class="r">Qté</th><th>Unité</th><th class="r">PU HT</th><th class="r">Total HT</th></tr></thead>
              <tbody>${doc.lines.filter((l) => l.label).map((l) => html`<tr><td>${l.label}${l.detail ? html`<br><small class="muted">${l.detail}</small>` : ''}</td><td class="r num">${l.qty}</td><td>${l.unit}</td><td class="r num">${money(l.unitPrice)}</td><td class="r num">${money(lineTotal(l))}</td></tr>`)}</tbody>
              <tfoot>
                ${t.deducted ? html`<tr><td colspan="4">Acomptes déduits</td><td class="r num">−${money(t.deducted)}</td></tr>` : ''}
                <tr><td colspan="4">${doc.kind === 'facture' ? 'Net à payer' : 'Total'}</td><td class="r num">${moneySigned(doc, t.due)}</td></tr>
              </tfoot>
            </table></div>
            <ul class="small muted" style="margin:14px 0 0;padding-left:18px">${(doc.mentions || []).map((m) => html`<li>${m}</li>`)}</ul>
          </section>

          ${doc.kind !== 'devis' ? html`
          <section class="panel">
            <header><h2>${doc.kind === 'avoir' ? 'Remboursements' : 'Paiements reçus'}</h2>
              <button class="btn sm primary" data-action="pay">${icon('euro')}${doc.kind === 'avoir' ? 'Enregistrer un remboursement' : 'Enregistrer un paiement'}</button></header>
            ${pays.length ? html`<ul class="list">${pays.map((p) => html`<li><span class="date">${date(p.date)}</span><span style="flex:1">${METHODS[p.method] || p.method}${p.note ? html` · <span class="muted">${p.note}</span>` : ''}</span><strong class="num">${money(p.amount)}</strong><button class="icon-btn" data-action="delPay" data-id="${p.id}" aria-label="Supprimer ce paiement">${icon('trash')}</button></li>`)}</ul>`
            : html`<p class="muted small">Aucun ${doc.kind === 'avoir' ? 'remboursement' : 'paiement'} enregistré. Chaque encaissement alimente ton livre des recettes et ta déclaration URSSAF du mois.</p>`}
            ${doc.kind === 'facture' ? html`<div class="total-line big"><span>Reste dû</span><span class="num">${money(Math.max(0, due))}</span></div>` : ''}
          </section>` : ''}

          ${late ? html`
          <section class="panel">
            <h2>Retard de paiement : ${daysLate} jour(s)</h2>
            ${c.type === 'b2b' ? html`
              <p>Pénalités de retard dues de plein droit : <strong>${money(penalty)}</strong> (taux ${store.settings.invoicing.latePenaltyRate} %/an) + indemnité forfaitaire de <strong>${money(LEGAL.recoveryFee)}</strong>.</p>`
            : html`<p>Client particulier : pas de pénalités automatiques ni d’indemnité de 40 €. Des intérêts au taux légal peuvent courir après mise en demeure.</p>`}
            <div class="row"><a class="btn" href="#/modeles/relance?doc=${doc.id}">${icon('doc')}Lettre de relance</a><a class="btn" href="#/modeles/mise-en-demeure?doc=${doc.id}">${icon('doc')}Mise en demeure</a></div>
          </section>` : ''}
        </div>

        <aside class="stack sticky">
          <section class="panel stack" style="gap:8px">
            <h2>Suite</h2>
            ${doc.kind === 'devis' && doc.status === 'envoye' ? html`
              <button class="btn primary" data-action="accept">${icon('check')}Le client a signé</button>
              <button class="btn" data-action="refuse">Le client a refusé</button>` : ''}
            ${doc.kind === 'devis' && doc.status === 'accepte' ? html`
              <a class="btn primary" href="#/documents/new?from=${doc.id}&mode=acompte">${icon('plus')}Facture d’acompte (${doc.depositPercent || 0} %)</a>
              <a class="btn" href="#/documents/new?from=${doc.id}&mode=solde">${icon('plus')}Facture de solde</a>` : ''}
            ${doc.kind === 'devis' ? html`<a class="btn" href="#/documents/new?dup=${doc.id}">${icon('copy')}Nouvelle version</a>` : ''}
            ${doc.kind === 'facture' ? html`<a class="btn" href="#/documents/new?credit=${doc.id}">${icon('plus')}Corriger par un avoir</a>` : ''}
            ${doc.kind === 'facture' ? html`<a class="btn" href="#/documents/new?dup=${doc.id}">${icon('copy')}Dupliquer en brouillon</a>` : ''}
            <a class="btn" href="#/modeles/contrat?client=${doc.clientId}">${icon('doc')}Contrat pour ce client</a>
          </section>
          ${origin || related.length || credits.length ? html`
          <section class="panel">
            <h2>Documents liés</h2>
            <ul class="list">
              ${origin ? html`<li><span class="muted">Origine</span><a href="#/documents/${origin.id}" style="flex:1">${KIND_LABEL[origin.kind]} ${origin.number || 'brouillon'}</a>${stateBadge(origin)}</li>` : ''}
              ${related.map((r) => html`<li><span class="muted">Lié</span><a href="#/documents/${r.id}" style="flex:1">${r.isDeposit ? 'Acompte' : KIND_LABEL[r.kind]} ${r.number || 'brouillon'}</a>${stateBadge(r)}</li>`)}
            </ul>
          </section>` : ''}
        </aside>
      </div>`);
  }

  function payDialog() {
    const isRefund = doc.kind === 'avoir';
    const remaining = isRefund ? round2(totals(doc).due - paymentsOf(doc.id).reduce((s, p) => s + Number(p.amount), 0)) : balance(doc);
    openDialog(html`
      <form class="form" novalidate>
        <header><h2>${isRefund ? 'Remboursement effectué' : 'Paiement reçu'}</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">✕</button></header>
        <div class="form-grid">
          <label class="field"><span>Date ${isRefund ? 'du remboursement' : 'de réception'}</span><input type="date" name="date" value="${todayISO()}" max="${todayISO()}" required></label>
          <label class="field"><span>Montant (€)</span><input type="number" name="amount" step="0.01" min="0.01" value="${Math.max(0, remaining)}" required></label>
          <label class="field"><span>Mode de paiement</span><select name="method">${Object.entries(METHODS).map(([v, l]) => html`<option value="${v}">${l}</option>`)}</select></label>
          <label class="field"><span>Note</span><input name="note" placeholder="Ex. virement reçu sur compte pro"></label>
        </div>
        <p class="small muted">${isRefund ? 'Le remboursement est retranché de tes recettes du mois.' : 'Ce montant sera ajouté à ton livre des recettes et à ta déclaration URSSAF du mois de réception.'}</p>
        <footer><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn primary" type="submit">Enregistrer</button></footer>
      </form>`, {
      onSubmit: async (d) => {
        if (!(Number(d.amount) > 0)) { toast('Montant invalide.', 'error'); return false; }
        if (d.date > todayISO()) { toast('La date ne peut pas être dans le futur.', 'error'); return false; }
        if (Number(d.amount) > remaining + 0.004) toast(`Attention : le montant dépasse le reste dû (${money(remaining)}).`, 'error');
        await store.save('payments', { documentId: doc.id, date: d.date, amount: round2(d.amount), method: d.method, note: d.note });
        toast(isRefund ? 'Remboursement enregistré' : 'Paiement enregistré');
        draw();
      },
    });
  }

  onAction(root, {
    newClient: () => clientForm(undefined, { onSaved: (c) => { doc.clientId = c.id; drawEditor(); } }),
    addLine: () => { doc.lines.push({ label: '', detail: '', qty: 1, unit: 'jour', unitPrice: store.settings.pricing.tjm }); drawEditor(); root.querySelector(`[data-line="${doc.lines.length - 1}"][data-k="label"]`)?.focus(); },
    delLine: (el) => { doc.lines.splice(Number(el.dataset.i), 1); if (!doc.lines.length) doc.lines.push({ label: '', qty: 1, unit: 'jour', unitPrice: 0 }); drawEditor(); },
    save: async () => { try { await saveDraft(); drawSide(); } catch (e) { toast(e.message, 'error'); } },
    emit: async () => { try { if (dirty || !doc.id) await saveDraft({ silent: true }); await emit(); } catch (e) { toast(e.message, 'error'); } },
    pdf: async (el) => { el.disabled = true; try { await downloadDocumentPDF(doc); } catch (e) { toast(e.message, 'error'); } finally { el.disabled = false; } },
    delete: async () => {
      if (!(await confirmDialog('Supprimer ce brouillon ? Aucun numéro ne lui a été attribué, la numérotation reste continue.', { danger: true, ok: 'Supprimer' }))) return;
      await store.remove('documents', doc.id); toast('Brouillon supprimé'); location.hash = '#/documents';
    },
    sent: async () => { doc = await store.save('documents', { ...doc, sentAt: new Date().toISOString() }); draw(); },
    accept: async () => { doc = await store.save('documents', { ...doc, status: 'accepte', signedAt: new Date().toISOString() }); toast('Devis accepté'); draw(); },
    refuse: async () => { doc = await store.save('documents', { ...doc, status: 'refuse' }); draw(); },
    pay: () => payDialog(),
    delPay: async (el) => {
      if (!(await confirmDialog('Supprimer ce paiement ? À ne faire que pour corriger une erreur de saisie : s’il a déjà été déclaré à l’URSSAF, ta déclaration ne correspondra plus.', { danger: true, ok: 'Supprimer' }))) return;
      await store.remove('payments', el.dataset.id); draw();
    },
  });

  // Prévenir la perte d'un brouillon non enregistré
  window.onbeforeunload = (e) => { if (dirty && root.isConnected) e.preventDefault(); };

  draw();
  if (id === 'new' && query.client && !store.get('clients', query.client)) toast(`Client introuvable : ${clientName(query.client)}`, 'error');
}
