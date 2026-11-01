/* ---------------------------------------------------------
   Fiches clients (particulier / professionnel)
   --------------------------------------------------------- */
import { store } from '../core/store.js';
import { html, raw, icon, openDialog, onAction, toast, confirmDialog } from '../core/dom.js';
import { money } from '../core/format.js';
import { balance } from './shared.js';

export const title = 'Clients';

const EMPTY = { type: 'b2b', name: '', contactName: '', siren: '', vatNumber: '', email: '', phone: '', address: '', zip: '', city: '', country: 'France', smallBusiness: false, notes: '' };

/* API publique de l'État (gratuite, sans clé) : recherche d'entreprise par SIREN */
async function lookupSiren(siren) {
  const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siren)}&page=1&per_page=1`);
  if (!res.ok) throw new Error('Annuaire indisponible, saisis les informations à la main.');
  const r = (await res.json()).results?.[0];
  if (!r) throw new Error('Aucune entreprise trouvée pour ce SIREN.');
  return {
    name: r.nom_raison_sociale || r.nom_complet || '',
    siren: r.siren,
    address: r.siege?.adresse?.replace(/\s\d{5}\s.*$/, '') || '',
    zip: r.siege?.code_postal || '',
    city: r.siege?.libelle_commune || '',
    active: r.etat_administratif !== 'C',
  };
}

export function clientForm(client = EMPTY, { onSaved } = {}) {
  const c = { ...EMPTY, ...client };
  const dlg = openDialog(html`
    <form class="form" novalidate>
      <header><h2>${c.id ? 'Modifier le client' : 'Nouveau client'}</h2><button type="button" class="icon-btn" data-close aria-label="Fermer">✕</button></header>
      <div class="seg" role="radiogroup" aria-label="Type de client">
        <label><input type="radio" name="type" value="b2b" ${c.type === 'b2b' ? raw('checked') : ''}><span>Professionnel</span></label>
        <label><input type="radio" name="type" value="b2c" ${c.type === 'b2c' ? raw('checked') : ''}><span>Particulier</span></label>
      </div>
      <div class="form-grid">
        <label class="field full b2b-only"><span>SIREN</span>
          <div class="row" style="flex-wrap:nowrap"><input name="siren" value="${c.siren}" inputmode="numeric" maxlength="11" autocomplete="off"><button type="button" class="btn" id="lookup">${icon('search')}Remplir</button></div>
          <small class="hint">Récupère nom et adresse sur l’annuaire officiel des entreprises.</small>
        </label>
        <label class="field full"><span id="nameLabel">${c.type === 'b2b' ? 'Raison sociale' : 'Nom et prénom'}</span><input name="name" value="${c.name}" required></label>
        <label class="field b2b-only"><span>Contact</span><input name="contactName" value="${c.contactName}"></label>
        <label class="field b2b-only"><span>N° TVA intracommunautaire</span><input name="vatNumber" value="${c.vatNumber}"></label>
        <label class="field"><span>Email</span><input name="email" type="email" value="${c.email}"></label>
        <label class="field"><span>Téléphone</span><input name="phone" type="tel" value="${c.phone}"></label>
        <label class="field full"><span>Adresse</span><input name="address" value="${c.address}"></label>
        <label class="field"><span>Code postal</span><input name="zip" value="${c.zip}"></label>
        <label class="field"><span>Ville</span><input name="city" value="${c.city}"></label>
        <label class="check full b2b-only"><input type="checkbox" name="smallBusiness" ${c.smallBusiness ? raw('checked') : ''}><span>Entreprise de 5 salariés ou moins, projet hors de son cœur de métier<br><small class="muted">Elle bénéficie alors du droit de rétractation de 14 jours (art. L221-3 C. conso).</small></span></label>
        <label class="field full"><span>Notes</span><textarea name="notes" rows="2">${c.notes}</textarea></label>
      </div>
      <footer><button type="button" class="btn ghost" data-close>Annuler</button><button class="btn primary" type="submit">Enregistrer</button></footer>
    </form>`, {
    onSubmit: async (data) => {
      if (!data.name) { toast('Le nom est obligatoire.', 'error'); return false; }
      data.siren = String(data.siren || '').replace(/\s/g, '');
      const saved = await store.save('clients', { ...c, ...data });
      toast('Client enregistré');
      onSaved?.(saved);
    },
  });
  const sync = () => {
    const b2b = dlg.querySelector('[name="type"]:checked').value === 'b2b';
    dlg.querySelectorAll('.b2b-only').forEach((el) => { el.hidden = !b2b; });
    dlg.querySelector('#nameLabel').textContent = b2b ? 'Raison sociale' : 'Nom et prénom';
  };
  dlg.querySelectorAll('[name="type"]').forEach((r) => r.addEventListener('change', sync));
  sync();
  dlg.querySelector('#lookup').addEventListener('click', async () => {
    const siren = dlg.querySelector('[name="siren"]').value.replace(/\s/g, '');
    if (!/^\d{9}$/.test(siren)) { toast('Un SIREN contient 9 chiffres.', 'error'); return; }
    try {
      const r = await lookupSiren(siren);
      ['name', 'address', 'zip', 'city'].forEach((k) => { if (r[k]) dlg.querySelector(`[name="${k}"]`).value = r[k]; });
      toast(r.active ? 'Informations récupérées' : 'Attention : cette entreprise est indiquée comme fermée.', r.active ? 'ok' : 'error');
    } catch (err) { toast(err.message, 'error'); }
  });
  return dlg;
}

export async function render(root) {
  const draw = () => {
    const clients = [...store.list('clients')].sort((a, b) => a.name.localeCompare(b.name));
    root.innerHTML = String(html`
      <header class="page-head">
        <div><h1>Clients</h1><p>Le type (particulier ou professionnel) adapte automatiquement les mentions de tes devis, factures et CGV.</p></div>
        <div class="actions"><button class="btn primary" data-action="new">${icon('plus')}Nouveau client</button></div>
      </header>
      <section class="panel">
        ${clients.length ? html`<div class="table-wrap"><table>
          <thead><tr><th>Client</th><th>Type</th><th>SIREN</th><th>Ville</th><th class="r">Documents</th><th class="r">Reste dû</th><th></th></tr></thead>
          <tbody>${clients.map((c) => {
            const docs = store.list('documents').filter((d) => d.clientId === c.id);
            const due = docs.filter((d) => d.kind === 'facture' && d.status === 'emise').reduce((s, d) => s + Math.max(0, balance(d)), 0);
            return html`<tr>
              <td><strong>${c.name}</strong>${c.contactName ? html`<br><small class="muted">${c.contactName}</small>` : ''}</td>
              <td><span class="badge ${c.type === 'b2b' ? 'info' : 'warn'}">${c.type === 'b2b' ? 'Pro' : 'Particulier'}</span></td>
              <td class="num">${c.siren || (c.type === 'b2b' ? html`<span class="badge warn">À compléter</span>` : '—')}</td>
              <td>${c.city || '—'}</td>
              <td class="r num">${docs.length}</td>
              <td class="r num">${due ? money(due) : '—'}</td>
              <td class="r"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap">
                <a class="btn sm" href="#/documents?client=${c.id}">Documents</a>
                <button class="btn sm" data-action="edit" data-id="${c.id}">${icon('edit')}Modifier</button>
                <button class="btn sm ghost danger" data-action="del" data-id="${c.id}" aria-label="Supprimer ${c.name}">${icon('trash')}</button>
              </div></td>
            </tr>`;
          })}</tbody></table></div>`
        : html`<div class="empty"><p>Aucun client pour l’instant.</p><button class="btn primary" data-action="new">${icon('plus')}Ajouter ta cliente</button></div>`}
      </section>`);
  };
  draw();
  const unsub = store.subscribe(() => { if (root.isConnected) draw(); else unsub(); });
  onAction(root, {
    new: () => clientForm(),
    edit: (el) => clientForm(store.get('clients', el.dataset.id)),
    del: async (el) => {
      const c = store.get('clients', el.dataset.id);
      if (store.list('documents').some((d) => d.clientId === c.id)) { toast('Ce client a des documents : il ne peut pas être supprimé.', 'error'); return; }
      if (await confirmDialog(`Supprimer ${c.name} ?`, { danger: true, ok: 'Supprimer' })) { await store.remove('clients', c.id); toast('Client supprimé'); }
    },
  });
}
