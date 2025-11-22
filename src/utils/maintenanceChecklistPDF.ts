// src/utils/maintenanceChecklistPDF.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  return months[month - 1] ?? String(month);
}

/**
 * Genera el nombre de archivo del PDF de mantenimiento.
 * Ejemplo: MANTENIMIENTO_ALCANTARA_A1_2025_03.pdf
 */
export function getChecklistPDFFileName(data: ChecklistPDFData): string {
  const safeClient = data.clientCode || data.clientName || 'CLIENTE';
  const safeElevator = data.elevatorCode || data.elevatorAlias || 'ASCENSOR';
  const mm = String(data.month).padStart(2, '0');

  return `MANTENIMIENTO_${safeClient}_${safeElevator}_${data.year}_${mm}.pdf`
    .replace(/\s+/g, '_')
    .toUpperCase();
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

  doc.text(`Cliente: ${data.clientName}`, 15, cursorY);
  cursorY += 6;

  if (data.clientAddress) {
    doc.text(`Dirección: ${data.clientAddress}`, 15, cursorY);
    cursorY += 6;
  }

  doc.text(
    `Ascensor: ${data.elevatorAlias || data.elevatorCode}   (Código: ${data.elevatorCode})`,
    15,
    cursorY,
  );
  cursorY += 6;

  doc.text(
    `Período de mantenimiento: ${monthName} ${data.year}`,
    15,
    cursorY,
  );
  cursorY += 6;

  doc.text(`Técnico: ${data.technicianName}`, 15, cursorY);
  cursorY += 6;

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

  doc.text(`Estado de certificación: ${estadoTexto}`, 15, cursorY);
  cursorY += 6;

  doc.text(`Resumen de observaciones: ${data.observationSummary}`, 15, cursorY);
  cursorY += 10;

  // === TABLA PRINCIPAL (PREGUNTAS) ===
  const tableBody = data.questions.map((q) => {
    const statusLabel = q.status === 'approved' ? 'APROBADO' : 'RECHAZADO';

    const photos = (q.photoUrls || [])
      .filter((p): p is string => !!p)
      .join('\n');

    return [
      q.number.toString(),
      q.section,
      q.text,
      statusLabel,
      (q.observations || '').trim() || '-',
      photos || '-',
    ];
  });

  autoTable(doc, {
    startY: cursorY,
    head: [['N°', 'Sección', 'Pregunta', 'Estado', 'Observaciones', 'Fotos']],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      valign: 'top',
    },
    headStyles: {
      fillColor: [30, 64, 175], // azul oscuro
      textColor: 255,
    },
    columnStyles: {
      0: { cellWidth: 8 }, // N°
      1: { cellWidth: 25 }, // Sección
      2: { cellWidth: 70 }, // Pregunta
      3: { cellWidth: 20 }, // Estado
      4: { cellWidth: 40 }, // Observaciones
      5: { cellWidth: 30 }, // Fotos (urls)
    },
    theme: 'grid',
  });

  // Posición después de la tabla
  // @ts-expect-error: autoTable any type
  const finalY: number =
    (doc as any).lastAutoTable?.finalY ??
    (doc as any).previousAutoTable?.finalY ??
    cursorY;

  cursorY = finalY + 20;

  // === FIRMA ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Firma de conformidad', 15, cursorY);
  cursorY += 6;

  // Línea de firma
  const lineXStart = 15;
  const lineXEnd = 90;
  const lineY = cursorY + 15;
  doc.line(lineXStart, lineY, lineXEnd, lineY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Nombre y firma', lineXStart, lineY + 5);

  // Si tenemos imagen de la firma (dataURL), la incrustamos sobre la línea
  if (data.signatureDataUrl) {
    try {
      doc.addImage(
        data.signatureDataUrl,
        'PNG',
        lineXStart,
        lineY - 15,
        60, // ancho aprox
        15, // alto aprox
      );
    } catch {
      // Si falla, dejamos solo la línea
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
