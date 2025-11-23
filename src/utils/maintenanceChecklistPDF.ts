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
  // Identificador del checklist (lo usamos como folio: mnt_checklists.folio)
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

// Logo corporativo MIREGA (PNG en Base64)
const LOGO_BASE64 =
  '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' +
  'l3E+HnR8EgAAAABJRU5ErkJggg==';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 5;
const MARGIN_RIGHT = 5;
const MARGIN_TOP = 10;
const MARGIN_BOTTOM = 10;

const BLUE = { r: 39, g: 58, b: 143 }; // #273a8f

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
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

function drawHeader(doc: jsPDF) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  // Logo
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

  // Título principal
  doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(27);

  const mainTitle = 'INFORME MANTENIMIENTO';
  const mainTitleX = PAGE_WIDTH / 2;
  const mainTitleY = MARGIN_TOP + 15;
  doc.text(mainTitle, mainTitleX, mainTitleY, { align: 'center' });

  // Subtítulo
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  const subTitle = 'INSPECCIÓN MENSUAL';
  const mainTitleWidth = doc.getTextWidth(mainTitle);
  const subTitleX = mainTitleX - mainTitleWidth / 2;
  const subTitleY = mainTitleY + 7;
  doc.text(subTitle, subTitleX, subTitleY);

  // Info empresa
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const infoY1 = subTitleY + 8;

  // Icono ubicación (simple pin linear)
  const locX = MARGIN_LEFT + 35 + 3;
  const locIconY = infoY1 - 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.circle(locX, locIconY - 0.5, 1.2);
  doc.line(locX, locIconY + 0.7, locX - 1, locIconY + 2);
  doc.line(locX, locIconY + 0.7, locX + 1, locIconY + 2);
  doc.line(locX - 1, locIconY + 2, locX + 1, locIconY + 2);

  doc.text(
    'MIREGA ASCENSORES LTDA. - Pedro de Valdivia N°255 – Of. 202, Providencia',
    locX + 3,
    infoY1,
  );

  const infoY2 = infoY1 + 5;

  // Teléfono (icono handset)
  const phoneIconX = locX;
  const phoneIconY = infoY2 - 2;
  doc.rect(phoneIconX - 1, phoneIconY - 2, 3, 4);
  doc.line(phoneIconX - 1, phoneIconY - 2, phoneIconX + 2, phoneIconY + 2);

  doc.text('+56956087972', phoneIconX + 4, infoY2);

  // Correo (sobre)
  const infoY3 = infoY2 + 5;
  const mailIconX = locX;
  const mailIconY = infoY3 - 2.5;
  doc.rect(mailIconX - 2, mailIconY - 2, 4, 3);
  doc.line(mailIconX - 2, mailIconY - 2, mailIconX, mailIconY + 1);
  doc.line(mailIconX + 2, mailIconY - 2, mailIconX, mailIconY + 1);
  doc.text('contacto@mirega.cl', mailIconX + 4, infoY3);

  // Web (globo)
  const infoY4 = infoY3 + 5;
  const webIconX = locX;
  const webIconY = infoY4 - 2.5;
  doc.circle(webIconX, webIconY, 1.4);
  doc.ellipse(webIconX, webIconY, 1, 0.7);
  doc.line(webIconX - 1.4, webIconY, webIconX + 1.4, webIconY);
  doc.line(webIconX, webIconY - 1.4, webIconX, webIconY + 1.4);
  doc.text('www.mirega.cl', webIconX + 4, infoY4);

  return infoY4 + 8; // devuelvo el siguiente Y usable
}

function drawInfoGeneral(doc: jsPDF, data: MaintenanceChecklistPDFData, startY: number) {
  let y = startY;

  // Barra título INFORMACIÓN GENERAL
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.rect(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INFORMACIÓN GENERAL', MARGIN_LEFT + 3, y + 5.5);

  // Folio a la derecha
  const folioLabelWidth = doc.getTextWidth('N° FOLIO:');
  const folioBoxWidth = 25;
  const folioXLabel = PAGE_WIDTH - MARGIN_RIGHT - folioBoxWidth - folioLabelWidth - 3;
  const folioY = y + 5.5;
  doc.text('N° FOLIO:', folioXLabel, folioY);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  doc.rect(
    PAGE_WIDTH - MARGIN_RIGHT - folioBoxWidth,
    y + 1,
    folioBoxWidth,
    6,
    'F',
  );
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const folioStr = String(data.checklistId || '').padStart(4, '0');
  doc.text(
    folioStr,
    PAGE_WIDTH - MARGIN_RIGHT - folioBoxWidth / 2,
    y + 5,
    { align: 'center' },
  );

  y += 10;

  // Fila 1: Cliente / Fecha
  const labelHeight = 6;
  const labelWidth = 25;
  const midWidth = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  doc.setFontSize(9);

  // Cliente
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(MARGIN_LEFT, y, labelWidth, labelHeight, 'F');
  doc.text('Cliente:', MARGIN_LEFT + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(MARGIN_LEFT + labelWidth, y, midWidth - labelWidth - 40, labelHeight, 'F');
  doc.text(data.clientName ?? '', MARGIN_LEFT + labelWidth + 2, y + 4);

  // Fecha
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  const rightLabelX = PAGE_WIDTH - MARGIN_RIGHT - 40;
  doc.rect(rightLabelX, y, 15, labelHeight, 'F');
  doc.text('Fecha:', rightLabelX + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(rightLabelX + 15, y, 25, labelHeight, 'F');
  doc.text(formatDate(data.completionDate), rightLabelX + 17, y + 4);

  y += labelHeight + 2;

  // Fila 2: Dirección / Periodo
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(MARGIN_LEFT, y, labelWidth, labelHeight, 'F');
  doc.text('Dirección:', MARGIN_LEFT + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(MARGIN_LEFT + labelWidth, y, midWidth - labelWidth - 40, labelHeight, 'F');
  doc.text((data.clientAddress ?? '').substring(0, 60), MARGIN_LEFT + labelWidth + 2, y + 4);

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(rightLabelX, y, 20, labelHeight, 'F');
  doc.text('Periodo:', rightLabelX + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(rightLabelX + 20, y, 20, labelHeight, 'F');
  const monthName = MONTHS[(data.month ?? 1) - 1] ?? '';
  doc.text(`${monthName} ${data.year}`, rightLabelX + 22, y + 4);

  y += labelHeight + 2;

  // Fila 3: Ascensor / Vigencia
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(MARGIN_LEFT, y, labelWidth, labelHeight, 'F');
  doc.text('Ascensor:', MARGIN_LEFT + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(MARGIN_LEFT + labelWidth, y, midWidth - labelWidth - 40, labelHeight, 'F');
  const ascText = data.elevatorAlias || data.elevatorCode || '';
  doc.text(String(ascText), MARGIN_LEFT + labelWidth + 2, y + 4);

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(rightLabelX, y, 25, labelHeight, 'F');
  doc.text('Vigencia:', rightLabelX + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(rightLabelX + 25, y, 15, labelHeight, 'F');
  doc.text(mapCertificationStatus(data.certificationStatus), rightLabelX + 27, y + 4);

  y += labelHeight + 2;

  // Fila 4: Técnico / Última certificación
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(MARGIN_LEFT, y, labelWidth, labelHeight, 'F');
  doc.text('Técnico:', MARGIN_LEFT + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(MARGIN_LEFT + labelWidth, y, midWidth - labelWidth - 40, labelHeight, 'F');
  doc.text(data.technicianName ?? '', MARGIN_LEFT + labelWidth + 2, y + 4);

  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(rightLabelX, y, 35, labelHeight, 'F');
  doc.text('Última certificación:', rightLabelX + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(rightLabelX + 35, y, 15, labelHeight, 'F');
  doc.text(formatDate(data.lastCertificationDate ?? null), rightLabelX + 37, y + 4);

  y += labelHeight + 2;

  // Fila 5: Próxima certificación
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.setTextColor(255, 255, 255);
  doc.rect(MARGIN_LEFT, y, 40, labelHeight, 'F');
  doc.text('Próxima certificación:', MARGIN_LEFT + 2, y + 4);

  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 0, 0);
  doc.rect(MARGIN_LEFT + 40, y, midWidth - 40, labelHeight, 'F');
  doc.text(formatDate(data.nextCertificationDate ?? null), MARGIN_LEFT + 42, y + 4);

  return y + labelHeight + 4;
}

function drawChecklist(
  doc: jsPDF,
  data: MaintenanceChecklistPDFData,
  startY: number,
) {
  let y = startY;

  // Título CHECKLIST
  doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
  doc.rect(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CHECKLIST MANTENIMIENTO', MARGIN_LEFT + 3, y + 5.5);

  y += 10;

  // Listado de preguntas (simple columna, con iconos de estado)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const lineHeight = 4;
  const maxY = PAGE_HEIGHT - MARGIN_BOTTOM - 45; // dejar espacio para firma

  data.questions.forEach((q) => {
    if (y > maxY) return; // evitar pasar más de una hoja (nos ajustamos al requerimiento)

    const status = q.status;
    const baseX = MARGIN_LEFT + 2;

    // Texto número + pregunta
    const textLines = doc.splitTextToSize(
      `${q.number}. ${q.text}`,
      PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT - 25,
    );
    doc.text(textLines, baseX, y + 3);

    // Icono de estado a la derecha
    const iconCenterX = PAGE_WIDTH - MARGIN_RIGHT - 8;
    const iconCenterY = y + 2.5;

    if (status === 'approved') {
      doc.setFillColor(212, 237, 218);
      doc.circle(iconCenterX, iconCenterY, 2, 'F');
      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(0.5);
      doc.circle(iconCenterX, iconCenterY, 2, 'S');
      doc.setLineWidth(0.7);
      doc.line(iconCenterX - 1.2, iconCenterY, iconCenterX - 0.4, iconCenterY + 1);
      doc.line(iconCenterX - 0.4, iconCenterY + 1, iconCenterX + 1.4, iconCenterY - 1);
    } else if (status === 'rejected') {
      doc.setFillColor(248, 215, 218);
      doc.circle(iconCenterX, iconCenterY, 2, 'F');
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.5);
      doc.circle(iconCenterX, iconCenterY, 2, 'S');
      doc.setLineWidth(0.7);
      doc.line(iconCenterX - 1.2, iconCenterY - 1.2, iconCenterX + 1.2, iconCenterY + 1.2);
      doc.line(iconCenterX + 1.2, iconCenterY - 1.2, iconCenterX - 1.2, iconCenterY + 1.2);
    } else if (status === 'not_applicable') {
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.4);
      doc.circle(iconCenterX, iconCenterY, 2, 'S');
      doc.setFontSize(6);
      doc.text('N/A', iconCenterX, iconCenterY + 1.5, { align: 'center' });
      doc.setFontSize(8);
    } else if (status === 'out_of_period') {
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
  const signature = data.signature || (data.signatureDataUrl
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

function drawObservationsPage(
  doc: jsPDF,
  data: MaintenanceChecklistPDFData,
) {
  const rejected =
    data.rejectedQuestions ??
    data.questions.filter(
      (q) => q.status === 'rejected' && (q.observations ?? '').trim() !== '',
    );

  if (!rejected.length) {
    return;
  }

  doc.addPage();
  let y = drawHeader(doc);

  // Título OBSERVACIONES
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
    if (y > maxY) return; // no pasamos de 2 hojas

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
 * Genera el PDF de mantenimiento con:
 * - Encabezado corporativo
 * - Información general
 * - Checklist (página 1)
 * - Observaciones y firma (página 2, si aplica)
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
