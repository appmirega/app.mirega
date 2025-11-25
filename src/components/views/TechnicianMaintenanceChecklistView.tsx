// ======================================================
// TechnicianMaintenanceChecklistView.tsx
// Vista del técnico: historial, descarga de PDFs y firma
// Integrado con maintenanceChecklistPDF.ts
// ======================================================

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { generateMaintenanceChecklistPDF } from '../../utils/maintenanceChecklistPDF';
import { Download } from 'lucide-react';

interface MaintenanceHistory {
  id: string;
  client_id: string;
  elevator_id: string;
  month: number;
  year: number;
  completion_date: string | null;
}

export function TechnicianMaintenanceChecklistView() {
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // =============================================
  // 1) Cargar historial de checklists
  // =============================================
  const loadHistory = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('mnt_checklists')
      .select('id, client_id, elevator_id, month, year, completion_date')
      .order('completion_date', { ascending: false });

    if (!error && data) {
      setHistory(data as MaintenanceHistory[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // =============================================
  // 2) Descargar PDF de un checklist
  // =============================================
  const handleDownloadPDF = async (record: MaintenanceHistory) => {
    try {
      setDownloadingPDF(true);

      // 1) Información principal del checklist
      const { data: checklistData, error: chkErr } = await supabase
        .from('mnt_checklists')
        .select(
          `
          id,
          folio,
          month,
          year,
          completion_date,
          last_certification_date,
          next_certification_date,
          certification_not_legible,
          client:clients(
            id,
            company_name,
            address
          ),
          elevator:elevators(
            id,
            serial_number,
            location_name,
            brand,
            model,
            is_hydraulic,
            index_number
          ),
          technician:profiles!mnt_checklists_technician_id_fkey(
            full_name,
            email
          )
        `,
        )
        .eq('id', record.id)
        .maybeSingle();

      if (chkErr) throw chkErr;
      if (!checklistData) throw new Error('Checklist no encontrado');

      const elevatorNumber =
        checklistData.elevator.index_number != null
          ? `Ascensor ${checklistData.elevator.index_number}`
          : 'Ascensor';

      // 2) Todas las preguntas del checklist
      const { data: questionsData, error: qErr } = await supabase
        .from('mnt_checklist_questions')
        .select(
          `
          id,
          question_number,
          section,
          question_text,
          frequency,
          is_hydraulic_only
        `,
        )
        .order('question_number');

      if (qErr) throw qErr;

      // 3) Todas las respuestas de este checklist
      const { data: answersData, error: aErr } = await supabase
        .from('mnt_checklist_answers')
        .select('question_id, status, observations')
        .eq('checklist_id', checklistData.id);

      if (aErr) throw aErr;

      const answersMap = new Map<string, any>();
      (answersData || []).forEach((a: any) => {
        answersMap.set(a.question_id, a);
      });

      const currentMonth = checklistData.month as number;
      const quarters = [3, 6, 9, 12];
      const semesters = [3, 9];

      // 4) Construir preguntas para el PDF
      const pdfQuestions: {
        number: number;
        section: string;
        text: string;
        status: 'approved' | 'rejected' | 'not_applicable' | 'out_of_period';
        observations?: string | null;
      }[] = [];

      (questionsData || []).forEach((q: any) => {
        const ans = answersMap.get(q.id);

        let inPeriod = false;
        if (q.frequency === 'M') inPeriod = true;
        if (q.frequency === 'T') inPeriod = quarters.includes(currentMonth);
        if (q.frequency === 'S') inPeriod = semesters.includes(currentMonth);

        let status: 'approved' | 'rejected' | 'not_applicable' | 'out_of_period' =
          'approved';

        if (q.is_hydraulic_only && !checklistData.elevator.is_hydraulic) {
          status = 'not_applicable';
        } else if (!inPeriod) {
          status = 'out_of_period';
        } else if (ans?.status === 'rejected') {
          status = 'rejected';
        }

        pdfQuestions.push({
          number: q.question_number,
          section: q.section,
          text: q.question_text,
          status,
          observations: ans?.observations ?? null,
        });
      });

      // 5) Firma (última registrada)
      const { data: signature } = await supabase
        .from('mnt_checklist_signatures')
        .select('signer_name, signature_data, signed_at')
        .eq('checklist_id', checklistData.id)
        .order('signed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 6) Preparar datos para el generador de PDF
      const pdfData = {
        checklistId: checklistData.folio || checklistData.id,
        clientName: checklistData.client.company_name,
        clientAddress: checklistData.client.address,
        elevatorCode: checklistData.elevator.serial_number,
        elevatorAlias: elevatorNumber,
        elevatorBrand: checklistData.elevator.brand,
        elevatorModel: checklistData.elevator.model,
        elevatorIsHydraulic: checklistData.elevator.is_hydraulic,

        month: checklistData.month,
        year: checklistData.year,
        completionDate: checklistData.completion_date,
        lastCertificationDate: checklistData.last_certification_date,
        nextCertificationDate: checklistData.next_certification_date,
        certificationNotLegible: checklistData.certification_not_legible,

        technicianName: checklistData.technician.full_name,
        technicianEmail: checklistData.technician.email,

        questions: pdfQuestions,
        signature: signature
          ? {
              signerName: signature.signer_name,
              signatureDataUrl: signature.signature_data,
              signedAt: signature.signed_at,
            }
          : null,
      };

      // 7) Generar y descargar el PDF
      const pdfBlob = await generateMaintenanceChecklistPDF(pdfData);

      const filename = `MANTENIMIENTO_${checklistData.client.company_name}_${elevatorNumber}_${checklistData.year}_${String(
        checklistData.month,
      ).padStart(2, '0')}.pdf`;

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error al generar PDF:', e);
      alert('Error al generar el PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  // =============================================
  // Render
  // =============================================
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Checklist de Mantenimiento</h1>

      <button
        onClick={loadHistory}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Actualizar historial
      </button>

      {loading && <p>Cargando…</p>}

      <div className="space-y-4">
        {history.map((h) => (
          <div
            key={h.id}
            className="p-4 bg-white border rounded flex justify-between items-center"
          >
            <div>
              <p className="font-bold">
                Checklist #{h.id} — {h.month}/{h.year}
              </p>
              <p>Fecha: {h.completion_date || 'No registrado'}</p>
            </div>

            <button
              disabled={downloadingPDF}
              onClick={() => handleDownloadPDF(h)}
              className="px-4 py-2 bg-gray-800 text-white rounded flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={18} />
              PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


