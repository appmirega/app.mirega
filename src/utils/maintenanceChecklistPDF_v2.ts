// Generador de PDF - Formato MIREGA Oficial
// Actualizado con colores corporativos y formato A4
import jsPDF from 'jspdf';

export type CertificationStatus = 'sin_info' | 'vigente' | 'vencida' | 'por_vencer' | 'no_legible';
export type MaintenanceQuestionStatus = 'approved' | 'rejected' | 'not_applicable' | 'out_of_period';

export interface MaintenanceChecklistQuestion {
  number: number;
  section: string;
  text: string;
  status: MaintenanceQuestionStatus;
  observations?: string | null;
  photos?: string[];
}

export interface ChecklistSignatureInfo {
  signerName: string;
  signedAt: string;
  signatureDataUrl: string;
}

export interface MaintenanceChecklistPDFData {
  checklistId: string | number;
  folioNumber?: number | string;
  clientName: string;
  clientAddress?: string | null;
  elevatorNumber?: number;
  month: number;
  year: number;
  completionDate?: string;
  lastCertificationDate?: string | null;
  nextCertificationDate?: string | null;
  technicianName: string;
  certificationStatus?: CertificationStatus;
  questions: MaintenanceChecklistQuestion[];
  signature?: ChecklistSignatureInfo | null;
}

// Configuración de página A4
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 10;

// Colores corporativos MIREGA
const COLORS = {
  blue: '#273a8f',
  green: '#44ac4c',
  red: '#e1162b',
  black: '#1d1d1b',
};

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Helper para convertir hex a RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
}

// Formatear fecha
function formatDate(dateStr?: string | null, fallback = 'No registrado'): string {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return fallback;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Estado de certificación
function getCertificationStatusText(status?: CertificationStatus): string {
  switch (status) {
    case 'vigente': return 'Vigente';
    case 'vencida': return 'Vencida';
    case 'por_vencer': return 'Por vencer';
    case 'no_legible': return 'No legible';
    default: return 'No legible';
  }
}

// Cargar imagen con fallback
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
}

// ENCABEZADO
function drawHeader(doc: jsPDF, logoImg: HTMLImageElement | null): number {
  let y = MARGIN;

  // Logo (más pequeño y sin sobreposición)
  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', MARGIN, y, 25, 20);
    } catch (e) {
      console.error('Error al cargar logo:', e);
    }
  }

  // Título principal (más arriba para dar espacio)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...hexToRgb(COLORS.black));
  doc.text('INFORME MANTENIMIENTO', PAGE_WIDTH / 2, y + 10, { align: 'center' });

  // Subtítulo
  doc.setFontSize(14);
  doc.text('INSPECCIÓN MENSUAL', PAGE_WIDTH / 2, y + 18, { align: 'center' });

  // Información de contacto
  y += 25;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const contactInfo = 'MIREGA ASCENSORES LTDA. | Pedro de Valdivia N°255 – Of. 202, Providencia | +56956087972 | contacto@mirega.cl | www.mirega.cl';
  doc.text(contactInfo, PAGE_WIDTH / 2, y, { align: 'center' });

  return y + 8;
}

// INFORMACIÓN GENERAL
function drawGeneralInfo(doc: jsPDF, data: MaintenanceChecklistPDFData, startY: number): number {
  let y = startY;
  
  // Barra de título azul con folio
  const blueRgb = hexToRgb(COLORS.blue);
  doc.setFillColor(...blueRgb);
  doc.rect(MARGIN, y, PAGE_WIDTH - 2 * MARGIN, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('INFORMACIÓN GENERAL', MARGIN + 3, y + 5.5);

  // Folio
  const folioText = data.folioNumber ? `FOLIO: ${data.folioNumber}` : 'FOLIO: PENDIENTE';
  doc.text(folioText, PAGE_WIDTH - MARGIN - 3, y + 5.5, { align: 'right' });

  y += 10;

  // Configuración de campos
  const fieldHeight = 7;
  const labelWidth = 40;
  const leftCol = MARGIN;
  const rightCol = PAGE_WIDTH / 2 + 5;

  // Función para dibujar campo
  const drawField = (label: string, value: string, x: number, yPos: number, wide = false) => {
    const fieldWidth = wide ? PAGE_WIDTH - 2 * MARGIN - labelWidth - 2 : (PAGE_WIDTH / 2 - MARGIN - labelWidth - 7);
    
    // Label (azul)
    doc.setFillColor(...blueRgb);
    doc.setTextColor(255, 255, 255);
    doc.rect(x, yPos, labelWidth, fieldHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, x + 2, yPos + 4.8);

    // Value (blanco con borde)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...blueRgb);
    doc.setLineWidth(0.3);
    doc.rect(x + labelWidth, yPos, fieldWidth, fieldHeight);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(value, x + labelWidth + 3, yPos + 4.8);
  };

  // Fila 1: Cliente | Periodo
  drawField('Cliente:', data.clientName || '', leftCol, y);
  drawField('Periodo:', MONTHS[data.month - 1] || '', rightCol, y);
  y += fieldHeight + 2;

  // Fila 2: Dirección (ancho completo)
  drawField('Dirección:', data.clientAddress || '', leftCol, y, true);
  y += fieldHeight + 2;

  // Fila 3: Ascensor | Fecha
  const ascensorText = data.elevatorNumber ? `Ascensor ${data.elevatorNumber}` : 'No especificado';
  drawField('N° de Ascensor:', ascensorText, leftCol, y);
  drawField('Fecha:', formatDate(data.completionDate), rightCol, y);
  y += fieldHeight + 2;

  // Fila 4: Técnico | Vigencia
  drawField('Técnico:', data.technicianName || '', leftCol, y);
  drawField('Vigencia Certif.:', getCertificationStatusText(data.certificationStatus), rightCol, y);
  y += fieldHeight + 2;

  // Fila 5: Última Certificación | Próxima Certificación
  drawField('Última Certif.:', formatDate(data.lastCertificationDate, 'No legible'), leftCol, y);
  drawField('Próxima Certif.:', formatDate(data.nextCertificationDate, 'No legible'), rightCol, y);

  return y + fieldHeight + 8;
}

// LEYENDA DE ICONOGRAFÍA
function drawLegend(doc: jsPDF, y: number): number {
  const blueRgb = hexToRgb(COLORS.blue);
  const greenRgb = hexToRgb(COLORS.green);
  const redRgb = hexToRgb(COLORS.red);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Leyenda:', MARGIN, y);
  
  const startX = MARGIN + 18;
  let x = startX;

  // ✓ Aprobado
  doc.setFillColor(...greenRgb);
  doc.circle(x, y - 1.5, 2, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text('✓ Aprobado', x + 4, y);
  x += 25;

  // ✗ Rechazado
  doc.setFillColor(...redRgb);
  doc.circle(x, y - 1.5, 2, 'F');
  doc.text('✗ Rechazado', x + 4, y);
  x += 28;

  // - No corresponde al periodo
  doc.setFillColor(200, 200, 200);
  doc.circle(x, y - 1.5, 2, 'F');
  doc.text('- No corresponde al periodo', x + 4, y);
  x += 55;

  // / No aplica al tipo de ascensor
  doc.setFillColor(180, 180, 180);
  doc.circle(x, y - 1.5, 2, 'F');
  doc.text('/ No aplica al tipo', x + 4, y);

  return y + 6;
}

// CHECKLIST EN DOS COLUMNAS
function drawChecklist(doc: jsPDF, data: MaintenanceChecklistPDFData, startY: number): number {
  let y = startY;

  // Título de sección
  const blueRgb = hexToRgb(COLORS.blue);
  doc.setFillColor(...blueRgb);
  doc.rect(MARGIN, y, PAGE_WIDTH - 2 * MARGIN, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('CHECKLIST MANTENIMIENTO', MARGIN + 3, y + 5.5);

  y += 10;

  // Dividir preguntas en dos columnas equilibradas
  const total = data.questions.length;
  const half = Math.ceil(total / 2);
  const leftQuestions = data.questions.slice(0, half);
  const rightQuestions = data.questions.slice(half);

  const colWidth = (PAGE_WIDTH - 2 * MARGIN - 6) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colWidth + 6;

  const drawColumn = (questions: MaintenanceChecklistQuestion[], x: number, startYCol: number) => {
    let yCol = startYCol;
    const greenRgb = hexToRgb(COLORS.green);
    const redRgb = hexToRgb(COLORS.red);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    questions.forEach((q) => {
      const questionText = `${q.number}. ${q.text}`;
      const textWidth = colWidth - 12;
      const lines = doc.splitTextToSize(questionText, textWidth);

      // Dibujar texto
      doc.text(lines, x + 2, yCol + 3);

      // Dibujar icono de estado
      const iconX = x + colWidth - 5;
      const iconY = yCol + 2;

      // Cuadrado de fondo
      doc.setFillColor(240, 240, 240);
      doc.rect(iconX - 3, iconY - 2, 6, 6, 'F');

      if (q.status === 'approved') {
        doc.setFillColor(...greenRgb);
        doc.circle(iconX, iconY + 1, 2, 'F');
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        // Checkmark
        doc.line(iconX - 1, iconY + 1, iconX - 0.3, iconY + 2);
        doc.line(iconX - 0.3, iconY + 2, iconX + 1.2, iconY - 0.5);
      } else if (q.status === 'rejected') {
        doc.setFillColor(...redRgb);
        doc.circle(iconX, iconY + 1, 2, 'F');
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        // X mark
        doc.line(iconX - 1, iconY, iconX + 1, iconY + 2);
        doc.line(iconX + 1, iconY, iconX - 1, iconY + 2);
      } else if (q.status === 'out_of_period') {
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(10);
        doc.text('-', iconX, iconY + 2, { align: 'center' });
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
      } else if (q.status === 'not_applicable') {
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(10);
        doc.text('/', iconX, iconY + 2, { align: 'center' });
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
      }

      yCol += Math.max(5, lines.length * 3.5 + 2);
    });

    return yCol;
  };

  const yLeft = drawColumn(leftQuestions, leftX, y);
  const yRight = drawColumn(rightQuestions, rightX, y);

  return Math.max(yLeft, yRight) + 6;
}

// FIRMA
function drawSignature(doc: jsPDF, data: MaintenanceChecklistPDFData, y: number) {
  const blueRgb = hexToRgb(COLORS.blue);
  const boxW = 80;
  const boxH = 25;

  // Título
  doc.setFillColor(...blueRgb);
  doc.rect(MARGIN, y, boxW, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('RECEPCIONADO POR:', MARGIN + 2, y + 4);

  // Recuadro de firma
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...blueRgb);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN, y + 7, boxW, boxH);

  // Imagen de firma (más pequeña con más padding)
  if (data.signature?.signatureDataUrl) {
    try {
      doc.addImage(data.signature.signatureDataUrl, 'PNG', MARGIN + 10, y + 10, boxW - 20, boxH - 8);
    } catch (e) {
      console.error('Error al cargar firma:', e);
    }
  }

  // Nombre del firmante
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const signerName = data.signature?.signerName?.toUpperCase() || 'SIN FIRMA REGISTRADA';
  doc.text(signerName, MARGIN + boxW / 2, y + boxH + 10, { align: 'center' });

  // Fecha de firma
  if (data.signature?.signedAt) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(formatDate(data.signature.signedAt), MARGIN + boxW / 2, y + boxH + 14, { align: 'center' });
  }
}

// PÁGINA DE OBSERVACIONES
function drawObservationsPage(doc: jsPDF, data: MaintenanceChecklistPDFData, logoImg: HTMLImageElement | null) {
  const rejected = data.questions.filter(q => 
    q.status === 'rejected' && q.observations && q.observations.trim() !== ''
  );

  if (rejected.length === 0) return;

  doc.addPage();
  let y = drawHeader(doc, logoImg);

  // Título de observaciones
  const blueRgb = hexToRgb(COLORS.blue);
  doc.setFillColor(...blueRgb);
  doc.rect(MARGIN, y, PAGE_WIDTH - 2 * MARGIN, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('OBSERVACIONES', MARGIN + 3, y + 5.5);

  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  rejected.forEach((q, index) => {
    if (y > PAGE_HEIGHT - 60) return; // Evitar overflow

    // Número y pregunta
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. [Pregunta ${q.number}] ${q.section}`, MARGIN, y);
    y += 5;

    // Texto de la pregunta
    doc.setFont('helvetica', 'normal');
    const questionLines = doc.splitTextToSize(q.text, PAGE_WIDTH - 2 * MARGIN - 4);
    doc.text(questionLines, MARGIN + 2, y);
    y += questionLines.length * 4 + 2;

    // Observación
    doc.setFont('helvetica', 'italic');
    const obsText = `Observación: ${q.observations}`;
    const obsLines = doc.splitTextToSize(obsText, PAGE_WIDTH - 2 * MARGIN - 4);
    doc.text(obsLines, MARGIN + 2, y);
    y += obsLines.length * 4 + 6;
  });

  // Firma en página de observaciones
  drawSignature(doc, data, PAGE_HEIGHT - 50);
}

// FOOTER (número de página)
function addPageNumbers(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    
    // Número de página
    doc.text(`Página ${i} de ${totalPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 5, { align: 'right' });
    
    // Texto generado por
    doc.text('Documento generado por MIREGA', MARGIN, PAGE_HEIGHT - 5);
  }
}

// GENERADOR PRINCIPAL
export async function generateMaintenanceChecklistPDF(data: MaintenanceChecklistPDFData): Promise<Blob> {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait'
  });

  // Cargar logo
  const logoImg = await loadImage('/logo_color.png');

  // Página principal
  let y = drawHeader(doc, logoImg);
  y = drawGeneralInfo(doc, data, y);
  y = drawLegend(doc, y);
  y = drawChecklist(doc, data, y);
  
  // Firma al final de la primera página
  drawSignature(doc, data, PAGE_HEIGHT - 50);

  // Página de observaciones (si hay)
  drawObservationsPage(doc, data, logoImg);

  // Agregar numeración de páginas
  addPageNumbers(doc);

  return doc.output('blob');
}
