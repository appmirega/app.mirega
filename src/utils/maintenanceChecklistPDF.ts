// src/utils/maintenanceChecklistPDF.ts
import jsPDF from 'jspdf';

export type ChecklistStatus = 'approved' | 'rejected';

export interface ChecklistQuestionRow {
  number: number;
  section: string;
  text: string;
  status: ChecklistStatus;
  observations?: string | null;
  photoUrls?: (string | null | undefined)[];
}

export type CertificationStatus =
  | 'vigente'
  | 'vencida'
  | 'por_vencer'
  | 'no_legible'
  | 'sin_info';

export interface ChecklistPDFData {
  clientName: string;
  clientCode: string;
  clientAddress?: string | null;
  elevatorCode: string;
  elevatorAlias?: string | null;
  month: number;
  year: number;
  technicianName: string;
  certificationStatus: CertificationStatus;
  observationSummary: string; // Ej: "Sin observaciones" o "Presenta 3 observaciones."
  questions: ChecklistQuestionRow[];
  signatureDataUrl?: string | null; // data:image/png;base64,...
}

/**
 * Convierte cualquier valor a texto seguro para el PDF.
 */
function safeText(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Convierte un número de mes (1-12) a texto en español.
 */
function getMonthNameEs(month: number): string {
  const months = [
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
  return months[month - 1] ?? safeText(month);
}

/**
 * Genera el nombre de archivo del PDF de mantenimiento.
 * Ejemplo: MANTENIMIENTO_ALCANTARA_A1_2025_03.pdf
 */
export function getChecklistPDFFileName(data: ChecklistPDFData): string {
  const client = safeText(data.clientCode || data.clientName || 'CLIENTE');
  const elevator = safeText(data.elevatorCode || data.elevatorAlias || 'ASCENSOR');
  const mm = String(data.month).padStart(2, '0');
  const year = safeText(data.year);

  // Nos aseguramos de que el resultado final sea string
  const fileName = `MANTENIMIENTO_${client}_${elevator}_${year}_${mm}.pdf`;
  return fileName.replace(/\s+/g, '_').toUpperCase();
}

/**
 * Agrega texto con salto de página si se acerca al final.
 */
function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  cursorY: number,
  maxWidth: number,
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 20;
  const lines = doc.splitTextToSize(text, maxWidth);

  lines.forEach((line) => {
    if (cursorY > pageHeight - bottomMargin) {
      doc.addPage();
      cursorY = 20;
    }
    doc.text(line, x, cursorY);
    cursorY += 4;
  });

  return cursorY;
}

/**
 * Genera un Blob con el PDF del checklist de mantenimiento.
 */
export async function generateMaintenanceChecklistPDF(
  data: ChecklistPDFData,
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 30; // margen izq 15, der 15
  let cursorY = 15;

  // === ENCABEZADO ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('INFORME DE MANTENIMIENTO DE ASCENSOR', pageWidth / 2, cursorY, {
    align: 'center',
  });

  cursorY += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const monthName = getMonthNameEs(data.month);

  cursorY = addWrappedText(
    doc,
    `Cliente: ${safeText(data.clientName)}`,
    15,
    cursorY,
    contentWidth,
  );

  if (data.clientAddress) {
    cursorY = addWrappedText(
      doc,
      `Dirección: ${safeText(data.clientAddress)}`,
      15,
      cursorY,
      contentWidth,
    );
  }

  cursorY = addWrappedText(
    doc,
    `Ascensor: ${safeText(
      data.elevatorAlias || data.elevatorCode,
    )}   (Código: ${safeText(data.elevatorCode)})`,
    15,
    cursorY,
    contentWidth,
  );

  cursorY = addWrappedText(
    doc,
    `Período de mantenimiento: ${monthName} ${safeText(data.year)}`,
    15,
    cursorY,
    contentWidth,
  );

  cursorY = addWrappedText(
    doc,
    `Técnico: ${safeText(data.technicianName)}`,
    15,
    cursorY,
    contentWidth,
  );

  let estadoTexto = '';
  switch (data.certificationStatus) {
    case 'vigente':
      estadoTexto = 'Vigente';
      break;
    case 'vencida':
      estadoTexto = 'Vencida';
      break;
    case 'por_vencer':
      estadoTexto = 'Próxima a vencer';
      break;
    case 'no_legible':
      estadoTexto = 'No legible';
      break;
    case 'sin_info':
    default:
      estadoTexto = 'Sin información';
      break;
  }

  cursorY = addWrappedText(
    doc,
    `Estado de certificación: ${estadoTexto}`,
    15,
    cursorY,
    contentWidth,
  );

  cursorY = addWrappedText(
    doc,
    `Resumen de observaciones: ${safeText(data.observationSummary)}`,
    15,
    cursorY,
    contentWidth,
  );

  cursorY += 4;

  // === DETALLE DE PREGUNTAS ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  cursorY = addWrappedText(doc, 'Detalle de checklist:', 15, cursorY, contentWidth);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  cursorY += 2;

  for (const q of data.questions) {
    const statusLabel = q.status === 'approved' ? 'APROBADO' : 'RECHAZADO';
    const obs = (q.observations || '').toString().trim() || 'Sin observaciones';
    const photos = (q.photoUrls || [])
      .filter((p): p is string => !!p)
      .map((p) => safeText(p))
      .join(', ');

    const headerLine = `${q.number}. [${safeText(q.section)}] ${safeText(q.text)}`;
    cursorY = addWrappedText(doc, headerLine, 15, cursorY, contentWidth);

    cursorY = addWrappedText(doc, `   Estado: ${statusLabel}`, 15, cursorY, contentWidth);
    cursorY = addWrappedText(
      doc,
      `   Observaciones: ${obs}`,
      15,
      cursorY,
      contentWidth,
    );
    cursorY = addWrappedText(
      doc,
      `   Fotos: ${photos || 'Sin fotos'}`,
      15,
      cursorY,
      contentWidth,
    );

    cursorY += 2;
  }

  // === FIRMA ===
  const pageHeight = doc.internal.pageSize.getHeight();
  if (cursorY > pageHeight - 50) {
    doc.addPage();
    cursorY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  cursorY += 8;
  doc.text('Firma de conformidad', 15, cursorY);
  cursorY += 6;

  const lineXStart = 15;
  const lineXEnd = 90;
  const lineY = cursorY + 15;
  doc.line(lineXStart, lineY, lineXEnd, lineY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Nombre y firma', lineXStart, lineY + 5);

  if (data.signatureDataUrl && typeof data.signatureDataUrl === 'string') {
    try {
      doc.addImage(
        data.signatureDataUrl,
        'PNG',
        lineXStart,
        lineY - 15,
        60, // ancho
        15, // alto
      );
    } catch (e) {
      console.error('Error al agregar imagen de firma al PDF:', e);
    }
  }

  // Fecha de generación
  const now = new Date();
  const fechaStr = `${now.getDate().toString().padStart(2, '0')}/${(
    now.getMonth() + 1
  )
    .toString()
    .padStart(2, '0')}/${now.getFullYear()}`;

  doc.setFontSize(8);
  doc.text(`Informe generado el ${fechaStr}`, pageWidth - 15, 285, {
    align: 'right',
  });

  // Devolver Blob
  return doc.output('blob');
}

