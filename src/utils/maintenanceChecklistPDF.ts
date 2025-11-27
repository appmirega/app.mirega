import jsPDF from 'jspdf';

export type CertificationStatus =
  | 'sin_info'
  | 'vigente'
  | 'vencida'
  | 'por_vencer'
  | 'no_legible';

export type MaintenanceQuestionStatus =
  | 'approved'
  | 'rejected'
  | 'not_applicable'
  | 'out_of_period';

export interface MaintenanceChecklistQuestion {
  number: number;
  section: string;
  text: string;
  status: MaintenanceQuestionStatus;
  observations?: string | null;
}

export interface ChecklistSignatureInfo {
  signerName: string;
  signedAt: string;
  signatureDataUrl: string;
}

export interface MaintenanceChecklistPDFData {
  checklistId: string | number;
  folioNumber?: number | string; // <-- nuevo: folio oficial o temporal

  clientName: string;
  clientCode?: string | number;
  clientAddress?: string | null;
  clientContactName?: string | null;

  elevatorCode?: string | null;
  elevatorAlias?: string | null;
  elevatorIndex?: number | null;
  elevatorBrand?: string | null;
  elevatorModel?: string | null;
  elevatorIsHydraulic?: boolean;

  month: number;
  year: number;
  completionDate?: string;
  lastCertificationDate?: string | null;
  nextCertificationDate?: string | null;
  certificationNotLegible?: boolean;

  technicianName: string;
  technicianEmail?: string | null;

  certificationStatus?: CertificationStatus;
  observationSummary?: string;

  questions: MaintenanceChecklistQuestion[];
  rejectedQuestions?: MaintenanceChecklistQuestion[];

  signatureDataUrl?: string | null;
  signature?: ChecklistSignatureInfo | null;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 5;
const MARGIN_RIGHT = 5;
const MARGIN_TOP = 10;
const MARGIN_BOTTOM = 10;

const BLUE = { r: 39, g: 58, b: 143 };

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

function formatDate(dateStr?: string | null, fallback: string = 'No registrado'): string {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return fallback;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function mapCertificationStatus(status?: CertificationStatus): string {
  switch (status) {
    case 'vigente': return 'Vigente';
    case 'vencida': return 'Vencida';
    case 'por_vencer': return 'Por vencer';
    case 'no_legible': return 'Información Irregular';
    default: return 'Información Irregular';
  }
}

function formatElevatorLabel(index?: number | null, alias?: string | null, code?: string | null): string {
  if (index != null && !Number.isNaN(index)) return `Ascensor ${index}`;
  const raw = (alias || code || '').trim();
  if (!raw) return '';
  if (/^ascensor\s+\d+/i.test(raw)) return raw;
  return raw;
}

const LOGO_PATH = '/logo_color.png';
const ICON1_PATH = '/icons/icono_1.png';
const ICON2_PATH = '/icons/icono_2.png';
const ICON3_PATH = '/icons/icono_3.png';
const ICON4_PATH = '/icons/icono_4.png';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
}

function drawHeader(doc: jsPDF, logoImg: HTMLImageElement | null, icons: (HTMLImageElement | null)[]) {
  const logoWidth = 35;
  const logoHeight = 30;
  if (logoImg) {
    try { doc.addImage(logoImg, 'PNG', MARGIN_LEFT, MARGIN_TOP, logoWidth, logoHeight); } catch (e) { }
  }

  const mainTitle = 'INFORME MANTENIMIENTO';
  const subTitle = 'INSPECCIÓN MENSUAL';

  doc.setFont('helvetica');
  doc.setFontSize(16);
  doc.setTextColor(0,0,0);

  const titleXcenter = PAGE_WIDTH / 2;
  const titleY = MARGIN_TOP + 16;
  doc.text(mainTitle, titleXcenter, titleY, { align: 'center' });

  doc.setFont('helvetica');
  doc.setFontSize(13);
  const titleWidth = doc.getTextWidth(mainTitle);
  const titleStartX = titleXcenter - titleWidth / 2;
  const subTitleY = titleY + 7;
  doc.text(subTitle, titleStartX, subTitleY);

  const companyText1 = 'MIREGA ASCENSORES LTDA. Pedro de Valdivia N°255 – Of. 202, Providencia';
  const companyText2 = '+56956087972';
  const companyText3 = 'contacto@mirega.cl';
  const companyText4 = 'www.mirega.cl';

  let fontSize = 9;
  doc.setFont('helvetica');
  doc.setFontSize(fontSize);

  const iconWidth = 3.5;
  const iconGap = 2;
  const segmentGap = 8;

  let totalWidth = (iconWidth + iconGap + doc.getTextWidth(companyText1)) + segmentGap + (iconWidth + iconGap + doc.getTextWidth(companyText2)) + segmentGap + (iconWidth + iconGap + doc.getTextWidth(companyText3)) + segmentGap + (iconWidth + iconGap + doc.getTextWidth(companyText4));
  const maxContentWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  if (totalWidth > maxContentWidth) { doc.setFontSize(8); }

  const infoY = subTitleY + 8;
  let cursorX = MARGIN_LEFT;
  const yIcon = infoY - 3;
  const yBaseline = infoY;

  try { if (icons[0]) doc.addImage(icons[0], 'PNG', cursorX, yIcon, iconWidth, 3); } catch(e) {}
  cursorX += iconWidth + iconGap;
  doc.text(companyText1, cursorX, yBaseline);
  cursorX += doc.getTextWidth(companyText1) + segmentGap;

  try { if (icons[1]) doc.addImage(icons[1], 'PNG', cursorX, yIcon, iconWidth, 3); } catch(e) {}
  cursorX += iconWidth + iconGap;
  doc.text(companyText2, cursorX, yBaseline);
  cursorX += doc.getTextWidth(companyText2) + segmentGap;

  try { if (icons[2]) doc.addImage(icons[2], 'PNG', cursorX, yIcon, iconWidth, 3); } catch(e) {}
  cursorX += iconWidth + iconGap;
  doc.text(companyText3, cursorX, yBaseline);
  cursorX += doc.getTextWidth(companyText3) + segmentGap;

  try { if (icons[3]) doc.addImage(icons[3], 'PNG', cursorX, yIcon, iconWidth, 3); } catch(e) {}
  cursorX += iconWidth + iconGap;
  doc.text(companyText4, cursorX, yBaseline);

  return infoY + 8;
}

function drawFolioBox(doc: jsPDF, folio: number | string | null, y: number) {
  const boxW = 26;
  const totalWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.rect(MARGIN_LEFT, y - 6, totalWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255,255,255);
  doc.text('INFORMACIÓN GENERAL', MARGIN_LEFT + 3, y - 1);

  doc.setFillColor(255,255,255);
  doc.roundedRect(PAGE_WIDTH - MARGIN_RIGHT - boxW, y - 5, boxW, 6, 2, 2, 'F');
  doc.setTextColor(0,0,0);
  doc.setFont('helvetica', 'normal');
  const label = folio != null ? String(folio) : 'PENDIENTE';
  doc.setFontSize(9);
  doc.text(label, PAGE_WIDTH - MARGIN_RIGHT - boxW / 2, y - 1.5, { align: 'center' });
}

function drawInfoGeneral(doc: jsPDF, data: MaintenanceChecklistPDFData, startY: number, folioNumber: number | string | null) {
  let y = startY;
  drawFolioBox(doc, folioNumber, y + 7);

  y += 12;
  doc.setFontSize(9);

  const totalWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const leftGroupWidth = totalWidth * 0.55;
  const rightGroupWidth = totalWidth - leftGroupWidth;

  const leftLabelWidth = 25;
  const leftFieldWidth = leftGroupWidth - leftLabelWidth - 2;
  const rightLabelWidth = 35;
  const rightFieldWidth = rightGroupWidth - rightLabelWidth - 4;

  const xLeftLabel = MARGIN_LEFT;
  const xLeftField = xLeftLabel + leftLabelWidth + 2;
  const xRightLabel = MARGIN_LEFT + leftGroupWidth + 2;
  const xRightField = xRightLabel + rightLabelWidth + 2;

  const labelHeight = 6;

  // Cliente
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255,255,255);
  doc.rect(xLeftLabel, y, leftLabelWidth, labelHeight, 'F');
  doc.text('Cliente:', xLeftLabel + 2, y + 4);
  doc.setFillColor(255,255,255);
  doc.setTextColor(0,0,0);
  doc.rect(xLeftField, y, leftFieldWidth, labelHeight, 'F');
  doc.text((data.clientName ?? '').substring(0,45), xLeftField + 2, y + 4);

  // Fecha
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255,255,255);
  doc.rect(xRightLabel, y, 18, labelHeight, 'F');
  doc.text('Fecha:', xRightLabel + 2, y + 4);
  doc.setFillColor(255,255,255);
  doc.setTextColor(0,0,0);
  const fechaFieldWidth = 28;
  doc.rect(xRightLabel + 18 + 2, y, fechaFieldWidth, labelHeight, 'F');
  doc.text(formatDate(data.completionDate, 'No registrado'), xRightLabel + 18 + 4, y + 4);

  // Periodo
  const periodoLabelX = xRightLabel + 18 + 2 + fechaFieldWidth + 3;
  const periodoFieldX = periodoLabelX + 24;
  const periodoFieldWidth = Math.max(20, PAGE_WIDTH - MARGIN_RIGHT - periodoFieldX);
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255,255,255);
  doc.rect(periodoLabelX, y, 24, labelHeight, 'F');
  doc.text('Periodo:', periodoLabelX + 2, y + 4);
  doc.setFillColor(255,255,255);
  doc.setTextColor(0,0,0);
  const monthName = MONTHS[(data.month ?? 1) - 1] ?? '';
  doc.rect(periodoFieldX, y, periodoFieldWidth, labelHeight, 'F');
  doc.text(`${monthName} ${data.year}`, periodoFieldX + 2, y + 4);

  y += labelHeight + 1;

  // Direccion / Vigencia certificacion
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255,255,255);
  doc.rect(xLeftLabel, y, leftLabelWidth, labelHeight, 'F');
  doc.text('Dirección:', xLeftLabel + 2, y + 4);
  doc.setFillColor(255,255,255);
  doc.setTextColor(0,0,0);
  doc.rect(xLeftField, y, leftFieldWidth, labelHeight, 'F');
  doc.text((data.clientAddress ?? '').substring(0,60), xLeftField + 2, y + 4);

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255,255,255);
  doc.rect(xRightLabel, y, rightLabelWidth, labelHeight, 'F');
  doc.text('Vigencia certificación:', xRightLabel + 2, y + 4);
  doc.setFillColor(255,255,255);
  doc.setTextColor(0,0,0);
  doc.rect(xRightField, y, rightFieldWidth, labelHeight, 'F');
  doc.text(mapCertificationStatus(data.certificationStatus), xRightField + 2, y + 4);

  y += labelHeight + 1;

  // Ascensor / Ultima certificacion
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255,255,255);
  doc.rect(xLeftLabel, y, leftLabelWidth, labelHeight, 'F');
  doc.text('Ascensor:', xLeftLabel + 2, y + 4);
  doc.setFillColor(255,255,255);
  doc.setTextColor(0,0,0);
  doc.rect(xLeftField, y, leftFieldWidth, labelHeight, 'F');
  const ascText = formatElevatorLabel(data.elevatorIndex, data.elevatorAlias, data.elevatorCode);
  doc.text(String(ascText).substring(0,45), xLeftField + 2, y + 4);

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255,255,255);
  doc.rect(xRightLabel, y, rightLabelWidth, labelHeight, 'F');
  doc.text('Última certificación:', xRightLabel + 2, y + 4);
  doc.setFillColor(255,255,255);
  doc.setTextColor(0,0,0);
  const lastCertText = data.certificationNotLegible || !data.lastCertificationDate ? 'No legible' : formatDate(data.lastCertificationDate, 'No legible');
  doc.rect(xRightField, y, rightFieldWidth, labelHeight, 'F');
  doc.text(lastCertText, xRightField + 2, y + 4);

  y += labelHeight + 1;

  // Tecnico / Proxima certificacion
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255,255,255);
  doc.rect(xLeftLabel, y, leftLabelWidth, labelHeight, 'F');
  doc.text('Técnico:', xLeftLabel + 2, y + 4);
  doc.setFillColor(255,255,255);
  doc.setTextColor(0,0,0);
  doc.rect(xLeftField, y, leftFieldWidth, labelHeight, 'F');
  doc.text((data.technicianName ?? '').substring(0,45), xLeftField + 2, y + 4);

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255,255,255);
  doc.rect(xRightLabel, y, rightLabelWidth, labelHeight, 'F');
  doc.text('Próxima certificación', xRightLabel + 2, y + 4);
  doc.setFillColor(255,255,255);
  doc.setTextColor(0,0,0);
  const nextCertText = data.certificationNotLegible || !data.nextCertificationDate ? 'No legible' : formatDate(data.nextCertificationDate, 'No legible');
  doc.rect(xRightField, y, rightFieldWidth, labelHeight, 'F');
  doc.text(nextCertText, xRightField + 2, y + 4);

  return y + labelHeight + 6;
}

function drawChecklist(doc: jsPDF, data: MaintenanceChecklistPDFData, startY: number) {
  let y = startY;

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.rect(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CHECKLIST MANTENIMIENTO', MARGIN_LEFT + 3, y + 5.5);

  y += 10;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const lineHeight = 4;
  const maxY = PAGE_HEIGHT - MARGIN_BOTTOM - 45;

  data.questions.forEach((q) => {
    if (y > maxY) return;

    const baseX = MARGIN_LEFT + 2;
    const textLines = doc.splitTextToSize(`${q.number}. ${q.text}`, PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT - 25);
    doc.text(textLines, baseX, y + 3);

    const iconCenterX = PAGE_WIDTH - MARGIN_RIGHT - 8;
    const iconCenterY = y + 2.5;

    if (q.status === 'approved') {
      doc.setFillColor(212, 237, 218);
      doc.circle(iconCenterX, iconCenterY, 2, 'F');
      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(0.5);
      doc.circle(iconCenterX, iconCenterY, 2, 'S');
      doc.setLineWidth(0.7);
      doc.line(iconCenterX - 1.2, iconCenterY, iconCenterX - 0.4, iconCenterY + 1);
      doc.line(iconCenterX - 0.4, iconCenterY + 1, iconCenterX + 1.4, iconCenterY - 1);
    } else if (q.status === 'rejected') {
      doc.setFillColor(248, 215, 218);
      doc.circle(iconCenterX, iconCenterY, 2, 'F');
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.5);
      doc.circle(iconCenterX, iconCenterY, 2, 'S');
      doc.setLineWidth(0.7);
      doc.line(iconCenterX - 1.2, iconCenterY - 1.2, iconCenterX + 1.2, iconCenterY + 1.2);
      doc.line(iconCenterX + 1.2, iconCenterY - 1.2, iconCenterX - 1.2, iconCenterY + 1.2);
    } else if (q.status === 'not_applicable') {
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.4);
      doc.circle(iconCenterX, iconCenterY, 2, 'S');
      doc.setFontSize(6);
      doc.text('N/A', iconCenterX, iconCenterY + 1.5, { align: 'center' });
      doc.setFontSize(8);
    } else if (q.status === 'out_of_period') {
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.4);
      doc.circle(iconCenterX, iconCenterY, 2, 'S');
      doc.setFontSize(6);
      doc.text('P', iconCenterX, iconCenterY + 1.5, { align: 'center' });
      doc.setFontSize(8);
    }

    y += lineHeight * textLines.length + 1;
  });

  return y + 5;
}

function drawSignature(doc: jsPDF, data: MaintenanceChecklistPDFData, y: number) {
  const signature = data.signature || (data.signatureDataUrl ? { signerName: '', signedAt: '', signatureDataUrl: data.signatureDataUrl } : null as any);
  const boxWidth = 90;
  const boxHeight = 30;

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.rect(MARGIN_LEFT, y, boxWidth, 6, 'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RECEPCIONADO POR:', MARGIN_LEFT + 2, y + 4);

  doc.setFillColor(255,255,255);
  doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setLineWidth(0.6);
  doc.rect(MARGIN_LEFT, y + 7, boxWidth, boxHeight, 'F');

  if (signature?.signatureDataUrl) {
    try { doc.addImage(signature.signatureDataUrl, 'PNG', MARGIN_LEFT + 5, y + 9, boxWidth - 10, boxHeight - 10); } catch(e) { }
  }

  doc.setTextColor(0,0,0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const signerName = signature?.signerName?.trim() || 'SIN FIRMA REGISTRADA';
  doc.text(signerName.toUpperCase(), MARGIN_LEFT + boxWidth / 2, y + boxHeight + 9, { align: 'center' });

  const signedAt = signature?.signedAt ? formatDate(signature.signedAt) : '';
  if (signedAt) doc.text(signedAt, MARGIN_LEFT + boxWidth / 2, y + boxHeight + 14, { align: 'center' });
}

function drawObservationsPage(doc: jsPDF, data: MaintenanceChecklistPDFData, logoImg: HTMLImageElement | null, icons: (HTMLImageElement | null)[]) {
  const rejected = data.rejectedQuestions ?? data.questions.filter(q => q.status === 'rejected' && (q.observations ?? '').trim() !== '');
  if (!rejected.length) return;

  doc.addPage();
  let y = drawHeader(doc, logoImg, icons);
  y += 2;

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.rect(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT, 8, 'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('OBSERVACIONES', MARGIN_LEFT + 3, y + 5.5);

  y += 12;

  doc.setFontSize(9);
  doc.setTextColor(0,0,0);
  doc.setFont('helvetica', 'normal');

  const maxY = PAGE_HEIGHT - MARGIN_BOTTOM - 45;

  rejected.forEach((rq, index) => {
    if (y > maxY) return;
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. [P${rq.number}] ${rq.section}`, MARGIN_LEFT + 2, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    const textLines = doc.splitTextToSize(rq.text, PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT - 4);
    doc.text(textLines, MARGIN_LEFT + 2, y);
    y += textLines.length * 4;
    if (rq.observations) {
      doc.setFont('helvetica', 'italic');
      const obsLines = doc.splitTextToSize(`Observación: ${rq.observations}`, PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT - 4);
      doc.text(obsLines, MARGIN_LEFT + 2, y);
      y += obsLines.length * 4;
    }
    y += 4;
  });

  drawSignature(doc, data, PAGE_HEIGHT - MARGIN_BOTTOM - 40);
}

export async function generateMaintenanceChecklistPDF(data: MaintenanceChecklistPDFData): Promise<Blob> {
  const doc: any = new jsPDF({ unit: 'mm', format: 'a4' });

  const [logoImg, icon1, icon2, icon3, icon4] = await Promise.all([
    loadImage(LOGO_PATH), loadImage(ICON1_PATH), loadImage(ICON2_PATH), loadImage(ICON3_PATH), loadImage(ICON4_PATH)
  ]);
  const icons = [icon1, icon2, icon3, icon4];

  const folioToUse = data.folioNumber ?? null;

  let y = drawHeader(doc, logoImg, icons);
  y = drawInfoGeneral(doc, data, y + 2, folioToUse as any);
  y = drawChecklist(doc, data, y + 4);
  drawSignature(doc, data, PAGE_HEIGHT - MARGIN_BOTTOM - 40);

  drawObservationsPage(doc, data, logoImg, icons);

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120,120,120);
    const footerText = `Página ${p} / ${total}`;
    doc.text(footerText, PAGE_WIDTH - MARGIN_RIGHT - 10, PAGE_HEIGHT - 4, { align: 'right' });
    doc.text('Documento generado por MIREGA', MARGIN_LEFT + 2, PAGE_HEIGHT - 4);
  }

  return doc.output('blob') as Blob;
}
