import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { generateMaintenanceChecklistPDF } from '../../utils/maintenanceChecklistPDF';

interface MaintenanceHistory {
  id: string;
  month: number;
  year: number;
  completion_date: string | null;
  client_name: string;
  building_internal_name: string;
  elevator_alias: string;
  elevator_number: number | string | null;
  folio: number | string | null;
}

export const TechnicianMaintenanceChecklistView = () => {
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    // Traer folio, cliente (company_name + building_name interno), elevator (location_name + elevator_number)
    const { data, error } = await supabase
      .from('mnt_checklists')
      .select(`
        id,
        month,
        year,
        completion_date,
        folio,
        clients(company_name, building_name),
        elevators(location_name, elevator_number)
      `)
      .order('completion_date', { ascending: false });

    if (!error && data) {
      const parsed = data.map((row: any) => ({
        id: row.id,
        month: row.month,
        year: row.year,
        completion_date: row.completion_date,
        client_name: row.clients?.company_name ?? '',
        building_internal_name: row.clients?.building_name ?? '',
        elevator_alias: row.elevators?.location_name ?? '',
        elevator_number: row.elevators?.elevator_number ?? row.elevators?.internal_code ?? null,
        folio: row.folio ?? null,
      }));
      setHistory(parsed);
    }
    setLoading(false);
  };

  useEffect(() => { loadHistory(); }, []);

  // Agrupar por building_internal_name y mes-año
  const grouped = history.reduce((acc:any, h) => {
    const building = (h.building_internal_name || h.client_name || 'Sin nombre').trim();
    const monthName = new Date(h.completion_date || `${h.year}-${String(h.month).padStart(2,'0')}-01`).toLocaleString('es-CL', { month: 'long' });
    acc[building] = acc[building] || {};
    const key = `${monthName} ${h.year}`;
    acc[building][key] = acc[building][key] || [];
    acc[building][key].push(h);
    return acc;
  }, {});

  const handleDownloadPDF = async (record: MaintenanceHistory) => {
    setDownloadingPDF(true);
    try {
      // Obtener todos los datos necesarios para el PDF
      const { data: checklistData, error: checklistError } = await supabase
        .from('mnt_checklists')
        .select(`
          id,
          folio,
          month,
          year,
          completion_date,
          elevator_id,
          technician_id,
          last_certification_date,
          next_certification_date,
          certification_not_legible,
          certification_status,
          observation_summary,
          signature_data_url,
          clients (
            id,
            company_name,
            business_name,
            address,
            contact_name,
            building_name
          ),
          elevators (
            id,
            internal_code,
            location_name,
            elevator_number,
            is_hydraulic
          ),
          users!mnt_checklists_technician_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('id', record.id)
        .single();

      if (checklistError) throw checklistError;

      // Obtener las respuestas del checklist
      const { data: answersData, error: answersError } = await supabase
        .from('mnt_checklist_answers')
        .select(`
          question_id,
          status,
          observations,
          mnt_checklist_questions (
            question_number,
            section,
            question_text
          )
        `)
        .eq('checklist_id', record.id);

      if (answersError) throw answersError;

      // Preparar datos para el PDF
      const questions = (answersData || []).map((answer: any) => ({
        number: answer.mnt_checklist_questions?.question_number || 0,
        section: answer.mnt_checklist_questions?.section || '',
        text: answer.mnt_checklist_questions?.question_text || '',
        status: answer.status,
        observations: answer.observations,
      }));

      const pdfData = {
        checklistId: checklistData.id,
        folioNumber: checklistData.folio,
        clientName: checklistData.clients?.company_name || checklistData.clients?.business_name || '',
        clientAddress: checklistData.clients?.address,
        clientContactName: checklistData.clients?.contact_name,
        elevatorCode: checklistData.elevators?.internal_code,
        elevatorAlias: checklistData.elevators?.location_name,
        elevatorIndex: checklistData.elevators?.elevator_number,
        month: checklistData.month,
        year: checklistData.year,
        completionDate: checklistData.completion_date,
        lastCertificationDate: checklistData.last_certification_date,
        nextCertificationDate: checklistData.next_certification_date,
        certificationNotLegible: checklistData.certification_not_legible,
        certificationStatus: checklistData.certification_status,
        technicianName: checklistData.users?.full_name || '',
        technicianEmail: checklistData.users?.email,
        observationSummary: checklistData.observation_summary,
        questions: questions,
        signatureDataUrl: checklistData.signature_data_url,
      };

      // Generar PDF
      const pdfBlob = await generateMaintenanceChecklistPDF(pdfData);

      // Descargar
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Checklist_${pdfData.folioNumber || record.id}_${pdfData.clientName}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleViewPDF = async (record: MaintenanceHistory) => {
    setDownloadingPDF(true);
    try {
      // Obtener todos los datos necesarios para el PDF (mismo código que handleDownloadPDF)
      const { data: checklistData, error: checklistError } = await supabase
        .from('mnt_checklists')
        .select(`
          id,
          folio,
          month,
          year,
          completion_date,
          elevator_id,
          technician_id,
          last_certification_date,
          next_certification_date,
          certification_not_legible,
          certification_status,
          observation_summary,
          signature_data_url,
          clients (
            id,
            company_name,
            business_name,
            address,
            contact_name,
            building_name
          ),
          elevators (
            id,
            internal_code,
            location_name,
            elevator_number,
            is_hydraulic
          ),
          users!mnt_checklists_technician_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('id', record.id)
        .single();

      if (checklistError) throw checklistError;

      const { data: answersData, error: answersError } = await supabase
        .from('mnt_checklist_answers')
        .select(`
          question_id,
          status,
          observations,
          mnt_checklist_questions (
            question_number,
            section,
            question_text
          )
        `)
        .eq('checklist_id', record.id);

      if (answersError) throw answersError;

      const questions = (answersData || []).map((answer: any) => ({
        number: answer.mnt_checklist_questions?.question_number || 0,
        section: answer.mnt_checklist_questions?.section || '',
        text: answer.mnt_checklist_questions?.question_text || '',
        status: answer.status,
        observations: answer.observations,
      }));

      const pdfData = {
        checklistId: checklistData.id,
        folioNumber: checklistData.folio,
        clientName: checklistData.clients?.company_name || checklistData.clients?.business_name || '',
        clientAddress: checklistData.clients?.address,
        clientContactName: checklistData.clients?.contact_name,
        elevatorCode: checklistData.elevators?.internal_code,
        elevatorAlias: checklistData.elevators?.location_name,
        elevatorIndex: checklistData.elevators?.elevator_number,
        month: checklistData.month,
        year: checklistData.year,
        completionDate: checklistData.completion_date,
        lastCertificationDate: checklistData.last_certification_date,
        nextCertificationDate: checklistData.next_certification_date,
        certificationNotLegible: checklistData.certification_not_legible,
        certificationStatus: checklistData.certification_status,
        technicianName: checklistData.users?.full_name || '',
        technicianEmail: checklistData.users?.email,
        observationSummary: checklistData.observation_summary,
        questions: questions,
        signatureDataUrl: checklistData.signature_data_url,
      };

      // Generar PDF y abrir en nueva pestaña
      const pdfBlob = await generateMaintenanceChecklistPDF(pdfData);
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleSharePDF = async (record: MaintenanceHistory) => {
    setDownloadingPDF(true);
    try {
      // Obtener datos y generar PDF (mismo código)
      const { data: checklistData, error: checklistError } = await supabase
        .from('mnt_checklists')
        .select(`
          id,
          folio,
          month,
          year,
          completion_date,
          elevator_id,
          technician_id,
          last_certification_date,
          next_certification_date,
          certification_not_legible,
          certification_status,
          observation_summary,
          signature_data_url,
          clients (
            id,
            company_name,
            business_name,
            address,
            contact_name,
            building_name
          ),
          elevators (
            id,
            internal_code,
            location_name,
            elevator_number,
            is_hydraulic
          ),
          users!mnt_checklists_technician_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('id', record.id)
        .single();

      if (checklistError) throw checklistError;

      const { data: answersData, error: answersError } = await supabase
        .from('mnt_checklist_answers')
        .select(`
          question_id,
          status,
          observations,
          mnt_checklist_questions (
            question_number,
            section,
            question_text
          )
        `)
        .eq('checklist_id', record.id);

      if (answersError) throw answersError;

      const questions = (answersData || []).map((answer: any) => ({
        number: answer.mnt_checklist_questions?.question_number || 0,
        section: answer.mnt_checklist_questions?.section || '',
        text: answer.mnt_checklist_questions?.question_text || '',
        status: answer.status,
        observations: answer.observations,
      }));

      const pdfData = {
        checklistId: checklistData.id,
        folioNumber: checklistData.folio,
        clientName: checklistData.clients?.company_name || checklistData.clients?.business_name || '',
        clientAddress: checklistData.clients?.address,
        clientContactName: checklistData.clients?.contact_name,
        elevatorCode: checklistData.elevators?.internal_code,
        elevatorAlias: checklistData.elevators?.location_name,
        elevatorIndex: checklistData.elevators?.elevator_number,
        month: checklistData.month,
        year: checklistData.year,
        completionDate: checklistData.completion_date,
        lastCertificationDate: checklistData.last_certification_date,
        nextCertificationDate: checklistData.next_certification_date,
        certificationNotLegible: checklistData.certification_not_legible,
        certificationStatus: checklistData.certification_status,
        technicianName: checklistData.users?.full_name || '',
        technicianEmail: checklistData.users?.email,
        observationSummary: checklistData.observation_summary,
        questions: questions,
        signatureDataUrl: checklistData.signature_data_url,
      };

      const pdfBlob = await generateMaintenanceChecklistPDF(pdfData);
      const fileName = `Checklist_${pdfData.folioNumber || record.id}_${pdfData.clientName}.pdf`;

      // Usar Web Share API si está disponible
      if (navigator.share && navigator.canShare) {
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Checklist de Mantenimiento',
            text: `Checklist de ${pdfData.clientName}`,
          });
          return;
        }
      }

      // Fallback: descargar
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      alert('PDF descargado. Compártelo desde tu gestor de archivos.');
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error compartiendo PDF:', error);
        alert('Error al compartir el PDF');
      }
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Checklist de Mantenimiento</h2>
        <p className="text-sm text-slate-600 mt-1">Historial de checklists completados</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <p className="text-slate-600">No hay checklists completados</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(grouped).map((building) => (
            <div key={building} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h3 className="font-semibold text-lg text-white">{building}</h3>
              </div>
              
              <div className="divide-y divide-slate-100">
                {Object.keys(grouped[building]).map((period) => (
                  <div key={building + period} className="p-6">
                    <h4 className="font-medium text-slate-900 mb-4 capitalize">{period}</h4>
                    <div className="space-y-3">
                      {grouped[building][period].map((h: MaintenanceHistory) => (
                        <div 
                          key={h.id} 
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                Ascensor {h.elevator_number ?? h.elevator_alias ?? 'N/A'}
                              </p>
                              {h.folio && (
                                <p className="text-sm text-slate-600">Folio: {h.folio}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleViewPDF(h)} 
                              disabled={downloadingPDF}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Ver
                            </button>
                            
                            <button 
                              onClick={() => handleDownloadPDF(h)} 
                              disabled={downloadingPDF}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              PDF
                            </button>
                            
                            <button 
                              onClick={() => handleSharePDF(h)} 
                              disabled={downloadingPDF}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                              Compartir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {downloadingPDF && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="text-slate-900 font-medium">Generando PDF...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
