/* ---------------------------------------------------------
   Point d'entrée : thème, authentification, navigation.
   --------------------------------------------------------- */
import { db } from './core/db.js';
import { store } from './core/store.js';
import { startRouter, parseHash } from './core/router.js';
import { $, html, icon, toast, openDialog, readForm } from './core/dom.js';
import { overdueInvoices } from './modules/shared.js';

const NAV = [
  { group: 'Pilotage', items: [
    { href: '#/', label: 'Accueil', icon: 'home' },
    { href: '#/finances', label: 'Finances & URSSAF', icon: 'chart' },
  ] },
  { group: 'Projets', items: [
    { href: '#/clients', label: 'Clients', icon: 'users' },
    { href: '#/simulateur', label: 'Simulateur de prix', icon: 'calc' },
    { href: '#/projets', label: 'Projets & temps', icon: 'clock' },
  ] },
  { group: 'Facturation', items: [
    { href: '#/documents', label: 'Devis & factures', icon: 'file', count: () => overdueInvoices().length },
    { href: '#/recettes', label: 'Livre des recettes', icon: 'book' },
  ] },
  { group: 'Conformité', items: [
    { href: '#/checklist', label: 'Checklist légale', icon: 'shield' },
    { href: '#/modeles', label: 'Modèles de documents', icon: 'doc' },
  ] },
  { group: 'Réglages', items: [
    { href: '#/parametres', label: 'Paramètres & sauvegarde', icon: 'gear' },
  ] },
];

/* ---------- Thème clair / sombre ---------- */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('yl-theme', theme); } catch {}
  $('.theme-label').textContent = theme === 'dark' ? 'Thème clair' : 'Thème sombre';
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#0b1712' : '#eef4f0';
}

/* ---------- Navigation ---------- */
function renderNav() {
  const current = '#' + parseHash().path;
  $('#nav').innerHTML = NAV.map((g) => html`
    <div class="nav-group"><span>${g.group}</span>
      ${g.items.map((it) => {
        const n = it.count?.() || 0;
        const active = it.href === current || (it.href !== '#/' && current.startsWith(it.href));
        return html`<a href="${it.href}" ${active ? html`aria-current="page"` : ''}>${icon(it.icon)}<span>${it.label}</span>${n ? html`<b class="count" aria-label="${n} en retard">${n}</b>` : ''}</a>`;
      })}
    </div>`).join('');
  $('#brandName').textContent = store.settings.identity.tradeName || 'Freelance';
  const pill = $('#modePill');
  pill.textContent = db.mode === 'cloud' ? `Synchronisé · ${db.user?.email || ''}` : 'Mode local (cet appareil)';
  pill.classList.toggle('cloud', db.mode === 'cloud');
}

function setupShell() {
  const sidebar = $('#sidebar'), scrim = $('#scrim'), menuBtn = $('#menuBtn');
  const close = () => { sidebar.classList.remove('open'); scrim.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', () => { sidebar.classList.add('open'); scrim.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); });
  scrim.addEventListener('click', close);
  sidebar.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
  $('#themeBtn').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  applyTheme(document.documentElement.dataset.theme || 'dark');
}

async function showApp() {
  $('#auth').hidden = true;
  $('#app').hidden = false;
  await store.load();
  renderNav();
  const router = startRouter($('#main'), {
    onRoute: (path, title) => { renderNav(); $('#topbarTitle').textContent = title || 'Cockpit'; document.title = `${title || 'Accueil'} · Cockpit`; },
  });
  store.subscribe(renderNav);

  // Multi-appareils : quand l'app revient au premier plan, on recharge
  // les données (ex. facture créée sur le Mac, consultée sur l'iPhone).
  let lastLoad = Date.now();
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || db.mode !== 'cloud' || Date.now() - lastLoad < 30000) return;
    lastLoad = Date.now();
    try { await store.load(); router.rerender(); } catch (e) { toast(e.message, 'error'); }
  });
}

/* ---------- Connexion (mode cloud) ---------- */
function showAuth(mode = 'signin') {
  $('#app').hidden = true;
  const box = $('#auth');
  box.hidden = false;
  const titles = { signin: 'Connexion', signup: 'Créer mon compte', reset: 'Mot de passe oublié' };
  box.innerHTML = String(html`
    <form class="panel form" novalidate>
      <div class="brand"><img src="icons/icon.svg" alt="" width="38" height="38"><div><strong>Cockpit</strong><span>Espace freelance privé</span></div></div>
      <h1>${titles[mode]}</h1>
      <label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" required></label>
      ${mode !== 'reset' ? html`<label class="field"><span>Mot de passe</span><input name="password" type="password" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" minlength="8" required></label>` : ''}
      <button class="btn primary" type="submit">${mode === 'signin' ? 'Se connecter' : mode === 'signup' ? 'Créer le compte' : 'Envoyer le lien'}</button>
      <div class="row small">
        ${mode !== 'signin' ? html`<a href="#" data-mode="signin">J’ai déjà un compte</a>` : html`<a href="#" data-mode="reset">Mot de passe oublié</a><span class="spacer"></span><a href="#" data-mode="signup">Créer mon compte</a>`}
      </div>
      <p class="small muted">Après avoir créé ton compte, désactive les inscriptions dans Supabase (voir README) : personne d’autre ne pourra en créer.</p>
    </form>`);
  box.querySelectorAll('[data-mode]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); showAuth(a.dataset.mode); }));
  box.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { email, password } = readForm(e.target);
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      if (mode === 'signin') { await db.signIn(email, password); await showApp(); }
      else if (mode === 'signup') { await db.signUp(email, password); toast('Compte créé. Confirme ton email via le lien reçu, puis connecte-toi.'); showAuth('signin'); }
      else { await db.resetPassword(email); toast('Lien envoyé, vérifie ta boîte mail.'); showAuth('signin'); }
    } catch (err) { toast(err.message, 'error'); } finally { btn.disabled = false; }
  });
}

async function boot() {
  setupShell();
  try {
    await db.init();
  } catch (e) {
    document.body.innerHTML = `<p style="padding:24px">Impossible de joindre Supabase : ${e.message}. Vérifie ta connexion ou js/config.js.</p>`;
    return;
  }
  if (db.mode === 'cloud') {
    db.onAuthChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        openDialog(html`<form class="form"><header><h2>Nouveau mot de passe</h2></header>
          <label class="field"><span>Mot de passe (8 caractères min.)</span><input name="password" type="password" minlength="8" required autocomplete="new-password"></label>
          <footer><button class="btn primary" type="submit">Enregistrer</button></footer></form>`,
        { onSubmit: async ({ password }) => { await db.updatePassword(password); toast('Mot de passe mis à jour.'); } });
      }
      if (event === 'SIGNED_OUT') location.reload();
    });
    if (!db.user) return showAuth('signin');
  }
  await showApp();
}

boot();

/* Service worker : met l'app en cache pour l'ouvrir même hors ligne */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

