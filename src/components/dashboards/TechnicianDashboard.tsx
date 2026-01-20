import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Calendar,
  MapPin,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Clock,
  Navigation,
  Phone,
  FileText,
  Wrench,
} from 'lucide-react';

interface TechnicianDashboardProps {
  onNavigate?: (path: string) => void;
}

export function TechnicianDashboard({ onNavigate }: TechnicianDashboardProps = {}) {
  const { profile } = useAuth();
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [stats, setStats] = useState({
    scheduledToday: 0,
    completed: 0,
    pending: 0,
    emergencies: 0,
    checklistsThisMonth: 0,
    totalChecklistsMonth: 0,
    stoppedElevators: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadTechnicianData();
    }
  }, [profile]);

  const loadTechnicianData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Cargar mantenimientos programados
      const { data: schedules, error } = await supabase
        .from('maintenance_schedules')
        .select(`
          *,
          elevators (
            id,
            internal_code,
            brand,
            model,
            location_address,
            location_building,
            location_coordinates,
            clients (
              company_name,
              contact_person,
              contact_phone
            )
          )
        `)
        .eq('assigned_technician_id', profile?.id)
        .eq('scheduled_date', today)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setTodaySchedule(schedules || []);

      const completed = schedules?.filter(s => s.status === 'completed').length || 0;
      const pending = schedules?.filter(s => s.status === 'pending').length || 0;

      // Cargar emergencias del día (completadas hoy)
      console.log('🔍 Dashboard: Buscando emergencias del día:', { today, techId: profile?.id });
      
      const { count: emergencyCount, error: emergencyError, data: emergencyData } = await supabase
        .from('emergency_visits')
        .select('*', { count: 'exact' })
        .eq('assigned_technician_id', profile?.id)
        .eq('status', 'completed')
        .gte('completed_at', `${today}T00:00:00`)
        .lt('completed_at', `${today}T23:59:59`);
      
      console.log('✅ Dashboard: Emergencias encontradas:', { count: emergencyCount, error: emergencyError, sample: emergencyData?.slice(0, 2) });

      // Cargar solicitudes de servicio (TODAS, no solo del técnico)
      const { count: requestsCount, error: requestsError } = await supabase
        .from('service_requests')
        .select('id', { count: 'exact', head: true });
      
      console.log('📋 Solicitudes de servicio encontradas:', requestsCount, requestsError);

      // Cargar checklists del mes actual (completados)
      const { count: checklistsCount } = await supabase
        .from('mnt_checklists')
        .select('id', { count: 'exact', head: true })
        .eq('technician_id', profile?.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .eq('status', 'completed');

      // Cargar total de checklists del mes (todos los asignados)
      const { count: totalChecklistsCount } = await supabase
        .from('mnt_checklists')
        .select('id', { count: 'exact', head: true })
        .eq('technician_id', profile?.id)
        .eq('month', currentMonth)
        .eq('year', currentYear);

      // Cargar ascensores detenidos
      const { count: stoppedCount } = await supabase
        .from('emergency_visits')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .eq('final_status', 'stopped')
        .is('reactivation_date', null);

      setStats({
        scheduledToday: schedules?.length || 0,
        completed,
        pending: requestsCount || 0,
        emergencies: emergencyCount || 0,
        checklistsThisMonth: checklistsCount || 0,
        totalChecklistsMonth: totalChecklistsCount || 0,
        stoppedElevators: stoppedCount || 0,
      });
    } catch (error) {
      console.error('Error loading technician data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (coordinates: string | null) => {
    if (coordinates) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${coordinates}`, '_blank');
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Atajos Rápidos</h1>
        <p className="text-slate-600 mt-1">Acceso rápido a información reciente y tareas prioritarias</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Ascensores Detenidos - PRIMERO y destacado */}
        <div 
          className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg border-2 border-red-700 p-6 cursor-pointer hover:shadow-xl transition-all transform hover:scale-105"
          onClick={() => onNavigate?.('stopped-elevators')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-white animate-pulse" />
            </div>
            {stats.stoppedElevators > 0 && (
              <span className="bg-white text-red-600 text-xs font-bold px-3 py-1 rounded-full animate-bounce">
                ¡ALERTA!
              </span>
            )}
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{stats.stoppedElevators}</h3>
          <p className="text-sm text-white/90 font-medium">🚨 Ascensores Detenidos</p>
        </div>

        {/* Mantenimientos del Mes */}
        <div 
          className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-lg transition"
          onClick={() => onNavigate?.('maintenance-history')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {stats.checklistsThisMonth} / {stats.totalChecklistsMonth}
          </h3>
          <p className="text-sm text-purple-100">Mantenimientos del Mes</p>
        </div>

        {/* Emergencias del Día */}
        <div 
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 cursor-pointer hover:shadow-lg transition"
          onClick={() => onNavigate?.('emergency-history')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-500 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">{stats.emergencies}</h3>
          <p className="text-sm text-slate-600">Emergencias del Día</p>
        </div>

        {/* Calendario Mensual */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">{stats.scheduledToday}</h3>
          <p className="text-sm text-slate-600">Calendario Mensual</p>
        </div>

        {/* Órdenes de Trabajo */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500 p-3 rounded-lg">
              <Wrench className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">{stats.completed}</h3>
          <p className="text-sm text-slate-600">Órdenes de Trabajo</p>
        </div>

        {/* Solicitudes de Servicio */}
        <div 
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 cursor-pointer hover:shadow-lg transition"
          onClick={() => onNavigate?.('service-requests')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-500 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-1">{stats.pending}</h3>
          <p className="text-sm text-slate-600">Solicitudes de Servicio</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList className="w-6 h-6 text-slate-900" />
          <h2 className="text-xl font-bold text-slate-900">Mantenimientos del Día</h2>
        </div>

        {todaySchedule.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">No hay mantenimientos programados para hoy</p>
            <p className="text-sm text-slate-500 mt-1">Revisa la sección de emergencias o contacta con administración</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todaySchedule.map((schedule, index) => {
              const elevator = schedule.elevators;
              const client = elevator?.clients;
              const statusColors = {
                pending: 'bg-orange-100 text-orange-800',
                in_progress: 'bg-blue-100 text-blue-800',
                completed: 'bg-green-100 text-green-800',
                cancelled: 'bg-red-100 text-red-800',
              };

              return (
                <div
                  key={schedule.id}
                  className="border border-slate-200 rounded-lg p-6 hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-900 text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">
                          {client?.company_name}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {elevator?.brand} {elevator?.model} - {elevator?.internal_code}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        statusColors[schedule.status as keyof typeof statusColors]
                      }`}
                    >
                      {schedule.status === 'pending' ? 'Pendiente' :
                       schedule.status === 'in_progress' ? 'En Progreso' :
                       schedule.status === 'completed' ? 'Completado' : 'Cancelado'}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-slate-900 font-medium">
                          {elevator?.location_building}
                        </p>
                        <p className="text-sm text-slate-600">{elevator?.location_address}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-slate-900 font-medium">{client?.contact_person}</p>
                        <p className="text-sm text-slate-600">{client?.contact_phone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleNavigate(elevator?.location_coordinates)}
                      className="flex-1 bg-slate-900 text-white px-4 py-3 rounded-lg font-medium hover:bg-slate-800 transition flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-5 h-5" />
                      Navegar
                    </button>
                    <button
                      onClick={() => handleCall(client?.contact_phone)}
                      className="flex-1 bg-slate-100 text-slate-900 px-4 py-3 rounded-lg font-medium hover:bg-slate-200 transition flex items-center justify-center gap-2"
                    >
                      <Phone className="w-5 h-5" />
                      Llamar
                    </button>
                    <button className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center gap-2">
                      <ClipboardList className="w-5 h-5" />
                      Iniciar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {stats.emergencies > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Emergencias Asignadas</h2>
          </div>
          <p className="text-red-800 mb-4">
            Tienes {stats.emergencies} emergencia(s) asignada(s). Revisa la sección de emergencias para más detalles.
          </p>
          <button className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition">
            Ver Emergencias
          </button>
        </div>
      )}
    </div>
  );
}
