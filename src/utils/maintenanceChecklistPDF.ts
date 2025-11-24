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

// Intenta convertir alias a "Ascensor 1/2/3" cuando el alias es letra o número
function formatElevatorLabel(alias?: string | null, code?: string | null): string {
  if (!alias && !code) return '';
  const raw = (alias || code || '').trim();

  // Si ya viene algo como "Ascensor 1", lo respetamos
  if (/^ascensor\s+\d+/i.test(raw)) return raw;

  // Si es solo números → Ascensor N
  if (/^\d+$/.test(raw)) {
    return `Ascensor ${raw}`;
  }

  // Si es una letra A, B, C... → Ascensor 1, 2, 3
  if (/^[A-Za-z]$/.test(raw)) {
    const n = raw.toUpperCase().charCodeAt(0) - 64; // A=65 → 1
    if (n > 0) return `Ascensor ${n}`;
  }

  // Si no calza con nada, devolvemos el texto tal cual
  return raw;
}

// Carga el logo desde /logo_color.png
async function loadLogoImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = '/logo_color.png';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
}

/**
 * ENCABEZADO: logo + títulos + línea de datos empresa
 */
function drawHeader(doc: jsPDF, logoImg: HTMLImageElement | null) {
  // LOGO: 35 x 30 mm, respetando margen izquierdo
  if (logoImg) {
    try {
      doc.addImage(
        logoImg,
        'PNG',
        MARGIN_LEFT,
        MARGIN_TOP,
        35,
        30,
      );
    } catch (e) {
      console.error('Error al agregar logo:', e);
    }
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

  // INFORMACIÓN DE EMPRESA – una sola línea, centrada dentro de márgenes
  const maxContentWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  let fontSize = 9;
  let totalWidth = 0;

  const computeWidths = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    const text1 =
      'MIREGA ASCENSORES LTDA. Pedro de Valdivia N°255 – Of. 202, Providencia';
    const text2 = '+56956087972';
    const text3 = 'contacto@mirega.cl';
    const text4 = 'www.mirega.cl';

    const iconToTextGap = 2;
    const segmentGap = 8;
    const iconWidth = 4;

    const t1w = doc.getTextWidth(text1);
    const t2w = doc.getTextWidth(text2);
    const t3w = doc.getTextWidth(text3);
    const t4w = doc.getTextWidth(text4);

    totalWidth =
      (iconWidth + iconToTextGap + t1w) +
      segmentGap +
      (iconWidth + iconToTextGap + t2w) +
      segmentGap +
      (iconWidth + iconToTextGap + t3w) +
      segmentGap +
      (iconWidth + iconToTextGap + t4w);

    return {
      text1,
      text2,
      text3,
      text4,
      iconToTextGap,
      segmentGap,
      iconWidth,
      t1w,
      t2w,
      t3w,
      t4w,
    };
  };

  // Intento 1: tamaño 9, si se pasa reducimos a 8
  let metrics = computeWidths();
  if (totalWidth > maxContentWidth) {
    fontSize = 8;
    metrics = computeWidths();
  }

  const infoY = subTitleY + 8;
  // centrado, pero nunca menos que el margen izquierdo
  let cursorX = (PAGE_WIDTH - totalWidth) / 2;
  if (cursorX < MARGIN_LEFT) cursorX = MARGIN_LEFT;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);

  const yBaseline = infoY;

  // Desestructuramos métricas
  const {
    text1,
    text2,
    text3,
    text4,
    iconToTextGap,
    segmentGap,
    iconWidth,
    t1w,
    t2w,
    t3w,
    t4w,
  } = metrics;

  // Icono ubicación (pin simple)
  const pinCenterX = cursorX + iconWidth / 2;
  const pinCenterY = yBaseline - 2;
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
 * BLOQUE INFORMACIÓN GENERAL (ajustado a maqueta)
 */
function drawInfoGeneral(doc: jsPDF, data: MaintenanceChecklistPDFData, startY: number) {
  let y = startY;

  const totalWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const labelHeight = 6;

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

  // Diseño: 60% ancho para lado izquierdo, 40% para lado derecho
  const leftLabelWidth = 25;
  const leftGroupWidth = totalWidth * 0.6;
  const leftFieldWidth = leftGroupWidth - leftLabelWidth;

  const rightLabelWidth = 35;
  const rightFieldWidth = totalWidth - leftGroupWidth - rightLabelWidth - 6; // 6 mm separación

  const xLeftLabel = MARGIN_LEFT;
  const xLeftField = xLeftLabel + leftLabelWidth;
  const xRightLabel = MARGIN_LEFT + leftGroupWidth + 4;
  const xRightField = xRightLabel + rightLabelWidth;

  // --- Fila 1: Cliente / Fecha / Periodo ---
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(xLeftLabel, y, leftLabelWidth, labelHeight, 'F');
  doc.text('Cliente:', xLeftLabel + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(xLeftField, y, leftFieldWidth, labelHeight, 'F');
  doc.text(
    (data.clientName ?? '').substring(0, 45),
    xLeftField + 2,
    y + 4,
  );

  // Fecha
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(xRightLabel, y, rightLabelWidth, labelHeight, 'F');
  doc.text('Fecha:', xRightLabel + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  const halfRightField = (rightFieldWidth - 2) / 2; // dividimos derecha en 2: Fecha / Periodo
  doc.rect(xRightField, y, halfRightField, labelHeight, 'F');
  doc.text(formatDate(data.completionDate, 'No registrado'), xRightField + 2, y + 4);

  // Periodo
  const xPeriodoLabel = xRightField + halfRightField + 2;
  const periodoLabelWidth = 20;
  const xPeriodoField = xPeriodoLabel + periodoLabelWidth;
  const periodoFieldWidth = rightFieldWidth - halfRightField - 2 - periodoLabelWidth;

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(xPeriodoLabel, y, periodoLabelWidth, labelHeight, 'F');
  doc.text('Periodo:', xPeriodoLabel + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(xPeriodoField, y, periodoFieldWidth, labelHeight, 'F');
  const monthName = MONTHS[(data.month ?? 1) - 1] ?? '';
  doc.text(`${monthName} ${data.year}`, xPeriodoField + 2, y + 4);

  y += labelHeight + 2;

  // --- Fila 2: Dirección / Vigencia certificación ---
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(xLeftLabel, y, leftLabelWidth, labelHeight, 'F');
  doc.text('Dirección:', xLeftLabel + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(xLeftField, y, leftFieldWidth, labelHeight, 'F');
  doc.text(
    (data.clientAddress ?? '').substring(0, 60),
    xLeftField + 2,
    y + 4,
  );

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(xRightLabel, y, rightLabelWidth, labelHeight, 'F');
  doc.text('Vigencia certificación:', xRightLabel + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(xRightField, y, rightFieldWidth, labelHeight, 'F');
  doc.text(mapCertificationStatus(data.certificationStatus), xRightField + 2, y + 4);

  y += labelHeight + 2;

  // --- Fila 3: Ascensor / Última certificación ---
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(xLeftLabel, y, leftLabelWidth, labelHeight, 'F');
  doc.text('Ascensor:', xLeftLabel + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(xLeftField, y, leftFieldWidth, labelHeight, 'F');
  const ascText = formatElevatorLabel(
    data.elevatorAlias || data.elevatorCode || '',
    data.elevatorCode || '',
  );
  doc.text(String(ascText).substring(0, 45), xLeftField + 2, y + 4);

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(xRightLabel, y, rightLabelWidth, labelHeight, 'F');
  doc.text('Última certificación:', xRightLabel + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(xRightField, y, rightFieldWidth, labelHeight, 'F');
  const lastCertText =
    data.certificationNotLegible || !data.lastCertificationDate
      ? 'No es legible'
      : formatDate(data.lastCertificationDate, 'No es legible');
  doc.text(lastCertText, xRightField + 2, y + 4);

  y += labelHeight + 2;

  // --- Fila 4: Técnico / Próxima certificación ---
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(xLeftLabel, y, leftLabelWidth, labelHeight, 'F');
  doc.text('Técnico:', xLeftLabel + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(xLeftField, y, leftFieldWidth, labelHeight, 'F');
  doc.text(
    (data.technicianName ?? '').substring(0, 45),
    xLeftField + 2,
    y + 4,
  );

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(xRightLabel, y, rightLabelWidth, labelHeight, 'F');
  doc.text('Próxima certificación', xRightLabel + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(xRightField, y, rightFieldWidth, labelHeight, 'F');
  const nextCertText =
    data.certificationNotLegible || !data.nextCertificationDate
      ? 'No es legible'
      : formatDate(data.nextCertificationDate, 'No es legible');
  doc.text(nextCertText, xRightField + 2, y + 4);

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
  const maxY = PAGE_HEIGHT - MARGIN_BOTTOM - 45; // espacio para firma

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
      // círculo con check (verde)
      doc.setFillColor(212, 237, 218);
      doc.circle(iconCenterX, iconCenterY, 2, 'F');
      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(0.5);
      doc.circle(iconCenterX, iconCenterY, 2, 'S');
      doc.setLineWidth(0.7);
      doc.line(iconCenterX - 1.2, iconCenterY, iconCenterX - 0.4, iconCenterY + 1);
      doc.line(iconCenterX - 0.4, iconCenterY + 1, iconCenterX + 1.4, iconCenterY - 1);
    } else if (q.status === 'rejected') {
      // círculo con X (rojo)
      doc.setFillColor(248, 215, 218);
      doc.circle(iconCenterX, iconCenterY, 2, 'F');
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.5);
      doc.circle(iconCenterX, iconCenterY, 2, 'S');
      doc.setLineWidth(0.7);
      doc.line(iconCenterX - 1.2, iconCenterY - 1.2, iconCenterX + 1.2, iconCenterY + 1.2);
      doc.line(iconCenterX + 1.2, iconCenterY - 1.2, iconCenterX - 1.2, iconCenterY + 1.2);
    } else if (q.status === 'not_applicable') {
      // círculo gris N/A
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.4);
      doc.circle(iconCenterX, iconCenterY, 2, 'S');
      doc.setFontSize(6);
      doc.text('N/A', iconCenterX, iconCenterY + 1.5, { align: 'center' });
      doc.setFontSize(8);
    } else if (q.status === 'out_of_period') {
      // círculo naranja P (fuera de periodo)
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
  logoImg: HTMLImageElement | null,
) {
  const rejected =
    data.rejectedQuestions ??
    data.questions.filter(
      (q) => q.status === 'rejected' && (q.observations ?? '').trim() !== '',
    );

  if (!rejected.length) return;

  doc.addPage();
  let y = drawHeader(doc, logoImg);

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

  const logoImg = await loadLogoImage();

  // HOJA 1
  let y = drawHeader(doc, logoImg);
  y = drawInfoGeneral(doc, data, y + 2);
  y = drawChecklist(doc, data, y + 4);
  drawSignature(doc, data, PAGE_HEIGHT - MARGIN_BOTTOM - 40);

  // HOJA 2 (solo si hay observaciones)
  drawObservationsPage(doc, data, logoImg);

  return doc.output('blob') as Blob;
}

