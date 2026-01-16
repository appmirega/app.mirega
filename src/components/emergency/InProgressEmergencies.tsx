import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Building2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InProgressEmergency {
  id: string;
  client_id: string;
  created_at: string;
  last_autosave: string;
  client_name?: string;
  elevator_numbers?: string[];
}

interface InProgressEmergenciesProps {
  onBack: () => void;
}

export function InProgressEmergencies({ onBack }: InProgressEmergenciesProps) {
  const [emergencies, setEmergencies] = useState<InProgressEmergency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInProgressEmergencies();
  }, []);

  const loadInProgressEmergencies = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user logged in');
        return;
      }

      // Get draft emergency visits
      const { data: emergenciesData, error: emergenciesError } = await supabase
        .from('emergency_visits')
        .select(`
          id,
          client_id,
          created_at,
          last_autosave,
          clients (
            company_name
          )
        `)
        .eq('technician_id', user.id)
        .eq('status', 'draft')
        .order('last_autosave', { ascending: false });

      if (emergenciesError) {
        console.error('Error loading emergencies:', emergenciesError);
        return;
      }

      // Get elevator information for each emergency
      const emergenciesWithElevators = await Promise.all(
        (emergenciesData || []).map(async (emergency) => {
          const { data: elevatorsData } = await supabase
            .from('emergency_visit_elevators')
            .select('elevator_id, elevators(elevator_number)')
            .eq('emergency_visit_id', emergency.id);

          return {
            id: emergency.id,
            client_id: emergency.client_id,
            created_at: emergency.created_at,
            last_autosave: emergency.last_autosave,
            client_name: (emergency.clients as any)?.company_name,
            elevator_numbers: elevatorsData?.map(e => (e.elevators as any)?.elevator_number).filter(Boolean)
          };
        })
      );

      setEmergencies(emergenciesWithElevators);
    } catch (error) {
      console.error('Error loading in-progress emergencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleResumeEmergency = (emergencyId: string) => {
    // TODO: Navigate to emergency form with this ID
    console.log('Resume emergency:', emergencyId);
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
            <h1 className="text-2xl font-bold text-gray-900">Emergencias en Progreso</h1>
            <p className="text-gray-600 text-sm mt-1">
              Formularios sin firmar - guardados automáticamente
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Empty state */}
        {!loading && emergencies.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay emergencias en progreso
            </h3>
            <p className="text-gray-600">
              Todos tus formularios están completos o no has iniciado ninguno
            </p>
          </div>
        )}

        {/* List */}
        {!loading && emergencies.length > 0 && (
          <div className="space-y-4">
            {emergencies.map((emergency) => (
              <div
                key={emergency.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Client */}
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {emergency.client_name || 'Cliente desconocido'}
                      </h3>
                    </div>

                    {/* Elevators */}
                    {emergency.elevator_numbers && emergency.elevator_numbers.length > 0 && (
                      <p className="text-sm text-gray-600 mb-3">
                        Ascensores: {emergency.elevator_numbers.join(', ')}
                      </p>
                    )}

                    {/* Timestamps */}
                    <div className="flex flex-col gap-1 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Iniciado: {formatDate(emergency.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Último guardado: {formatDate(emergency.last_autosave)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="ml-4 flex flex-col gap-2">
                    <button
                      onClick={() => handleResumeEmergency(emergency.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Continuar
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('¿Eliminar este borrador? Esta acción no se puede deshacer.')) {
                          const { error } = await supabase
                            .from('emergency_visits')
                            .delete()
                            .eq('id', emergency.id);
                          
                          if (!error) {
                            loadInProgressEmergencies();
                          } else {
                            alert('Error al eliminar el borrador');
                          }
                        }
                      }}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {!loading && emergencies.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">
            {emergencies.length} emergencia{emergencies.length !== 1 ? 's' : ''} sin completar
          </div>
        )}
      </div>
    </div>
  );
}
