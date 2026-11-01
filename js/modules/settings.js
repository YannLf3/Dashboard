/* ---------------------------------------------------------
   Paramètres : identité, régime fiscal, facturation, données.
   --------------------------------------------------------- */
import { store } from '../core/store.js';
import { db, localDb } from '../core/db.js';
import { html, raw, icon, readForm, toast, downloadFile, confirmDialog, getPath } from '../core/dom.js';
import { pct, todayISO, date } from '../core/format.js';
import { ACTIVITY_LABELS, LEGAL, socialRateFor, defaultAcreEnd } from '../data/legal.js';

export const title = 'Paramètres';

/* Le SIRET (14 chiffres) se vérifie avec l'algorithme de Luhn,
   comme les numéros de carte bancaire. */
export function isValidSiret(v) {
  const s = String(v || '').replace(/\s/g, '');
  if (!/^\d{14}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let n = Number(s[13 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}

export async function render(root) {
  const s = store.settings;
  const f = (name, label, { type = 'text', hint = '', full = false, attrs = '' } = {}) => html`
    <label class="field ${full ? 'full' : ''}"><span>${label}</span>
      <input name="${name}" type="${type}" value="${getPath(s, name) ?? ''}" ${raw(attrs)}>
      ${hint ? html`<small class="hint">${hint}</small>` : ''}
    </label>`;
  const acreEnd = s.regime.creationDate ? defaultAcreEnd(s.regime.creationDate) : '';
  const rateNow = socialRateFor(s, todayISO());

  root.innerHTML = String(html`
    <header class="page-head">
      <div><h1>Paramètres</h1><p>Ces informations alimentent tes devis, factures, modèles et calculs de cotisations.</p></div>
    </header>
    <form id="settingsForm" class="stack" novalidate>
      <section class="panel">
        <h2>Ton identité d’entrepreneur</h2>
        <div class="form-grid">
          ${f('identity.firstName', 'Prénom')}
          ${f('identity.lastName', 'Nom')}
          ${f('identity.tradeName', 'Nom commercial', { hint: 'Apparaît sous ton nom suivi de « EI ».' })}
          ${f('identity.siret', 'SIRET (14 chiffres)', { attrs: 'inputmode="numeric" autocomplete="off"' })}
          ${f('identity.address', 'Adresse', { full: true, attrs: 'autocomplete="street-address"' })}
          ${f('identity.zip', 'Code postal', { attrs: 'inputmode="numeric" autocomplete="postal-code"' })}
          ${f('identity.city', 'Ville', { attrs: 'autocomplete="address-level2"' })}
          ${f('identity.email', 'Email professionnel', { type: 'email' })}
          ${f('identity.phone', 'Téléphone', { type: 'tel' })}
          ${f('identity.website', 'Site web', { type: 'url' })}
          ${f('identity.ape', 'Code APE', { hint: 'Ex. 6201Z (programmation informatique).' })}
        </div>
      </section>

      <section class="panel">
        <h2>Coordonnées bancaires (affichées sur les factures)</h2>
        <div class="form-grid">
          ${f('identity.iban', 'IBAN', { full: true, attrs: 'autocomplete="off"' })}
          ${f('identity.bic', 'BIC')}
          ${f('identity.bankName', 'Banque')}
        </div>
      </section>

      <section class="panel">
        <h2>Régime fiscal et social</h2>
        <div class="form-grid">
          <label class="field"><span>Catégorie d’activité</span>
            <select name="regime.activity">${Object.entries(ACTIVITY_LABELS).map(([v, l]) => html`<option value="${v}" ${s.regime.activity === v ? raw('selected') : ''}>${l}</option>`)}</select>
            <small class="hint">Développeur web : le plus souvent BNC. Vérifie sur ton espace URSSAF.</small>
          </label>
          ${f('regime.creationDate', 'Date de début d’activité', { type: 'date' })}
          <label class="check full"><input type="checkbox" name="regime.acre" ${s.regime.acre ? raw('checked') : ''}><span>Je bénéficie de l’ACRE<br><small class="muted">Création avant le 01/07/2026 : tu paies 50 % du taux ; à partir de cette date : 75 %.</small></span></label>
          ${f('regime.acreEndDate', 'Fin de l’ACRE (si différente)', { type: 'date', hint: acreEnd ? `Calcul par défaut : ${date(acreEnd)} (fin du 3e trimestre civil suivant le début).` : 'Renseigne d’abord ta date de début.' })}
          <label class="field"><span>Taux actuel appliqué</span><input value="${pct(rateNow)} de cotisations sociales" readonly></label>
          <label class="check full"><input type="checkbox" name="regime.vatFranchise" ${s.regime.vatFranchise ? raw('checked') : ''}><span>Je suis en franchise de TVA<br><small class="muted">Cas par défaut. Décoche seulement si tu factures la TVA (dépassement du seuil ou option).</small></span></label>
          ${f('regime.vatRate', 'Taux de TVA si applicable (%)', { type: 'number', attrs: 'step="0.1" min="0"' })}
          <label class="check full"><input type="checkbox" name="regime.versementLiberatoire" ${s.regime.versementLiberatoire ? raw('checked') : ''}><span>J’ai opté pour le versement libératoire de l’impôt</span></label>
          ${f('regime.socialRateOverride', 'Forcer le taux de cotisations (%)', { type: 'number', hint: `Vide = taux officiel ${LEGAL.checkedOn.slice(0, 4)}.`, attrs: 'step="0.01" min="0"' })}
          ${f('regime.cfpRateOverride', 'Forcer le taux de CFP (%)', { type: 'number', hint: 'Vide = 0,2 % (BNC) ou 0,1 % (BIC).', attrs: 'step="0.01" min="0"' })}
        </div>
      </section>

      <section class="panel">
        <h2>Facturation</h2>
        <div class="form-grid">
          ${f('invoicing.lastInvoiceSeq', 'Dernier numéro de facture émis hors dashboard', { type: 'number', hint: 'Tu as émis 0001_010926 : laisse 1. La prochaine sera 0002_JJMMAA.', attrs: 'min="0" step="1"' })}
          ${f('invoicing.lastInvoiceDate', 'Date de cette facture', { type: 'date' })}
          ${f('invoicing.paymentTermsDays', 'Délai de paiement (jours)', { type: 'number', hint: 'Entre pros : 30 jours par défaut, 60 jours maximum.', attrs: 'min="0" max="60"' })}
          ${f('invoicing.depositPercent', 'Acompte par défaut (%)', { type: 'number', attrs: 'min="0" max="100"' })}
          ${f('invoicing.quoteValidityDays', 'Validité des devis (jours)', { type: 'number', attrs: 'min="1"' })}
          ${f('invoicing.latePenaltyRate', 'Taux des pénalités pour le calcul (%/an)', { type: 'number', hint: 'Taux BCE + 10 points : 12,15 % au 1er semestre 2026.', attrs: 'step="0.01"' })}
          ${f('invoicing.extraMention', 'Mention complémentaire (facultatif)', { full: true })}
        </div>
      </section>

      <section class="panel">
        <h2>Médiateur de la consommation</h2>
        <p class="small muted">Obligatoire seulement si tu travailles pour des particuliers. <a href="${LEGAL.sources.mediator}" target="_blank" rel="noopener">Liste officielle</a>.</p>
        <div class="form-grid">
          ${f('mediator.name', 'Nom du médiateur')}
          ${f('mediator.website', 'Site web', { type: 'url' })}
          ${f('mediator.address', 'Adresse postale', { full: true })}
        </div>
      </section>

      <section class="panel">
        <h2>Tarif et disponibilité</h2>
        <div class="form-grid">
          ${f('pricing.tjm', 'TJM par défaut (€ / jour)', { type: 'number', attrs: 'min="0" step="5"' })}
          ${f('pricing.hoursPerDay', 'Heures dans une journée facturée', { type: 'number', attrs: 'min="1" max="12" step="0.5"' })}
          ${f('pricing.hoursPerWeek', 'Heures disponibles par semaine', { type: 'number', hint: 'Sert à convertir les jours en délai réel.', attrs: 'min="1" step="0.5"' })}
          ${f('pricing.contingencyPct', 'Marge d’imprévus par défaut (%)', { type: 'number', attrs: 'min="0" max="100"' })}
          ${f('pricing.pmPct', 'Gestion de projet par défaut (%)', { type: 'number', attrs: 'min="0" max="100"' })}
          ${f('goals.yearlyRevenue', 'Objectif de CA annuel (€)', { type: 'number', attrs: 'min="0" step="100"' })}
        </div>
      </section>

      <div class="row" style="position:sticky;bottom:12px;justify-content:flex-end">
        <button class="btn primary" type="submit">${icon('check')}Enregistrer les paramètres</button>
      </div>
    </form>

    <section class="panel" style="margin-top:20px" id="data">
      <h2>Sauvegarde et données</h2>
      <p class="small muted">Stockage actuel : <strong>${db.mode === 'cloud' ? `Supabase (synchronisé, connecté en tant que ${db.user?.email})` : 'local, dans ce navigateur uniquement'}</strong>.
      ${db.mode === 'local' ? 'Pour synchroniser Mac, iPhone et iPad, configure Supabase (README).' : ''}</p>
      <div class="row">
        <button class="btn" data-act="export">${icon('download')}Exporter une sauvegarde (.json)</button>
        <label class="btn">${icon('upload')}Importer une sauvegarde<input type="file" accept="application/json" id="importFile" hidden></label>
        ${db.mode === 'cloud' && localDb.hasData() ? html`<button class="btn" data-act="migrate">${icon('upload')}Envoyer mes données locales vers Supabase</button>` : ''}
        ${db.mode === 'cloud' ? html`<span class="spacer"></span><button class="btn danger" data-act="logout">Se déconnecter</button>` : ''}
      </div>
    </section>`);

  const form = root.querySelector('#settingsForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = readForm(form);
    const siret = String(data.identity.siret || '').replace(/\s/g, '');
    data.identity.siret = siret;
    if (siret && !isValidSiret(siret)) toast('Attention : ce SIRET ne passe pas le contrôle de validité. Vérifie-le.', 'error');
    try { await store.saveSettings(data); toast('Paramètres enregistrés'); render(root); } catch (err) { toast(err.message, 'error'); }
  });

  root.querySelector('#data').addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'export') {
      downloadFile(`cockpit-sauvegarde-${todayISO()}.json`, JSON.stringify(store.exportAll(), null, 2), 'application/json');
      toast('Sauvegarde téléchargée');
    }
    if (act === 'logout') await db.signOut();
    if (act === 'migrate') {
      if (!(await confirmDialog('Les données de ce navigateur vont être copiées dans ton compte Supabase. Les éléments ayant le même identifiant seront remplacés.', { title: 'Envoyer vers Supabase', ok: 'Envoyer' }))) return;
      const all = await localDb.loadAll();
      await store.importAll({ app: 'cockpit-yannlf3', data: all });
      toast('Données envoyées vers Supabase'); render(root);
    }
  });
  root.querySelector('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (!(await confirmDialog(`Importer la sauvegarde du ${date(payload.exportedAt?.slice(0, 10))} ? Les éléments ayant le même identifiant seront remplacés.`, { title: 'Importer', ok: 'Importer' }))) return;
      await store.importAll(payload);
      toast('Sauvegarde importée'); render(root);
    } catch (err) { toast(err.message || 'Fichier illisible', 'error'); }
  });
}
