import { generateMaintenancePDF } from '../pdfGenerator';

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
  // Identificador del checklist (lo usamos como folio)
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

  // Estado resumen de certificación (por si en el futuro lo mostramos en el PDF)
  certificationStatus?: CertificationStatus;

  // Resumen de observaciones (no imprescindible para el diseño actual)
  observationSummary?: string;

  // Preguntas del checklist
  questions: MaintenanceChecklistQuestion[];
  rejectedQuestions?: MaintenanceChecklistQuestion[];

  // Firma
  signatureDataUrl?: string | null;
  signature?: ChecklistSignatureInfo | null;
}

/**
 * Adaptador entre el flujo nuevo de Mirega y el generador de PDF antiguo
 * (generateMaintenancePDF), que es el que dibuja el informe profesional
 * en tamaño A4 con banner corporativo, información general, checklist
 * completo y segunda hoja de observaciones.
 */
export async function generateMaintenanceChecklistPDF(
  data: MaintenanceChecklistPDFData,
): Promise<Blob> {
  const folioNumber = (() => {
    const raw = typeof data.checklistId === 'number'
      ? data.checklistId
      : parseInt(String(data.checklistId), 10);

    return Number.isNaN(raw) ? 0 : raw;
  })();

  const signature = data.signature;

  // Construimos el payload que espera generateMaintenancePDF
  const checklistPayload: any = {
    folio: folioNumber,
    client: {
      business_name: data.clientName,
      address: data.clientAddress ?? '',
      contact_name: data.clientContactName ?? '',
    },
    elevator: {
      brand: data.elevatorBrand ?? '',
      model: data.elevatorModel ?? '',
      serial_number: (data.elevatorCode as string) ?? '',
      is_hydraulic: !!data.elevatorIsHydraulic,
    },
    checklist: {
      month: data.month,
      year: data.year,
      last_certification_date: data.lastCertificationDate ?? null,
      next_certification_date: data.nextCertificationDate ?? null,
      certification_not_legible: !!data.certificationNotLegible,
      completion_date: data.completionDate ?? '',
    },
    technician: {
      full_name: data.technicianName,
      email: data.technicianEmail ?? '',
    },
    questions: (data.questions || []).map((q) => ({
      question_number: q.number,
      section: q.section,
      question_text: q.text,
      // El generador antiguo solo distingue aprobado / rechazado.
      // Todo lo que NO sea "rejected" lo marcamos como aprobado.
      answer_status: q.status === 'rejected' ? 'rejected' : 'approved',
      observations: q.observations ?? undefined,
    })),
    signature: {
      signer_name: signature?.signerName || '',
      signature_data:
        signature?.signatureDataUrl || data.signatureDataUrl || '',
      signed_at: signature?.signedAt || '',
    },
  };

  return generateMaintenancePDF(checklistPayload);
}

