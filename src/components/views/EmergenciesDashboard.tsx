import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Phone,
  MapPin,
  Zap,
} from 'lucide-react';
import { MultiElevatorEmergencyForm } from '../emergency/MultiElevatorEmergencyForm';
import { EmergencyQRScanner } from '../emergency/EmergencyQRScanner';

interface EmergencyVisit {
  id: string;
  client_id: string;
  building_name: string;
  building_address: string;
  elevators_in_failure: string[];
  status: 'in_progress' | 'completed';
  created_at: string;
  completed_at?: string;
  technician_id: string;
  technician?: {
    full_name: string;
    email: string;
  };
  clients?: {
    company_name: string;
    contact_phone: string;
  };
}

type ActiveTab = 'in_progress' | 'completed';

export function EmergenciesDashboard() {
  const { profile, user } = useAuth();
  const [emergencies, setEmergencies] = useState<EmergencyVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('in_progress');
  const [showNewEmergencyForm, setShowNewEmergencyForm] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannerData, setScannerData] = useState<any>(null);

  const [stats, setStats] = useState({
    in_progress: 0,
    completed: 0,
  });

  const isAdmin = profile?.role === 'admin' || profile?.role === 'developer';
  const isTechnician = profile?.role === 'technician';

  useEffect(() => {
    loadEmergencies();
  }, [activeTab]);

  const loadEmergencies = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('emergency_v2_visits')
        .select(`
          id,
          client_id,
          building_name,
          building_address,
          elevators_in_failure,
          status,
          created_at,
          completed_at,
          technician_id,
          technician:profiles!technician_id (
            full_name,
            email
          ),
          clients:clients!client_id (
            company_name,
            contact_phone
          )
        `);

      if (activeTab === 'in_progress') {
        query = query.eq('status', 'in_progress');
      } else if (activeTab === 'completed') {
        query = query.eq('status', 'completed');
      }

      // Filtrar por técnico si es técnico
      if (isTechnician) {
        query = query.eq('technician_id', user?.id);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const typedData = (data || []) as EmergencyVisit[];
      setEmergencies(typedData);

      // Actualizar stats
      const inProgress = typedData.filter(e => e.status === 'in_progress').length;
      const completed = typedData.filter(e => e.status === 'completed').length;
      setStats({ in_progress: inProgress, completed });
    } catch (error) {
      console.error('Error loading emergencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQRScanSuccess = (data: {
    clientId: string;
    buildingName: string;
    buildingAddress: string;
    elevators: Array<{ id: string; internal_code: string; location: string }>;
  }) => {
    setScannerData(data);
    setShowQRScanner(false);
    setShowNewEmergencyForm(true);
  };

  const handleCompleteEmergency = async (emergencyId: string) => {
    try {
      const { error } = await supabase
        .from('emergency_v2_visits')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', emergencyId);

      if (error) throw error;

      await loadEmergencies();
    } catch (error) {
      console.error('Error completing emergency:', error);
      alert('Error al completar emergencia');
    }
  };

  const filteredEmergencies = emergencies.filter(e => {
    if (activeTab === 'in_progress') return e.status === 'in_progress';
    if (activeTab === 'completed') return e.status === 'completed';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Emergencias</h1>
            <p className="text-gray-600">Gestión centralizada de llamadas de emergencia y asignación técnica</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setShowQRScanner(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition shadow-md"
            >
              <Plus className="w-5 h-5" />
              Nueva Emergencia
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Emergencias Activas</p>
                <p className="text-3xl font-bold text-red-600">{stats.in_progress}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completadas Hoy</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs por Estado */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'in_progress'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Zap className="w-4 h-4" />
              Activas
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center ${
                activeTab === 'in_progress'
                  ? 'bg-white text-red-600'
                  : 'bg-red-600 text-white'
              }`}>
                {stats.in_progress}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Resueltas
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center ${
                activeTab === 'completed'
                  ? 'bg-white text-green-600'
                  : 'bg-green-600 text-white'
              }`}>
                {stats.completed}
              </span>
            </button>
          </div>
        </div>

        {/* Listado de Emergencias */}
        {filteredEmergencies.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
            <p className="text-gray-600 font-medium text-lg">
              {activeTab === 'in_progress'
                ? 'No hay emergencias activas'
                : 'No hay emergencias resueltas'}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {activeTab === 'in_progress'
                ? 'Todas las emergencias han sido resueltas'
                : 'Aún no hay emergencias completadas'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEmergencies.map((emergency) => (
              <div
                key={emergency.id}
                className={`bg-white rounded-xl shadow-sm p-6 border-l-4 transition hover:shadow-md ${
                  emergency.status === 'in_progress'
                    ? 'border-red-500 hover:border-red-600'
                    : 'border-green-500 hover:border-green-600'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-gray-900">
                        {emergency.clients?.company_name || 'Cliente'}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        emergency.status === 'in_progress'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {emergency.status === 'in_progress' ? '🔴 ACTIVA' : '✅ Resuelta'}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{emergency.building_name}</p>
                          <p className="text-xs">{emergency.building_address}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-orange-500" />
                        <p>
                          <span className="font-medium">{emergency.elevators_in_failure?.length || 0}</span> ascensor(es)
                          en falla
                        </p>
                      </div>

                      {emergency.clients?.contact_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-blue-500" />
                          <p>{emergency.clients.contact_phone}</p>
                        </div>
                      )}

                      {emergency.technician?.full_name && (
                        <div className="flex items-center gap-2">
                          <p>
                            <span className="font-medium">Técnico:</span> {emergency.technician.full_name}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-4 h-4" />
                        <p>{new Date(emergency.created_at).toLocaleString('es-CL')}</p>
                      </div>
                    </div>
                  </div>

                  {emergency.status === 'in_progress' && isAdmin && (
                    <button
                      onClick={() => handleCompleteEmergency(emergency.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex-shrink-0"
                    >
                      Completar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* QR Scanner Modal */}
        {showQRScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Escanear QR de Edificio</h2>
                <button
                  onClick={() => setShowQRScanner(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <EmergencyQRScanner
                  onScanSuccess={handleQRScanSuccess}
                  onCancel={() => setShowQRScanner(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* New Emergency Form Modal */}
        {showNewEmergencyForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 max-h-screen overflow-y-auto">
            <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full my-8">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Nueva Emergencia</h2>
                <button
                  onClick={() => {
                    setShowNewEmergencyForm(false);
                    setScannerData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                {scannerData && (
                  <MultiElevatorEmergencyForm
                    initialData={{
                      clientId: scannerData.clientId,
                      buildingName: scannerData.buildingName,
                      buildingAddress: scannerData.buildingAddress,
                      elevatorsInFailure: [],
                      availableElevators: scannerData.elevators,
                    }}
                    onSuccess={() => {
                      setShowNewEmergencyForm(false);
                      setScannerData(null);
                      loadEmergencies();
                    }}
                    onCancel={() => {
                      setShowNewEmergencyForm(false);
                      setScannerData(null);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
