import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  QrCode,
  ClipboardList,
  Building2,
  Search,
  History,
  FileText,
  Download,
  ArrowLeft,
  Calendar,
  Check,
} from 'lucide-react';
import { QRScanner } from '../checklist/QRScanner';
import { CertificationForm } from '../checklist/CertificationForm';
import { DynamicChecklistForm } from '../checklist/DynamicChecklistForm';
import {
  generateMaintenancePDF,
  generatePDFFilename,
} from '../../utils/pdfGenerator';
import { ChecklistSignatureModal } from '../checklist/ChecklistSignatureModal';

interface Client {
  id: string;
  company_name: string;
  address: string;
}

interface Elevator {
  id: string;
  brand: string;
  model: string;
  serial_number: string;
  is_hydraulic: boolean;
  location_name: string;
}

interface ActiveChecklist {
  id: string;
  elevator_id: string;
  elevator: Elevator;
  month: number;
  year: number;
}

interface MaintenanceHistory {
  id: string;
  month: number;
  year: number;
  completion_date: string;
  status: string;
  elevator: {
    brand: string;
    model: string;
    serial_number: string;
  };
  client: {
    company_name: string;
  };
}

type ViewMode =
  | 'start'
  | 'select-client'
  | 'select-elevator'
  | 'certification'
  | 'checklist'
  | 'history'
  | 'pdfs'
  | 'sign-visit';

export function TechnicianMaintenanceChecklistView() {
  const { profile } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>('start');
  const [showQRScanner, setShowQRScanner] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [elevators, setElevators] = useState<Elevator[]>([]);
  const [selectedElevator, setSelectedElevator] = useState<Elevator | null>(null);

  const [activeChecklist, setActiveChecklist] = useState<ActiveChecklist | null>(null);

  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceHistory[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // ---- Firma de visita (por cliente/mes) ----
  const [signClients, setSignClients] = useState<Client[]>([]);
  const [signSelectedClient, setSignSelectedClient] = useState<Client | null>(null);
  const [signVisitChecklists, setSignVisitChecklists] = useState<any[]>([]);
  const [signVisitSummary, setSignVisitSummary] = useState<{
    totalChecklists: number;
    totalElevators: number;
    totalRejected: number;
    certificationStatus: string;
  } | null>(null);
  const [loadingSignClients, setLoadingSignClients] = useState(false);
  const [isSigningVisit, setIsSigningVisit] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // ---------------------------------------------------
  // Cargar clientes (cuando estamos en "select-client")
  // ---------------------------------------------------
  useEffect(() => {
    if (viewMode !== 'select-client') return;

    const loadClients = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('clients')
          .select('id, company_name, address, is_active')
          .eq('is_active', true) // usamos is_active, no status
          .order('company_name', { ascending: true });

        if (error) throw error;

        setClients((data || []) as Client[]);
      } catch (err) {
        console.error('Error loading clients:', err);
        setError('Error al cargar los clientes');
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, [viewMode]);

  // ---------------------------------------------------
  // Buscar clientes por nombre
  // ---------------------------------------------------
  const handleSearchClients = async () => {
    if (!searchTerm.trim()) {
      setError('Ingresa un término de búsqueda');
      return;
    }

    setLoadingSearch(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, address, is_active')
        .ilike('company_name', `%${searchTerm}%`)
        .eq('is_active', true)
        .order('company_name', { ascending: true });

      if (error) throw error;

      setClients((data || []) as Client[]);
    } catch (err) {
      console.error('Error searching clients:', err);
      setError('Error al buscar clientes');
    } finally {
      setLoadingSearch(false);
    }
  };

  // ---------------------------------------------------
  // Seleccionar cliente → cargar ascensores
  // ---------------------------------------------------
  const handleSelectClient = async (client: Client) => {
    setSelectedClient(client);
    setSelectedElevator(null);
    setActiveChecklist(null);
    setViewMode('select-elevator');
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('elevators')
        .select('id, brand, model, serial_number, is_hydraulic, location_name')
        .eq('client_id', client.id)
        .eq('status', 'active')
        .order('location_name', { ascending: true });

      if (error) throw error;

      setElevators((data || []) as Elevator[]);
    } catch (err) {
      console.error('Error loading elevators:', err);
      setError('Error al cargar los ascensores del cliente');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------
  // Seleccionar ascensor (1 checklist/ascensor/mes)
  // ---------------------------------------------------
  const handleSelectElevator = async (elevator: Elevator) => {
    setSelectedElevator(elevator);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    try {
      const { data: existingChecklist, error } = await supabase
        .from('mnt_checklists')
        .select('*')
        .eq('elevator_id', elevator.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error buscando checklist existente:', error);
      }

      if (existingChecklist) {
        if (existingChecklist.status === 'completed') {
          alert(
            'Este ascensor ya tiene un checklist de mantenimiento registrado para este mes. No se pueden crear más.'
          );
          return;
        }

        // Si hay checklist en progreso → retomamos
        setActiveChecklist({
          id: existingChecklist.id,
          elevator_id: elevator.id,
          elevator,
          month: currentMonth,
          year: currentYear,
        });
        setViewMode('checklist');
        return;
      }

      // No hay checklist todavía → pasamos a certificación
      setViewMode('certification');
    } catch (err) {
      console.error('Error en handleSelectElevator:', err);
      alert('Error al verificar checklist existente. Intenta nuevamente.');
    }
  };

  // ---------------------------------------------------
  // QR escaneado
  // ---------------------------------------------------
  const handleQRCodeScanned = async (qrData: string) => {
    setShowQRScanner(false);

    try {
      const { data, error } = await supabase
        .from('elevators')
        .select(
          `
          id,
          brand,
          model,
          serial_number,
          is_hydraulic,
          location_name,
          client:clients(
            id,
            company_name,
            address
          )
        `,
        )
        .eq('qr_code', qrData)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setError('No se encontró un ascensor con ese código QR');
        return;
      }

      const elevatorData: Elevator = {
        id: data.id,
        brand: data.brand,
        model: data.model,
        serial_number: data.serial_number,
        is_hydraulic: data.is_hydraulic,
        location_name: data.location_name,
      };

      const clientData: Client = {
        id: data.client.id,
        company_name: data.client.company_name,
        address: data.client.address,
      };

      setSelectedClient(clientData);
      setSelectedElevator(elevatorData);
      setViewMode('certification');
    } catch (err) {
      console.error('Error handling QR code:', err);
      setError('Error al procesar el código QR');
    }
  };

  // ---------------------------------------------------
  // Certificación → crear checklist
  // ---------------------------------------------------
  const handleCertificationSubmit = async (certData: {
    lastCertificationDate: string | null;
    nextCertificationDate: string | null;
    certificationNotLegible: boolean;
  }) => {
    if (!selectedClient || !selectedElevator || !profile?.id) return;

    setLoading(true);
    setError(null);

    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data, error } = await supabase
        .from('mnt_checklists')
        .insert({
          client_id: selectedClient.id,
          elevator_id: selectedElevator.id,
          technician_id: profile.id,
          month: currentMonth,
          year: currentYear,
          status: 'in_progress',
          last_certification_date: certData.lastCertificationDate,
          next_certification_date: certData.nextCertificationDate,
          certification_not_legible: certData.certificationNotLegible,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('No se pudo crear el checklist');

      setActiveChecklist({
        id: data.id,
        elevator_id: selectedElevator.id,
        elevator: selectedElevator,
        month: currentMonth,
        year: currentYear,
      });

      setViewMode('checklist');
    } catch (err) {
      console.error('Error creating checklist:', err);
      setError('Error al crear el checklist de mantenimiento');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------
  // Completar checklist (solo marca como completed)
  // ---------------------------------------------------
  const handleChecklistComplete = async () => {
    if (!activeChecklist) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('mnt_checklists')
        .update({
          status: 'completed',
          completion_date: new Date().toISOString(),
        })
        .eq('id', activeChecklist.id);

      if (error) throw error;

      setViewMode('history');
      await loadHistory();
    } catch (err) {
      console.error('Error completing checklist:', err);
      setError('Error al completar el checklist');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------
  // Cargar historial
  // ---------------------------------------------------
  const loadHistory = async () => {
    if (!profile?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('mnt_checklists')
        .select(
          `
          id,
          month,
          year,
          status,
          completion_date,
          elevator:elevators(
            brand,
            model,
            serial_number
          ),
          client:clients(
            company_name
          )
        `,
        )
        .eq('technician_id', profile.id)
        .order('completion_date', { ascending: false })
        .limit(50);

      if (error) throw error;

      setMaintenanceHistory((data || []) as MaintenanceHistory[]);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------
  // Descargar PDF individual desde historial
  // (PDF on-the-fly, aún sin firma de visita)
  // ---------------------------------------------------
  const handleDownloadPDF = async (record: MaintenanceHistory) => {
    try {
      setDownloadingPDF(true);

      const { data: checklistData, error } = await supabase
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
          client:clients(
            business_name:company_name,
            address,
            contact_name
          ),
          elevator:elevators(
            brand,
            model,
            serial_number,
            is_hydraulic
          ),
          profiles:profiles!mnt_checklists_technician_id_fkey(
            full_name,
            email
          )
        `,
        )
        .eq('id', record.id)
        .maybeSingle();

      if (error) throw error;
      if (!checklistData) throw new Error('No se encontró información del checklist');

      const { data: answers } = await supabase
        .from('mnt_checklist_answers')
        .select('*, mnt_checklist_questions(*)')
        .eq('checklist_id', checklistData.id);

      const questionsWithAnswers =
        answers
          ?.map((a: any) => ({
            question_number: a.mnt_checklist_questions.question_number,
            section: a.mnt_checklist_questions.section,
            question_text: a.mnt_checklist_questions.question_text,
            answer_status: a.status,
            observations: a.observations,
          }))
          .filter((q: any) => q.answer_status !== 'pending') || [];

      const pdfBlob = await generateMaintenancePDF({
        folio: 0, // en el historial técnico no usamos folio correlativo aún
        client: {
          business_name: checklistData.client.business_name,
          address: checklistData.client.address,
          contact_name: checklistData.client.contact_name || '',
        },
        elevator: {
          brand: checklistData.elevator.brand,
          model: checklistData.elevator.model,
          serial_number: checklistData.elevator.serial_number,
          is_hydraulic: checklistData.elevator.is_hydraulic,
        },
        checklist: {
          month: checklistData.month,
          year: checklistData.year,
          last_certification_date: checklistData.last_certification_date,
          next_certification_date: checklistData.next_certification_date,
          certification_not_legible: checklistData.certification_not_legible,
          completion_date: checklistData.completion_date,
        },
        technician: {
          full_name: checklistData.profiles.full_name,
          email: checklistData.profiles.email,
        },
        questions: questionsWithAnswers,
        signature: {
          signer_name: '',
          signature_data: '',
          signed_at: '',
        },
      });

      const filename = generatePDFFilename(
        checklistData.client.business_name,
        checklistData.elevator.serial_number,
        checklistData.month,
        checklistData.year,
      );

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Error al generar el PDF del mantenimiento');
    } finally {
      setDownloadingPDF(false);
    }
  };

  // ---------------------------------------------------
  // Descargar ZIP (placeholder)
  // ---------------------------------------------------
  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      alert(
        'La descarga masiva de PDFs aún no está implementada completamente. Esta función se agregará más adelante.'
      );
    } catch (err) {
      console.error('Error downloading ZIP:', err);
    } finally {
      setDownloadingZip(false);
    }
  };

  // ---------------------------------------------------
  // Firma de visita: cargar clientes con checklists completados
  // ---------------------------------------------------
  const loadSignClients = async () => {
    if (!profile?.id) return;

    setLoadingSignClients(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('mnt_checklists')
        .select(
          `
          id,
          client_id,
          status,
          clients(
            id,
            company_name,
            address
          )
        `,
        )
        .eq('technician_id', profile.id)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .eq('status', 'completed');

      if (error) throw error;

      const clientMap = new Map<string, Client>();
      (data || []).forEach((row: any) => {
        if (row.clients) {
          clientMap.set(row.clients.id, {
            id: row.clients.id,
            company_name: row.clients.company_name,
            address: row.clients.address,
          });
        }
      });

      setSignClients(Array.from(clientMap.values()));
      setSignSelectedClient(null);
      setSignVisitChecklists([]);
      setSignVisitSummary(null);
    } catch (err) {
      console.error('Error loading clients for signature:', err);
      setError('Error al cargar clientes con mantenimientos completados.');
    } finally {
      setLoadingSignClients(false);
    }
  };

  // ---------------------------------------------------
  // Firma de visita: cargar resumen para un cliente
  // ---------------------------------------------------
  const loadVisitDataForClient = async (client: Client) => {
    if (!profile?.id) return;

    setSignSelectedClient(client);
    setLoading(true);
    setError(null);

    try {
      const { data: checklists, error: clError } = await supabase
        .from('mnt_checklists')
        .select(
          `
          id,
          elevator_id,
          completion_date,
          last_certification_date,
          next_certification_date,
          certification_not_legible,
          elevators(
            id,
            location_name
          )
        `,
        )
        .eq('technician_id', profile.id)
        .eq('client_id', client.id)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .eq('status', 'completed')
        .order('completion_date', { ascending: true });

      if (clError) throw clError;

      const checklistList = (checklists || []) as any[];
      setSignVisitChecklists(checklistList);

      const ids = checklistList.map((c) => c.id);
      let totalRejected = 0;

      if (ids.length > 0) {
        const { data: answers, error: ansError } = await supabase
          .from('mnt_checklist_answers')
          .select('id, status, checklist_id')
          .in('checklist_id', ids);

        if (ansError) throw ansError;

        totalRejected =
          (answers || []).filter((a: any) => a.status === 'rejected').length;
      }

      // Determinar estado de certificación resumido
      let certificationStatus = 'Sin información';
      const today = new Date();
      const allCerts = checklistList.map((c) => ({
        last: c.last_certification_date as string | null,
        next: c.next_certification_date as string | null,
        notLegible: c.certification_not_legible as boolean,
      }));

      if (allCerts.some((c) => c.notLegible)) {
        certificationStatus = 'No legible';
      } else {
        const validNextDates = allCerts
          .map((c) => (c.next ? new Date(c.next) : null))
          .filter((d): d is Date => d !== null);

        if (validNextDates.length > 0) {
          const minNext = validNextDates.reduce((a, b) => (a < b ? a : b));
          const diffDays =
            (minNext.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

          if (diffDays < 0) certificationStatus = 'Vencida';
          else if (diffDays <= 30) certificationStatus = 'Próxima a vencer';
          else certificationStatus = 'Vigente';
        }
      }

      setSignVisitSummary({
        totalChecklists: checklistList.length,
        totalElevators: checklistList.length,
        totalRejected,
        certificationStatus,
      });
    } catch (err) {
      console.error('Error loading visit summary:', err);
      setError('Error al cargar el resumen de la visita.');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------
  // Firma de visita: guardar firma para todos los checklists
  // ---------------------------------------------------
  const handleVisitSignatureConfirm = async (
    signerName: string,
    signatureDataURL: string,
  ) => {
    if (!signVisitChecklists.length) return;

    setIsSigningVisit(true);
    setError(null);

    try {
      const rows = signVisitChecklists.map((cl: any) => ({
        checklist_id: cl.id,
        signer_name: signerName,
        signature_data: signatureDataURL,
        signed_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('mnt_checklist_signatures')
        .insert(rows);

      if (error) throw error;

      alert(
        'Firma registrada para los mantenimientos de este cliente en el periodo seleccionado.',
      );

      setShowSignatureModal(false);
    } catch (err) {
      console.error('Error al guardar firma de visita:', err);
      setError('Error al guardar la firma de la visita.');
    } finally {
      setIsSigningVisit(false);
    }
  };

  // ---------------------------------------------------
  // Navegación atrás
  // ---------------------------------------------------
  const handleGoBack = () => {
    switch (viewMode) {
      case 'select-client':
        setViewMode('start');
        break;
      case 'select-elevator':
        setViewMode('select-client');
        break;
      case 'certification':
        setViewMode('select-elevator');
        break;
      case 'checklist':
        setViewMode('select-elevator');
        break;
      case 'history':
      case 'pdfs':
      case 'sign-visit':
        setViewMode('start');
        break;
      default:
        setViewMode('start');
    }
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const formatMonthYear = (month: number, year: number) => {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('es-CL', {
      month: 'long',
      year: 'numeric',
    });
  };

  // ---------------------------------------------------
  // RENDER
  // ---------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header principal */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {viewMode !== 'start' && (
            <button
              onClick={handleGoBack}
              className="p-2 rounded-full hover:bg-slate-100 transition"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-7 h-7 text-blue-600" />
              Checklist de Mantenimiento
            </h1>
            <p className="text-sm text-slate-600">
              Gestiona los checklists de mantenimiento de ascensores de tus clientes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setViewMode('history');
              loadHistory();
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${
              viewMode === 'history'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            Historial
          </button>

          <button
            onClick={() => setViewMode('pdfs')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${
              viewMode === 'pdfs'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Informes PDF
          </button>

          <button
            onClick={() => {
              setViewMode('sign-visit');
              setSignSelectedClient(null);
              setSignClients([]);
              setSignVisitChecklists([]);
              setSignVisitSummary(null);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${
              viewMode === 'sign-visit'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Check className="w-4 h-4" />
            Firma visita
          </button>
        </div>
      </div>

      {/* Vista inicial */}
      {viewMode === 'start' && (
        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={() => setViewMode('select-client')}
            className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition"
          >
            <Building2 className="w-8 h-8 text-blue-600" />
            <div className="text-left">
              <h2 className="text-base font-semibold text-slate-900">Iniciar nuevo checklist</h2>
              <p className="text-sm text-slate-600">
                Selecciona un cliente y ascensor para realizar el checklist del mes.
              </p>
            </div>
          </button>

          <button
            onClick={() => setShowQRScanner(true)}
            className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition"
          >
            <QrCode className="w-8 h-8 text-blue-600" />
            <div className="text-left">
              <h2 className="text-base font-semibold text-slate-900">
                Escanear QR de ascensor
              </h2>
              <p className="text-sm text-slate-600">
                Escanea el código QR del ascensor para iniciar el checklist rápidamente.
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Selección de cliente */}
      {viewMode === 'select-client' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Seleccionar Cliente</h2>
                <p className="text-sm text-slate-600">
                  Elige el cliente al que pertenece el ascensor.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Buscar cliente por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <button
                onClick={handleSearchClients}
                disabled={loadingSearch}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingSearch ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Buscar
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {clients.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No hay clientes para mostrar. Intenta buscar por nombre.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {clients.map((client) => (
                  <li key={client.id}>
                    <button
                      onClick={() => handleSelectClient(client)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{client.company_name}</p>
                        <p className="text-xs text-slate-500">
                          {client.address || 'Dirección no registrada'}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Selección de ascensor */}
      {viewMode === 'select-elevator' && selectedClient && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Ascensores de {selectedClient.company_name}
              </h2>
              <p className="text-sm text-slate-600">
                Selecciona el ascensor al que le realizarás el checklist de mantenimiento.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {elevators.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No hay ascensores activos registrados para este cliente.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {elevators.map((elevator) => (
                  <li key={elevator.id}>
                    <button
                      onClick={() => handleSelectElevator(elevator)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{elevator.location_name}</p>
                        <p className="text-xs text-slate-500">
                          {elevator.brand} {elevator.model} • N° Serie: {elevator.serial_number}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Certificación */}
      {viewMode === 'certification' && selectedElevator && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Certificación del Ascensor</h2>
              <p className="text-sm text-slate-600">
                Registra la información de certificación antes de iniciar el checklist de
                mantenimiento.
              </p>
            </div>
          </div>

          <CertificationForm
            elevator={selectedElevator}
            onSubmit={handleCertificationSubmit}
            onCancel={() => setViewMode('select-elevator')}
          />
        </div>
      )}

      {/* Checklist */}
      {viewMode === 'checklist' && activeChecklist && selectedElevator && (
        <DynamicChecklistForm
          checklistId={activeChecklist.id}
          elevatorId={activeChecklist.elevator_id}
          isHydraulic={selectedElevator.is_hydraulic}
          month={activeChecklist.month}
          onComplete={handleChecklistComplete}
          onSave={() => {
            // aquí podrías mostrar un mensaje de "guardado" si quieres
          }}
        />
      )}

      {/* Historial */}
      {viewMode === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <History className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Historial de Mantenimientos
              </h2>
              <p className="text-sm text-slate-600">
                Revisa los mantenimientos completados.
              </p>
            </div>
          </div>

          <button
            onClick={loadHistory}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 hover:bg-slate-50"
          >
            <History className="w-4 h-4" />
            Actualizar historial
          </button>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {maintenanceHistory.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No hay registros de mantenimiento completados.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {maintenanceHistory.map((record) => (
                  <li
                    key={record.id}
                    className="px-4 py-3 flex items-center gap-4 justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">
                        {record.client.company_name} • {record.elevator.brand}{' '}
                        {record.elevator.model} ({record.elevator.serial_number})
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatMonthYear(record.month, record.year)} • Estado:{' '}
                        <span className="font-semibold">
                          {record.status === 'completed' ? 'Completado' : record.status}
                        </span>
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 text-right">
                      {record.completion_date &&
                        new Date(record.completion_date).toLocaleString('es-CL')}
                    </div>
                    <button
                      onClick={() => handleDownloadPDF(record)}
                      disabled={downloadingPDF}
                      className="ml-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Informes PDF (vista general / ZIP futuro) */}
      {viewMode === 'pdfs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Informes de Mantenimiento en PDF
                </h2>
                <p className="text-sm text-slate-600">
                  Descarga los informes individuales desde el historial o utiliza la descarga
                  masiva (próximamente).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-1"
                >
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>
                      {month.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-1"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleDownloadZip}
                disabled={downloadingZip}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Descargar ZIP
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
            <p>
              Aquí podrás descargar de forma masiva los informes de mantenimiento del período
              seleccionado. Esta funcionalidad se encuentra en desarrollo.
            </p>
          </div>
        </div>
      )}

      {/* Firma de visita (por cliente/mes) */}
      {viewMode === 'sign-visit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Firma de visita por cliente
                </h2>
                <p className="text-sm text-slate-600">
                  Selecciona el periodo y el cliente para firmar todos los checklists completados.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-1"
                >
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>
                      {month.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-1"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">
                  Periodo: {formatMonthYear(selectedMonth, selectedYear)}
                </span>
              </div>

              <button
                onClick={loadSignClients}
                disabled={loadingSignClients}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingSignClients ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Buscar clientes con mantenimientos
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Lista de clientes */}
            <div className="md:col-span-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-700">
                  Clientes con checklists completados
                </p>
              </div>
              {signClients.length === 0 ? (
                <div className="p-4 text-xs text-slate-500">
                  No se encontraron clientes con checklists completados en este periodo.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                  {signClients.map((client) => (
                    <li key={client.id}>
                      <button
                        onClick={() => loadVisitDataForClient(client)}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 text-xs ${
                          signSelectedClient?.id === client.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <p className="font-medium text-slate-900 text-sm">
                          {client.company_name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {client.address || 'Sin dirección registrada'}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Resumen de visita */}
            <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-4">
              {!signSelectedClient ? (
                <div className="text-sm text-slate-500">
                  Selecciona un cliente de la lista para ver el resumen de la visita.
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Cliente: {signSelectedClient.company_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Periodo: {formatMonthYear(selectedMonth, selectedYear)}
                    </p>
                  </div>

                  {signVisitSummary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <p className="text-[11px] text-slate-500">Ascensores</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {signVisitSummary.totalElevators}
                        </p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <p className="text-[11px] text-slate-500">Checklists</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {signVisitSummary.totalChecklists}
                        </p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <p className="text-[11px] text-slate-500">Observaciones</p>
                        <p className="text-lg font-semibold text-amber-700">
                          {signVisitSummary.totalRejected}
                        </p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <p className="text-[11px] text-slate-500">Certificación</p>
                        <p className="text-[12px] font-semibold text-slate-900">
                          {signVisitSummary.certificationStatus}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Lista simple de ascensores incluidos */}
                  <div className="border border-slate-200 rounded-lg max-h-[200px] overflow-y-auto">
                    {signVisitChecklists.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500">
                        No se encontraron checklists completados para este cliente en el periodo.
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-100 text-xs">
                        {signVisitChecklists.map((cl: any) => (
                          <li key={cl.id} className="px-3 py-2 flex justify-between gap-2">
                            <div>
                              <p className="font-medium text-slate-900">
                                {cl.elevators?.location_name || 'Ascensor sin nombre'}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Completado:{' '}
                                {cl.completion_date &&
                                  new Date(cl.completion_date).toLocaleString('es-CL')}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowSignatureModal(true)}
                      disabled={
                        !signVisitChecklists.length || isSigningVisit
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSigningVisit ? (
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Firmar visita
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de QR */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Escanear código QR
                </h3>
              </div>
              <button
                onClick={() => setShowQRScanner(false)}
                className="p-1 rounded-full hover:bg-slate-100"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <div className="p-4">
              <QRScanner onScan={handleQRCodeScanned} />
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowQRScanner(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de firma de visita */}
      <ChecklistSignatureModal
        open={showSignatureModal && !!signSelectedClient && signVisitChecklists.length > 0}
        onClose={() => setShowSignatureModal(false)}
        onConfirm={handleVisitSignatureConfirm}
        clientName={signSelectedClient?.company_name}
        elevatorSummary={
          signVisitChecklists.length
            ? `${signVisitChecklists.length} ascensores`
            : undefined
        }
        periodLabel={formatMonthYear(selectedMonth, selectedYear)}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {loading && viewMode !== 'select-client' && viewMode !== 'sign-visit' && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}

