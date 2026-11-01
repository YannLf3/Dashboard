/* ---------------------------------------------------------
   M1 — Checklist légale (progression sauvegardée)
   --------------------------------------------------------- */
import { store } from '../core/store.js';
import { html, raw, onAction, toast } from '../core/dom.js';
import { PHASES, TAGS, ALL_ITEMS } from '../data/checklist.js';
import { LEGAL } from '../data/legal.js';
import { date } from '../core/format.js';

export const title = 'Checklist légale';

export const itemState = (id) => store.get('checklist', id) || {};
export const isResolved = (id) => { const s = itemState(id); return Boolean(s.done || s.na); };
export function phaseProgress(phase) {
  const done = phase.items.filter((it) => isResolved(it.id)).length;
  return { done, total: phase.items.length, ratio: phase.items.length ? done / phase.items.length : 0 };
}
export function globalProgress() {
  const done = ALL_ITEMS.filter((it) => isResolved(it.id)).length;
  return { done, total: ALL_ITEMS.length, ratio: done / ALL_ITEMS.length };
}

export async function render(root, { query }) {
  let filter = query.filtre || 'tout';
  const draw = () => {
    const g = globalProgress();
    root.innerHTML = String(html`
      <header class="page-head">
        <div>
          <h1>Checklist légale</h1>
          <p>${g.done} points traités sur ${g.total}. Coche ce qui est fait, marque « non concerné » ce qui ne s’applique pas. Chiffres vérifiés le ${date(LEGAL.checkedOn)} ; ceci n’est pas un avis juridique.</p>
        </div>
        <div class="seg" role="radiogroup" aria-label="Filtrer">
          ${[['tout', 'Tout'], ['afaire', 'À faire'], ['obligatoire', 'Obligatoire']].map(([v, l]) => html`<label><input type="radio" name="f" value="${v}" ${filter === v ? raw('checked') : ''}><span>${l}</span></label>`)}
        </div>
      </header>
      <div class="stack">
        ${PHASES.map((phase, i) => {
          const p = phaseProgress(phase);
          const items = phase.items.filter((it) => filter === 'tout' || (filter === 'afaire' && !isResolved(it.id)) || (filter === 'obligatoire' && it.tag === 'obligatoire'));
          if (!items.length) return '';
          return html`
          <section class="panel" id="phase-${phase.id}">
            <header>
              <div><h2>${i + 1}. ${phase.title}</h2><p class="small muted" style="margin:4px 0 0">${phase.intro}</p></div>
              <span class="badge ${p.ratio === 1 ? 'ok' : ''}">${p.done} / ${p.total}</span>
            </header>
            <div class="meter" style="margin-bottom:6px"><i style="--v:${Math.round(p.ratio * 100)}%"></i></div>
            ${items.map((it) => itemView(it))}
          </section>`;
        })}
      </div>`);
  };
  const itemView = (it) => {
    const st = itemState(it.id);
    const tag = TAGS[it.tag];
    return html`
      <article class="check-item ${st.done || st.na ? 'done' : ''}">
        <input type="checkbox" id="c-${it.id}" data-id="${it.id}" ${st.done ? raw('checked') : ''} ${st.na ? raw('disabled') : ''} aria-describedby="w-${it.id}">
        <div>
          <label class="title" for="c-${it.id}"><span>${it.title}</span><span class="badge ${tag.tone}">${tag.label}</span>${st.na ? html`<span class="badge">Non concerné</span>` : ''}</label>
          <p class="why" id="w-${it.id}">${it.why}</p>
          <details>
            <summary class="small" style="color:var(--accent);margin-top:6px">Comment faire</summary>
            <p class="how">${it.how}</p>
            ${st.doneAt ? html`<p class="small muted">Fait le ${date(st.doneAt.slice(0, 10))}</p>` : ''}
          </details>
          <div class="links">
            ${it.link ? html`<a href="${it.link}">Ouvrir dans le dashboard</a>` : ''}
            ${it.source ? html`<a href="${it.source.url}" target="_blank" rel="noopener">${it.source.label}</a>` : ''}
            <a href="#" data-action="na" data-id="${it.id}">${st.na ? 'Me concerne finalement' : 'Non concerné'}</a>
          </div>
        </div>
      </article>`;
  };

  draw();
  if (query.phase) document.getElementById(`phase-${query.phase}`)?.scrollIntoView({ block: 'start' });
  root.addEventListener('change', async (e) => {
    if (e.target.name === 'f') { filter = e.target.value; draw(); return; }
    const id = e.target.dataset.id;
    if (!id) return;
    try {
      await store.save('checklist', { ...itemState(id), id, done: e.target.checked, doneAt: e.target.checked ? new Date().toISOString() : '' });
      draw();
    } catch (err) { toast(err.message, 'error'); }
  });
  onAction(root, {
    na: async (el) => {
      const st = itemState(el.dataset.id);
      try { await store.save('checklist', { ...st, id: el.dataset.id, na: !st.na, done: false }); draw(); } catch (err) { toast(err.message, 'error'); }
    },
  });
}

