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
} from 'lucide-react';
import { QRScanner } from '../checklist/QRScanner';
import { CertificationForm } from '../checklist/CertificationForm';
import { DynamicChecklistForm } from '../checklist/DynamicChecklistForm';
import {
  generateMaintenanceChecklistPDF,
  generateMaintenancePDFsZip,
} from '../../utils/pdf/maintenanceChecklistPDF';

type ViewMode =
  | 'start'
  | 'select-client'
  | 'select-elevator'
  | 'certification'
  | 'checklist'
  | 'history'
  | 'pdfs';

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

interface MaintenanceRecord {
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

interface PDFRecord {
  id: string;
  month: number;
  year: number;
  completion_date: string;
  elevator: {
    brand: string;
    model: string;
    serial_number: string;
  };
  client: {
    company_name: string;
  };
}

export function TechnicianMaintenanceChecklistView() {
  const { profile } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>('start');
  const [showQRScanner, setShowQRScanner] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [elevators, setElevators] = useState<Elevator[]>([]);
  const [selectedElevator, setSelectedElevator] = useState<Elevator | null>(null);

  const [activeChecklist, setActiveChecklist] = useState<ActiveChecklist | null>(null);

  const [historyRecords, setHistoryRecords] = useState<MaintenanceRecord[]>([]);
  const [pdfRecords, setPdfRecords] = useState<PDFRecord[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchingClient, setSearchingClient] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // --------- Cargar clientes para selección ---------

  useEffect(() => {
    if (viewMode !== 'select-client') return;

    const loadClients = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('clients')
          .select('id, company_name, address')
          .eq('status', 'active')
          .order('company_name');

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

  // --------- Buscar clientes ---------

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
        .select('id, company_name, address')
        .ilike('company_name', `%${searchTerm}%`)
        .eq('status', 'active')
        .order('company_name');

      if (error) throw error;

      setClients((data || []) as Client[]);
    } catch (err) {
      console.error('Error searching clients:', err);
      setError('Error al buscar clientes');
    } finally {
      setLoadingSearch(false);
    }
  };

  // --------- Seleccionar cliente y cargar ascensores ---------

  const handleSelectClient = async (client: Client) => {
    setLoading(true);
    setError(null);
    setElevators([]);
    setSelectedElevator(null);

    try {
      const { data, error } = await supabase
        .from('elevators')
        .select(
          'id, brand, model, serial_number, is_hydraulic, location_name',
        )
        .eq('client_id', client.id)
        .eq('status', 'active')
        .order('location_name');

      if (error) throw error;

      setSelectedClient(client);
      setElevators((data || []) as Elevator[]);
      setViewMode('select-elevator');
    } catch (err) {
      console.error('Error loading elevators:', err);
      setError('Error al cargar los ascensores del cliente');
    } finally {
      setLoading(false);
    }
  };

  // --------- Seleccionar ascensor (lista o QR) ---------

  const handleSelectElevator = async (elevator: Elevator) => {
    setSelectedElevator(elevator);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    try {
      // Buscar cualquier checklist de este ascensor en el mes/año actual
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
        // Si ya está completado, no dejamos crear otro
        if (existingChecklist.status === 'completed') {
          alert(
            'Este ascensor ya tiene un checklist de mantenimiento registrado para este mes. No se pueden crear más.'
          );
          return;
        }

        // Si existe y no está completado, retomamos ese mismo
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

      // Si no hay ningún checklist en el mes actual → pasar a certificación
      setViewMode('certification');
    } catch (err) {
      console.error('Error en handleSelectElevator:', err);
      alert('Error al verificar checklist existente. Intenta nuevamente.');
    }
  };

  const handleQRCodeScanned = async (qrData: string) => {
    setShowQRScanner(false);

    try {
      const { data: elevator, error } = await supabase
        .from('elevators')
        .select(
          'id, brand, model, serial_number, is_hydraulic, location_name, client:clients(id, company_name, address)',
        )
        .eq('qr_code', qrData)
        .maybeSingle();

      if (error) throw error;
      if (!elevator) {
        setError('No se encontró un ascensor con ese código QR');
        return;
      }

      const client: Client = {
        id: elevator.client.id,
        company_name: elevator.client.company_name,
        address: elevator.client.address,
      };

      const selectedElevator: Elevator = {
        id: elevator.id,
        brand: elevator.brand,
        model: elevator.model,
        serial_number: elevator.serial_number,
        is_hydraulic: elevator.is_hydraulic,
        location_name: elevator.location_name,
      };

      setSelectedClient(client);
      setSelectedElevator(selectedElevator);
      setViewMode('certification');
    } catch (err) {
      console.error('Error handling QR code:', err);
      setError('Error al procesar el código QR');
    }
  };

  // --------- Certificación → crear checklist ---------

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

      const { data: newChecklist, error: createError } = await supabase
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

      if (createError) throw createError;
      if (!newChecklist) throw new Error('No se pudo crear el checklist');

      setActiveChecklist({
        id: newChecklist.id,
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

  // --------- Completar checklist ---------

  const handleChecklistComplete = async () => {
    if (!activeChecklist) return;

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('mnt_checklists')
        .update({
          status: 'completed',
          completion_date: new Date().toISOString(),
        })
        .eq('id', activeChecklist.id);

      if (updateError) throw updateError;

      setViewMode('history');
      await loadHistory();
    } catch (err) {
      console.error('Error completing checklist:', err);
      setError('Error al completar el checklist');
    } finally {
      setLoading(false);
    }
  };

  // --------- Cargar historial ---------

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
        .eq('status', 'completed')
        .order('completion_date', { ascending: false });

      if (error) throw error;

      setHistoryRecords((data || []) as MaintenanceRecord[]);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Error al cargar el historial de mantenimientos');
    } finally {
      setLoading(false);
    }
  };

  // --------- Cargar PDFs ---------

  const loadPDFRecords = async () => {
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
        .eq('status', 'completed')
        .order('completion_date', { ascending: false });

      if (error) throw error;

      setPdfRecords((data || []) as PDFRecord[]);
    } catch (err) {
      console.error('Error loading PDF records:', err);
      setError('Error al cargar los informes PDF');
    } finally {
      setLoading(false);
    }
  };

  // --------- Generar y descargar PDF individual ---------

  const handleDownloadSinglePDF = async (record: PDFRecord) => {
    try {
      await generateMaintenanceChecklistPDF(record.id);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error al generar el PDF');
    }
  };

  // --------- Generar ZIP con PDFs ---------

  const handleDownloadPDFsZip = async () => {
    try {
      await generateMaintenancePDFsZip(
        selectedMonth,
        selectedYear,
        profile?.id || '',
      );
    } catch (err) {
      console.error('Error generating PDFs ZIP:', err);
      alert('Error al generar los PDFs');
    }
  };

  // --------- Helpers UI ---------

  const handleGoBack = () => {
    switch (viewMode) {
      case 'select-client':
        setViewMode('start');
        setClients([]);
        setSelectedClient(null);
        break;
      case 'select-elevator':
        setViewMode('select-client');
        setElevators([]);
        setSelectedElevator(null);
        break;
      case 'certification':
        setViewMode('select-elevator');
        break;
      case 'checklist':
        setViewMode('select-elevator');
        setActiveChecklist(null);
        break;
      case 'history':
      case 'pdfs':
        setViewMode('start');
        break;
      default:
        setViewMode('start');
    }
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i,
  );

  const formatMonthYear = (month: number, year: number) => {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('es-CL', {
      month: 'long',
      year: 'numeric',
    });
  };

  // --------- Render principal ---------

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
              Gestiona los checklists de mantenimiento de ascensores de tus
              clientes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('history')}
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
            onClick={() => {
              setViewMode('pdfs');
              loadPDFRecords();
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${
              viewMode === 'pdfs'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Informes PDF
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
              <h2 className="text-base font-semibold text-slate-900">
                Iniciar nuevo checklist
              </h2>
              <p className="text-sm text-slate-600">
                Selecciona un cliente y ascensor para realizar el checklist del
                mes.
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              setShowQRScanner(true);
            }}
            className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition"
          >
            <QrCode className="w-8 h-8 text-blue-600" />
            <div className="text-left">
              <h2 className="text-base font-semibold text-slate-900">
                Escanear QR de ascensor
              </h2>
              <p className="text-sm text-slate-600">
                Escanea el código QR del ascensor para iniciar el checklist
                rápidamente.
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
                <h2 className="text-lg font-semibold text-slate-900">
                  Seleccionar Cliente
                </h2>
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
                        <p className="font-medium text-slate-900">
                          {client.company_name}
                        </p>
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
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Ascensores de {selectedClient.company_name}
                </h2>
                <p className="text-sm text-slate-600">
                  Selecciona el ascensor al que le realizarás el checklist de
                  mantenimiento.
                </p>
              </div>
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
                        <p className="font-medium text-slate-900">
                          {elevator.location_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {elevator.brand} {elevator.model} • N° Serie:{' '}
                          {elevator.serial_number}
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
              <h2 className="text-lg font-semibold text-slate-900">
                Certificación del Ascensor
              </h2>
              <p className="text-sm text-slate-600">
                Registra la información de certificación antes de iniciar el
                checklist de mantenimiento.
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
            // opcional: mostrar toast, etc.
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
            {historyRecords.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No hay registros de mantenimiento completados.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {historyRecords.map((record) => (
                  <li key={record.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        {record.client.company_name} •{' '}
                        {record.elevator.brand} {record.elevator.model} (
                        {record.elevator.serial_number})
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatMonthYear(record.month, record.year)} • Estado:{' '}
                        <span className="font-semibold">
                          {record.status === 'completed'
                            ? 'Completado'
                            : record.status}
                        </span>
                      </p>
                    </div>
                    <div className="text-xs text-slate-500">
                      {record.completion_date &&
                        new Date(record.completion_date).toLocaleString('es-CL')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Informes PDF */}
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
                  Descarga los informes individuales o un archivo ZIP con los
                  informes del período seleccionado.
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
                onClick={handleDownloadPDFsZip}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                Descargar ZIP
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {pdfRecords.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No hay informes disponibles. Asegúrate de actualizar la lista o
                de que existan mantenimientos completados.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pdfRecords.map((record) => (
                  <li
                    key={record.id}
                    className="px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {record.client.company_name} •{' '}
                        {record.elevator.brand} {record.elevator.model} (
                        {record.elevator.serial_number})
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatMonthYear(record.month, record.year)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadSinglePDF(record)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50"
                    >
                      <Download className="w-4 h-4" />
                      Descargar PDF
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* QR Scanner */}
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}
