/* ---------------------------------------------------------
   Génération des PDF avec jsPDF (+ plugin autoTable pour les
   tableaux). Les librairies sont chargées seulement quand on
   clique sur « PDF » : l'app démarre plus vite.
   Unités : millimètres, format A4 (210 × 297).
   --------------------------------------------------------- */
import { CDN } from '../config.js';
import { loadScript, downloadFile } from '../core/dom.js';
import { money, date, pdfSafe } from '../core/format.js';
import { store } from '../core/store.js';
import { totals, lineTotal, buildMentions, sellerSnapshot, clientSnapshot, KIND_LABEL, METHODS } from '../modules/shared.js';

const GREEN = [12, 127, 86], INK = [23, 35, 29], MUTED = [83, 109, 97], LINE = [207, 222, 213];
const M = 16; // marge

async function jsPDFReady() {
  await loadScript(CDN.jspdf);
  await loadScript(CDN.autotable);
  const { jsPDF } = window.jspdf;
  return jsPDF;
}
const t = (s) => pdfSafe(s);
const eur = (n) => pdfSafe(money(n));

const table = (doc, opts) => (window.autoTable ? window.autoTable(doc, opts) : doc.autoTable(opts));

function footer(doc, left) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text(t(left), M, 289);
    doc.text(`${i} / ${n}`, 210 - M, 289, { align: 'right' });
  }
}

/* ---------- Devis / facture / avoir ---------- */
export async function documentPDF(d) {
  const jsPDF = await jsPDFReady();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const seller = d.seller || sellerSnapshot();
  const client = d.client || clientSnapshot(d.clientId) || {};
  const tot = totals(d);
  const mentions = d.mentions || buildMentions(d);
  const titleTxt = d.kind === 'facture' && d.isDeposit ? 'FACTURE D’ACOMPTE' : KIND_LABEL[d.kind].toUpperCase();
  pdf.setProperties({ title: `${KIND_LABEL[d.kind]} ${d.number || 'brouillon'}`, author: seller.displayName, creator: 'Cockpit Yannlf3' });

  // Bandeau vert fin
  pdf.setFillColor(...GREEN); pdf.rect(0, 0, 210, 4, 'F');

  // Émetteur (gauche)
  let y = 18;
  pdf.setTextColor(...INK); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12);
  pdf.text(t(seller.displayName), M, y);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...MUTED);
  const sellerLines = [
    seller.tradeName ? `Nom commercial : ${seller.tradeName}` : '',
    seller.address, `${seller.zip || ''} ${seller.city || ''}`.trim(),
    seller.siret ? `SIRET : ${seller.siret}` : '', seller.ape ? `APE : ${seller.ape}` : '',
    seller.email, seller.phone, seller.website,
  ].filter(Boolean);
  sellerLines.forEach((l, i) => pdf.text(t(l), M, y + 5 + i * 4.3));

  // Titre (droite)
  pdf.setTextColor(...GREEN); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(20);
  pdf.text(t(titleTxt), 210 - M, 20, { align: 'right' });
  pdf.setFontSize(10); pdf.setTextColor(...INK);
  pdf.text(t(d.number ? `N° ${d.number}` : 'BROUILLON — non valable'), 210 - M, 27, { align: 'right' });
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...MUTED);
  const meta = [`Date d’émission : ${date(d.issueDate)}`];
  if (d.kind === 'devis') meta.push(`Valable jusqu’au : ${date(d.validUntil)}`);
  if (d.kind === 'facture') {
    meta.push(d.servicePeriod ? `Prestation : ${d.servicePeriod}` : `Date de prestation : ${date(d.serviceDate)}`);
    meta.push(`Échéance : ${date(d.dueDate)}`);
  }
  meta.forEach((l, i) => pdf.text(t(l), 210 - M, 33 + i * 4.3, { align: 'right' }));

  // Client (encadré à droite)
  y = Math.max(y + 5 + sellerLines.length * 4.3, 33 + meta.length * 4.3) + 6;
  const boxX = 112, boxW = 210 - M - boxX;
  const clientLines = [
    client.name,
    client.type === 'b2b' && client.contactName ? `À l’attention de ${client.contactName}` : '',
    client.address, `${client.zip || ''} ${client.city || ''}`.trim(), client.country && client.country !== 'France' ? client.country : '',
    client.type === 'b2b' && client.siren ? `SIREN : ${client.siren}` : '',
    client.vatNumber ? `TVA : ${client.vatNumber}` : '',
  ].filter(Boolean);
  const boxH = 9 + clientLines.length * 4.6;
  pdf.setDrawColor(...LINE); pdf.setLineWidth(0.3); pdf.roundedRect(boxX, y, boxW, boxH, 2, 2);
  pdf.setFontSize(8); pdf.setTextColor(...MUTED); pdf.text('CLIENT', boxX + 4, y + 5);
  pdf.setFontSize(10); pdf.setTextColor(...INK);
  clientLines.forEach((l, i) => { pdf.setFont('helvetica', i === 0 ? 'bold' : 'normal'); pdf.text(t(l), boxX + 4, y + 10 + i * 4.6); });
  y += boxH + 8;

  // Objet
  if (d.title) {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10.5); pdf.setTextColor(...INK);
    const lines = pdf.splitTextToSize(t(`Objet : ${d.title}`), 210 - 2 * M);
    pdf.text(lines, M, y); y += lines.length * 5 + 2;
  }
  if (d.kind === 'avoir' && d.relatedId) {
    const f = store.get('documents', d.relatedId);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5);
    pdf.text(t(`Avoir sur la facture n° ${f?.number || ''} du ${date(f?.issueDate)}`), M, y); y += 6;
  }

  // Lignes
  table(pdf, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Désignation', 'Qté', 'Unité', 'Prix unit. HT', 'Total HT']],
    // Libellé en gras + détail en petit gris dans la même cellule :
    // autoTable calcule la hauteur, puis on dessine nous-mêmes le texte.
    body: (d.lines || []).filter((l) => l.label).map((l) => [
      { content: t(l.label + (l.detail ? `\n${l.detail}` : '')), label: t(l.label), detail: t(l.detail || '') },
      t(String(l.qty).replace('.', ',')), t(l.unit || ''), eur(l.unitPrice), eur(lineTotal(l)),
    ]),
    theme: 'plain',
    willDrawCell: (h) => { if (h.section === 'body' && h.column.index === 0) h.cell.text = []; },
    didDrawCell: (h) => {
      if (h.section !== 'body' || h.column.index !== 0) return;
      const { label, detail } = h.cell.raw;
      const x = h.cell.x + 2.4, w = h.cell.width - 4.8;
      let yy = h.cell.y + 2.4;
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...INK);
      const ll = pdf.splitTextToSize(label, w); pdf.text(ll, x, yy, { baseline: 'top' }); yy += ll.length * 3.9;
      if (detail) { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...MUTED); pdf.text(pdf.splitTextToSize(detail, w), x, yy + 0.4, { baseline: 'top' }); }
    },
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 2.4, lineColor: LINE, lineWidth: 0 },
    headStyles: { fillColor: [238, 244, 240], textColor: MUTED, fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 14 }, 2: { cellWidth: 20 }, 3: { halign: 'right', cellWidth: 28 }, 4: { halign: 'right', cellWidth: 28 } },
    bodyStyles: { lineWidth: { bottom: 0.2 } },
  });
  y = pdf.lastAutoTable.finalY + 6;

  // Totaux
  const rows = [['Total HT', eur(tot.ht)]];
  if (tot.vatOn) rows.push([`TVA ${String(seller.vatRate).replace('.', ',')} %`, eur(tot.vat)], ['Total TTC', eur(tot.ttc)]);
  (d.deductions || []).forEach((x) => rows.push([t(x.label), eur(-x.amount)]));
  const finalLabel = d.kind === 'avoir' ? 'Montant de l’avoir' : d.kind === 'devis' ? (tot.vatOn ? 'Total TTC' : 'Total') : 'Net à payer';
  rows.push([finalLabel, eur(tot.due)]);
  if (y > 240) { pdf.addPage(); y = 20; }
  const tx = 104, labelW = 210 - M - tx - 34; // colonne libellés / colonne montants
  rows.forEach(([l, v], i) => {
    const last = i === rows.length - 1;
    if (last) { pdf.setFillColor(...GREEN); pdf.rect(tx - 3, y - 4.5, 210 - M - tx + 3, 8, 'F'); pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10.5); }
    else { pdf.setTextColor(...INK); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); }
    const ls = pdf.splitTextToSize(t(l), labelW);
    pdf.text(ls, tx, y); pdf.text(v, 210 - M - 2, y, { align: 'right' });
    y += (last ? 9 : 5.5) + (ls.length - 1) * 4.2;
  });

  // Paiement
  pdf.setTextColor(...INK); pdf.setFontSize(9);
  if (d.kind === 'facture' && seller.iban) {
    pdf.setFont('helvetica', 'bold'); pdf.text('Règlement par virement', M, y);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...MUTED);
    pdf.text(t(`IBAN : ${seller.iban}${seller.bic ? `   BIC : ${seller.bic}` : ''}${seller.bankName ? `   (${seller.bankName})` : ''}`), M, y + 4.5);
    pdf.text(t(`Merci d’indiquer la référence ${d.number || ''} dans le libellé du virement.`), M, y + 9);
    y += 15;
  }
  if (d.notes) {
    pdf.setTextColor(...INK);
    const n = pdf.splitTextToSize(t(d.notes), 210 - 2 * M);
    if (y + n.length * 4.2 > 270) { pdf.addPage(); y = 20; }
    pdf.text(n, M, y); y += n.length * 4.2 + 4;
  }

  // Bon pour accord (devis)
  if (d.kind === 'devis') {
    if (y > 225) { pdf.addPage(); y = 20; }
    pdf.setDrawColor(...LINE); pdf.roundedRect(110, y, 210 - M - 110, 34, 2, 2);
    pdf.setFontSize(8.5); pdf.setTextColor(...MUTED);
    pdf.text(pdf.splitTextToSize(t('Date et signature du client, précédées de la mention « Bon pour accord » et « J’accepte les CGV jointes »'), 210 - M - 114), 114, y + 5);
    y += 40;
  }

  // Mentions légales
  pdf.setFontSize(7.6); pdf.setTextColor(...MUTED);
  const ml = pdf.splitTextToSize(t(mentions.join('\n')), 210 - 2 * M);
  if (y + ml.length * 3.4 > 282) { pdf.addPage(); y = 20; }
  pdf.text(ml, M, Math.max(y, 282 - ml.length * 3.4 - 4));

  footer(pdf, `${seller.displayName}${seller.tradeName ? ` (${seller.tradeName})` : ''} · SIRET ${seller.siret || '—'}`);
  return pdf;
}

export async function downloadDocumentPDF(d) {
  const pdf = await documentPDF(d);
  const name = `${KIND_LABEL[d.kind]}_${d.number || 'brouillon'}_${(d.client?.name || '').replace(/[^\w-]+/g, '-')}.pdf`;
  downloadFile(name, pdf.output('blob'));
}

/* ---------- Texte long (modèles : CGV, contrats…) ---------- */
export async function textPDF(titleTxt, body, filename) {
  const jsPDF = await jsPDFReady();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const s = sellerSnapshot();
  pdf.setFillColor(...GREEN); pdf.rect(0, 0, 210, 4, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.setTextColor(...INK);
  const tl = pdf.splitTextToSize(t(titleTxt), 210 - 2 * M);
  pdf.text(tl, M, 20);
  let y = 20 + tl.length * 7 + 4;
  pdf.setFontSize(9.8);
  for (const para of t(body).split('\n')) {
    const isHeading = /^(\d+(\.\d+)*[.)]?\s|ARTICLE|Article|[A-ZÉÈ][A-ZÉÈ '’-]{6,}$)/.test(para.trim()) && para.length < 90;
    pdf.setFont('helvetica', isHeading ? 'bold' : 'normal');
    const lines = para.trim() ? pdf.splitTextToSize(para, 210 - 2 * M) : [''];
    for (const l of lines) {
      if (y > 278) { pdf.addPage(); y = 18; }
      pdf.text(l, M, y); y += 4.8;
    }
    y += isHeading ? 0.8 : 1.6;
  }
  footer(pdf, `${s.displayName} · SIRET ${s.siret || '—'}`);
  downloadFile(filename, pdf.output('blob'));
}

/* ---------- Livre des recettes ---------- */
export async function receiptsPDF(rows, year) {
  const jsPDF = await jsPDFReady();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const s = sellerSnapshot();
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(...INK);
  pdf.text(t(`Livre des recettes ${year}`), M, 16);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...MUTED);
  pdf.text(t(`${s.displayName} · SIRET ${s.siret || '—'} · ${s.address || ''} ${s.zip || ''} ${s.city || ''}`), M, 22);
  const total = rows.reduce((a, r) => a + r.amount, 0);
  table(pdf, {
    startY: 28, margin: { left: M, right: M },
    head: [['Date', 'Pièce', 'Client', 'Nature de la prestation', 'Mode', 'Montant']],
    body: rows.map((r) => [date(r.date), t(r.number), t(r.client), t(r.nature), t(METHODS[r.method] || r.method), eur(r.amount)]),
    foot: [['', '', '', '', 'Total', eur(total)]],
    styles: { fontSize: 8.5, textColor: INK, cellPadding: 2 },
    headStyles: { fillColor: [238, 244, 240], textColor: MUTED },
    footStyles: { fillColor: [238, 244, 240], textColor: INK, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 30 }, 4: { cellWidth: 26 }, 5: { halign: 'right', cellWidth: 28 } },
  });
  footer(pdf, `Livre des recettes ${year} · ${s.displayName}`);
  downloadFile(`livre-des-recettes-${year}.pdf`, pdf.output('blob'));
}
