/* ---------------------------------------------------------
   M2 — Simulateur de prix (TJM libre)
   Prix = jours × TJM. Les jours = production + gestion de
   projet + marge d'imprévus. Le délai réel dépend de ton
   temps disponible par semaine (études + freelance).
   --------------------------------------------------------- */
import { store } from '../core/store.js';
import { html, raw, icon, onAction, toast, confirmDialog } from '../core/dom.js';
import { money, money0, number, todayISO, addDays, dateLong, round2, uid } from '../core/format.js';
import { CATEGORIES, ALL_FEATURES, midpoint } from '../data/features.js';
import { chargesFor, LEGAL } from '../data/legal.js';
import { newDocument, receiptsList } from './shared.js';

export const title = 'Simulateur de prix';

function defaultSim() {
  const p = store.settings.pricing;
  return {
    name: 'Réseau social — MVP', clientId: '', tjm: p.tjm, pmPct: p.pmPct, contingencyPct: p.contingencyPct, discountPct: 0,
    features: Object.fromEntries(ALL_FEATURES.map((f) => [f.id, { on: Boolean(f.mvp), days: midpoint(f) }])),
    custom: [], maintenanceDays: 1, schedule: '30/40/30', lineMode: 'lot', notes: '',
  };
}

const half = (n) => Math.round(n * 2) / 2;

export function computeSim(sim, settings = store.settings) {
  const sel = ALL_FEATURES.filter((f) => sim.features[f.id]?.on);
  const custom = sim.custom.filter((c) => c.on !== false && c.label);
  const prod = sel.reduce((s, f) => s + Number(sim.features[f.id].days || 0), 0) + custom.reduce((s, c) => s + Number(c.days || 0), 0);
  const pm = prod * Number(sim.pmPct || 0) / 100;
  const cont = (prod + pm) * Number(sim.contingencyPct || 0) / 100;
  const days = half(prod + pm + cont);
  const tjm = Number(sim.tjm) || 0;
  const gross = round2(days * tjm);
  const discount = round2(gross * Number(sim.discountPct || 0) / 100);
  const priceHT = round2(gross - discount);
  const vatOn = !settings.regime.vatFranchise;
  const ttc = vatOn ? round2(priceHT * (1 + settings.regime.vatRate / 100)) : priceHT;
  const charges = chargesFor(settings, priceHT, todayISO());
  const hours = days * Number(settings.pricing.hoursPerDay || 7);
  const weeks = hours / Math.max(1, Number(settings.pricing.hoursPerWeek || 7.5));
  const legalOff = ALL_FEATURES.filter((f) => f.legal && !sim.features[f.id]?.on);
  const cashedYear = receiptsList({ year: todayISO().slice(0, 4) }).reduce((s, r) => s + r.amount, 0);
  return {
    sel, custom, prod: round2(prod), pm: round2(pm), cont: round2(cont), days, tjm, gross, discount, priceHT, ttc, vatOn,
    charges, net: round2(priceHT - charges.total), hours, weeks, end: addDays(todayISO(), Math.ceil(weeks * 7)),
    hourly: tjm / Number(settings.pricing.hoursPerDay || 7), maintenance: round2(Number(sim.maintenanceDays || 0) * tjm),
    legalOff, cashedYear,
  };
}

export async function render(root, { id }) {
  let sim = id ? structuredClone(store.get('simulations', id) || defaultSim()) : defaultSim();
  // complète une simulation ancienne avec les nouvelles fonctionnalités du catalogue
  ALL_FEATURES.forEach((f) => { sim.features[f.id] ??= { on: false, days: midpoint(f) }; });

  function draw() {
    const sims = [...store.list('simulations')].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const clients = [...store.list('clients')].sort((a, b) => a.name.localeCompare(b.name));
    root.innerHTML = String(html`
      <header class="page-head">
        <div><h1>Simulateur de prix</h1><p>Coche les fonctionnalités demandées, ajuste les jours : le prix, ton net estimé et le délai réel se mettent à jour.</p></div>
        <div class="actions">
          ${sims.length ? html`<select id="loadSim" aria-label="Ouvrir une simulation" style="width:auto"><option value="">Ouvrir une simulation…</option>${sims.map((x) => html`<option value="${x.id}" ${x.id === sim.id ? raw('selected') : ''}>${x.name}</option>`)}</select>` : ''}
          <button class="btn" data-action="reset">${icon('plus')}Nouvelle</button>
        </div>
      </header>
      <div class="split">
        <form class="stack" id="simForm" novalidate>
          <section class="panel">
            <div class="form-grid">
              <label class="field"><span>Nom de la simulation</span><input name="name" value="${sim.name}"></label>
              <label class="field"><span>Client</span><select name="clientId"><option value="">—</option>${clients.map((c) => html`<option value="${c.id}" ${sim.clientId === c.id ? raw('selected') : ''}>${c.name}</option>`)}</select></label>
              <label class="field"><span>TJM (€ / jour)</span><input type="number" name="tjm" min="0" step="5" value="${sim.tjm}"><small class="hint">Libre. Repère : 200 à 300 € pour un premier projet, à remonter avec l’expérience.</small></label>
              <label class="field"><span>Ajuster rapidement</span><input type="range" name="tjmRange" min="100" max="900" step="10" value="${Math.min(900, Math.max(100, sim.tjm))}" aria-label="Curseur de TJM"></label>
              <label class="field"><span>Gestion de projet (%)</span><input type="number" name="pmPct" min="0" max="100" value="${sim.pmPct}"><small class="hint">Réunions, emails, suivi : souvent 10 à 15 %.</small></label>
              <label class="field"><span>Marge d’imprévus (%)</span><input type="number" name="contingencyPct" min="0" max="100" value="${sim.contingencyPct}"><small class="hint">20 % ou plus si la stack est nouvelle pour toi.</small></label>
              <label class="field"><span>Remise commerciale (%)</span><input type="number" name="discountPct" min="0" max="100" value="${sim.discountPct}"></label>
              <label class="field"><span>Échéancier de paiement (%)</span><input name="schedule" value="${sim.schedule}" placeholder="30/40/30"><small class="hint">Acompte / jalon / solde.</small></label>
            </div>
          </section>

          ${CATEGORIES.map((cat) => html`
            <section class="panel">
              <header><h2>${cat.label}</h2><span class="small muted" data-cat="${cat.id}"></span></header>
              ${cat.items.map((f) => { const st = sim.features[f.id]; return html`
                <div class="feat ${st.on ? '' : 'off'}" data-row="${f.id}">
                  <input type="checkbox" data-feat="${f.id}" ${st.on ? raw('checked') : ''} aria-labelledby="fl-${f.id}">
                  <div><div class="name" id="fl-${f.id}">${f.label} ${f.legal ? html`<span class="badge warn">Légal / stores</span>` : ''}</div><div class="desc">${f.desc} <span class="num">(${number(f.min)} à ${number(f.max)} j)</span></div></div>
                  <label class="row" style="flex-wrap:nowrap"><input type="number" data-days="${f.id}" min="0" step="0.5" value="${st.days}" aria-label="Jours pour ${f.label}"><span class="small muted">j</span></label>
                </div>`; })}
            </section>`)}

          <section class="panel">
            <header><h2>Fonctionnalités sur mesure</h2><button type="button" class="btn sm" data-action="addCustom">${icon('plus')}Ajouter</button></header>
            ${sim.custom.length ? sim.custom.map((c, i) => html`
              <div class="feat">
                <input type="checkbox" data-custom-on="${i}" ${c.on !== false ? raw('checked') : ''} aria-label="Inclure">
                <input data-custom-label="${i}" value="${c.label}" placeholder="Ex. Événements et invitations">
                <div class="row" style="flex-wrap:nowrap"><input type="number" data-custom-days="${i}" min="0" step="0.5" value="${c.days}" aria-label="Jours"><button type="button" class="icon-btn" data-action="delCustom" data-i="${i}" aria-label="Retirer">${icon('trash')}</button></div>
              </div>`) : html`<p class="small muted">Ajoute ici toute demande spécifique de ta cliente.</p>`}
          </section>

          <section class="panel form">
            <label class="field"><span>Maintenance proposée (jours par mois)</span><input type="number" name="maintenanceDays" min="0" step="0.25" value="${sim.maintenanceDays}"><small class="hint">Mises à jour de sécurité, corrections, petites évolutions. À vendre dans un devis séparé.</small></label>
            <label class="field"><span>Notes</span><textarea name="notes" rows="3">${sim.notes}</textarea></label>
          </section>
        </form>
        <aside class="panel sticky" id="summary"></aside>
      </div>
      <a class="sim-pill" href="#" id="simPill" aria-label="Voir l’estimation"></a>`);
    drawSummary();
    root.querySelector('#loadSim')?.addEventListener('change', (e) => { if (e.target.value) location.hash = `#/simulateur/${e.target.value}`; });
  }

  function drawSummary() {
    const r = computeSim(sim);
    const s = store.settings;
    CATEGORIES.forEach((cat) => {
      const el = root.querySelector(`[data-cat="${cat.id}"]`);
      if (el) el.textContent = `${number(cat.items.filter((f) => sim.features[f.id].on).reduce((a, f) => a + Number(sim.features[f.id].days || 0), 0))} j`;
    });
    const parts = String(sim.schedule || '').split('/').map(Number).filter((n) => n > 0);
    const vatBase = LEGAL.vatFranchise.services.base;
    root.querySelector('#summary').innerHTML = String(html`
      <h2 style="margin-bottom:10px">Estimation</h2>
      <div class="total-line"><span>Production</span><span class="num">${number(r.prod)} j</span></div>
      <div class="total-line"><span>Gestion de projet</span><span class="num">${number(r.pm)} j</span></div>
      <div class="total-line"><span>Imprévus</span><span class="num">${number(r.cont)} j</span></div>
      <div class="total-line"><strong>Total facturé</strong><strong class="num">${number(r.days)} jours</strong></div>
      <div class="total-line"><span>× TJM</span><span class="num">${money(r.tjm)}</span></div>
      ${r.discount ? html`<div class="total-line"><span>Remise</span><span class="num">−${money(r.discount)}</span></div>` : ''}
      <div class="total-line big"><span>Prix ${r.vatOn ? 'HT' : ''}</span><span class="num">${money0(r.priceHT)}</span></div>
      ${r.vatOn ? html`<div class="total-line"><span>TTC</span><span class="num">${money0(r.ttc)}</span></div>` : html`<p class="small muted" style="margin:2px 0 8px">TVA non applicable (franchise)</p>`}
      <div class="total-line"><span>Cotisations et CFP estimées</span><span class="num">−${money0(r.charges.total)}</span></div>
      <div class="total-line"><strong>Net estimé avant impôt</strong><strong class="num" style="color:var(--accent)">${money0(r.net)}</strong></div>
      <div class="total-line"><span>Taux horaire équivalent</span><span class="num">${money(r.hourly)}</span></div>

      <h3 style="margin:16px 0 6px">Délai réel</h3>
      <p class="small">${number(Math.round(r.hours))} h de travail à ${number(s.pricing.hoursPerWeek)} h/semaine = <strong>${number(Math.ceil(r.weeks))} semaines</strong>, soit une livraison vers le <strong>${dateLong(r.end)}</strong>.</p>
      ${parts.length ? html`<h3 style="margin:14px 0 6px">Échéancier</h3>${parts.map((p, i) => html`<div class="total-line"><span>${i === 0 ? 'Acompte à la signature' : i === parts.length - 1 ? 'Solde à la livraison' : `Jalon ${i}`} (${p} %)</span><span class="num">${money0(r.priceHT * p / 100)}</span></div>`)}` : ''}
      ${r.maintenance ? html`<div class="total-line"><span>Maintenance mensuelle</span><span class="num">${money0(r.maintenance)} / mois</span></div>` : ''}

      <div class="stack" style="gap:10px;margin-top:14px">
        ${r.legalOff.length ? html`<div class="callout danger">${icon('alert')}<p>Fonctions exigées par la loi ou les stores non incluses : ${r.legalOff.map((f) => f.label).join(', ')}.</p></div>` : ''}
        ${r.weeks > 26 ? html`<div class="callout warn">${icon('clock')}<p>Plus de 6 mois de délai à ton rythme actuel : propose un découpage en lots (MVP puis évolutions).</p></div>` : ''}
        ${r.cashedYear + r.priceHT > vatBase ? html`<div class="callout warn">${icon('alert')}<p>Encaissé sur une seule année, ce montant te ferait dépasser le seuil de franchise de TVA (${money0(vatBase)}). Étale l’échéancier sur deux années civiles ou anticipe la TVA.</p></div>` : ''}
        ${parts.length && parts.reduce((a, b) => a + b, 0) !== 100 ? html`<div class="callout warn">${icon('alert')}<p>L’échéancier totalise ${parts.reduce((a, b) => a + b, 0)} % au lieu de 100 %.</p></div>` : ''}
        ${r.tjm < 200 ? html`<div class="callout">${icon('info')}<p>Un TJM sous 200 € couvre difficilement tes cotisations, ton matériel et les périodes sans client.</p></div>` : ''}
        <label class="field"><span>Lignes du devis</span><select id="lineMode"><option value="lot" ${sim.lineMode === 'lot' ? raw('selected') : ''}>Une ligne par lot</option><option value="feat" ${sim.lineMode === 'feat' ? raw('selected') : ''}>Une ligne par fonctionnalité</option></select></label>
        <button class="btn" data-action="save">${icon('check')}Enregistrer la simulation</button>
        <button class="btn primary" data-action="toQuote">${icon('file')}Créer le devis</button>
      </div>`);
    root.querySelector('#lineMode').addEventListener('change', (e) => { sim.lineMode = e.target.value; });
    const pill = root.querySelector('#simPill');
    pill.textContent = `${number(r.days)} j · ${money0(r.priceHT)} · ${Math.ceil(r.weeks)} sem.`;
    pill.onclick = (e) => { e.preventDefault(); root.querySelector('#summary').scrollIntoView({ behavior: 'smooth' }); };
  }

  root.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.feat) { sim.features[el.dataset.feat].on = el.checked; el.closest('.feat').classList.toggle('off', !el.checked); }
    else if (el.dataset.days) sim.features[el.dataset.days].days = Number(el.value);
    else if (el.dataset.customOn !== undefined) sim.custom[el.dataset.customOn].on = el.checked;
    else if (el.dataset.customLabel !== undefined) sim.custom[el.dataset.customLabel].label = el.value;
    else if (el.dataset.customDays !== undefined) sim.custom[el.dataset.customDays].days = Number(el.value);
    else if (el.name === 'tjmRange') { sim.tjm = Number(el.value); root.querySelector('[name="tjm"]').value = el.value; }
    else if (el.name && el.closest('#simForm')) {
      sim[el.name] = el.type === 'number' ? Number(el.value) : el.value;
      if (el.name === 'tjm') { const rg = root.querySelector('[name="tjmRange"]'); if (rg) rg.value = el.value; }
    } else return;
    drawSummary();
  });

  async function save({ silent } = {}) {
    sim = await store.save('simulations', sim);
    if (!silent) toast('Simulation enregistrée');
    history.replaceState(null, '', `#/simulateur/${sim.id}`);
    return sim;
  }

  function quoteLines(r) {
    const k = r.days / Math.max(r.prod, 0.0001); // répartit gestion + imprévus sur chaque ligne
    const tjm = r.tjm;
    let lines;
    if (sim.lineMode === 'feat') {
      lines = [
        ...r.sel.map((f) => ({ label: f.label, detail: f.desc, qty: half(sim.features[f.id].days * k), unit: 'jour', unitPrice: tjm })),
        ...r.custom.map((c) => ({ label: c.label, detail: '', qty: half(c.days * k), unit: 'jour', unitPrice: tjm })),
      ];
    } else {
      lines = CATEGORIES.map((cat) => {
        const fs = cat.items.filter((f) => sim.features[f.id].on);
        const d = fs.reduce((a, f) => a + Number(sim.features[f.id].days || 0), 0);
        return d ? { label: cat.label, detail: fs.map((f) => f.label).join(' ; '), qty: half(d * k), unit: 'jour', unitPrice: tjm } : null;
      }).filter(Boolean);
      if (r.custom.length) lines.push({ label: 'Fonctionnalités spécifiques', detail: r.custom.map((c) => c.label).join(' ; '), qty: half(r.custom.reduce((a, c) => a + Number(c.days || 0), 0) * k), unit: 'jour', unitPrice: tjm });
    }
    // l'arrondi par ligne peut décaler le total : on ajuste la dernière ligne
    const diff = half(r.days - lines.reduce((a, l) => a + l.qty, 0));
    if (lines.length && diff) lines.at(-1).qty = Math.max(0.5, lines.at(-1).qty + diff);
    if (r.discount) lines.push({ label: `Remise commerciale (${sim.discountPct} %)`, detail: '', qty: 1, unit: 'forfait', unitPrice: -r.discount });
    return lines;
  }

  onAction(root, {
    reset: () => { sim = defaultSim(); history.replaceState(null, '', '#/simulateur'); draw(); },
    addCustom: () => { sim.custom.push({ id: uid(), label: '', days: 1, on: true }); draw(); },
    delCustom: (el) => { sim.custom.splice(Number(el.dataset.i), 1); draw(); },
    save: async () => { try { await save(); } catch (e) { toast(e.message, 'error'); } },
    toQuote: async () => {
      const r = computeSim(sim);
      if (!r.days) { toast('Sélectionne au moins une fonctionnalité.', 'error'); return; }
      if (r.legalOff.length && !(await confirmDialog(`Ces fonctions exigées par la loi ou les stores ne sont pas incluses : ${r.legalOff.map((f) => f.label).join(', ')}. Créer le devis quand même ?`, { title: 'Fonctions légales manquantes', ok: 'Créer quand même' }))) return;
      try {
        await save({ silent: true });
        const project = await store.save('projects', { name: sim.name, clientId: sim.clientId, status: 'proposition', estimateDays: r.days, simulationId: sim.id });
        const parts = String(sim.schedule || '').split('/').map(Number).filter((n) => n > 0);
        const devis = await store.save('documents', newDocument('devis', {
          clientId: sim.clientId, projectId: project.id, title: sim.name, lines: quoteLines(r),
          depositPercent: parts[0] ?? store.settings.invoicing.depositPercent,
          notes: `Délai indicatif : ${Math.ceil(r.weeks)} semaines à compter de la réception de l’acompte.${parts.length > 1 ? ` Échéancier : ${parts.join(' % / ')} %.` : ''} Toute demande hors du périmètre ci-dessus fera l’objet d’un devis complémentaire.`,
        }));
        toast('Devis créé en brouillon');
        location.hash = `#/documents/${devis.id}`;
      } catch (e) { toast(e.message, 'error'); }
    },
  });

  draw();
}
