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
  // IMPORTANTE: aquí debe venir mnt_checklists.folio
  checklistId: string | number;

  // Cliente
  clientName: string;
  clientCode?: string | number;
  clientAddress?: string | null;
  clientContactName?: string | null;

  // Ascensor
  elevatorCode?: string | null;
  elevatorAlias?: string | null;
  elevatorBrand?: string | null;
  elevatorModel?: string | null;
  elevatorIsHydraulic?: boolean;

  // Datos del mantenimiento
  month: number;
  year: number;
  completionDate?: string;
  lastCertificationDate?: string | null;
  nextCertificationDate?: string | null;
  certificationNotLegible?: boolean;

  // Técnico
  technicianName: string;
  technicianEmail?: string | null;

  // Estado resumen de certificación
  certificationStatus?: CertificationStatus;

  // Resumen de observaciones
  observationSummary?: string;

  // Preguntas del checklist
  questions: MaintenanceChecklistQuestion[];
  rejectedQuestions?: MaintenanceChecklistQuestion[];

  // Firma
  signatureDataUrl?: string | null;
  signature?: ChecklistSignatureInfo | null;
}

// Logo corporativo MIREGA (PNG base64 – recortado para tamaño pequeño)
const LOGO_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAOwAAAC7CAYAAABmWHJbAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAA...recortado...';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 5;
const MARGIN_RIGHT = 5;
const MARGIN_TOP = 10;
const MARGIN_BOTTOM = 10;

const BLUE = { r: 39, g: 58, b: 143 }; // #273a8f

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'N/A';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function mapCertificationStatus(status?: CertificationStatus): string {
  switch (status) {
    case 'vigente':
      return 'Vigente';
    case 'vencida':
      return 'Vencida';
    case 'por_vencer':
      return 'Por vencer';
    case 'no_legible':
      return 'No legible';
    default:
      return 'Sin información';
  }
}

/**
 * ENCABEZADO: logo + títulos + línea de datos empresa en una sola línea
 */
function drawHeader(doc: jsPDF) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  // LOGO: 35 x 30 mm, respetando el margen izquierdo
  try {
    doc.addImage(
      `data:image/png;base64,${LOGO_BASE64}`,
      'PNG',
      MARGIN_LEFT,
      MARGIN_TOP,
      35,
      30,
    );
  } catch (e) {
    console.error('Error al agregar logo:', e);
  }

  // TÍTULO PRINCIPAL
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(27);

  const mainTitle = 'INFORME MANTENIMIENTO';
  const mainTitleX = PAGE_WIDTH / 2;
  const mainTitleY = MARGIN_TOP + 16;
  doc.text(mainTitle, mainTitleX, mainTitleY, { align: 'center' });

  // SUBTÍTULO – alineado a la IZQUIERDA del título
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  const subTitle = 'INSPECCIÓN MENSUAL';
  const mainTitleWidth = doc.getTextWidth(mainTitle);
  const subTitleX = mainTitleX - mainTitleWidth / 2; // mismo inicio que el título
  const subTitleY = mainTitleY + 7;
  doc.text(subTitle, subTitleX, subTitleY);

  // INFORMACIÓN DE EMPRESA – una sola línea, centrada
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const infoY = subTitleY + 8;

  const text1 =
    'MIREGA ASCENSORES LTDA. Pedro de Valdivia N°255 – Of. 202, Providencia';
  const text2 = '+56956087972';
  const text3 = 'contacto@mirega.cl';
  const text4 = 'www.mirega.cl';

  const iconToTextGap = 2;
  const segmentGap = 8;
  const iconWidth = 4; // ancho aproximado de cada icono

  const t1w = doc.getTextWidth(text1);
  const t2w = doc.getTextWidth(text2);
  const t3w = doc.getTextWidth(text3);
  const t4w = doc.getTextWidth(text4);

  const totalWidth =
    (iconWidth + iconToTextGap + t1w) +
    segmentGap +
    (iconWidth + iconToTextGap + t2w) +
    segmentGap +
    (iconWidth + iconToTextGap + t3w) +
    segmentGap +
    (iconWidth + iconToTextGap + t4w);

  let cursorX = (PAGE_WIDTH - totalWidth) / 2;
  const yBaseline = infoY;

  // Icono ubicación (pin simple)
  const pinCenterX = cursorX + iconWidth / 2;
  const pinCenterY = yBaseline - 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.circle(pinCenterX, pinCenterY - 0.5, 1.1);
  doc.line(pinCenterX, pinCenterY + 0.3, pinCenterX - 0.9, pinCenterY + 2);
  doc.line(pinCenterX, pinCenterY + 0.3, pinCenterX + 0.9, pinCenterY + 2);

  cursorX += iconWidth + iconToTextGap;
  doc.text(text1, cursorX, yBaseline);
  cursorX += t1w + segmentGap;

  // Icono teléfono (handset lineal)
  const phoneX = cursorX + iconWidth / 2;
  const phoneY = yBaseline - 2;
  doc.rect(phoneX - 1.5, phoneY - 2, 3, 4);
  doc.line(phoneX - 1.5, phoneY - 2, phoneX + 1.5, phoneY + 2);

  cursorX += iconWidth + iconToTextGap;
  doc.text(text2, cursorX, yBaseline);
  cursorX += t2w + segmentGap;

  // Icono correo (sobre)
  const mailX = cursorX + iconWidth / 2;
  const mailY = yBaseline - 2.2;
  doc.rect(mailX - 2, mailY - 1.6, 4, 3);
  doc.line(mailX - 2, mailY - 1.6, mailX, mailY + 1.4);
  doc.line(mailX + 2, mailY - 1.6, mailX, mailY + 1.4);

  cursorX += iconWidth + iconToTextGap;
  doc.text(text3, cursorX, yBaseline);
  cursorX += t3w + segmentGap;

  // Icono web (globo)
  const webX = cursorX + iconWidth / 2;
  const webY = yBaseline - 2.2;
  doc.circle(webX, webY, 1.4);
  doc.ellipse(webX, webY, 1, 0.7);
  doc.line(webX - 1.4, webY, webX + 1.4, webY);
  doc.line(webX, webY - 1.4, webX, webY + 1.4);

  cursorX += iconWidth + iconToTextGap;
  doc.text(text4, cursorX, yBaseline);

  return infoY + 8; // siguiente Y usable
}

/**
 * BLOQUE INFORMACIÓN GENERAL (idéntico a maqueta azul)
 */
function drawInfoGeneral(doc: jsPDF, data: MaintenanceChecklistPDFData, startY: number) {
  let y = startY;

  const totalWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const labelHeight = 6;
  const labelWidthLeft = 25;

  // Barra "INFORMACIÓN GENERAL" + FOLIO
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.rect(MARGIN_LEFT, y, totalWidth, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INFORMACIÓN GENERAL', MARGIN_LEFT + 3, y + 5.5);

  // Folio a la derecha con caja redondeada
  const folioLabel = 'N° FOLIO:';
  doc.setFontSize(9);
  const folioLabelWidth = doc.getTextWidth(folioLabel);
  const folioBoxWidth = 30;
  const folioXLabel = PAGE_WIDTH - MARGIN_RIGHT - folioBoxWidth - folioLabelWidth - 4;
  const folioCenterY = y + 4.5;

  doc.text(folioLabel, folioXLabel, folioCenterY + 0.5);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.roundedRect(
    PAGE_WIDTH - MARGIN_RIGHT - folioBoxWidth,
    y + 1.5,
    folioBoxWidth,
    5,
    2,
    2,
    'F',
  );

  doc.setTextColor(0, 0, 0);
  const folioStr = String(data.checklistId || '').padStart(4, '0');
  doc.text(
    folioStr,
    PAGE_WIDTH - MARGIN_RIGHT - folioBoxWidth / 2,
    y + 5,
    { align: 'center' },
  );

  y += 10;

  doc.setFontSize(9);

  const midWidth = totalWidth;

  // Fila 1: Cliente / Fecha / Periodo
  // Cliente label
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(MARGIN_LEFT, y, labelWidthLeft, labelHeight, 'F');
  doc.text('Cliente:', MARGIN_LEFT + 2, y + 4);

  // Cliente campo
  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  const clienteFieldWidth = midWidth * 0.45;
  doc.rect(MARGIN_LEFT + labelWidthLeft, y, clienteFieldWidth, labelHeight, 'F');
  doc.text(
    (data.clientName ?? '').substring(0, 40),
    MARGIN_LEFT + labelWidthLeft + 2,
    y + 4,
  );

  // Fecha
  const fechaLabelWidth = 20;
  const fechaFieldWidth = 25;
  const periodoLabelWidth = 20;
  const periodoFieldWidth = 25;

  let xCursor = MARGIN_LEFT + labelWidthLeft + clienteFieldWidth + 3;

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(xCursor, y, fechaLabelWidth, labelHeight, 'F');
  doc.text('Fecha:', xCursor + 2, y + 4);

  xCursor += fechaLabelWidth;
  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(xCursor, y, fechaFieldWidth, labelHeight, 'F');
  doc.text(formatDate(data.completionDate), xCursor + 2, y + 4);

  xCursor += fechaFieldWidth + 3;

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(xCursor, y, periodoLabelWidth, labelHeight, 'F');
  doc.text('Periodo:', xCursor + 2, y + 4);

  xCursor += periodoLabelWidth;
  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(xCursor, y, periodoFieldWidth, labelHeight, 'F');
  const monthName = MONTHS[(data.month ?? 1) - 1] ?? '';
  doc.text(`${monthName} ${data.year}`, xCursor + 2, y + 4);

  y += labelHeight + 2;

  // Fila 2: Dirección / Vigencia certificación
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(MARGIN_LEFT, y, labelWidthLeft, labelHeight, 'F');
  doc.text('Dirección:', MARGIN_LEFT + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  const direccionFieldWidth = midWidth * 0.45;
  doc.rect(MARGIN_LEFT + labelWidthLeft, y, direccionFieldWidth, labelHeight, 'F');
  doc.text(
    (data.clientAddress ?? '').substring(0, 50),
    MARGIN_LEFT + labelWidthLeft + 2,
    y + 4,
  );

  xCursor = MARGIN_LEFT + labelWidthLeft + direccionFieldWidth + 3;

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  const vigLabelWidth = 42;
  const vigFieldWidth = 25;
  doc.rect(xCursor, y, vigLabelWidth, labelHeight, 'F');
  doc.text('Vigencia certificación:', xCursor + 2, y + 4);

  xCursor += vigLabelWidth;
  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(xCursor, y, vigFieldWidth, labelHeight, 'F');
  doc.text(mapCertificationStatus(data.certificationStatus), xCursor + 2, y + 4);

  y += labelHeight + 2;

  // Fila 3: Ascensor / Última certificación
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(MARGIN_LEFT, y, labelWidthLeft, labelHeight, 'F');
  doc.text('Ascensor:', MARGIN_LEFT + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  const ascFieldWidth = midWidth * 0.45;
  doc.rect(MARGIN_LEFT + labelWidthLeft, y, ascFieldWidth, labelHeight, 'F');
  const ascText = data.elevatorAlias || data.elevatorCode || '';
  doc.text(String(ascText), MARGIN_LEFT + labelWidthLeft + 2, y + 4);

  xCursor = MARGIN_LEFT + labelWidthLeft + ascFieldWidth + 3;

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  const ultLabelWidth = 40;
  const ultFieldWidth = 27;
  doc.rect(xCursor, y, ultLabelWidth, labelHeight, 'F');
  doc.text('Última certificación:', xCursor + 2, y + 4);

  xCursor += ultLabelWidth;
  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(xCursor, y, ultFieldWidth, labelHeight, 'F');
  doc.text(formatDate(data.lastCertificationDate ?? null), xCursor + 2, y + 4);

  y += labelHeight + 2;

  // Fila 4: Técnico / Próxima certificación
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(MARGIN_LEFT, y, labelWidthLeft, labelHeight, 'F');
  doc.text('Técnico:', MARGIN_LEFT + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  const tecFieldWidth = midWidth * 0.45;
  doc.rect(MARGIN_LEFT + labelWidthLeft, y, tecFieldWidth, labelHeight, 'F');
  doc.text(data.technicianName ?? '', MARGIN_LEFT + labelWidthLeft + 2, y + 4);

  xCursor = MARGIN_LEFT + labelWidthLeft + tecFieldWidth + 3;

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  const proxLabelWidth = 45;
  const proxFieldWidth = 27;
  doc.rect(xCursor, y, proxLabelWidth, labelHeight, 'F');
  doc.text('Próxima certificación', xCursor + 2, y + 4);

  xCursor += proxLabelWidth;
  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(xCursor, y, proxFieldWidth, labelHeight, 'F');
  doc.text(formatDate(data.nextCertificationDate ?? null), xCursor + 2, y + 4);

  return y + labelHeight + 5;
}

/**
 * CHECKLIST en una columna con iconos de estado
 */
function drawChecklist(
  doc: jsPDF,
  data: MaintenanceChecklistPDFData,
  startY: number,
) {
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
  const maxY = PAGE_HEIGHT - MARGIN_BOTTOM - 45; // dejar espacio para firma

  data.questions.forEach((q) => {
    if (y > maxY) return;

    const baseX = MARGIN_LEFT + 2;
    const textLines = doc.splitTextToSize(
      `${q.number}. ${q.text}`,
      PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT - 25,
    );
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

/**
 * CAJA DE FIRMA (pie de página)
 */
function drawSignature(doc: jsPDF, data: MaintenanceChecklistPDFData, y: number) {
  const signature =
    data.signature ||
    (data.signatureDataUrl
      ? {
          signerName: '',
          signedAt: '',
          signatureDataUrl: data.signatureDataUrl!,
        }
      : null);

  const boxWidth = 90;
  const boxHeight = 30;

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.rect(MARGIN_LEFT, y, boxWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RECEPCIONADO POR:', MARGIN_LEFT + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setLineWidth(0.6);
  doc.rect(MARGIN_LEFT, y + 7, boxWidth, boxHeight, 'F');

  if (signature?.signatureDataUrl) {
    try {
      doc.addImage(
        signature.signatureDataUrl,
        'PNG',
        MARGIN_LEFT + 5,
        y + 9,
        boxWidth - 10,
        boxHeight - 10,
      );
    } catch (e) {
      console.error('Error al agregar firma:', e);
    }
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const signerName =
    signature?.signerName?.trim() || 'SIN FIRMA REGISTRADA';
  doc.text(
    signerName.toUpperCase(),
    MARGIN_LEFT + boxWidth / 2,
    y + boxHeight + 9,
    { align: 'center' },
  );
}

/**
 * HOJA 2 – OBSERVACIONES
 */
function drawObservationsPage(
  doc: jsPDF,
  data: MaintenanceChecklistPDFData,
) {
  const rejected =
    data.rejectedQuestions ??
    data.questions.filter(
      (q) => q.status === 'rejected' && (q.observations ?? '').trim() !== '',
    );

  if (!rejected.length) return;

  doc.addPage();
  let y = drawHeader(doc);

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.rect(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('OBSERVACIONES', MARGIN_LEFT + 3, y + 5.5);

  y += 12;

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  const maxY = PAGE_HEIGHT - MARGIN_BOTTOM - 45;

  rejected.forEach((rq, index) => {
    if (y > maxY) return; // no más de 2 hojas

    doc.setFont('helvetica', 'bold');
    doc.text(
      `${index + 1}. [P${rq.number}] ${rq.section}`,
      MARGIN_LEFT + 2,
      y,
    );
    y += 4;

    doc.setFont('helvetica', 'normal');
    const textLines = doc.splitTextToSize(
      rq.text,
      PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT - 4,
    );
    doc.text(textLines, MARGIN_LEFT + 2, y);
    y += textLines.length * 4;

    if (rq.observations) {
      doc.setFont('helvetica', 'italic');
      const obsLines = doc.splitTextToSize(
        `Observación: ${rq.observations}`,
        PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT - 4,
      );
      doc.text(obsLines, MARGIN_LEFT + 2, y);
      y += obsLines.length * 4;
    }

    y += 4;
  });

  drawSignature(doc, data, PAGE_HEIGHT - MARGIN_BOTTOM - 40);
}

/**
 * GENERADOR PRINCIPAL
 */
export async function generateMaintenanceChecklistPDF(
  data: MaintenanceChecklistPDFData,
): Promise<Blob> {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  // HOJA 1
  let y = drawHeader(doc);
  y = drawInfoGeneral(doc, data, y + 2);
  y = drawChecklist(doc, data, y + 4);
  drawSignature(doc, data, PAGE_HEIGHT - MARGIN_BOTTOM - 40);

  // HOJA 2 (solo si hay observaciones)
  drawObservationsPage(doc, data);

  return doc.output('blob') as Blob;
}

