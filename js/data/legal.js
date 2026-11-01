/* ---------------------------------------------------------
   Chiffres et règles légales — vérifiés le 1er novembre 2026.
   Un seul fichier à mettre à jour chaque 1er janvier.
   Chaque valeur cite sa source pour pouvoir la revérifier.
   --------------------------------------------------------- */
import { parseISO, toISO } from '../core/format.js';

export const LEGAL = {
  checkedOn: '2026-11-01',

  // Plafonds du régime micro 2026-2028 (loi de finances 2026, art. 50-0 et 102 ter CGI)
  microCeiling: { services: 83600, sales: 203100 },

  // Franchise en base de TVA (en vigueur depuis 2025, la réforme à 25 000 € a été abandonnée)
  vatFranchise: { services: { base: 37500, major: 41250 }, sales: { base: 85000, major: 93500 } },

  // Taux de cotisations sociales 2026 (part du CA encaissé)
  socialRates: { bnc: 0.256, bic_services: 0.212, cipav: 0.232 },
  // Contribution à la formation professionnelle (CFP)
  cfpRates: { bnc: 0.002, bic_services: 0.001, cipav: 0.002 },
  // Versement libératoire de l'impôt (si option choisie)
  vlRates: { bnc: 0.022, bic_services: 0.017, cipav: 0.022 },
  // Abattement forfaitaire pour l'impôt sur le revenu (sans versement libératoire)
  taxAllowance: { bnc: 0.34, bic_services: 0.5, cipav: 0.34 },

  // ACRE micro : part du taux normal effectivement payée
  // Créations avant le 01/07/2026 : 50 % du taux. À partir du 01/07/2026 : 75 % (décret 2026-69).
  acre: { switchDate: '2026-07-01', before: 0.5, after: 0.75 },

  recoveryFee: 40, // indemnité forfaitaire de recouvrement B2B (art. D441-5 C. com.)
  einvoicing: { reception: '2026-09-01', emissionMicro: '2027-09-01' },
  cibsSwitch: '2027-01-01', // nouvelle mention de franchise TVA
  invoiceRetentionYears: 10,

  sources: {
    micro: 'https://bpifrance-creation.fr/encyclopedie/micro-entreprise-regime-auto-entrepreneur/lessentiel-ce-regime/seuils-du-regime-micro',
    vat: 'https://entreprendre.service-public.gouv.fr/vosdroits/F21746',
    rates: 'https://www.autoentrepreneur.urssaf.fr/portail/accueil/sinformer-sur-le-statut/lessentiel-du-statut.html',
    acre: 'https://www.legifiscal.fr/actualites-fiscales/4422-publication-decret-reduisant-exoneration-acre-createurs-repreneurs-entreprise.html',
    invoice: 'https://entreprendre.service-public.gouv.fr/vosdroits/F31808',
    einvoice: 'https://www.impots.gouv.fr/facturation-electronique-et-plateformes-agreees',
    cibs: 'https://www.legifiscal.fr/actualites-fiscales/4613-mention-facture-changement-article-exoneration-tva-autoentrepreneurs.html',
    mediator: 'https://www.economie.gouv.fr/mediation-conso',
    cfe: 'https://entreprendre.service-public.gouv.fr/vosdroits/F23547',
    late: 'https://entreprendre.service-public.gouv.fr/vosdroits/F23211',
  },
};

export const ACTIVITY_LABELS = {
  bnc: 'Libéral non réglementé (BNC, SSI)',
  bic_services: 'Prestations de services commerciales (BIC)',
  cipav: 'Libéral réglementé (CIPAV)',
};

/* Taux réellement appliqué à un encaissement daté `iso` */
export function socialRateFor(settings, iso) {
  const r = settings.regime;
  const base = r.socialRateOverride !== '' && r.socialRateOverride != null ? Number(r.socialRateOverride) / 100 : LEGAL.socialRates[r.activity] ?? LEGAL.socialRates.bnc;
  if (r.acre && r.creationDate) {
    const end = r.acreEndDate || defaultAcreEnd(r.creationDate);
    if (iso >= r.creationDate && iso <= end) {
      const factor = r.creationDate >= LEGAL.acre.switchDate ? LEGAL.acre.after : LEGAL.acre.before;
      return base * factor;
    }
  }
  return base;
}
export function cfpRateFor(settings) {
  const r = settings.regime;
  return r.cfpRateOverride !== '' && r.cfpRateOverride != null ? Number(r.cfpRateOverride) / 100 : LEGAL.cfpRates[r.activity] ?? 0.002;
}
export function vlRateFor(settings) {
  return settings.regime.versementLiberatoire ? LEGAL.vlRates[settings.regime.activity] ?? 0 : 0;
}

/* ACRE micro : jusqu'à la fin du 3e trimestre civil qui suit le début d'activité
   (≈ 12 mois). Modifiable dans les paramètres si ton attestation dit autre chose. */
export function defaultAcreEnd(creationISO) {
  const d = parseISO(creationISO);
  const q = Math.floor(d.getMonth() / 3); // trimestre 0..3
  const endQuarter = q + 3;               // + 3 trimestres
  const y = d.getFullYear() + Math.floor(endQuarter / 4);
  const lastMonth = (endQuarter % 4) * 3 + 3; // 3, 6, 9, 12
  return toISO(new Date(y, lastMonth, 0));
}

/* Charges estimées sur un encaissement */
export function chargesFor(settings, amount, iso) {
  const social = amount * socialRateFor(settings, iso);
  const cfp = amount * cfpRateFor(settings);
  const vl = amount * vlRateFor(settings);
  return { social, cfp, vl, total: social + cfp + vl };
}

/* Mention TVA selon la date d'émission de la facture */
export function vatMention(settings, issueISO) {
  if (!settings.regime.vatFranchise) return '';
  return issueISO >= LEGAL.cibsSwitch ? 'TVA non applicable, art. L.233-3 du CIBS' : 'TVA non applicable, art. 293 B du CGI';
}

export function ceilingFor(settings) {
  return LEGAL.microCeiling.services; // activité de services (BNC ou BIC services)
}
