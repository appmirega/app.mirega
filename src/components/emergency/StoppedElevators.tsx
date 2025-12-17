import { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Building2, Loader2, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StoppedElevator {
  id: string;
  elevator_number: string;
  client_name: string;
  visit_date: string;
  failure_description: string;
  emergency_visit_id: string;
}

interface StoppedElevatorsProps {
  onBack: () => void;
}

export function StoppedElevators({ onBack }: StoppedElevatorsProps) {
  const [elevators, setElevators] = useState<StoppedElevator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoppedElevators();
  }, []);

  const loadStoppedElevators = async () => {
    try {
      setLoading(true);

      // Get emergency visit elevators with stopped status
      const { data, error } = await supabase
        .from('emergency_visit_elevators')
        .select(`
          id,
          emergency_visit_id,
          elevator_id,
          elevators (
            elevator_number,
            client_id,
            clients (
              business_name
            )
          ),
          emergency_visits (
            visit_date,
            failure_description
          )
        `)
        .eq('final_status', 'stopped')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading stopped elevators:', error);
        return;
      }

      const formattedElevators = (data || []).map((item) => ({
        id: item.id,
        elevator_number: (item.elevators as any)?.elevator_number || 'N/A',
        client_name: (item.elevators as any)?.clients?.business_name || 'Cliente desconocido',
        visit_date: (item.emergency_visits as any)?.visit_date || '',
        failure_description: (item.emergency_visits as any)?.failure_description || 'Sin descripción',
        emergency_visit_id: item.emergency_visit_id
      }));

      setElevators(formattedElevators);
    } catch (error) {
      console.error('Error loading stopped elevators:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-7 h-7 text-red-600" />
              Ascensores Detenidos
            </h1>
            <p className="text-red-700 text-sm mt-1 font-medium">
              Estado crítico - requiere atención inmediata
            </p>
          </div>
        </div>

        {/* Count badge */}
        {!loading && elevators.length > 0 && (
          <div className="mb-6 inline-flex items-center gap-2 bg-red-100 border-2 border-red-300 text-red-900 px-4 py-2 rounded-lg font-bold">
            <AlertTriangle className="w-5 h-5" />
            {elevators.length} ascensor{elevators.length !== 1 ? 'es' : ''} detenido{elevators.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          </div>
        )}

        {/* Empty state */}
        {!loading && elevators.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay ascensores detenidos
            </h3>
            <p className="text-gray-600">
              Todos los ascensores están operativos
            </p>
          </div>
        )}

        {/* List */}
        {!loading && elevators.length > 0 && (
          <div className="space-y-4">
            {elevators.map((elevator) => (
              <div
                key={elevator.id}
                className="bg-red-50 rounded-xl border-2 border-red-300 p-6 shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    {/* Client */}
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-5 h-5 text-red-700" />
                      <h3 className="text-lg font-bold text-red-900">
                        {elevator.client_name}
                      </h3>
                    </div>

                    {/* Elevator number */}
                    <p className="text-base font-semibold text-red-800 mb-3">
                      Ascensor N° {elevator.elevator_number}
                    </p>

                    {/* Failure description */}
                    <div className="bg-white rounded-lg p-3 mb-3 border border-red-200">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold text-red-900">Falla:</span>{' '}
                        {elevator.failure_description}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-2 text-sm text-red-700">
                      <Calendar className="w-4 h-4" />
                      <span>Detenido desde: {formatDate(elevator.visit_date)}</span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm font-bold rounded-full">
                      DETENIDO
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
