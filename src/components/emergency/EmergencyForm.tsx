import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Camera, 
  Save, 
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { ManualServiceRequestForm } from '../forms/ManualServiceRequestForm';
import { generateEmergencyVisitPDF, EmergencyVisitPDFData } from '../../utils/emergencyVisitPDF';

interface EmergencyFormProps {
  clientId: string;
  elevatorIds: string[];
  onComplete: () => void;
  onCancel: () => void;
}

interface ElevatorInfo {
  id: string;
  elevator_number: number;
  brand: string;
  model: string;
  location_name: string;
}

interface LastEmergency {
  visit_date: string;
  days_since_last_emergency: number;
}

export function EmergencyForm({ clientId, elevatorIds, onComplete, onCancel }: EmergencyFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visitId, setVisitId] = useState<string | null>(null);
  
  // Datos del cliente y ascensores
  const [clientName, setClientName] = useState('');
  const [elevators, setElevators] = useState<ElevatorInfo[]>([]);
  const [lastEmergencies, setLastEmergencies] = useState<Map<string, LastEmergency>>(new Map());
  
  // Estado inicial de ascensores (Paso 2)
  const [elevatorInitialStatus, setElevatorInitialStatus] = useState<Map<string, 'operational' | 'stopped'>>(new Map());
  
  // Descripción de falla (Paso 3)
  const [failureDescription, setFailureDescription] = useState('');
  const [failurePhoto1, setFailurePhoto1] = useState<File | null>(null);
  const [failurePhoto2, setFailurePhoto2] = useState<File | null>(null);
  const [failurePhoto1Url, setFailurePhoto1Url] = useState('');
  const [failurePhoto2Url, setFailurePhoto2Url] = useState('');
  
  // Estado final (Paso 5)
  const [finalStatus, setFinalStatus] = useState<'operational' | 'observation' | 'stopped' | ''>('');
  
  // Resolución (Paso 7)
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [resolutionPhoto1, setResolutionPhoto1] = useState<File | null>(null);
  const [resolutionPhoto2, setResolutionPhoto2] = useState<File | null>(null);
  const [resolutionPhoto1Url, setResolutionPhoto1Url] = useState('');
  const [resolutionPhoto2Url, setResolutionPhoto2Url] = useState('');
  const [failureCause, setFailureCause] = useState<'normal_use' | 'third_party' | 'part_lifespan' | ''>('');
  
  // Firma (Paso 8)
  const [receiverName, setReceiverName] = useState('');
  const [signatureRef, setSignatureRef] = useState<SignatureCanvas | null>(null);
  
  // Solicitud
  const [serviceRequestId, setServiceRequestId] = useState<string | null>(null);
  const [showServiceRequestModal, setShowServiceRequestModal] = useState(false);
  
  // Control de UI
  const [currentStep, setCurrentStep] = useState(1);
  const [showWarning, setShowWarning] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, [clientId, elevatorIds]);

  // Guardado automático cada 30 segundos
  useEffect(() => {
    if (!visitId) return;
    
    const interval = setInterval(() => {
      autoSave();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [visitId, failureDescription, resolutionSummary, finalStatus]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Cargar información del cliente
      const { data: client } = await supabase
        .from('clients')
        .select('company_name')
        .eq('id', clientId)
        .single();
      
      if (client) setClientName(client.company_name);
      
      // Cargar información de ascensores
      const { data: elevatorsData } = await supabase
        .from('elevators')
        .select('id, elevator_number, brand, model, location_name')
        .in('id', elevatorIds);
      
      if (elevatorsData) {
        setElevators(elevatorsData);
        
        // Inicializar estados iniciales como operativos por defecto
        const initialStatuses = new Map();
        elevatorsData.forEach(e => initialStatuses.set(e.id, 'operational'));
        setElevatorInitialStatus(initialStatuses);
      }
      
      // Cargar últimas emergencias para cada ascensor
      const { data: lastEmergenciesData } = await supabase
        .from('last_emergency_by_elevator')
        .select('elevator_id, visit_date, days_since_last_emergency')
        .in('elevator_id', elevatorIds);
      
      if (lastEmergenciesData) {
        const emergenciesMap = new Map();
        lastEmergenciesData.forEach(e => emergenciesMap.set(e.elevator_id, e));
        setLastEmergencies(emergenciesMap);
      }
      
      // Crear borrador de visita
      await createDraft();
      
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDraft = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_visits')
        .insert({
          client_id: clientId,
          technician_id: profile?.id,
          status: 'draft'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setVisitId(data.id);
      
      // Insertar ascensores afectados
      const elevatorInserts = elevatorIds.map(elevId => ({
        emergency_visit_id: data.id,
        elevator_id: elevId,
        initial_status: 'operational'
      }));
      
      await supabase
        .from('emergency_visit_elevators')
        .insert(elevatorInserts);
      
    } catch (error) {
      console.error('Error creating draft:', error);
    }
  };

  const autoSave = useCallback(async () => {
    if (!visitId) return;
    
    try {
      await supabase
        .from('emergency_visits')
        .update({
          failure_description: failureDescription,
          resolution_summary: resolutionSummary,
          final_status: finalStatus || null,
          last_autosave: new Date().toISOString()
        })
        .eq('id', visitId);
      
    } catch (error) {
      console.error('Error auto-saving:', error);
    }
  }, [visitId, failureDescription, resolutionSummary, finalStatus]);

  const uploadPhoto = async (file: File, path: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${path}_${Date.now()}.${fileExt}`;
      const filePath = `emergency-visits/${visitId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('emergency-photos')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('emergency-photos')
        .getPublicUrl(filePath);
      
      return urlData.publicUrl;
      
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleFailurePhotoUpload = async (fileNum: 1 | 2, file: File) => {
    const url = await uploadPhoto(file, `failure_${fileNum}`);
    if (url) {
      if (fileNum === 1) {
        setFailurePhoto1Url(url);
        await supabase
          .from('emergency_visits')
          .update({ failure_photo_1_url: url })
          .eq('id', visitId);
      } else {
        setFailurePhoto2Url(url);
        await supabase
          .from('emergency_visits')
          .update({ failure_photo_2_url: url })
          .eq('id', visitId);
      }
    }
  };

  const handleResolutionPhotoUpload = async (fileNum: 1 | 2, file: File) => {
    const url = await uploadPhoto(file, `resolution_${fileNum}`);
    if (url) {
      if (fileNum === 1) {
        setResolutionPhoto1Url(url);
        await supabase
          .from('emergency_visits')
          .update({ resolution_photo_1_url: url })
          .eq('id', visitId);
      } else {
        setResolutionPhoto2Url(url);
        await supabase
          .from('emergency_visits')
          .update({ resolution_photo_2_url: url })
          .eq('id', visitId);
      }
    }
  };

  const updateElevatorInitialStatus = async (elevatorId: string, status: 'operational' | 'stopped') => {
    setElevatorInitialStatus(prev => new Map(prev).set(elevatorId, status));
    
    await supabase
      .from('emergency_visit_elevators')
      .update({ initial_status: status })
      .eq('emergency_visit_id', visitId)
      .eq('elevator_id', elevatorId);
  };

  const handleFinalStatusChange = (status: 'operational' | 'observation' | 'stopped') => {
    setFinalStatus(status);
    
    // Si es detenido, mostrar advertencia de solicitud obligatoria
    if (status === 'stopped' && !serviceRequestId) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  };

  const formatTimeSinceEmergency = (days: number): string => {
    if (days < 30) return `hace ${days} día${days !== 1 ? 's' : ''}`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return `hace ${months} mes${months !== 1 ? 'es' : ''}`;
    }
    const years = Math.floor(days / 365);
    return `hace ${years} año${years !== 1 ? 's' : ''}`;
  };

  const canComplete = () => {
    // Validaciones básicas
    if (!failureDescription || !resolutionSummary || !finalStatus || !failureCause) return false;
    if (!receiverName || signatureRef?.isEmpty()) return false;
    
    // Si está detenido, requiere solicitud
    if (finalStatus === 'stopped' && !serviceRequestId) return false;
    
    return true;
  };
  const generateAndUploadPDF = async (signatureUrl: string | null) => {
    try {
      // Preparar datos del PDF
      const pdfData: EmergencyVisitPDFData = {
        visitId: visitId!,
        clientName,
        clientAddress: elevators[0]?.location_name || null,
        visitDate: new Date().toISOString(),
        visitTime: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        technicianName: profile?.full_name || 'Técnico',
        elevators: elevators.map(e => ({
          elevator_number: e.elevator_number,
          brand: e.brand,
          model: e.model,
          location_name: e.location_name,
          initial_status: elevatorInitialStatus.get(e.id) || 'operational',
          final_status: finalStatus as 'operational' | 'observation' | 'stopped'
        })),
        failureDescription,
        failurePhoto1Url,
        failurePhoto2Url,
        resolutionSummary,
        resolutionPhoto1Url,
        resolutionPhoto2Url,
        failureCause: failureCause as 'normal_use' | 'third_party' | 'part_lifespan',
        finalStatus: finalStatus as 'operational' | 'observation' | 'stopped',
        observationUntil: finalStatus === 'observation' 
          ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
          : null,
        receiverName,
        signatureDataUrl: signatureUrl || '',
        completedAt: new Date().toISOString()
      };

      // Generar PDF
      const pdfBlob = await generateEmergencyVisitPDF(pdfData);

      // Subir PDF a Storage (misma lógica que mantenimiento)
      const fileName = `emergencia_${clientName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const filePath = `emergencias/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('emergency-pdfs')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Error subiendo PDF:', uploadError);
        throw new Error(`Error al subir PDF: ${uploadError.message}`);
      }

      // Obtener URL pública del PDF
      const { data: urlData } = supabase.storage
        .from('emergency-pdfs')
        .getPublicUrl(filePath);

      if (!urlData) {
        throw new Error('No se pudo obtener la URL del PDF');
      }

      const pdfUrl = urlData.publicUrl;

      // Actualizar URL del PDF en la base de datos
      const { error: updateError } = await supabase
        .from('emergency_visits')
        .update({ pdf_url: pdfUrl })
        .eq('id', visitId);

      if (updateError) {
        throw new Error(`Error guardando URL del PDF: ${updateError.message}`);
      }

      console.log('✅ PDF generado y guardado:', pdfUrl);

    } catch (error) {
      console.error('Error generando o subiendo PDF:', error);
      // No bloqueamos el flujo si falla el PDF
      alert('Advertencia: El PDF no pudo generarse, pero la emergencia se guardó correctamente.');
    }
  };
  const handleComplete = async () => {
    if (!canComplete()) {
      console.log('❌ Validación falló. Estado:', {
        failureDescription: !!failureDescription,
        resolutionSummary: !!resolutionSummary,
        finalStatus,
        failureCause,
        receiverName,
        signatureEmpty: signatureRef?.isEmpty()
      });
      return;
    }
    
    console.log('✅ Iniciando completado de emergencia...');
    
    try {
      setSaving(true);
      
      // Subir firma
      const signatureBlob = await new Promise<Blob>((resolve) => {
        signatureRef?.getTrimmedCanvas().toBlob((blob) => resolve(blob!));
      });
      
      const signatureFile = new File([signatureBlob], 'signature.png', { type: 'image/png' });
      const signatureUrl = await uploadPhoto(signatureFile, 'signature');
      
      // Calcular fecha de observación si aplica
      let observationUntil = null;
      if (finalStatus === 'observation') {
        const date = new Date();
        date.setDate(date.getDate() + 15);
        observationUntil = date.toISOString().split('T')[0];
      }
      
      // Actualizar visita
      await supabase
        .from('emergency_visits')
        .update({
          failure_description: failureDescription,
          failure_photo_1_url: failurePhoto1Url,
          failure_photo_2_url: failurePhoto2Url,
          final_status: finalStatus,
          resolution_summary: resolutionSummary,
          resolution_photo_1_url: resolutionPhoto1Url,
          resolution_photo_2_url: resolutionPhoto2Url,
          failure_cause: failureCause,
          receiver_name: receiverName,
          receiver_signature_url: signatureUrl,
          observation_until: observationUntil,
          service_request_id: serviceRequestId,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', visitId);
      
      // Actualizar estado final de ascensores
      for (const elevatorId of elevatorIds) {
        await supabase
          .from('emergency_visit_elevators')
          .update({ final_status: finalStatus })
          .eq('emergency_visit_id', visitId)
          .eq('elevator_id', elevatorId);
      }
      
      // Generar PDF
      await generateAndUploadPDF(signatureUrl);
      
      onComplete();
      
    } catch (error) {
      console.error('Error completing visit:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-lg">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Visita de Emergencia</h1>
          <p className="text-gray-600">{clientName}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Save className="w-4 h-4" />
          Guardado automático
        </div>
      </div>

      {/* Ascensores afectados */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Ascensores Afectados</h2>
        <div className="space-y-4">
          {elevators.map(elevator => {
            const lastEmergency = lastEmergencies.get(elevator.id);
            return (
              <div key={elevator.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">
                      Ascensor #{elevator.elevator_number}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {elevator.brand} {elevator.model} - {elevator.location_name}
                    </p>
                  </div>
                </div>
                
                {/* Alerta de última emergencia */}
                {lastEmergency && (
                  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      Última emergencia {formatTimeSinceEmergency(lastEmergency.days_since_last_emergency)}
                    </span>
                  </div>
                )}
                
                {/* Estado inicial */}
                <div className="flex gap-2">
                  <button
                    onClick={() => updateElevatorInitialStatus(elevator.id, 'operational')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                      elevatorInitialStatus.get(elevator.id) === 'operational'
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                  >
                    Operativo
                  </button>
                  <button
                    onClick={() => updateElevatorInitialStatus(elevator.id, 'stopped')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                      elevatorInitialStatus.get(elevator.id) === 'stopped'
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                  >
                    Detenido
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Descripción de la falla */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Descripción de la Falla</h2>
        <textarea
          value={failureDescription}
          onChange={(e) => setFailureDescription(e.target.value)}
          placeholder="Describe detalladamente la falla encontrada..."
          className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
        />
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto 1
            </label>
            {!failurePhoto1Url ? (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                <Camera className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Subir foto</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFailurePhoto1(file);
                      handleFailurePhotoUpload(1, file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <img src={failurePhoto1Url} alt="Falla 1" className="w-full h-40 object-cover rounded-lg" />
                <button
                  onClick={() => { setFailurePhoto1(null); setFailurePhoto1Url(''); }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto 2
            </label>
            {!failurePhoto2Url ? (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                <Camera className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Subir foto</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFailurePhoto2(file);
                      handleFailurePhotoUpload(2, file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <img src={failurePhoto2Url} alt="Falla 2" className="w-full h-40 object-cover rounded-lg" />
                <button
                  onClick={() => { setFailurePhoto2(null); setFailurePhoto2Url(''); }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estado Final */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Estado Final del Ascensor</h2>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => handleFinalStatusChange('operational')}
            className={`p-4 rounded-lg border-2 transition-all ${
              finalStatus === 'operational'
                ? 'bg-green-50 border-green-500'
                : 'bg-white border-gray-300'
            }`}
          >
            <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${
              finalStatus === 'operational' ? 'text-green-600' : 'text-gray-400'
            }`} />
            <p className="font-semibold text-center">Operativo</p>
            <p className="text-xs text-center text-gray-600 mt-1">Emergencia resuelta</p>
          </button>
          
          <button
            onClick={() => handleFinalStatusChange('observation')}
            className={`p-4 rounded-lg border-2 transition-all ${
              finalStatus === 'observation'
                ? 'bg-yellow-50 border-yellow-500'
                : 'bg-white border-gray-300'
            }`}
          >
            <AlertCircle className={`w-8 h-8 mx-auto mb-2 ${
              finalStatus === 'observation' ? 'text-yellow-600' : 'text-gray-400'
            }`} />
            <p className="font-semibold text-center">Observación</p>
            <p className="text-xs text-center text-gray-600 mt-1">Sin causa identificada (15 días)</p>
          </button>
          
          <button
            onClick={() => handleFinalStatusChange('stopped')}
            className={`p-4 rounded-lg border-2 transition-all ${
              finalStatus === 'stopped'
                ? 'bg-red-50 border-red-500'
                : 'bg-white border-gray-300'
            }`}
          >
            <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${
              finalStatus === 'stopped' ? 'text-red-600' : 'text-gray-400'
            }`} />
            <p className="font-semibold text-center">Detenido</p>
            <p className="text-xs text-center text-gray-600 mt-1">Requiere reparación</p>
          </button>
        </div>
        
        {showWarning && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-medium">
              ⚠️ Debe crear una solicitud de servicio antes de cerrar
            </p>
            <p className="text-xs text-red-600 mt-1">
              La prioridad será automáticamente <span className="font-bold">CRÍTICA</span> porque el ascensor quedó detenido
            </p>
          </div>
        )}
      </div>

      {/* Solicitudes */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Solicitudes de Servicio</h2>
        <button
          onClick={() => setShowServiceRequestModal(true)}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          {serviceRequestId ? 'Ver Solicitud Creada' : 'Solicitud Técnica Adicional'}
        </button>
      </div>

      {/* Resolución */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Resumen de Resolución</h2>
        <textarea
          value={resolutionSummary}
          onChange={(e) => setResolutionSummary(e.target.value)}
          placeholder="Describe lo que se realizó para resolver la falla..."
          className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto Resolución 1
            </label>
            {!resolutionPhoto1Url ? (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
                <Camera className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Subir foto</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setResolutionPhoto1(file);
                      handleResolutionPhotoUpload(1, file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <img src={resolutionPhoto1Url} alt="Resolución 1" className="w-full h-40 object-cover rounded-lg" />
                <button
                  onClick={() => { setResolutionPhoto1(null); setResolutionPhoto1Url(''); }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto Resolución 2
            </label>
            {!resolutionPhoto2Url ? (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
                <Camera className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Subir foto</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setResolutionPhoto2(file);
                      handleResolutionPhotoUpload(2, file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <img src={resolutionPhoto2Url} alt="Resolución 2" className="w-full h-40 object-cover rounded-lg" />
                <button
                  onClick={() => { setResolutionPhoto2(null); setResolutionPhoto2Url(''); }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Clasificación de la Falla
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setFailureCause('normal_use')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                failureCause === 'normal_use'
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white border-gray-300 hover:border-blue-300'
              }`}
            >
              <p className="font-semibold text-gray-900">Desgaste por uso normal</p>
            </button>
            <button
              type="button"
              onClick={() => setFailureCause('third_party')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                failureCause === 'third_party'
                  ? 'bg-orange-50 border-orange-500'
                  : 'bg-white border-gray-300 hover:border-orange-300'
              }`}
            >
              <p className="font-semibold text-gray-900">Responsabilidad de terceros</p>
            </button>
            <button
              type="button"
              onClick={() => setFailureCause('part_lifespan')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                failureCause === 'part_lifespan'
                  ? 'bg-purple-50 border-purple-500'
                  : 'bg-white border-gray-300 hover:border-purple-300'
              }`}
            >
              <p className="font-semibold text-gray-900">Vida útil de repuesto</p>
            </button>
          </div>
        </div>
      </div>

      {/* Firma */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Firma y Cierre</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de quien recepciona
          </label>
          <input
            type="text"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder="Nombre completo"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Firma
          </label>
          <div className="border-2 border-gray-300 rounded-lg">
            <SignatureCanvas
              ref={(ref) => setSignatureRef(ref)}
              canvasProps={{
                className: 'w-full h-48 cursor-crosshair'
              }}
            />
          </div>
          <button
            onClick={() => signatureRef?.clear()}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            Limpiar firma
          </button>
        </div>
      </div>

      {/* Botón de completar */}
      <button
        onClick={handleComplete}
        disabled={!canComplete() || saving}
        className="w-full py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5" />
            Completar y Generar PDF
          </>
        )}
      </button>

      {/* Modal de Solicitud Técnica */}
      {showServiceRequestModal && (
        <ManualServiceRequestForm
          onClose={() => setShowServiceRequestModal(false)}
          onSuccess={() => {
            setShowServiceRequestModal(false);
            // Aquí podrías guardar el ID de la solicitud si lo necesitas
          }}
          forcedPriority={finalStatus === 'stopped' ? 'critical' : undefined}
        />
      )}
    </div>
  );
}
