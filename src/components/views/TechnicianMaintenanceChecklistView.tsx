import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MaintenanceHistory } from '../../types';
import { generateMaintenanceChecklistPDF } from '../../utils/maintenanceChecklistPDF';

export const TechnicianMaintenanceChecklistView = () => {
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

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
        folio,
        clients(company_name, building_name),
        elevators(location_name, internal_code)
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
        building_internal_name: row.clients?.building_name ?? '', // nombre interno
        elevator_alias: row.elevators?.location_name ?? '',
        elevator_index: row.elevators?.internal_code ?? '',
        folio: row.folio ?? null,
      }));

      setHistory(parsed);
    }

    setLoading(false);
  };

  useEffect(() => { loadHistory(); }, []);

  // Agrupar por nombre interno del edificio y luego por mes-año
  const grouped = history.reduce((acc: any, h) => {
    const building = (h.building_internal_name || h.client_name || 'Sin nombre').trim();
    const monthName = new Date(h.completion_date || `${h.year}-${String(h.month).padStart(2,'0')}-01`).toLocaleString('es-CL', { month: 'long' });
    acc[building] = acc[building] || {};
    const key = `${monthName} ${h.year}`;
    acc[building][key] = acc[building][key] || [];
    acc[building][key].push(h);
    return acc;
  }, {} as Record<string, Record<string, MaintenanceHistory[]>>);

  const handleDownloadPDF = async (record: any) => {
    try {
      setDownloadingPDF(true);
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
            elevator:elevators(location_name,is_hydraulic,internal_code),
            profiles:profiles!mnt_checklists_technician_id_fkey(full_name,email),
            folio
          `,
        )
        .eq('id', record.id)
        .maybeSingle();

      if (checklistError || !checklistData) throw new Error('No se pudo cargar el checklist');

      const { data: questionsData } = await supabase
        .from('mnt_checklist_questions')
        .select('id,question_number,section,question_text,frequency,is_hydraulic_only')
        .order('question_number');

      const { data: answersData } = await supabase
        .from('mnt_checklist_answers')
        .select('question_id,status,observations')
        .eq('checklist_id', checklistData.id);

      const answersMap = new Map();
      (answersData || []).forEach((a: any) => answersMap.set(a.question_id, a));

      const quarters = [3,6,9,12];
      const semesters = [3,9];

      const pdfQuestions: any[] = [];
      const rejectedQuestions: any[] = [];

      (questionsData || []).forEach((q: any) => {
        const a = answersMap.get(q.id);
        const isHydraulicOnly = !!q.is_hydraulic_only;
        const freq = q.frequency;
        let inPeriod = false;
        if (freq === 'M') inPeriod = true;
        if (freq === 'T') inPeriod = quarters.includes(checklistData.month);
        if (freq === 'S') inPeriod = semesters.includes(checklistData.month);

        let status: any = 'out_of_period';
        if (isHydraulicOnly && !checklistData.elevator?.is_hydraulic) status = 'not_applicable';
        else if (!inPeriod) status = 'out_of_period';
        else if (a?.status === 'rejected') status = 'rejected';
        else if (a?.status === 'approved') status = 'approved';

        const row = { number: q.question_number, section: q.section, text: q.question_text, status, observations: a?.observations ?? null };
        pdfQuestions.push(row);
        if (status === 'rejected') rejectedQuestions.push(row);
      });

      const observationSummary = rejectedQuestions.length === 0 ? 'Sin observaciones' : `Presenta ${rejectedQuestions.length} observaciones.`;

      const { data: signatureRow } = await supabase
        .from('mnt_checklist_signatures')
        .select('*')
        .eq('checklist_id', checklistData.id)
        .order('signed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const signature = signatureRow && signatureRow.signature_data ? { signerName: signatureRow.signer_name, signedAt: signatureRow.signed_at, signatureDataUrl: signatureRow.signature_data } : null;

      let certStatus = 'sin_info';
      if (checklistData.certification_not_legible) certStatus = 'no_legible';
      else if (checklistData.next_certification_date) {
        const next = new Date(checklistData.next_certification_date);
        const today = new Date();
        const diff = (next.getTime() - today.getTime()) / (1000*60*60*24);
        if (diff < 0) certStatus = 'vencida';
        else if (diff <= 30) certStatus = 'por_vencer';
        else certStatus = 'vigente';
      }

      const pdfBlob = await generateMaintenanceChecklistPDF({
        checklistId: checklistData.id,
        folioNumber: checklistData.folio ?? null,
        clientName: checklistData.client.company_name,
        clientCode: checklistData.client.id,
        clientAddress: checklistData.client.address,
        elevatorAlias: checklistData.elevator.location_name,
        elevatorIndex: checklistData.elevator.internal_code,
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

      const fileName = `MANTENIMIENTO_${checklistData.client.company_name}_${checklistData.elevator.location_name}_${checklistData.year}_${String(checklistData.month).padStart(2,'0')}.pdf`;

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF');
    } finally { setDownloadingPDF(false); }
  };

  const handleViewPDF = async (record: any) => {
    try {
      setDownloadingPDF(true);
      const { data: checklistData, error: checklistError } = await supabase
        .from('mnt_checklists')
        .select(`id, month, year, completion_date, last_certification_date, next_certification_date, certification_not_legible, client:clients(id,company_name,address), elevator:elevators(location_name,is_hydraulic,internal_code), profiles:profiles!mnt_checklists_technician_id_fkey(full_name,email), folio`)
        .eq('id', record.id)
        .maybeSingle();
      if (checklistError || !checklistData) throw new Error('No se pudo cargar el checklist');

      const { data: questionsData } = await supabase
        .from('mnt_checklist_questions')
        .select('id,question_number,section,question_text,frequency,is_hydraulic_only')
        .order('question_number');
      const { data: answersData } = await supabase
        .from('mnt_checklist_answers')
        .select('question_id,status,observations')
        .eq('checklist_id', checklistData.id);
      const answersMap = new Map();
      (answersData || []).forEach((a: any) => answersMap.set(a.question_id, a));

      const pdfQuestions: any[] = [];
      const rejectedQuestions: any[] = [];
      (questionsData || []).forEach((q: any) => {
        const a = answersMap.get(q.id);
        let status: any = 'out_of_period';
        const freq = q.frequency;
        const quarters = [3,6,9,12];
        const semesters = [3,9];
        let inPeriod = false;
        if (freq === 'M') inPeriod = true;
        if (freq === 'T') inPeriod = quarters.includes(checklistData.month);
        if (freq === 'S') inPeriod = semesters.includes(checklistData.month);
        if (a?.status === 'rejected') status = 'rejected';
        else if (a?.status === 'approved') status = 'approved';
        const row = { number: q.question_number, section: q.section, text: q.question_text, status, observations: a?.observations ?? null };
        pdfQuestions.push(row);
        if (status === 'rejected') rejectedQuestions.push(row);
      });

      const { data: signatureRow } = await supabase
        .from('mnt_checklist_signatures')
        .select('*')
        .eq('checklist_id', checklistData.id)
        .order('signed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const signature = signatureRow && signatureRow.signature_data ? { signerName: signatureRow.signer_name, signedAt: signatureRow.signed_at, signatureDataUrl: signatureRow.signature_data } : null;

      const observationSummary = rejectedQuestions.length === 0 ? 'Sin observaciones' : `Presenta ${rejectedQuestions.length} observaciones.`;

      const certStatus = checklistData.certification_not_legible ? 'no_legible' : (checklistData.next_certification_date ? 'vigente' : 'sin_info');

      const pdfBlob = await generateMaintenanceChecklistPDF({
        checklistId: checklistData.id,
        folioNumber: checklistData.folio ?? null,
        clientName: checklistData.client.company_name,
        clientCode: checklistData.client.id,
        clientAddress: checklistData.client.address,
        elevatorAlias: checklistData.elevator.location_name,
        elevatorIndex: checklistData.elevator.internal_code,
        month: checklistData.month,
        year: checklistData.year,
        completionDate: checklistData.completion_date,
        lastCertificationDate: checklistData.last_certification_date,
        nextCertificationDate: checklistData.next_certification_date,
        certificationNotLegible: checklistData.certification_not_legible,
        technicianName: checklistData.profiles.full_name,
        technicianEmail: checklistData.profiles.email,
        certificationStatus: certStatus as any,
        observationSummary,
        questions: pdfQuestions,
        rejectedQuestions,
        signature,
      });

      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error('Error al ver PDF:', error);
      alert('Error al abrir el PDF');
    } finally { setDownloadingPDF(false); }
  };

  const handleSharePDF = async (record: any) => {
    try {
      setDownloadingPDF(true);
      const { data: checklistData, error: checklistError } = await supabase
        .from('mnt_checklists')
        .select(`id, month, year, completion_date, client:clients(id,company_name), elevator:elevators(location_name,internal_code), profiles:profiles!mnt_checklists_technician_id_fkey(full_name), folio`)
        .eq('id', record.id)
        .maybeSingle();
      if (checklistError || !checklistData) throw new Error('No se pudo cargar el checklist');

      const { data: questionsData } = await supabase
        .from('mnt_checklist_questions')
        .select('id,question_number,section,question_text,frequency,is_hydraulic_only')
        .order('question_number');
      const { data: answersData } = await supabase
        .from('mnt_checklist_answers')
        .select('question_id,status,observations')
        .eq('checklist_id', checklistData.id);
      const answersMap = new Map(); (answersData || []).forEach((a: any) => answersMap.set(a.question_id, a));
      const pdfQuestions: any[] = []; const rejectedQuestions: any[] = [];
      (questionsData || []).forEach((q: any) => { const a = answersMap.get(q.id); const status = a?.status ?? 'out_of_period'; const row = { number: q.question_number, section: q.section, text: q.question_text, status, observations: a?.observations ?? null }; pdfQuestions.push(row); if (status === 'rejected') rejectedQuestions.push(row); });

      const { data: signatureRow } = await supabase
        .from('mnt_checklist_signatures')
        .select('*')
        .eq('checklist_id', checklistData.id)
        .order('signed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const signature = signatureRow && signatureRow.signature_data ? { signerName: signatureRow.signer_name, signedAt: signatureRow.signed_at, signatureDataUrl: signatureRow.signature_data } : null;

      const pdfBlob = await generateMaintenanceChecklistPDF({
        checklistId: checklistData.id,
        folioNumber: checklistData.folio ?? null,
        clientName: checklistData.client.company_name,
        clientCode: checklistData.client.id,
        clientAddress: null,
        elevatorAlias: checklistData.elevator.location_name,
        elevatorIndex: checklistData.elevator.internal_code,
        month: checklistData.month,
        year: checklistData.year,
        completionDate: checklistData.completion_date,
        lastCertificationDate: null,
        nextCertificationDate: null,
        certificationNotLegible: false,
        technicianName: checklistData.profiles.full_name,
        technicianEmail: null,
        certificationStatus: 'sin_info',
        observationSummary: rejectedQuestions.length ? `Presenta ${rejectedQuestions.length} observaciones` : 'Sin observaciones',
        questions: pdfQuestions,
        rejectedQuestions,
        signature,
      });

      const fileName = `MANTENIMIENTO_${checklistData.client.company_name}_${checklistData.elevator.location_name}_${checklistData.year}_${String(checklistData.month).padStart(2,'0')}.pdf`;

      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        try {
          await (navigator as any).share({ files: [file], title: fileName });
          return;
        } catch (e) {
          console.warn('Web Share failed', e);
        }
      }

      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      alert('Web Share no disponible. Se abrió el PDF en una nueva pestaña; desde ahí puede descargar y compartir.');

    } catch (error) {
      console.error('Error al compartir PDF:', error);
      alert('Error al compartir el PDF');
    } finally { setDownloadingPDF(false); }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Checklist de Mantenimiento</h2>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        Object.keys(grouped).length === 0 ? <p>No hay checklists</p> : (
          <div>
            {Object.keys(grouped).map((building) => (
              <div key={building} className="mb-6">
                <h3 className="font-semibold text-lg">{building}</h3>
                {Object.keys(grouped[building]).map((period) => (
                  <div key={building + period} className="pl-4 mt-2">
                    <h4 className="font-medium">{period}</h4>
                    <ul className="pl-6 mt-1 space-y-1">
                      {grouped[building][period].map((h: any) => (
                        <li key={h.id} className="flex items-center justify-between">
                          <div>{`Ascensor ${h.elevator_index ?? ''}`}</div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleViewPDF(h)} className="px-2 py-1 bg-gray-200 rounded">Ver</button>
                            <button onClick={() => handleDownloadPDF(h)} className="px-2 py-1 bg-blue-600 text-white rounded">PDF</button>
                            <button onClick={() => handleSharePDF(h)} className="px-2 py-1 bg-green-500 text-white rounded">Compartir</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
