// Generador de PDF para Visitas de Emergencia
// Formato MIREGA - Adaptado del PDF de Mantenimiento
import jsPDF from 'jspdf';

export interface EmergencyElevatorInfo {
  elevator_number: number;
  brand: string;
  model: string;
  location_name: string;
  initial_status: 'operational' | 'stopped';
  final_status: 'operational' | 'observation' | 'stopped';
}

export interface EmergencyVisitPDFData {
  visitId: string;
  clientName: string;
  clientAddress?: string | null;
  visitDate: string;
  visitTime: string;
  technicianName: string;
  elevators: EmergencyElevatorInfo[];
  failureDescription: string;
  failurePhoto1Url?: string | null;
  failurePhoto2Url?: string | null;
  resolutionSummary: string;
  resolutionPhoto1Url?: string | null;
  resolutionPhoto2Url?: string | null;
  failureCause: 'normal_use' | 'third_party' | 'part_lifespan';
  finalStatus: 'operational' | 'observation' | 'stopped';
  observationUntil?: string | null;
  receiverName: string;
  signatureDataUrl: string;
  completedAt: string;
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
  orange: '#f59e0b',
  yellow: '#fbbf24',
  black: '#1d1d1b',
};

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
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Formatear hora
function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return timeStr;
}

// Etiquetas de causa de falla
function getFailureCauseLabel(cause: string): string {
  switch (cause) {
    case 'normal_use': return 'Desgaste por uso normal';
    case 'third_party': return 'Responsabilidad de terceros';
    case 'part_lifespan': return 'Vida útil de repuesto';
    default: return 'No especificado';
  }
}

// Etiquetas de estado
function getStatusLabel(status: string): string {
  switch (status) {
    case 'operational': return 'Operativo';
    case 'observation': return 'En Observación';
    case 'stopped': return 'Detenido';
    default: return 'No especificado';
  }
}

// Cargar imagen con fallback
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.error('Error al cargar imagen:', src);
      resolve(null);
    };
  });
}

// ENCABEZADO
function drawHeader(doc: jsPDF, logoImg: HTMLImageElement | null): number {
  let y = MARGIN;

  // Logo
  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', MARGIN, y, 25, 20);
    } catch (e) {
      console.error('Error al cargar logo:', e);
    }
  }

  // Título principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...hexToRgb(COLORS.red)); // Rojo para emergencias
  doc.text('REPORTE DE EMERGENCIA', PAGE_WIDTH / 2, y + 10, { align: 'center' });

  // Subtítulo
  doc.setFontSize(14);
  doc.setTextColor(...hexToRgb(COLORS.black));
  doc.text('SERVICIO DE ATENCIÓN', PAGE_WIDTH / 2, y + 18, { align: 'center' });

  // Información de contacto
  y += 25;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const contactInfo = 'MIREGA ASCENSORES LTDA. | Pedro de Valdivia N°255 – Of. 202, Providencia | +56956087972 | contacto@mirega.cl | www.mirega.cl';
  doc.text(contactInfo, PAGE_WIDTH / 2, y, { align: 'center' });

  return y + 8;
}

// INFORMACIÓN GENERAL
function drawGeneralInfo(doc: jsPDF, data: EmergencyVisitPDFData, startY: number): number {
  let y = startY;
  
  // Barra de título roja
  const redRgb = hexToRgb(COLORS.red);
  doc.setFillColor(...redRgb);
  doc.rect(MARGIN, y, PAGE_WIDTH - 2 * MARGIN, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('INFORMACIÓN GENERAL', MARGIN + 3, y + 5.5);

  y += 10;

  // Configuración de campos
  const fieldHeight = 6;
  const labelWidth = 30;
  const leftCol = MARGIN;
  const rightCol = PAGE_WIDTH / 2;

  // Función para dibujar campo
  const drawField = (label: string, value: string, x: number, yPos: number, width?: number) => {
    const fieldWidth = width || ((PAGE_WIDTH / 2) - MARGIN - labelWidth);
    
    // Label (rojo para emergencias)
    doc.setFillColor(...redRgb);
    doc.setTextColor(255, 255, 255);
    doc.rect(x, yPos, labelWidth, fieldHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, x + 1.5, yPos + 4.2);

    // Value
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...redRgb);
    doc.setLineWidth(0.3);
    doc.rect(x + labelWidth, yPos, fieldWidth, fieldHeight);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(value, x + labelWidth + 2, yPos + 4.2);
  };

  // Fila 1: Cliente | Fecha
  drawField('Cliente:', data.clientName || '', leftCol, y);
  drawField('Fecha:', formatDate(data.visitDate), rightCol, y);
  y += fieldHeight + 1.5;

  // Fila 2: Dirección | Hora
  drawField('Dirección:', data.clientAddress || 'No especificada', leftCol, y);
  drawField('Hora:', formatTime(data.visitTime), rightCol, y);
  y += fieldHeight + 1.5;

  // Fila 3: Técnico
  drawField('Técnico:', data.technicianName || '', leftCol, y);
  y += fieldHeight + 1.5;

  return y + 3;
}

// ASCENSORES ATENDIDOS
function drawElevators(doc: jsPDF, data: EmergencyVisitPDFData, startY: number): number {
  let y = startY;

  // Barra de título
  const redRgb = hexToRgb(COLORS.red);
  doc.setFillColor(...redRgb);
  doc.rect(MARGIN, y, PAGE_WIDTH - 2 * MARGIN, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('ASCENSORES ATENDIDOS', MARGIN + 3, y + 5.5);

  y += 12;

  // Tabla de ascensores
  const tableStart = MARGIN;
  const colWidths = [15, 45, 35, 35, 35]; // N°, Marca/Modelo, Ubicación, Estado Inicial, Estado Final
  const rowHeight = 7;

  // Encabezados
  doc.setFillColor(220, 220, 220);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  
  let x = tableStart;
  const headers = ['N°', 'Marca / Modelo', 'Ubicación', 'Estado Inicial', 'Estado Final'];
  headers.forEach((header, i) => {
    doc.rect(x, y, colWidths[i], rowHeight);
    doc.text(header, x + colWidths[i] / 2, y + 4.5, { align: 'center' });
    x += colWidths[i];
  });

  y += rowHeight;

  // Datos de ascensores
  doc.setFont('helvetica', 'normal');
  data.elevators.forEach((elevator) => {
    x = tableStart;
    
    // N°
    doc.rect(x, y, colWidths[0], rowHeight);
    doc.text(String(elevator.elevator_number), x + colWidths[0] / 2, y + 4.5, { align: 'center' });
    x += colWidths[0];
    
    // Marca/Modelo
    doc.rect(x, y, colWidths[1], rowHeight);
    const brandModel = `${elevator.brand} ${elevator.model}`.substring(0, 25);
    doc.text(brandModel, x + 2, y + 4.5);
    x += colWidths[1];
    
    // Ubicación
    doc.rect(x, y, colWidths[2], rowHeight);
    const location = elevator.location_name.substring(0, 20);
    doc.text(location, x + 2, y + 4.5);
    x += colWidths[2];
    
    // Estado Inicial
    doc.rect(x, y, colWidths[3], rowHeight);
    const initialLabel = elevator.initial_status === 'operational' ? 'Operativo' : 'Detenido';
    const initialColor = elevator.initial_status === 'operational' ? COLORS.green : COLORS.red;
    doc.setTextColor(...hexToRgb(initialColor));
    doc.setFont('helvetica', 'bold');
    doc.text(initialLabel, x + colWidths[3] / 2, y + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    x += colWidths[3];
    
    // Estado Final
    doc.rect(x, y, colWidths[4], rowHeight);
    const finalLabel = getStatusLabel(elevator.final_status);
    let finalColor = COLORS.green;
    if (elevator.final_status === 'observation') finalColor = COLORS.yellow;
    if (elevator.final_status === 'stopped') finalColor = COLORS.red;
    doc.setTextColor(...hexToRgb(finalColor));
    doc.setFont('helvetica', 'bold');
    doc.text(finalLabel, x + colWidths[4] / 2, y + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    y += rowHeight;
  });

  return y + 5;
}

// DESCRIPCIÓN DE FALLA
function drawFailureDescription(doc: jsPDF, data: EmergencyVisitPDFData, startY: number, failurePhoto1?: HTMLImageElement | null, failurePhoto2?: HTMLImageElement | null): number {
  let y = startY;

  // Verificar si necesitamos nueva página
  if (y > PAGE_HEIGHT - 80) {
    doc.addPage();
    y = MARGIN;
  }

  // Barra de título
  const redRgb = hexToRgb(COLORS.red);
  doc.setFillColor(...redRgb);
  doc.rect(MARGIN, y, PAGE_WIDTH - 2 * MARGIN, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPCIÓN DE LA FALLA', MARGIN + 3, y + 5.5);

  y += 12;

  // Descripción
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  
  const maxWidth = PAGE_WIDTH - 2 * MARGIN;
  const lines = doc.splitTextToSize(data.failureDescription || 'Sin descripción', maxWidth);
  lines.forEach((line: string) => {
    if (y > PAGE_HEIGHT - 20) {
      doc.addPage();
      y = MARGIN;
    }
    doc.text(line, MARGIN, y);
    y += 5;
  });

  y += 3;

  // Fotos de la falla
  if (failurePhoto1 || failurePhoto2) {
    // Verificar espacio para fotos
    if (y > PAGE_HEIGHT - 70) {
      doc.addPage();
      y = MARGIN;
    }

    const photoWidth = 85;
    const photoHeight = 60;
    let x = MARGIN;

    if (failurePhoto1) {
      try {
        doc.addImage(failurePhoto1, 'JPEG', x, y, photoWidth, photoHeight);
        doc.setFontSize(7);
        doc.text('Foto 1 - Falla', x, y + photoHeight + 3);
      } catch (e) {
        console.error('Error al agregar foto 1 de falla:', e);
      }
      x += photoWidth + 5;
    }

    if (failurePhoto2) {
      try {
        doc.addImage(failurePhoto2, 'JPEG', x, y, photoWidth, photoHeight);
        doc.setFontSize(7);
        doc.text('Foto 2 - Falla', x, y + photoHeight + 3);
      } catch (e) {
        console.error('Error al agregar foto 2 de falla:', e);
      }
    }

    y += photoHeight + 8;
  }

  return y;
}

// RESOLUCIÓN
function drawResolution(doc: jsPDF, data: EmergencyVisitPDFData, startY: number, resolutionPhoto1?: HTMLImageElement | null, resolutionPhoto2?: HTMLImageElement | null): number {
  let y = startY;

  // Verificar si necesitamos nueva página
  if (y > PAGE_HEIGHT - 80) {
    doc.addPage();
    y = MARGIN;
  }

  // Barra de título
  const greenRgb = hexToRgb(COLORS.green);
  doc.setFillColor(...greenRgb);
  doc.rect(MARGIN, y, PAGE_WIDTH - 2 * MARGIN, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('RESOLUCIÓN Y TRABAJOS REALIZADOS', MARGIN + 3, y + 5.5);

  y += 12;

  // Resumen de resolución
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  
  const maxWidth = PAGE_WIDTH - 2 * MARGIN;
  const lines = doc.splitTextToSize(data.resolutionSummary || 'Sin descripción', maxWidth);
  lines.forEach((line: string) => {
    if (y > PAGE_HEIGHT - 20) {
      doc.addPage();
      y = MARGIN;
    }
    doc.text(line, MARGIN, y);
    y += 5;
  });

  y += 3;

  // Clasificación de la falla
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Clasificación de la falla:', MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(getFailureCauseLabel(data.failureCause), MARGIN + 5, y);
  y += 8;

  // Fotos de resolución
  if (resolutionPhoto1 || resolutionPhoto2) {
    // Verificar espacio para fotos
    if (y > PAGE_HEIGHT - 70) {
      doc.addPage();
      y = MARGIN;
    }

    const photoWidth = 85;
    const photoHeight = 60;
    let x = MARGIN;

    if (resolutionPhoto1) {
      try {
        doc.addImage(resolutionPhoto1, 'JPEG', x, y, photoWidth, photoHeight);
        doc.setFontSize(7);
        doc.text('Foto 1 - Resolución', x, y + photoHeight + 3);
      } catch (e) {
        console.error('Error al agregar foto 1 de resolución:', e);
      }
      x += photoWidth + 5;
    }

    if (resolutionPhoto2) {
      try {
        doc.addImage(resolutionPhoto2, 'JPEG', x, y, photoWidth, photoHeight);
        doc.setFontSize(7);
        doc.text('Foto 2 - Resolución', x, y + photoHeight + 3);
      } catch (e) {
        console.error('Error al agregar foto 2 de resolución:', e);
      }
    }

    y += photoHeight + 8;
  }

  return y;
}

// ESTADO FINAL Y OBSERVACIONES
function drawFinalStatus(doc: jsPDF, data: EmergencyVisitPDFData, startY: number): number {
  let y = startY;

  // Verificar espacio
  if (y > PAGE_HEIGHT - 40) {
    doc.addPage();
    y = MARGIN;
  }

  // Barra de título
  const blueRgb = hexToRgb(COLORS.blue);
  doc.setFillColor(...blueRgb);
  doc.rect(MARGIN, y, PAGE_WIDTH - 2 * MARGIN, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('ESTADO FINAL DEL SERVICIO', MARGIN + 3, y + 5.5);

  y += 12;

  // Estado final
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Estado:', MARGIN, y);
  
  let statusColor = COLORS.green;
  if (data.finalStatus === 'observation') statusColor = COLORS.yellow;
  if (data.finalStatus === 'stopped') statusColor = COLORS.red;
  
  doc.setTextColor(...hexToRgb(statusColor));
  doc.text(getStatusLabel(data.finalStatus), MARGIN + 20, y);
  doc.setTextColor(0, 0, 0);
  
  y += 8;

  // Si está en observación
  if (data.finalStatus === 'observation' && data.observationUntil) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(COLORS.orange));
    doc.text(`⚠ En observación hasta: ${formatDate(data.observationUntil)}`, MARGIN, y);
    doc.text('Se cerrará automáticamente si no se reportan problemas.', MARGIN, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 12;
  }

  // Si quedó detenido
  if (data.finalStatus === 'stopped') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(COLORS.red));
    doc.text('⚠ ASCENSOR DETENIDO - REQUIERE REPARACIÓN', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text('Se ha generado una solicitud de servicio con prioridad CRÍTICA.', MARGIN, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 12;
  }

  return y + 3;
}

// FIRMA
function drawSignature(doc: jsPDF, data: EmergencyVisitPDFData, startY: number, signatureImg?: HTMLImageElement | null): number {
  let y = startY;

  // Verificar espacio
  if (y > PAGE_HEIGHT - 50) {
    doc.addPage();
    y = MARGIN;
  }

  // Barra de título
  const blueRgb = hexToRgb(COLORS.blue);
  doc.setFillColor(...blueRgb);
  doc.rect(MARGIN, y, PAGE_WIDTH - 2 * MARGIN, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('FIRMA Y RECEPCIÓN', MARGIN + 3, y + 5.5);

  y += 12;

  // Nombre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Recibido por:', MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(data.receiverName || 'No especificado', MARGIN, y);
  y += 8;

  // Firma
  if (signatureImg) {
    try {
      const sigWidth = 60;
      const sigHeight = 30;
      doc.addImage(signatureImg, 'PNG', MARGIN, y, sigWidth, sigHeight);
      y += sigHeight + 2;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, y, MARGIN + sigWidth, y);
      doc.setFontSize(7);
      doc.text('Firma', MARGIN, y + 3);
    } catch (e) {
      console.error('Error al agregar firma:', e);
    }
  }

  y += 8;

  // Fecha de completado
  doc.setFontSize(8);
  doc.text(`Fecha de servicio: ${formatDate(data.completedAt)}`, MARGIN, y);

  return y + 5;
}

// PIE DE PÁGINA
function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const y = PAGE_HEIGHT - 10;
  
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  
  // Página
  doc.text(`Página ${pageNum} de ${totalPages}`, PAGE_WIDTH / 2, y, { align: 'center' });
  
  // Nota legal
  doc.text('Este documento es válido como constancia del servicio de emergencia prestado.', PAGE_WIDTH / 2, y + 3, { align: 'center' });
}

// FUNCIÓN PRINCIPAL DE GENERACIÓN
export async function generateEmergencyVisitPDF(data: EmergencyVisitPDFData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Cargar logo (ajusta la ruta según tu proyecto)
  const logoImg = await loadImage('/logo.png');

  // Cargar fotos si existen
  const failurePhoto1 = data.failurePhoto1Url ? await loadImage(data.failurePhoto1Url) : null;
  const failurePhoto2 = data.failurePhoto2Url ? await loadImage(data.failurePhoto2Url) : null;
  const resolutionPhoto1 = data.resolutionPhoto1Url ? await loadImage(data.resolutionPhoto1Url) : null;
  const resolutionPhoto2 = data.resolutionPhoto2Url ? await loadImage(data.resolutionPhoto2Url) : null;
  const signatureImg = data.signatureDataUrl ? await loadImage(data.signatureDataUrl) : null;

  // Generar contenido
  let y = drawHeader(doc, logoImg);
  y = drawGeneralInfo(doc, data, y);
  y = drawElevators(doc, data, y);
  y = drawFailureDescription(doc, data, y, failurePhoto1, failurePhoto2);
  y = drawResolution(doc, data, y, resolutionPhoto1, resolutionPhoto2);
  y = drawFinalStatus(doc, data, y);
  y = drawSignature(doc, data, y, signatureImg);

  // Pie de página en todas las páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  // Retornar blob
  return doc.output('blob');
}
