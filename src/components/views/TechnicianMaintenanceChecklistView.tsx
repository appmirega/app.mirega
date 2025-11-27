import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MaintenanceHistory } from '../../types';
import { generateMaintenanceChecklistPDF } from '../../utils/maintenanceChecklistPDF';

export const TechnicianMaintenanceChecklistView = () => {
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // ===============================
  // CARGAR HISTORIAL
  // ===============================

  const loadHistory = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('mnt_checklists')
      .select(
        `
        id,
        month,
        year,
        completion_date,
        clients(company_name),
        elevators(location_name)
      `,
      )
      .order('completion_date', { ascending: false });

    if (!error && data) {
      const parsed = data.map((row: any) => ({
        id: row.id,
        month: row.month,
        year: row.year,
        completion_date: row.completion_date,
        client_name: row.clients?.company_name ?? '',
        elevator_alias: row.elevators?.location_name ?? '',
      }));

      setHistory(parsed);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // ========================================================
  //            DESCARGAR PDF — CORREGIDO
  // ========================================================

  const handleDownloadPDF = async (record: MaintenanceHistory) => {
    try {
      setDownloadingPDF(true);

      // 1) Cargar checklist completo
      const { data: checklistData, error: checklistError } = await supabase
        .from('mnt_checklists')
        .select(
          `
            id,
            month,
            year,
            completion_date,
            last_certification_date,
            next_certification_date,
            certification_not_legible,
            client:clients(id,company_name,address),
            elevator:elevators(location_name,is_hydraulic),
            profiles:profiles!mnt_checklists_technician_id_fkey(full_name,email)
          `,
        )
        .eq('id', record.id)
        .maybeSingle();

      if (checklistError || !checklistData) {
        console.error('Error checklist', checklistError);
        throw new Error('No se pudo cargar el checklist');
      }

      const currentMonth = checklistData.month;

      // 2) Preguntas
      const { data: questionsData } = await supabase
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

      // 3) Respuestas
      const { data: answersData } = await supabase
        .from('mnt_checklist_answers')
        .select(
          `
            question_id,
            status,
            observations
          `,
        )
        .eq('checklist_id', checklistData.id);

      const answersMap = new Map();
      (answersData || []).forEach((a: any) => {
        answersMap.set(a.question_id, a);
      });

      const quarters = [3, 6, 9, 12];
      const semesters = [3, 9];

      const pdfQuestions: any[] = [];
      const rejectedQuestions: any[] = [];

      (questionsData || []).forEach((q: any) => {
        const a = answersMap.get(q.id);
        const isHydraulicOnly = !!q.is_hydraulic_only;
        const freq = q.frequency;

        let inPeriod = false;
        if (freq === 'M') inPeriod = true;
        if (freq === 'T') inPeriod = quarters.includes(currentMonth);
        if (freq === 'S') inPeriod = semesters.includes(currentMonth);

        let status: any = 'out_of_period';

        if (isHydraulicOnly && !checklistData.elevator?.is_hydraulic) {
          status = 'not_applicable';
        } else if (!inPeriod) {
          status = 'out_of_period';
        } else if (a?.status === 'rejected') {
          status = 'rejected';
        } else if (a?.status === 'approved') {
          status = 'approved';
        }

        const row = {
          number: q.question_number,
          section: q.section,
          text: q.question_text,
          status,
          observations: a?.observations ?? null,
        };

        pdfQuestions.push(row);
        if (status === 'rejected') rejectedQuestions.push(row);
      });

      const observationSummary =
        rejectedQuestions.length === 0
          ? 'Sin observaciones'
          : `Presenta ${rejectedQuestions.length} observaciones.`;

      // Firma
      const { data: signatureRow } = await supabase
        .from('mnt_checklist_signatures')
        .select('*')
        .eq('checklist_id', checklistData.id)
        .order('signed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const signature =
        signatureRow && signatureRow.signature_data
          ? {
              signerName: signatureRow.signer_name,
              signedAt: signatureRow.signed_at,
              signatureDataUrl: signatureRow.signature_data,
            }
          : null;

      // Estado certificación
      let certStatus = 'sin_info';

      if (checklistData.certification_not_legible) {
        certStatus = 'no_legible';
      } else if (checklistData.next_certification_date) {
        const next = new Date(checklistData.next_certification_date);
        const today = new Date();
        const diff =
          (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

        if (diff < 0) certStatus = 'vencida';
        else if (diff <= 30) certStatus = 'por_vencer';
        else certStatus = 'vigente';
      }

      // PDF FINAL
      const pdfBlob = await generateMaintenanceChecklistPDF({
        checklistId: checklistData.id,
        clientName: checklistData.client.company_name,
        clientCode: checklistData.client.id,
        clientAddress: checklistData.client.address,
        elevatorAlias: checklistData.elevator.location_name,
        month: checklistData.month,
        year: checklistData.year,
        completionDate: checklistData.completion_date,
        lastCertificationDate: checklistData.last_certification_date,
        nextCertificationDate: checklistData.next_certification_date,
        certificationNotLegible: checklistData.certification_not_legible,
        technicianName: checklistData.profiles.full_name,
        technicianEmail: checklistData.profiles.email,
        certificationStatus: certStatus,
        observationSummary,
        questions: pdfQuestions,
        rejectedQuestions,
        signature,
      });

      // Descargar
      const fileName = `MANTENIMIENTO_${checklistData.client.company_name}_${checklistData.elevator.location_name}_${checklistData.year}_${String(
        checklistData.month,
      ).padStart(2, '0')}.pdf`;

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  // ========================================================
  //                 RENDER
  // ========================================================

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Checklist de Mantenimiento</h2>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <ul>
          {history.map((h) => (
            <li key={h.id} className="mb-4">
              <div>
                <strong>
                  {h.client_name} — {h.elevator_alias}
                </strong>
              </div>
              <div>
                Fecha: {new Date(h.completion_date).toLocaleString()}
              </div>
              <button
                onClick={() => handleDownloadPDF(h)}
                disabled={downloadingPDF}
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
              >
                PDF
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
