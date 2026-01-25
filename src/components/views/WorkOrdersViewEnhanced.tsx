import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, FileText, Clock, CheckCircle, X, AlertCircle, DollarSign, Calendar, Package } from 'lucide-react';

interface WorkOrder {
  id: string;
  building_id: string;
  service_request_id?: string;
  folio_number?: string;
  created_at: string;
  work_type: string;
  description: string;
  status: string;
  assigned_technician_id?: string;
  priority: string;
  scheduled_date?: string;
  completed_at?: string;
  notes?: string;
  // Nuevos campos
  has_client_cost: boolean;
  requires_client_approval: boolean;
  external_quotation_number?: string;
  external_quotation_pdf_url?: string;
  quotation_amount?: number;
  quotation_description?: string;
  involves_foreign_parts: boolean;
  foreign_parts_supplier?: string;
  estimated_execution_days?: number;
  requires_advance_payment: boolean;
  advance_percentage?: number;
  advance_amount?: number;
  approval_deadline?: string;
  work_warranty_months?: number;
  work_warranty_description?: string;
  parts_warranty_months?: number;
  parts_warranty_description?: string;
  client_approved_at?: string;
  client_rejected_at?: string;
  buildings?: {
    name: string;
    clients?: {
      business_name: string;
    };
  };
  profiles?: {
    full_name: string;
  };
}

type ViewMode = 'list' | 'create';

export function WorkOrdersViewEnhanced() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    // Básico
    building_id: '',
    service_request_id: '',
    work_type: 'maintenance',
    description: '',
    priority: 'medium',
    assigned_technician_id: '',
    scheduled_date: '',
    notes: '',
    // Costo y cotización
    has_client_cost: false,
    external_quotation_number: '',
    quotation_amount: '',
    quotation_description: '',
    // Repuestos
    involves_foreign_parts: false,
    foreign_parts_supplier: '',
    estimated_execution_days: '',
    // Adelantos
    requires_advance_payment: false,
    advance_percentage: '',
    // Garantías
    work_warranty_months: '',
    work_warranty_description: '',
    parts_warranty_months: '',
    parts_warranty_description: '',
    // Aprobación
    requires_client_approval: false,
    approval_deadline: '',
  });

  const [buildings, setBuildings] = useState<any[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadWorkOrders();
    loadBuildings();
    loadTechnicians();
  }, []);

  const loadWorkOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          buildings (
            name,
            clients (
              business_name
            )
          ),
          profiles (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkOrders(data || []);
    } catch (error) {
      console.error('Error loading work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, clients(business_name)')
        .order('name');

      if (error) throw error;
      setBuildings(data || []);
    } catch (error) {
      console.error('Error loading buildings:', error);
    }
  };

  const loadServiceRequests = async (buildingId: string) => {
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select('id, description, request_type')
        .eq('building_id', buildingId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServiceRequests(data || []);
    } catch (error) {
      console.error('Error loading service requests:', error);
    }
  };

  const loadTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'technician')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  };

  const handleBuildingChange = (buildingId: string) => {
    setFormData({ ...formData, building_id: buildingId, service_request_id: '' });
    if (buildingId) {
      loadServiceRequests(buildingId);
    }
  };

  const handleAdvancePercentageChange = (percentage: string) => {
    setFormData({ ...formData, advance_percentage: percentage });
    if (percentage && formData.quotation_amount) {
      const amount = (parseFloat(formData.quotation_amount) * parseFloat(percentage)) / 100;
      setFormData(prev => ({ ...prev, advance_amount: amount.toString() }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const insertData = {
        building_id: formData.building_id,
        service_request_id: formData.service_request_id || null,
        work_type: formData.work_type,
        description: formData.description,
        priority: formData.priority,
        assigned_technician_id: formData.assigned_technician_id || null,
        scheduled_date: formData.scheduled_date || null,
        notes: formData.notes || null,
        status: 'pending',
        // Costo
        has_client_cost: formData.has_client_cost,
        external_quotation_number: formData.external_quotation_number || null,
        quotation_amount: formData.quotation_amount ? parseFloat(formData.quotation_amount) : null,
        quotation_description: formData.quotation_description || null,
        // Repuestos
        involves_foreign_parts: formData.involves_foreign_parts,
        foreign_parts_supplier: formData.foreign_parts_supplier || null,
        estimated_execution_days: formData.estimated_execution_days ? parseInt(formData.estimated_execution_days) : null,
        // Adelantos
        requires_advance_payment: formData.requires_advance_payment,
        advance_percentage: formData.advance_percentage ? parseFloat(formData.advance_percentage) : null,
        advance_amount: formData.advance_amount ? parseFloat(formData.advance_amount) : null,
        // Garantías
        work_warranty_months: formData.work_warranty_months ? parseInt(formData.work_warranty_months) : null,
        work_warranty_description: formData.work_warranty_description || null,
        parts_warranty_months: formData.parts_warranty_months ? parseInt(formData.parts_warranty_months) : null,
        parts_warranty_description: formData.parts_warranty_description || null,
        // Aprobación
        requires_client_approval: formData.requires_client_approval,
        approval_deadline: formData.approval_deadline || null,
      };

      const { error } = await supabase.from('work_orders').insert([insertData]);

      if (error) throw error;

      alert('✅ Orden de trabajo creada exitosamente');
      resetForm();
      setViewMode('list');
      loadWorkOrders();
    } catch (error: any) {
      console.error('Error creating work order:', error);
      alert('Error al crear orden de trabajo: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      building_id: '',
      service_request_id: '',
      work_type: 'maintenance',
      description: '',
      priority: 'medium',
      assigned_technician_id: '',
      scheduled_date: '',
      notes: '',
      has_client_cost: false,
      external_quotation_number: '',
      quotation_amount: '',
      quotation_description: '',
      involves_foreign_parts: false,
      foreign_parts_supplier: '',
      estimated_execution_days: '',
      requires_advance_payment: false,
      advance_percentage: '',
      work_warranty_months: '',
      work_warranty_description: '',
      parts_warranty_months: '',
      parts_warranty_description: '',
      requires_client_approval: false,
      approval_deadline: '',
    });
    setActiveTab('basic');
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pending_approval: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, string> = {
      low: 'bg-slate-100 text-slate-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return badges[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (viewMode === 'create') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900">Crear Orden de Trabajo</h2>
          </div>
          <button
            onClick={() => { setViewMode('list'); resetForm(); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          {[
            { id: 'basic', label: 'Información Básica' },
            { id: 'cost', label: 'Cotización y Costo' },
            { id: 'warranty', label: 'Garantías' },
            { id: 'approval', label: 'Aprobación' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium transition ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* BASIC TAB */}
          {activeTab === 'basic' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Edificio *
                </label>
                <select
                  required
                  value={formData.building_id}
                  onChange={(e) => handleBuildingChange(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar edificio</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.clients?.business_name} - {building.name}
                    </option>
                  ))}
                </select>
              </div>

              {serviceRequests.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Solicitud de Servicio (Opcional)
                  </label>
                  <select
                    value={formData.service_request_id}
                    onChange={(e) => setFormData({ ...formData, service_request_id: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Crear nueva OT</option>
                    {serviceRequests.map((sr) => (
                      <option key={sr.id} value={sr.id}>
                        {sr.request_type} - {sr.description?.substring(0, 50)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de Trabajo *
                  </label>
                  <select
                    required
                    value={formData.work_type}
                    onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="maintenance">Mantenimiento</option>
                    <option value="repair">Reparación</option>
                    <option value="installation">Instalación</option>
                    <option value="inspection">Inspección</option>
                    <option value="emergency">Emergencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Prioridad *
                  </label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descripción *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe el trabajo a realizar..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fecha Programada
                  </label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Asignar Técnico
                  </label>
                  <select
                    value={formData.assigned_technician_id}
                    onChange={(e) => setFormData({ ...formData, assigned_technician_id: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sin asignar</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notas Adicionales
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Notas o instrucciones especiales..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('cost')}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Siguiente: Cotización
                </button>
              </div>
            </>
          )}

          {/* COST TAB */}
          {activeTab === 'cost' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_client_cost}
                    onChange={(e) => setFormData({ ...formData, has_client_cost: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="font-medium text-slate-900">
                    ¿Esta OT tiene costo al cliente?
                  </span>
                </label>
                {formData.has_client_cost && (
                  <p className="text-sm text-blue-700 mt-2">
                    📋 Folio generado automáticamente: OT-XXXX-2026
                  </p>
                )}
              </div>

              {formData.has_client_cost && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Número de Cotización Externa
                      </label>
                      <input
                        type="text"
                        value={formData.external_quotation_number}
                        onChange={(e) => setFormData({ ...formData, external_quotation_number: e.target.value })}
                        placeholder="Ej: COTI-2025-001"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Monto de Cotización (CLP)
                      </label>
                      <input
                        type="number"
                        value={formData.quotation_amount}
                        onChange={(e) => setFormData({ ...formData, quotation_amount: e.target.value })}
                        placeholder="0"
                        min="0"
                        step="1000"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Descripción de Cotización
                    </label>
                    <textarea
                      value={formData.quotation_description}
                      onChange={(e) => setFormData({ ...formData, quotation_description: e.target.value })}
                      rows={3}
                      placeholder="Descripción detallada de lo cotizado..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="border-t-2 border-slate-200 pt-4">
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Repuestos y Materiales
                    </h4>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.involves_foreign_parts}
                        onChange={(e) => setFormData({ ...formData, involves_foreign_parts: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span className="text-slate-900">¿Incluye compras en el extranjero?</span>
                    </label>

                    {formData.involves_foreign_parts && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Proveedor / País
                        </label>
                        <input
                          type="text"
                          value={formData.foreign_parts_supplier}
                          onChange={(e) => setFormData({ ...formData, foreign_parts_supplier: e.target.value })}
                          placeholder="Ej: Germany / Siemens"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Estimación de Ejecución (días)
                    </label>
                    <input
                      type="number"
                      value={formData.estimated_execution_days}
                      onChange={(e) => setFormData({ ...formData, estimated_execution_days: e.target.value })}
                      placeholder="Ej: 5"
                      min="1"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              <div className="border-t-2 border-slate-200 pt-4">
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Adelanto de Pago
                </h4>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requires_advance_payment}
                    onChange={(e) => setFormData({ ...formData, requires_advance_payment: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-slate-900">¿Requiere adelanto de pago?</span>
                </label>

                {formData.requires_advance_payment && (
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Porcentaje (%)
                      </label>
                      <input
                        type="number"
                        value={formData.advance_percentage}
                        onChange={(e) => handleAdvancePercentageChange(e.target.value)}
                        placeholder="Ej: 50"
                        min="0"
                        max="100"
                        step="5"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Monto (CLP) - Auto calculado
                      </label>
                      <input
                        type="text"
                        value={formData.advance_amount ? `$${parseFloat(formData.advance_amount).toLocaleString('es-CL')}` : '-'}
                        disabled
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('basic')}
                  className="flex-1 bg-slate-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition"
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('warranty')}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Siguiente: Garantías →
                </button>
              </div>
            </>
          )}

          {/* WARRANTY TAB */}
          {activeTab === 'warranty' && (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-4">Garantía del Trabajo</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Meses de Garantía
                      </label>
                      <input
                        type="number"
                        value={formData.work_warranty_months}
                        onChange={(e) => setFormData({ ...formData, work_warranty_months: e.target.value })}
                        placeholder="Ej: 12"
                        min="0"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Descripción
                      </label>
                      <textarea
                        value={formData.work_warranty_description}
                        onChange={(e) => setFormData({ ...formData, work_warranty_description: e.target.value })}
                        rows={3}
                        placeholder="Términos y condiciones de garantía..."
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-4">Garantía de Repuestos</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Meses de Garantía
                      </label>
                      <input
                        type="number"
                        value={formData.parts_warranty_months}
                        onChange={(e) => setFormData({ ...formData, parts_warranty_months: e.target.value })}
                        placeholder="Ej: 24"
                        min="0"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Descripción
                      </label>
                      <textarea
                        value={formData.parts_warranty_description}
                        onChange={(e) => setFormData({ ...formData, parts_warranty_description: e.target.value })}
                        rows={3}
                        placeholder="Términos específicos para repuestos..."
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('cost')}
                  className="flex-1 bg-slate-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition"
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('approval')}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Siguiente: Aprobación →
                </button>
              </div>
            </>
          )}

          {/* APPROVAL TAB */}
          {activeTab === 'approval' && (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requires_client_approval}
                    onChange={(e) => setFormData({ ...formData, requires_client_approval: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="font-medium text-slate-900">
                    ¿Requiere aprobación del cliente?
                  </span>
                </label>
                <p className="text-sm text-yellow-700 mt-2">
                  Si está activado, el cliente debe aprobar esta OT antes de ejecutarla
                </p>
              </div>

              {formData.requires_client_approval && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fecha Límite de Aprobación
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.approval_deadline}
                    onChange={(e) => setFormData({ ...formData, approval_deadline: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-sm text-slate-500 mt-2">
                    ⏰ El cliente tendrá esta fecha límite para aprobar o rechazar
                  </p>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-slate-900 mb-2">Resumen de la OT</h4>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>🏢 <strong>Tipo Folio:</strong> {formData.has_client_cost ? 'OT-XXXX-2026 (Con costo)' : 'OT-INT-XXXX-2026 (Sin costo)'}</p>
                  {formData.quotation_amount && <p>💰 <strong>Monto:</strong> ${parseFloat(formData.quotation_amount).toLocaleString('es-CL')}</p>}
                  {formData.requires_advance_payment && <p>💵 <strong>Adelanto:</strong> {formData.advance_percentage}% = ${formData.advance_amount ? parseFloat(formData.advance_amount).toLocaleString('es-CL') : '-'}</p>}
                  {formData.work_warranty_months && <p>🛡️ <strong>Garantía Trabajo:</strong> {formData.work_warranty_months} meses</p>}
                  {formData.parts_warranty_months && <p>🔧 <strong>Garantía Repuestos:</strong> {formData.parts_warranty_months} meses</p>}
                  {formData.requires_client_approval && <p>✅ <strong>Requiere Aprobación:</strong> Sí</p>}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('warranty')}
                  className="flex-1 bg-slate-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition"
                >
                  ← Anterior
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                >
                  {submitting ? '⏳ Creando...' : '✅ Crear Orden de Trabajo'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Órdenes de Trabajo</h1>
          <p className="text-slate-600 mt-1">Gestión de órdenes de trabajo, cotizaciones y garantías</p>
        </div>
        <button
          onClick={() => { setViewMode('create'); resetForm(); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nueva Orden
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-yellow-900">
                {workOrders.filter((w) => w.status === 'pending').length}
              </p>
              <p className="text-sm text-yellow-700">Pendientes</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-900">
                {workOrders.filter((w) => w.status === 'pending_approval').length}
              </p>
              <p className="text-sm text-blue-700">Pendientes Aprobación</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-orange-900">
                {workOrders.filter((w) => w.status === 'in_progress').length}
              </p>
              <p className="text-sm text-orange-700">En Proceso</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-900">
                {workOrders.filter((w) => w.status === 'completed').length}
              </p>
              <p className="text-sm text-green-700">Completadas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Folio</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Cliente/Edificio</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Descripción</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Monto</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Prioridad</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {workOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">No hay órdenes de trabajo</p>
                    <p className="text-sm text-slate-500 mt-1">Crea tu primera orden de trabajo</p>
                  </td>
                </tr>
              ) : (
                workOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm font-semibold text-blue-600">
                        {order.folio_number || '(auto)'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">
                        {order.buildings?.clients?.business_name || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-500">{order.buildings?.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900 capitalize">{order.work_type}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900 max-w-xs truncate">{order.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">
                        {order.quotation_amount ? `$${order.quotation_amount.toLocaleString('es-CL')}` : '-'}
                      </p>
                      {order.requires_advance_payment && (
                        <p className="text-xs text-orange-600">Adelanto: {order.advance_percentage}%</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadge(order.priority)}`}>
                        {order.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
