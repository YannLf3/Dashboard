/* ---------------------------------------------------------
   M5 — Modèles de documents : génère, modifie, exporte.
   Tes modifications sont enregistrées par modèle + client +
   document, et retrouvées sur tous tes appareils.
   --------------------------------------------------------- */
import { store } from '../core/store.js';
import { html, raw, icon, toast } from '../core/dom.js';
import { round2, todayISO, daysBetween, slug, date } from '../core/format.js';
import { TEMPLATES, templateById } from '../data/templates.js';
import { totals, balance, docState, clientSnapshot } from './shared.js';
import { textPDF } from '../lib/pdf.js';

export const title = 'Modèles de documents';

export async function render(root, { id, query }) {
  const tpl = id ? templateById(id) : null;
  if (!tpl) return renderList(root);

  const clients = [...store.list('clients')].sort((a, b) => a.name.localeCompare(b.name));
  const needsDoc = tpl.needs.includes('devis') ? 'devis' : tpl.needs.includes('facture') ? 'facture' : null;
  let doc = query.doc ? store.get('documents', query.doc) : null;
  let clientId = query.client || doc?.clientId || '';
  const docsFor = () => store.list('documents').filter((d) => d.kind === needsDoc && d.status !== 'brouillon' && (!clientId || d.clientId === clientId));
  if (needsDoc && !doc) doc = docsFor()[0] || null;
  if (doc && !clientId) clientId = doc.clientId;
  let version = query.version || (store.get('clients', clientId)?.type) || 'both';

  const draftId = () => `${tpl.id}:${clientId || 'general'}:${doc?.id || ''}${tpl.id === 'cgv' ? `:${version}` : ''}`;
  const generate = () => {
    const client = doc?.client || clientSnapshot(clientId);
    let ctxDoc = null;
    if (doc) {
      const due = doc.kind === 'facture' ? balance(doc) : totals(doc).due;
      const late = docState(doc).key === 'retard' ? daysBetween(doc.dueDate, todayISO()) : 0;
      ctxDoc = { ...doc, __total: totals(doc).due, __due: due, __penalty: round2(due * (Number(store.settings.invoicing.latePenaltyRate) / 100) * late / 365) };
    }
    return tpl.build({ s: store.settings, client, doc: ctxDoc, version });
  };
  const saved = () => store.get('drafts', draftId());

  const draw = () => {
    const text = saved()?.text ?? generate();
    const holes = (text.match(/\[[^\]]+\]/g) || []).length;
    root.innerHTML = String(html`
      <header class="page-head">
        <div><a class="small" href="#/modeles">${icon('back')} Modèles</a><h1>${tpl.title}</h1><p>${tpl.desc}</p></div>
        <div class="actions">
          <button class="btn" data-a="copy">${icon('copy')}Copier</button>
          <button class="btn primary" data-a="pdf">${icon('download')}PDF</button>
        </div>
      </header>
      <div class="split">
        <section class="panel stack" style="gap:12px">
          ${holes ? html`<div class="callout warn">${icon('edit')}<p>${holes} champ(s) entre [crochets] à compléter avant envoi.</p></div>` : ''}
          <label class="field"><span>Texte (modifiable)</span><textarea class="template-doc" id="txt" spellcheck="true">${text}</textarea></label>
          <div class="row"><button class="btn" data-a="save">${icon('check')}Enregistrer mes modifications</button><button class="btn ghost" data-a="regen">Régénérer depuis les données</button>${saved() ? html`<span class="small muted">Version modifiée enregistrée le ${date(saved().updatedAt.slice(0, 10))}</span>` : ''}</div>
        </section>
        <aside class="panel sticky stack" style="gap:12px">
          <h2>Contexte</h2>
          ${tpl.needs.includes('version') ? html`<label class="field"><span>Version</span><select id="version">
            ${[['both', 'Pros et particuliers'], ['b2b', 'Professionnels seulement'], ['b2c', 'Particuliers seulement']].map(([v, l]) => html`<option value="${v}" ${version === v ? raw('selected') : ''}>${l}</option>`)}</select></label>` : ''}
          ${tpl.needs.includes('client') || needsDoc ? html`<label class="field"><span>Client</span><select id="client"><option value="">—</option>${clients.map((c) => html`<option value="${c.id}" ${clientId === c.id ? raw('selected') : ''}>${c.name}</option>`)}</select></label>` : ''}
          ${needsDoc ? html`<label class="field"><span>${needsDoc === 'devis' ? 'Devis' : 'Facture'}</span><select id="doc"><option value="">—</option>${docsFor().map((d) => html`<option value="${d.id}" ${doc?.id === d.id ? raw('selected') : ''}>${d.number} — ${d.title || ''}</option>`)}</select></label>` : ''}
          <div class="callout">${icon('info')}<p>Modèle indicatif généré à partir de tes paramètres. Relis-le ; pour un contrat à fort enjeu, fais-le valider par un juriste (CCI, ordre des avocats : consultations gratuites ponctuelles).</p></div>
        </aside>
      </div>`);
  };
  draw();

  const nav = () => { location.hash = `#/modeles/${tpl.id}?client=${clientId}&doc=${doc?.id || ''}&version=${version}`; };
  root.addEventListener('change', (e) => {
    if (e.target.id === 'client') { clientId = e.target.value; doc = needsDoc ? docsFor()[0] || null : null; version = store.get('clients', clientId)?.type || version; nav(); }
    if (e.target.id === 'doc') { doc = store.get('documents', e.target.value) || null; nav(); }
    if (e.target.id === 'version') { version = e.target.value; nav(); }
  });
  root.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    const text = root.querySelector('#txt').value;
    try {
      if (a === 'copy') { await navigator.clipboard.writeText(text); toast('Texte copié'); }
      if (a === 'pdf') await textPDF(tpl.title, text, `${slug(tpl.title)}${clientId ? `-${slug(store.get('clients', clientId)?.name)}` : ''}.pdf`);
      if (a === 'save') { await store.save('drafts', { id: draftId(), text }); toast('Modifications enregistrées'); draw(); }
      if (a === 'regen') { if (saved()) await store.remove('drafts', draftId()); draw(); toast('Texte régénéré'); }
    } catch (err) { toast(err.message, 'error'); }
  });
}

function renderList(root) {
  root.innerHTML = String(html`
    <header class="page-head"><div><h1>Modèles de documents</h1><p>Générés avec tes informations et celles de ton client. Modifie, enregistre, exporte en PDF.</p></div></header>
    <div class="grid grid-3">
      ${TEMPLATES.map((t) => html`<a class="panel" href="#/modeles/${t.id}" style="text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:6px">
        <span style="color:var(--accent)">${icon('doc')}</span><h2>${t.title}</h2><p class="small muted" style="margin:0">${t.desc}</p></a>`)}
    </div>`);
}
