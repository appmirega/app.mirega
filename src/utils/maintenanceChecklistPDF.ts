// src/utils/maintenanceChecklistPDF.ts
import jsPDF from 'jspdf';

export type ChecklistStatus =
  | 'approved'
  | 'rejected'
  | 'not_applicable'
  | 'out_of_period';

export type CertificationStatus =
  | 'vigente'
  | 'vencida'
  | 'por_vencer'
  | 'no_legible'
  | 'sin_info';

export interface ChecklistQuestionRow {
  number: number;
  section: string;
  text: string;
  status: ChecklistStatus;
  observations?: string | null;
}

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
  observationSummary: string;

  // Checklist completo (todas las preguntas)
  questions: ChecklistQuestionRow[];

  // Solo las rechazadas (para la página 2)
  rejectedQuestions: ChecklistQuestionRow[];

  // Firma de la visita (si existe)
  signatureDataUrl?: string | null;
}

// --- Datos de cabecera corporativa (puedes ajustarlos a tu gusto) ---
const COMPANY_NAME = 'MIREGA Ascensores';
const COMPANY_ADDRESS = 'Dirección de la empresa';
const COMPANY_PHONE = '+56 9 0000 0000';
const COMPANY_WEBSITE = 'www.mirega.cl';

function safeText(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

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

export function getChecklistPDFFileName(data: ChecklistPDFData): string {
  const client = safeText(data.clientCode || data.clientName || 'CLIENTE');
  const elevator = safeText(data.elevatorCode || data.elevatorAlias || 'ASCENSOR');
  const mm = String(data.month).padStart(2, '0');
  const year = safeText(data.year);

  const raw = `MANTENIMIENTO_${client}_${elevator}_${year}_${mm}.pdf`;
  return raw.replace(/\s+/g, '_').toUpperCase();
}

// Iconito para cada estado
function statusIcon(status: ChecklistStatus): string {
  switch (status) {
    case 'approved':
      return '✔'; // Aprobado
    case 'rejected':
      return '✘'; // Rechazado
    case 'not_applicable':
      return '○'; // No aplica
    case 'out_of_period':
    default:
      return '◌'; // Fuera de periodo
  }
}

// Texto de estado para leyenda, si lo quieres usar después
function statusLabel(status: ChecklistStatus): string {
  switch (status) {
    case 'approved':
      return 'Aprobado';
    case 'rejected':
      return 'Rechazado';
    case 'not_applicable':
      return 'No aplica';
    case 'out_of_period':
    default:
      return 'Fuera de periodo';
  }
}

// Estado de certificación a texto
function certificationLabel(status: CertificationStatus): string {
  switch (status) {
    case 'vigente':
      return 'Vigente';
    case 'vencida':
      return 'Vencida';
    case 'por_vencer':
      return 'Próxima a vencer';
    case 'no_legible':
      return 'No legible';
    case 'sin_info':
    default:
      return 'Sin información';
  }
}

// Dibuja el banner corporativo y devuelve la primera posición Y disponible
function drawHeader(doc: jsPDF, data: ChecklistPDFData): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Barra roja arriba
  doc.setFillColor(220, 38, 38); // rojo
  doc.rect(0, 0, pageWidth, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(COMPANY_NAME, 15, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(COMPANY_ADDRESS, 15, 15);
  doc.text(`Tel: ${COMPANY_PHONE}`, 15, 20);

  const websiteText = safeText(COMPANY_WEBSITE);
  if (websiteText) {
    doc.text(websiteText, pageWidth - 15, 20, { align: 'right' });
  }

  // Título del informe
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('INFORME DE MANTENIMIENTO DE ASCENSOR', pageWidth / 2, 32, {
    align: 'center',
  });

  return 38; // siguiente Y libre
}

// Añade texto con salto de página cuando se acerca al final
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

  for (const line of lines) {
    if (cursorY > pageHeight - bottomMargin) {
      doc.addPage();
      cursorY = drawHeader(doc, {
        // Cabecera solo necesita algunos campos – el resto da igual aquí
        clientName: '',
        clientCode: '',
        clientAddress: '',
        elevatorCode: '',
        elevatorAlias: '',
        month: 1,
        year: 2000,
        technicianName: '',
        certificationStatus: 'sin_info',
        observationSummary: '',
        questions: [],
        rejectedQuestions: [],
        signatureDataUrl: null,
      });
    }
    doc.text(line, x, cursorY);
    cursorY += 4;
  }

  return cursorY;
}

export async function generateMaintenanceChecklistPDF(
  data: ChecklistPDFData,
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentMarginX = 15;

  // --- Página 1: cabecera y resumen ---
  let cursorY = drawHeader(doc, data);
  cursorY += 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const monthName = getMonthNameEs(data.month);

  // Bloque de resumen
  cursorY = addWrappedText(
    doc,
    `Cliente: ${safeText(data.clientName)}`,
    contentMarginX,
    cursorY,
    pageWidth - contentMarginX * 2,
  );
  if (data.clientAddress) {
    cursorY = addWrappedText(
      doc,
      `Dirección: ${safeText(data.clientAddress)}`,
      contentMarginX,
      cursorY,
      pageWidth - contentMarginX * 2,
    );
  }
  cursorY = addWrappedText(
    doc,
    `Ascensor: ${safeText(
      data.elevatorAlias || data.elevatorCode,
    )} (Código: ${safeText(data.elevatorCode)})`,
    contentMarginX,
    cursorY,
    pageWidth - contentMarginX * 2,
  );
  cursorY = addWrappedText(
    doc,
    `Período de mantenimiento: ${monthName} ${safeText(data.year)}`,
    contentMarginX,
    cursorY,
    pageWidth - contentMarginX * 2,
  );
  cursorY = addWrappedText(
    doc,
    `Técnico: ${safeText(data.technicianName)}`,
    contentMarginX,
    cursorY,
    pageWidth - contentMarginX * 2,
  );
  cursorY = addWrappedText(
    doc,
    `Estado de certificación: ${certificationLabel(data.certificationStatus)}`,
    contentMarginX,
    cursorY,
    pageWidth - contentMarginX * 2,
  );
  cursorY = addWrappedText(
    doc,
    `Resumen de observaciones: ${safeText(data.observationSummary)}`,
    contentMarginX,
    cursorY,
    pageWidth - contentMarginX * 2,
  );

  cursorY += 4;

  // Leyenda de iconos
  doc.setFont('helvetica', 'bold');
  doc.text('Leyenda:', contentMarginX, cursorY);
  doc.setFont('helvetica', 'normal');

  const legend = `✔ Aprobado   ✘ Rechazado   ○ No aplica   ◌ Fuera de periodo`;
  doc.text(legend, contentMarginX + 20, cursorY);
  cursorY += 6;

  // --- Checklist por secciones ---
  const groupedBySection: Record<string, ChecklistQuestionRow[]> = {};

  (data.questions || []).forEach((q) => {
    if (!groupedBySection[q.section]) groupedBySection[q.section] = [];
    groupedBySection[q.section].push(q);
  });

  const sections = Object.keys(groupedBySection).sort();

  const statusColX = pageWidth - 15; // columna derecha para el icono
  const textMaxWidth = statusColX - contentMarginX - 10; // espacio para el texto

  sections.forEach((section) => {
    const sectionQuestions = groupedBySection[section].sort(
      (a, b) => a.number - b.number,
    );

    // Salto de página si se acerca al final
    if (cursorY > pageHeight - 20) {
      doc.addPage();
      cursorY = drawHeader(doc, data);
      cursorY += 4;
    }

    // Título de sección con barra gris
    doc.setFillColor(241, 245, 249); // gris clarito
    doc.rect(contentMarginX - 2, cursorY - 4, pageWidth - contentMarginX * 2 + 4, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(section.toUpperCase(), contentMarginX, cursorY);
    cursorY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    for (const q of sectionQuestions) {
      if (cursorY > pageHeight - 20) {
        doc.addPage();
        cursorY = drawHeader(doc, data);
        cursorY += 4;

        // repetir encabezado de sección para continuidad
        doc.setFillColor(241, 245, 249);
        doc.rect(
          contentMarginX - 2,
          cursorY - 4,
          pageWidth - contentMarginX * 2 + 4,
          7,
          'F',
        );
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(section.toUpperCase(), contentMarginX, cursorY);
        cursorY += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }

      // Número de pregunta
      const questionNumberText = `${q.number}.`;
      doc.text(questionNumberText, contentMarginX, cursorY);

      // Texto de pregunta (multilínea)
      const textX = contentMarginX + 8;
      const lines = doc.splitTextToSize(q.text, textMaxWidth);
      let lineY = cursorY;

      for (const line of lines) {
        doc.text(line, textX, lineY);
        lineY += 4;
      }

      // Icono del estado en la columna derecha
      const icon = statusIcon(q.status);
      doc.setFont('helvetica', 'bold');
      doc.text(icon, statusColX, cursorY);
      doc.setFont('helvetica', 'normal');

      // Avanzar cursor (dejo un pequeño espacio entre preguntas)
      cursorY = lineY + 1;
    }

    cursorY += 3;
  });

  // --- Página de observaciones (solo si hay rechazadas) ---
  const rejected = data.rejectedQuestions || [];
  if (rejected.length > 0) {
    doc.addPage();
    cursorY = drawHeader(doc, data);
    cursorY += 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Observaciones levantadas', contentMarginX, cursorY);
    cursorY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    rejected.forEach((q) => {
      if (cursorY > pageHeight - 20) {
        doc.addPage();
        cursorY = drawHeader(doc, data);
        cursorY += 4;
      }

      const title = `N° ${q.number} • ${q.section}`;
      cursorY = addWrappedText(
        doc,
        title,
        contentMarginX,
        cursorY,
        pageWidth - contentMarginX * 2,
      );

      const obsText = q.observations
        ? `Observación: ${q.observations}`
        : 'Observación: (sin detalle registrado)';
      cursorY = addWrappedText(
        doc,
        obsText,
        contentMarginX,
        cursorY,
        pageWidth - contentMarginX * 2,
      );

      cursorY += 2;
    });
  }

  // --- Bloque de firma al final del último documento ---
  let lastPageIndex = doc.getNumberOfPages();
  doc.setPage(lastPageIndex);

  let signatureY = cursorY + 10;
  if (signatureY > pageHeight - 40) {
    doc.addPage();
    lastPageIndex = doc.getNumberOfPages();
    doc.setPage(lastPageIndex);
    signatureY = drawHeader(doc, data) + 10;
  }

  // Línea de firma
  const lineXStart = contentMarginX;
  const lineXEnd = contentMarginX + 75;
  const lineY = signatureY + 15;
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
        60, // ancho firma
        15, // alto firma
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
  doc.text(`Informe generado el ${fechaStr}`, pageWidth - 15, pageHeight - 10, {
    align: 'right',
  });

  return doc.output('blob');
}

