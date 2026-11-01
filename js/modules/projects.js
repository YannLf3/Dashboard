/* ---------------------------------------------------------
   Projets & suivi du temps : compare l'estimation du devis
   au temps réellement passé, et calcule ton TJM réel.
   --------------------------------------------------------- */
import { store, clientName } from '../core/store.js';
import { html, raw, icon, onAction, openDialog, toast, confirmDialog } from '../core/dom.js';
import { date, money, number, todayISO, round2 } from '../core/format.js';
import { totals } from './shared.js';

export const title = 'Projets & temps';

const STATUSES = { proposition: 'Proposition', 'en-cours': 'En cours', livre: 'Livré', clos: 'Clos', perdu: 'Perdu' };
const TIMER_KEY = 'yl-timer';
const readTimer = () => { try { return JSON.parse(localStorage.getItem(TIMER_KEY)); } catch { return null; } };

function projectStats(p) {
  const hpd = Number(store.settings.pricing.hoursPerDay) || 7;
  const hours = store.list('time').filter((t) => t.projectId === p.id).reduce((s, t) => s + Number(t.hours || 0), 0);
  const invoiced = store.list('documents').filter((d) => d.projectId === p.id && d.kind === 'facture' && d.status === 'emise').reduce((s, d) => s + totals(d).due, 0)
    - store.list('documents').filter((d) => d.projectId === p.id && d.kind === 'avoir' && d.status === 'emise').reduce((s, d) => s + totals(d).due, 0);
  const days = hours / hpd;
  return { hours: round2(hours), days: round2(days), invoiced: round2(invoiced), ratio: p.estimateDays ? days / p.estimateDays : 0, realTjm: days ? invoiced / days : 0 };
}

function projectForm(p = {}) {
  const clients = [...store.list('clients')].sort((a, b) => a.name.localeCompare(b.name));
  openDialog(html`
    <form class="form" novalidate>
      <header><h2>${p.id ? 'Modifier le projet' : 'Nouveau projet'}</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">✕</button></header>
      <div class="form-grid">
        <label class="field full"><span>Nom</span><input name="name" value="${p.name || ''}" required></label>
        <label class="field"><span>Client</span><select name="clientId"><option value="">—</option>${clients.map((c) => html`<option value="${c.id}" ${p.clientId === c.id ? raw('selected') : ''}>${c.name}</option>`)}</select></label>
        <label class="field"><span>Statut</span><select name="status">${Object.entries(STATUSES).map(([v, l]) => html`<option value="${v}" ${(p.status || 'en-cours') === v ? raw('selected') : ''}>${l}</option>`)}</select></label>
        <label class="field"><span>Estimation (jours)</span><input type="number" name="estimateDays" min="0" step="0.5" value="${p.estimateDays ?? ''}"></label>
      </div>
      <footer><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn primary" type="submit">Enregistrer</button></footer>
    </form>`, {
    onSubmit: async (d) => { if (!d.name) { toast('Le nom est obligatoire.', 'error'); return false; } await store.save('projects', { ...p, ...d }); toast('Projet enregistré'); },
  });
}

function timeForm(projectId, hours = '') {
  openDialog(html`
    <form class="form" novalidate>
      <header><h2>Ajouter du temps</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">✕</button></header>
      <div class="form-grid">
        <label class="field"><span>Date</span><input type="date" name="date" value="${todayISO()}"></label>
        <label class="field"><span>Heures</span><input type="number" name="hours" min="0.25" step="0.25" value="${hours}" required></label>
        <label class="field full"><span>Tâche</span><input name="note" placeholder="Ex. écran de connexion, API des posts"></label>
      </div>
      <footer><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn primary" type="submit">Ajouter</button></footer>
    </form>`, {
    onSubmit: async (d) => { if (!(Number(d.hours) > 0)) { toast('Indique un nombre d’heures.', 'error'); return false; } await store.save('time', { projectId, ...d, hours: Number(d.hours) }); toast('Temps ajouté'); },
  });
}

export async function render(root, { query }) {
  let tick;
  const draw = () => {
    const projects = [...store.list('projects')].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const open = query.p ? store.get('projects', query.p) : null;
    const timer = readTimer();
    root.innerHTML = String(html`
      <header class="page-head">
        <div><h1>Projets & temps</h1><p>Note ton temps réel : tu sauras si tes estimations sont justes et quel TJM tu gagnes vraiment.</p></div>
        <div class="actions"><button class="btn primary" data-action="newProject">${icon('plus')}Nouveau projet</button></div>
      </header>
      ${timer ? html`<section class="panel row" style="margin-bottom:20px"><span class="badge ok">Chrono en cours</span><strong>${store.get('projects', timer.projectId)?.name || ''}</strong><span class="timer" id="timer">00:00:00</span><span class="spacer"></span><button class="btn primary" data-action="stop">${icon('stop')}Arrêter et enregistrer</button></section>` : ''}
      <section class="panel">
        ${projects.length ? html`<div class="table-wrap"><table>
          <thead><tr><th>Projet</th><th>Client</th><th>Statut</th><th class="r">Estimé</th><th class="r">Passé</th><th style="min-width:120px">Avancement</th><th class="r">TJM réel</th><th></th></tr></thead>
          <tbody>${projects.map((p) => { const st = projectStats(p); return html`
            <tr>
              <td><a href="#/projets?p=${p.id}"><strong>${p.name}</strong></a></td>
              <td>${p.clientId ? clientName(p.clientId) : '—'}</td>
              <td><span class="badge ${p.status === 'en-cours' ? 'info' : p.status === 'livre' || p.status === 'clos' ? 'ok' : p.status === 'perdu' ? 'danger' : ''}">${STATUSES[p.status] || p.status}</span></td>
              <td class="r num">${p.estimateDays ? `${number(p.estimateDays)} j` : '—'}</td>
              <td class="r num">${number(st.days)} j</td>
              <td><div class="meter ${st.ratio > 1 ? 'danger' : st.ratio > 0.85 ? 'warn' : ''}"><i style="--v:${Math.min(100, st.ratio * 100)}%"></i></div></td>
              <td class="r num">${st.realTjm ? money(st.realTjm) : '—'}</td>
              <td class="r"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap">
                ${!timer ? html`<button class="btn sm" data-action="start" data-id="${p.id}" aria-label="Démarrer le chrono">${icon('play')}</button>` : ''}
                <button class="btn sm" data-action="addTime" data-id="${p.id}">${icon('plus')}Temps</button>
                <button class="btn sm ghost" data-action="edit" data-id="${p.id}" aria-label="Modifier">${icon('edit')}</button>
              </div></td>
            </tr>`; })}</tbody></table></div>`
        : html`<div class="empty"><p>Aucun projet. Un projet est créé automatiquement quand tu transformes une simulation en devis.</p><a class="btn primary" href="#/simulateur">${icon('calc')}Ouvrir le simulateur</a></div>`}
      </section>
      ${open ? detail(open) : ''}`);
    clearInterval(tick);
    if (timer) {
      const el = root.querySelector('#timer');
      const upd = () => { const s = Math.floor((Date.now() - timer.start) / 1000); el.textContent = [s / 3600, (s % 3600) / 60, s % 60].map((n) => String(Math.floor(n)).padStart(2, '0')).join(':'); };
      upd(); tick = setInterval(() => { if (!root.isConnected) clearInterval(tick); else upd(); }, 1000);
    }
  };

  const detail = (p) => {
    const entries = store.list('time').filter((t) => t.projectId === p.id).sort((a, b) => b.date.localeCompare(a.date));
    const st = projectStats(p);
    const docs = store.list('documents').filter((d) => d.projectId === p.id);
    return html`<section class="panel" style="margin-top:20px">
      <header><h2>${p.name}</h2><a class="small" href="#/projets">Fermer</a></header>
      <div class="grid grid-4" style="margin-bottom:16px">
        <div class="kpi"><span class="l">Temps passé</span><span class="v">${number(st.hours)} h</span></div>
        <div class="kpi"><span class="l">Estimation</span><span class="v">${number(p.estimateDays || 0)} j</span></div>
        <div class="kpi"><span class="l">Facturé</span><span class="v">${money(st.invoiced)}</span></div>
        <div class="kpi"><span class="l">TJM réel</span><span class="v">${st.realTjm ? money(st.realTjm) : '—'}</span></div>
      </div>
      ${docs.length ? html`<p class="small">Documents : ${docs.map((d) => html`<a href="#/documents/${d.id}">${d.number || 'brouillon'}</a> `)}</p>` : ''}
      ${entries.length ? html`<ul class="list">${entries.map((t) => html`<li><span class="date">${date(t.date)}</span><span style="flex:1">${t.note || '—'}</span><strong class="num">${number(t.hours)} h</strong><button class="icon-btn" data-action="delTime" data-id="${t.id}" aria-label="Supprimer">${icon('trash')}</button></li>`)}</ul>` : html`<p class="muted small">Aucune saisie de temps.</p>`}
    </section>`;
  };

  draw();
  const unsub = store.subscribe(() => { if (root.isConnected) draw(); else unsub(); });
  onAction(root, {
    newProject: () => projectForm(),
    edit: (el) => projectForm(store.get('projects', el.dataset.id)),
    addTime: (el) => timeForm(el.dataset.id),
    start: (el) => { localStorage.setItem(TIMER_KEY, JSON.stringify({ projectId: el.dataset.id, start: Date.now() })); draw(); },
    stop: () => {
      const t = readTimer();
      localStorage.removeItem(TIMER_KEY);
      const hours = Math.max(0.25, Math.round(((Date.now() - t.start) / 3600000) * 4) / 4);
      draw();
      timeForm(t.projectId, hours);
    },
    delTime: async (el) => { if (await confirmDialog('Supprimer cette saisie de temps ?', { danger: true, ok: 'Supprimer' })) await store.remove('time', el.dataset.id); },
  });
}
