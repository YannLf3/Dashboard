/* ---------------------------------------------------------
   Routeur à base de hash (#/factures/123).
   Le hash ne part jamais au serveur : parfait pour GitHub Pages,
   qui ne sait servir que des fichiers statiques.
   Chaque écran est un module chargé à la demande (import()).
   --------------------------------------------------------- */

export const ROUTES = [
  { path: '/', load: () => import('../modules/home.js') },
  { path: '/checklist', load: () => import('../modules/checklist.js') },
  { path: '/simulateur', load: () => import('../modules/simulator.js') },
  { path: '/simulateur/:id', load: () => import('../modules/simulator.js') },
  { path: '/documents', load: () => import('../modules/documents.js') },
  { path: '/documents/:id', load: () => import('../modules/document-edit.js') },
  { path: '/recettes', load: () => import('../modules/receipts.js') },
  { path: '/finances', load: () => import('../modules/finances.js') },
  { path: '/modeles', load: () => import('../modules/templates.js') },
  { path: '/modeles/:id', load: () => import('../modules/templates.js') },
  { path: '/clients', load: () => import('../modules/clients.js') },
  { path: '/projets', load: () => import('../modules/projects.js') },
  { path: '/parametres', load: () => import('../modules/settings.js') },
];

export function parseHash() {
  const [path, query = ''] = (location.hash.slice(1) || '/').split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(query)) };
}

function match(path) {
  const parts = path.split('/').filter(Boolean);
  for (const route of ROUTES) {
    const rp = route.path.split('/').filter(Boolean);
    if (rp.length !== parts.length) continue;
    const params = {};
    const ok = rp.every((seg, i) => (seg.startsWith(':') ? (params[seg.slice(1)] = decodeURIComponent(parts[i]), true) : seg === parts[i]));
    if (ok) return { route, params };
  }
  return null;
}

export function startRouter(outlet, { onRoute } = {}) {
  let token = 0;
  async function render() {
    const my = ++token;
    const { path, query } = parseHash();
    const found = match(path) || match('/');
    const mod = await found.route.load();
    if (my !== token) return; // une navigation plus récente a eu lieu
    // Nouveau conteneur à chaque écran : les écouteurs d'événements
    // posés par l'écran précédent disparaissent avec son conteneur.
    const view = document.createElement('div');
    outlet.replaceChildren(view);
    window.scrollTo(0, 0);
    outlet.focus({ preventScroll: true });
    await mod.render(view, { ...found.params, query });
    onRoute?.(path, mod.title);
  }
  window.addEventListener('hashchange', render);
  render();
  return { rerender: render };
}

export const go = (hash) => { if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = hash; };
