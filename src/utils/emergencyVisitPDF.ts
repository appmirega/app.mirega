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
  visitStartTime: string; // Hora de apertura del formulario
  visitEndTime: string;   // Hora de cierre
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
  serviceRequestType?: 'repair' | 'parts' | 'support' | null;
  serviceRequestDescription?: string | null;
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
    case 'normal_use': return 'Falla por uso';
    case 'third_party': return 'Daño de terceros';
    case 'part_lifespan': return 'Vida útil del repuesto';
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

  // Logo PNG sin fondo
  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', MARGIN, y, 30, 20);
    } catch (e) {
      console.error('Error al cargar logo:', e);
    }
  }

  // Título principal - NEGRO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text('REPORTE DE EMERGENCIA', PAGE_WIDTH / 2, y + 10, { align: 'center' });

  // Subtítulo - NEGRO
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
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
  
  // Barra de título AZUL
  const blueRgb = hexToRgb(COLORS.blue);
  doc.setFillColor(...blueRgb);
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
    
    // Label (AZUL)
    doc.setFillColor(...blueRgb);
    doc.setTextColor(255, 255, 255);
    doc.rect(x, yPos, labelWidth, fieldHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, x + 1.5, yPos + 4.2);

    // Value
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...blueRgb);
    doc.setLineWidth(0.3);
    doc.rect(x + labelWidth, yPos, fieldWidth, fieldHeight);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(value, x + labelWidth + 2, yPos + 4.2);
  };

  // Fila 1: Edificio | Fecha
  drawField('Edificio:', data.clientName || '', leftCol, y);
  drawField('Fecha:', formatDate(data.visitDate), rightCol, y);
  y += fieldHeight + 1.5;

  // Fila 2: Dirección | Hora Inicio
  drawField('Dirección:', data.clientAddress || 'No especificada', leftCol, y);
  drawField('Hora Inicio:', formatTime(data.visitStartTime), rightCol, y);
  y += fieldHeight + 1.5;

  // Fila 3: Técnico | Hora Cierre
  drawField('Técnico:', data.technicianName || '', leftCol, y);
  drawField('Hora Cierre:', formatTime(data.visitEndTime), rightCol, y);
  y += fieldHeight + 1.5;

  return y + 3;
}

// ASCENSORES ATENDIDOS
function drawElevators(doc: jsPDF, data: EmergencyVisitPDFData, startY: number): number {
  let y = startY;

  // Determinar color de barra según estado final predominante
  let barColor = COLORS.green; // Verde por defecto (operativo)
  const hasObservation = data.elevators.some(e => e.final_status === 'observation');
  const hasStopped = data.elevators.some(e => e.final_status === 'stopped');
  
  if (hasStopped) {
    barColor = COLORS.red; // Rojo si hay detenidos
  } else if (hasObservation) {
    barColor = COLORS.yellow; // Amarillo si hay en observación
  }

  // Barra de título con color dinámico
  const barRgb = hexToRgb(barColor);
  doc.setFillColor(...barRgb);
  doc.rect(MARGIN, y, PAGE_WIDTH - 2 * MARGIN, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('ASCENSORES ATENDIDOS', MARGIN + 3, y + 5.5);

  y += 12;

  // Tabla de ascensores
  const tableStart = MARGIN;
  const colWidths = [45, 40, 40, 65]; // Ascensor N°, Estado Inicial, Estado Final, Clasificación
  const rowHeight = 7;

  // Encabezados
  doc.setFillColor(220, 220, 220);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  
  let x = tableStart;
  const headers = ['Ascensor N°', 'Estado Inicial', 'Estado Final', 'Clasificación de la Falla'];
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
    
    // Ascensor N°
    doc.rect(x, y, colWidths[0], rowHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`Ascensor N° ${elevator.elevator_number}`, x + colWidths[0] / 2, y + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    x += colWidths[0];
    
    // Estado Inicial
    doc.rect(x, y, colWidths[1], rowHeight);
    const initialLabel = elevator.initial_status === 'operational' ? 'Operativo' : 'Detenido';
    const initialColor = elevator.initial_status === 'operational' ? COLORS.green : COLORS.red;
    doc.setTextColor(...hexToRgb(initialColor));
    doc.setFont('helvetica', 'bold');
    doc.text(initialLabel, x + colWidths[1] / 2, y + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    x += colWidths[1];
    
    // Estado Final
    doc.rect(x, y, colWidths[2], rowHeight);
    const finalLabel = getStatusLabel(elevator.final_status);
    let finalColor = COLORS.green;
    if (elevator.final_status === 'observation') finalColor = COLORS.yellow;
    if (elevator.final_status === 'stopped') finalColor = COLORS.red;
    doc.setTextColor(...hexToRgb(finalColor));
    doc.setFont('helvetica', 'bold');
    doc.text(finalLabel, x + colWidths[2] / 2, y + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    x += colWidths[2];
    
    // Clasificación de la Falla
    doc.rect(x, y, colWidths[3], rowHeight);
    doc.setFontSize(7);
    doc.text(getFailureCauseLabel(data.failureCause), x + 2, y + 4.5);
    doc.setFontSize(8);
    
    y += rowHeight;
  });

  return y + 5;
}

// DESCRIPCIÓN DE FALLA (sin fotos)
function drawFailureDescription(doc: jsPDF, data: EmergencyVisitPDFData, startY: number): number {
  let y = startY;

  // Verificar si necesitamos nueva página
  if (y > PAGE_HEIGHT - 50) {
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

  return y + 5;
}

// RESOLUCIÓN (sin fotos)
function drawResolution(doc: jsPDF, data: EmergencyVisitPDFData, startY: number): number {
  let y = startY;

  // Verificar si necesitamos nueva página
  if (y > PAGE_HEIGHT - 50) {
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

  return y + 5;
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

  // Si quedó detenido - mostrar detalle de solicitud
  if (data.finalStatus === 'stopped' && data.serviceRequestType) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(COLORS.red));
    doc.text('⚠ ASCENSOR DETENIDO - REQUIERE ATENCIÓN', MARGIN, y);
    y += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Siguiente Paso:', MARGIN, y);
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Detalle según tipo de solicitud
    if (data.serviceRequestType === 'parts') {
      const partDescription = data.serviceRequestDescription || 'No especificado';
      doc.text(`Se ha creado solicitud de Repuestos. ${partDescription}`, MARGIN, y);
      y += 5;
      doc.text('El supervisor coordinará la adquisición e instalación.', MARGIN, y);
    } else if (data.serviceRequestType === 'support') {
      doc.text('Se ha creado solicitud de Soporte Técnico.', MARGIN, y);
      y += 5;
      doc.text('Se requiere segunda opinión especializada.', MARGIN, y);
    } else if (data.serviceRequestType === 'repair') {
      doc.text('Se ha creado solicitud de Reparación.', MARGIN, y);
      y += 5;
      doc.text('El supervisor asignará técnico para realizar la reparación.', MARGIN, y);
    }
    
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  return y + 3;
}

// PÁGINA 2: EVIDENCIA FOTOGRÁFICA Y FIRMA
function drawPhotosAndSignaturePage(
  doc: jsPDF, 
  data: EmergencyVisitPDFData,
  failurePhoto1?: HTMLImageElement | null,
  failurePhoto2?: HTMLImageElement | null, 
  resolutionPhoto1?: HTMLImageElement | null,
  resolutionPhoto2?: HTMLImageElement | null,
  signatureImg?: HTMLImageElement | null
): void {
  doc.addPage();
  let y = MARGIN + 5;

  // Título de sección: ESTADO INICIAL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('REGISTRO FOTOGRÁFICO - ESTADO INICIAL', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 10;

  // Fotos iniciales (2 fotos, mismo tamaño forzado)
  const photoWidth = 85;
  const photoHeight = 65;
  const spacing = 10;
  const startX = (PAGE_WIDTH - (2 * photoWidth + spacing)) / 2;

  // Foto 1 - Estado Inicial
  if (failurePhoto1) {
    try {
      doc.addImage(failurePhoto1, 'JPEG', startX, y, photoWidth, photoHeight);
    } catch (e) {
      console.error('Error al agregar foto 1 inicial:', e);
    }
  } else {
    // Placeholder si no hay foto
    doc.setDrawColor(200, 200, 200);
    doc.rect(startX, y, photoWidth, photoHeight);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Sin foto', startX + photoWidth / 2, y + photoHeight / 2, { align: 'center' });
  }

  // Foto 2 - Estado Inicial
  if (failurePhoto2) {
    try {
      doc.addImage(failurePhoto2, 'JPEG', startX + photoWidth + spacing, y, photoWidth, photoHeight);
    } catch (e) {
      console.error('Error al agregar foto 2 inicial:', e);
    }
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.rect(startX + photoWidth + spacing, y, photoWidth, photoHeight);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Sin foto', startX + photoWidth + spacing + photoWidth / 2, y + photoHeight / 2, { align: 'center' });
  }

  y += photoHeight + 15;

  // Título de sección: ESTADO FINAL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('REGISTRO FOTOGRÁFICO - ESTADO FINAL', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 10;

  // Fotos finales (2 fotos, mismo tamaño forzado)
  // Foto 1 - Estado Final
  if (resolutionPhoto1) {
    try {
      doc.addImage(resolutionPhoto1, 'JPEG', startX, y, photoWidth, photoHeight);
    } catch (e) {
      console.error('Error al agregar foto 1 final:', e);
    }
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.rect(startX, y, photoWidth, photoHeight);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Sin foto', startX + photoWidth / 2, y + photoHeight / 2, { align: 'center' });
  }

  // Foto 2 - Estado Final
  if (resolutionPhoto2) {
    try {
      doc.addImage(resolutionPhoto2, 'JPEG', startX + photoWidth + spacing, y, photoWidth, photoHeight);
    } catch (e) {
      console.error('Error al agregar foto 2 final:', e);
    }
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.rect(startX + photoWidth + spacing, y, photoWidth, photoHeight);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Sin foto', startX + photoWidth + spacing + photoWidth / 2, y + photoHeight / 2, { align: 'center' });
  }

  y += photoHeight + 20;

  // FIRMA CENTRADA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('FIRMA Y RECEPCIÓN DEL SERVICIO', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 8;

  // Nombre del receptor centrado
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(data.receiverName || 'No especificado', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 8;

  // Firma centrada
  if (signatureImg) {
    try {
      const sigWidth = 60;
      const sigHeight = 30;
      const sigX = (PAGE_WIDTH - sigWidth) / 2;
      doc.addImage(signatureImg, 'PNG', sigX, y, sigWidth, sigHeight);
      y += sigHeight + 2;
      
      // Línea de firma
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(sigX, y, sigX + sigWidth, y);
      y += 4;
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Firma del Receptor', PAGE_WIDTH / 2, y, { align: 'center' });
    } catch (e) {
      console.error('Error al agregar firma:', e);
    }
  }

  y += 8;

  // Fecha del servicio centrada
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Fecha de Servicio: ${formatDate(data.completedAt)}`, PAGE_WIDTH / 2, y, { align: 'center' });
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

  // Cargar logo PNG sin fondo
  const logoImg = await loadImage('/logo.png');

  // Cargar fotos si existen
  const failurePhoto1 = data.failurePhoto1Url ? await loadImage(data.failurePhoto1Url) : null;
  const failurePhoto2 = data.failurePhoto2Url ? await loadImage(data.failurePhoto2Url) : null;
  const resolutionPhoto1 = data.resolutionPhoto1Url ? await loadImage(data.resolutionPhoto1Url) : null;
  const resolutionPhoto2 = data.resolutionPhoto2Url ? await loadImage(data.resolutionPhoto2Url) : null;
  const signatureImg = data.signatureDataUrl ? await loadImage(data.signatureDataUrl) : null;

  // ============ PÁGINA 1: INFORMACIÓN COMPLETA ============
  let y = drawHeader(doc, logoImg);
  y = drawGeneralInfo(doc, data, y);
  y = drawElevators(doc, data, y);
  y = drawFailureDescription(doc, data, y);
  y = drawResolution(doc, data, y);
  y = drawFinalStatus(doc, data, y);

  // Pie de página 1
  drawFooter(doc, 1, 2);

  // ============ PÁGINA 2: FOTOS Y FIRMA ============
  drawPhotosAndSignaturePage(doc, data, failurePhoto1, failurePhoto2, resolutionPhoto1, resolutionPhoto2, signatureImg);
  
  // Pie de página 2
  drawFooter(doc, 2, 2);

  // Retornar blob
  return doc.output('blob');
}
