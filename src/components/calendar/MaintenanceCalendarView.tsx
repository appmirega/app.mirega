import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { CalendarDayCell } from './CalendarDayCell';
import { MaintenanceAssignmentModal } from './MaintenanceAssignmentModal';
import { TechnicianAvailabilityPanel } from './TechnicianAvailabilityPanel';

interface MaintenanceAssignment {
  id: string;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  building_name: string;
  client_name: string;
  assigned_to: string;
  is_external: boolean;
  status: string;
  is_fixed: boolean;
  is_holiday_date: boolean;
  display_status: string;
  estimated_duration_hours: number;
  assigned_technician_id?: string;
}

interface Technician {
  technician_id: string;
  full_name: string;
  phone: string;
  email: string;
  is_on_leave: boolean;
  assignments_today: number;
  emergency_shift_type?: string;
}

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  assignments: MaintenanceAssignment[];
}

export function MaintenanceCalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [assignments, setAssignments] = useState<MaintenanceAssignment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<MaintenanceAssignment | null>(null);

  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAssignments(),
        loadTechnicians(),
        loadHolidays()
      ]);
      generateCalendarDays();
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from('v_monthly_maintenance_calendar')
      .select('*')
      .gte('scheduled_date', startOfMonth.toISOString().split('T')[0])
      .lte('scheduled_date', endOfMonth.toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time_start', { ascending: true });

    if (error) {
      console.error('Error loading assignments:', error);
      return;
    }

    setAssignments(data || []);
  };

  const loadTechnicians = async () => {
    const { data, error } = await supabase
      .from('v_technician_availability_today')
      .select('*');

    if (error) {
      console.error('Error loading technicians:', error);
      return;
    }

    setTechnicians(data || []);
  };

  const loadHolidays = async () => {
    const year = currentDate.getFullYear();
    const { data, error } = await supabase
      .from('holidays')
      .select('holiday_date')
      .gte('holiday_date', `${year}-01-01`)
      .lte('holiday_date', `${year}-12-31`);

    if (error) {
      console.error('Error loading holidays:', error);
      return;
    }

    const holidaySet = new Set(data?.map(h => h.holiday_date) || []);
    setHolidays(holidaySet);
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Primer día del mes
    const firstDay = new Date(year, month, 1);
    // Último día del mes
    const lastDay = new Date(year, month + 1, 0);
    
    // Día de la semana del primer día (0=domingo, 1=lunes, etc.)
    const startDayOfWeek = firstDay.getDay();
    // Ajustar para que lunes sea el primer día (0=lunes, 6=domingo)
    const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Días del mes anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = adjustedStartDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push(createCalendarDay(date, false, today));
    }

    // Días del mes actual
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push(createCalendarDay(date, true, today));
    }

    // Días del mes siguiente para completar la grilla (6 filas x 7 días = 42)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push(createCalendarDay(date, false, today));
    }

    setCalendarDays(days);
  };

  const createCalendarDay = (date: Date, isCurrentMonth: boolean, today: Date): CalendarDay => {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    
    return {
      date,
      day: date.getDate(),
      isCurrentMonth,
      isToday: date.getTime() === today.getTime(),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isHoliday: holidays.has(dateStr),
      assignments: assignments.filter(a => a.scheduled_date === dateStr)
    };
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return;
    setSelectedDate(day.date);
    setSelectedAssignment(null);
    setShowAssignmentModal(true);
  };

  const handleAssignmentClick = (assignment: MaintenanceAssignment, day: CalendarDay) => {
    setSelectedDate(day.date);
    setSelectedAssignment(assignment);
    setShowAssignmentModal(true);
  };

  const handleAssignmentCreated = () => {
    loadCalendarData();
    setShowAssignmentModal(false);
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Calendario de Mantenimientos</h1>
              <p className="text-sm text-slate-600">Planificación y asignación de mantenimientos preventivos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Hoy
            </button>
            
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-white rounded transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              
              <div className="px-4 py-2 min-w-[200px] text-center">
                <span className="text-lg font-semibold text-slate-900">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </span>
              </div>
              
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-white rounded transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedDate(new Date());
                setSelectedAssignment(null);
                setShowAssignmentModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Asignar Mantenimiento
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Calendario Principal */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Leyenda */}
          <div className="mb-4 flex items-center gap-6 bg-white p-4 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-slate-600">Completado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-slate-600">Programado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-slate-600">Hoy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-slate-600">Atrasado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-sm text-slate-600">Día festivo</span>
            </div>
          </div>

          {/* Grid del Calendario */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {/* Días de la semana */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {weekDays.map(day => (
                <div
                  key={day}
                  className="py-3 text-center text-sm font-semibold text-slate-700"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 auto-rows-fr">
              {calendarDays.map((day, index) => (
                <CalendarDayCell
                  key={index}
                  day={day}
                  onDayClick={handleDayClick}
                  onAssignmentClick={handleAssignmentClick}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Panel Lateral de Técnicos */}
        <TechnicianAvailabilityPanel
          technicians={technicians}
          currentDate={currentDate}
          onRefresh={loadTechnicians}
        />
      </div>

      {/* Modal de Asignación */}
      {showAssignmentModal && (
        <MaintenanceAssignmentModal
          selectedDate={selectedDate}
          assignment={selectedAssignment}
          technicians={technicians}
          onClose={() => setShowAssignmentModal(false)}
          onSuccess={handleAssignmentCreated}
        />
      )}
    </div>
  );
}
