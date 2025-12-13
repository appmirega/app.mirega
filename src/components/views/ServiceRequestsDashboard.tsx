import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  AlertTriangle,
  Package,
  Users,
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  TrendingUp,
  AlertCircle,
  Plus,
} from 'lucide-react';
import type { ServiceRequest } from '../../types/serviceRequests';
import { ManualServiceRequestForm } from '../forms/ManualServiceRequestForm';

interface ServiceRequestWithDetails extends ServiceRequest {
  elevators?: {
    elevator_number: number;
    location_name: string;
    brand: string;
    model: string;
  };
  clients?: {
    company_name: string;
    building_name: string;
    address: string;
  };
  technician?: {
    full_name: string;
    email: string;
  };
}

export function ServiceRequestsDashboard() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<ServiceRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'critical'>('pending');
  const [showManualForm, setShowManualForm] = useState(false);
  const [stats, setStats] = useState({
    total_pending: 0,
    critical_count: 0,
    high_priority_count: 0,
    in_progress: 0,
  });
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequestWithDetails | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalAction, setApprovalAction] = useState<'internal' | 'parts' | 'external' | null>(null);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('service_requests')
        .select(`
          *,
          elevators:elevator_id (
            elevator_number,
            location_name,
            brand,
            model
          ),
          clients:client_id (
            company_name,
            building_name,
            address
          ),
          technician:created_by_technician_id (
            full_name,
            email
          )
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (filter === 'pending') {
        query = query.in('status', ['pending', 'analyzing']);
      } else if (filter === 'critical') {
        query = query.eq('priority', 'critical');
      }

      const { data, error } = await query;

      if (error) throw error;

      setRequests(data || []);

      // Calcular estadísticas
      const pending = data?.filter(r => ['pending', 'analyzing'].includes(r.status)).length || 0;
      const critical = data?.filter(r => r.priority === 'critical').length || 0;
      const high = data?.filter(r => r.priority === 'high').length || 0;
      const inProgress = data?.filter(r => r.status === 'in_progress').length || 0;

      setStats({
        total_pending: pending,
        critical_count: critical,
        high_priority_count: high,
        in_progress: inProgress,
      });
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'repair':
        return <Wrench className="w-5 h-5" />;
      case 'parts':
        return <Package className="w-5 h-5" />;
      case 'support':
        return <Users className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Hace menos de 1 hora';
    if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({
          status: newStatus,
          assigned_to_admin_id: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      alert(`✅ Estado actualizado a: ${newStatus}`);
      loadRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    }
  };

  const handleApprove = (request: ServiceRequestWithDetails) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
  };

  const handleReject = (request: ServiceRequestWithDetails) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const submitApproval = async () => {
    if (!selectedRequest || !approvalAction) {
      alert('Debe seleccionar una acción');
      return;
    }

    try {
      await handleUpdateStatus(selectedRequest.id, 'approved');
      // TODO: Aquí se implementará la lógica según la acción seleccionada
      setShowApprovalModal(false);
      setApprovalAction(null);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const submitReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      alert('Debe ingresar un motivo');
      return;
    }

    try {
      const { error } = await supabase
        .from('service_requests')
        .update({
          status: 'rejected',
          assigned_to_admin_id: profile?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: rejectReason
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      alert('✅ Solicitud rechazada');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al rechazar solicitud');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Solicitudes de Servicio</h1>
            <p className="text-gray-600">Gestión centralizada de solicitudes desde mantenimiento y emergencias</p>
          </div>
          <button
            onClick={() => setShowManualForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-md"
          >
            <Plus className="w-5 h-5" />
            Nueva Solicitud
          </button>
        </div>

        {/* Manual Form Modal */}
        {showManualForm && (
          <ManualServiceRequestForm
            onClose={() => setShowManualForm(false)}
            onSuccess={() => loadRequests()}
          />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pendientes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_pending}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Críticas</p>
                <p className="text-3xl font-bold text-red-600">{stats.critical_count}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Alta Prioridad</p>
                <p className="text-3xl font-bold text-orange-600">{stats.high_priority_count}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">En Progreso</p>
                <p className="text-3xl font-bold text-green-600">{stats.in_progress}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-3">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'critical'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Críticas
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Cargando solicitudes...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-900 mb-2">No hay solicitudes pendientes</p>
              <p className="text-gray-600">Todas las solicitudes han sido atendidas</p>
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-gray-100 p-2 rounded-lg">
                        {getRequestTypeIcon(request.request_type)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                        <p className="text-sm text-gray-600">
                          {request.clients?.company_name || request.clients?.building_name} - Ascensor #{request.elevators?.elevator_number}
                        </p>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-4">{request.description}</p>

                    {/* Fotos */}
                    {(request.photo_1_url || request.photo_2_url) && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Evidencia Fotográfica:</p>
                        <div className="flex gap-2">
                          {request.photo_1_url && (
                            <a
                              href={request.photo_1_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition"
                            >
                              <img
                                src={request.photo_1_url}
                                alt="Foto 1"
                                className="w-full h-full object-cover group-hover:scale-110 transition"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition flex items-center justify-center">
                                <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-semibold">Ver</span>
                              </div>
                            </a>
                          )}
                          {request.photo_2_url && (
                            <a
                              href={request.photo_2_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition"
                            >
                              <img
                                src={request.photo_2_url}
                                alt="Foto 2"
                                className="w-full h-full object-cover group-hover:scale-110 transition"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition flex items-center justify-center">
                                <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-semibold">Ver</span>
                              </div>
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      <span className={`px-3 py-1 rounded-full border ${getPriorityColor(request.priority)}`}>
                        {request.priority.toUpperCase()}
                      </span>
                      <span className="text-gray-600">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {getTimeAgo(request.created_at)}
                      </span>
                      <span className="text-gray-600">
                        Técnico: {request.technician?.full_name || 'No asignado'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleUpdateStatus(request.id, 'analyzing')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Analizar
                    </button>
                    <button
                      onClick={() => handleApprove(request)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleReject(request)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Aprobar */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Aprobar Solicitud</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="font-semibold text-blue-900">{selectedRequest.title}</p>
              <p className="text-sm text-blue-700 mt-1">{selectedRequest.description}</p>
            </div>

            <p className="text-gray-700 font-medium mb-4">¿Cómo desea proceder con esta solicitud?</p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setApprovalAction('internal')}
                className={`w-full p-4 border-2 rounded-lg text-left transition ${
                  approvalAction === 'internal'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-green-300'
                }`}
              >
                <div className="font-semibold text-gray-900">✅ Trabajo Interno</div>
                <div className="text-sm text-gray-600 mt-1">
                  Asignar técnico(s), coordinar fecha y hora de visita
                </div>
              </button>

              <button
                onClick={() => setApprovalAction('parts')}
                className={`w-full p-4 border-2 rounded-lg text-left transition ${
                  approvalAction === 'parts'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-green-300'
                }`}
              >
                <div className="font-semibold text-gray-900">📦 Requiere Repuestos</div>
                <div className="text-sm text-gray-600 mt-1">
                  Generar cotización y enviar al cliente para aprobación
                </div>
              </button>

              <button
                onClick={() => setApprovalAction('external')}
                className={`w-full p-4 border-2 rounded-lg text-left transition ${
                  approvalAction === 'external'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-green-300'
                }`}
              >
                <div className="font-semibold text-gray-900">🤝 Apoyo Externo</div>
                <div className="text-sm text-gray-600 mt-1">
                  Coordinar con proveedor o especialista externo
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovalAction(null);
                  setSelectedRequest(null);
                }}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={submitApproval}
                disabled={!approvalAction}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Aprobación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechazar */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Rechazar Solicitud</h3>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="font-semibold text-red-900">{selectedRequest.title}</p>
              <p className="text-sm text-red-700 mt-1">{selectedRequest.description}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Motivo del rechazo (obligatorio)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explica por qué se rechaza esta solicitud..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedRequest(null);
                }}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={submitReject}
                disabled={!rejectReason.trim()}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
