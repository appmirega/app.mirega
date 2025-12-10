import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, ChevronDown, ChevronUp, AlertCircle, Save } from 'lucide-react';
import PhotoCapture from './PhotoCapture';

interface Question {
  id: string;
  question_number: number;
  section: string;
  question_text: string;
  frequency: 'M' | 'T' | 'S';
  is_hydraulic_only: boolean;
}

interface Answer {
  question_id: string;
  status: 'approved' | 'rejected' | 'pending';
  observations: string;
  photo_1_url: string | null;
  photo_2_url: string | null;
  request_type?: 'reparacion' | 'repuestos' | 'soporte' | 'inspeccion';
  request_priority?: 'baja' | 'media' | 'alta' | 'critica';
}

interface DynamicChecklistFormProps {
  checklistId: string;
  elevatorId: string;
  isHydraulic: boolean;
  month: number;
  onComplete: () => void;
  onSave: () => void;
}

export function DynamicChecklistForm({
  checklistId,
  elevatorId, // reservado para futuros usos
  isHydraulic,
  month,
  onComplete,
  onSave,
}: DynamicChecklistFormProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changeCount, setChangeCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Cargar preguntas y respuestas
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { data: questionsData, error: questionsError } = await supabase
          .from('mnt_checklist_questions')
          .select('*')
          .order('question_number');

        if (questionsError) throw questionsError;

        const filteredQuestions = filterQuestionsByFrequency(
          (questionsData || []) as Question[],
          month,
          isHydraulic
        );
        setQuestions(filteredQuestions);

        const { data: answersData, error: answersError } = await supabase
          .from('mnt_checklist_answers')
          .select('*')
          .eq('checklist_id', checklistId);

        if (answersError) throw answersError;

        const answersMap = new Map<string, Answer>();
        (answersData || []).forEach((answer: any) => {
          answersMap.set(answer.question_id, {
            question_id: answer.question_id,
            status: answer.status as Answer['status'],
            observations: answer.observations || '',
            photo_1_url: answer.photo_1_url,
            photo_2_url: answer.photo_2_url,
            request_type: answer.request_type,
            request_priority: answer.request_priority,
          });
        });

        setAnswers(answersMap);

        const sections = new Set<string>();
        filteredQuestions.forEach((q) => sections.add(q.section));
        setExpandedSections(sections);
      } catch (error) {
        console.error('Error loading checklist data:', error);
        alert('Error al cargar el checklist');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [checklistId, month, isHydraulic]);

  // Filtrar preguntas por frecuencia y tipo de ascensor
  const filterQuestionsByFrequency = (
    allQuestions: Question[],
    currentMonth: number,
    isHydraulicElevator: boolean
  ): Question[] => {
    const monthlyQuestions = allQuestions.filter((q) => q.frequency === 'M');

    let trimestralQuestions: Question[] = [];
    let semestralQuestions: Question[] = [];

    if (currentMonth % 3 === 0) {
      trimestralQuestions = allQuestions.filter((q) => q.frequency === 'T');
    }

    if (currentMonth % 6 === 0) {
      semestralQuestions = allQuestions.filter((q) => q.frequency === 'S');
    }

    let filtered = [
      ...monthlyQuestions,
      ...trimestralQuestions,
      ...semestralQuestions,
    ];

    if (!isHydraulicElevator) {
      filtered = filtered.filter((q) => !q.is_hydraulic_only);
    }

    return filtered;
  };

  const getAnswer = (questionId: string): Answer | undefined => {
    return answers.get(questionId);
  };

  const handleAnswerChange = (questionId: string, status: Answer['status']) => {
    const currentAnswer = answers.get(questionId) || {
      question_id: questionId,
      status: 'pending' as Answer['status'],
      observations: '',
      photo_1_url: null,
      photo_2_url: null,
    };

    const newAnswer: Answer = {
      ...currentAnswer,
      status,
      observations: status === 'approved' ? '' : currentAnswer.observations,
      photo_1_url: status === 'approved' ? null : currentAnswer.photo_1_url,
      photo_2_url: status === 'approved' ? null : currentAnswer.photo_2_url,
      request_type: status === 'approved' ? undefined : currentAnswer.request_type,
      request_priority: status === 'approved' ? undefined : currentAnswer.request_priority,
    };

    const newMap = new Map(answers);
    newMap.set(questionId, newAnswer);
    setAnswers(newMap);
    setChangeCount((prev) => prev + 1);
  };

  const handleObservationsChange = (questionId: string, observations: string) => {
    const currentAnswer = answers.get(questionId);
    if (!currentAnswer) return;

    const newMap = new Map(answers);
    newMap.set(questionId, { ...currentAnswer, observations });
    setAnswers(newMap);
    setChangeCount((prev) => prev + 1);
  };

  const handleRequestTypeChange = (questionId: string, type: Answer['request_type']) => {
    const currentAnswer = answers.get(questionId);
    if (!currentAnswer) return;

    const newMap = new Map(answers);
    newMap.set(questionId, { ...currentAnswer, request_type: type });
    setAnswers(newMap);
    setChangeCount((prev) => prev + 1);
  };

  const handleRequestPriorityChange = (questionId: string, priority: Answer['request_priority']) => {
    const currentAnswer = answers.get(questionId);
    if (!currentAnswer) return;

    const newMap = new Map(answers);
    newMap.set(questionId, { ...currentAnswer, request_priority: priority });
    setAnswers(newMap);
    setChangeCount((prev) => prev + 1);
  };

  const handlePhotosChange = (
    questionId: string,
    photo1Url: string | null,
    photo2Url: string | null
  ) => {
    const currentAnswer = answers.get(questionId);
    if (!currentAnswer) return;

    const newMap = new Map(answers);
    newMap.set(questionId, { ...currentAnswer, photo_1_url: photo1Url, photo_2_url: photo2Url });
    setAnswers(newMap);
    setChangeCount((prev) => prev + 1);
  };

  const handleAutoSave = async () => {
    await saveAnswers(true);
  };

  const handleManualSave = async () => {
    await saveAnswers(false);
  };

  const saveAnswers = async (isAutoSave: boolean = false) => {
    setSaving(true);
    try {
      const answersToSave = Array.from(answers.values()).map((answer) => ({
        checklist_id: checklistId,
        question_id: answer.question_id,
        status: answer.status,
        observations: answer.observations,
        photo_1_url: answer.photo_1_url,
        photo_2_url: answer.photo_2_url,
        request_type: answer.request_type,
        request_priority: answer.request_priority,
      }));

      // Obtener datos del checklist para las solicitudes
      const { data: checklistData } = await supabase
        .from('mnt_checklists')
        .select('client_id, elevator_id, technician_id')
        .eq('id', checklistId)
        .single();

      for (const answer of answersToSave) {
        const { error } = await supabase
          .from('mnt_checklist_answers')
          .upsert(answer, {
            onConflict: 'checklist_id,question_id',
          });

        if (error) throw error;

        // Crear solicitud automática si tiene tipo y prioridad
        if (answer.status === 'rejected' && answer.request_type && answer.request_priority && checklistData) {
          // Verificar si ya existe una solicitud para esta respuesta
          const { data: existingRequest } = await supabase
            .from('service_requests')
            .select('id')
            .eq('checklist_answer_id', answer.question_id)
            .eq('checklist_id', checklistId)
            .maybeSingle();

          if (!existingRequest) {
            // Obtener el texto de la pregunta
            const question = questions.find(q => q.id === answer.question_id);
            
            // Mapear tipos en español a inglés
            const typeMap: Record<string, string> = {
              'reparacion': 'repair',
              'repuestos': 'parts',
              'soporte': 'support',
              'inspeccion': 'inspection'
            };

            // Mapear prioridades en español a inglés
            const priorityMap: Record<string, string> = {
              'baja': 'low',
              'media': 'medium',
              'alta': 'high',
              'critica': 'critical'
            };

            // Crear solicitud de servicio
            const { error: requestError } = await supabase
              .from('service_requests')
              .insert({
                client_id: checklistData.client_id,
                elevator_id: checklistData.elevator_id,
                created_by_technician_id: checklistData.technician_id,
                checklist_id: checklistId,
                checklist_answer_id: answer.question_id,
                request_type: typeMap[answer.request_type] || 'repair',
                priority: priorityMap[answer.request_priority] || 'medium',
                title: `Pregunta ${question?.question_number}: ${question?.question_text.substring(0, 80)}`,
                description: answer.observations,
                photo_1_url: answer.photo_1_url,
                photo_2_url: answer.photo_2_url,
                status: 'pending'
              });

            if (requestError) {
              console.error('Error creando solicitud de servicio:', requestError);
            } else {
              console.log('✅ Solicitud de servicio creada exitosamente');
            }
          }
        }
      }

      // Auto-guardado: marcamos que el checklist se actualizó
      if (isAutoSave) {
        const { error: updateError } = await supabase
          .from('mnt_checklists')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', checklistId);

        if (updateError) {
          console.error('Error updating checklist on autosave:', updateError);
        }
      }

      setLastSaved(new Date());
      setChangeCount(0);

      if (!isAutoSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving answers:', error);
      alert('Error al guardar las respuestas');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getProgress = () => {
    const total = questions.length;
    let answered = 0;

    questions.forEach((q) => {
      const answer = answers.get(q.id);
      if (answer && answer.status !== 'pending') {
        answered++;
      }
    });

    return {
      answered,
      total,
      percentage: total > 0 ? Math.round((answered / total) * 100) : 0,
    };
  };

  // Todas las rechazadas deben tener observación + al menos 1 foto
  const canComplete = () => {
    const allAnswered = questions.every((q) => {
      const answer = answers.get(q.id);
      if (!answer || answer.status === 'pending') return false;

      if (answer.status === 'rejected') {
        return (
          answer.observations.trim() !== '' &&
          !!answer.photo_1_url
        );
      }

      return true;
    });

    return allAnswered;
  };

  const handleCompleteClick = async () => {
    console.log('🔴 handleCompleteClick INICIADO');
    console.log('canComplete():', canComplete());
    
    if (!canComplete()) {
      alert('Aún hay preguntas sin responder o sin observaciones/fotos donde corresponde.');
      return;
    }

    console.log('typeof onComplete:', typeof onComplete);
    if (typeof onComplete !== 'function') {
      console.error('onComplete no es una función válida');
      alert('Error: La función onComplete no está disponible');
      return;
    }

    try {
      setSaving(true);
      console.log('Guardando respuestas...');
      
      // Guardar respuestas directamente sin llamar a onSave
      const answersToSave = Array.from(answers.values()).map((answer) => ({
        checklist_id: checklistId,
        question_id: answer.question_id,
        status: answer.status,
        observations: answer.observations,
        photo_1_url: answer.photo_1_url,
        photo_2_url: answer.photo_2_url,
      }));

      console.log('Guardando', answersToSave.length, 'respuestas...');

      for (const answer of answersToSave) {
        const { error } = await supabase
          .from('mnt_checklist_answers')
          .upsert(answer, {
            onConflict: 'checklist_id,question_id',
          });

        if (error) {
          console.log('❌ Error guardando respuesta:', error);
          throw error;
        }
      }
      
      console.log('✅ Todas las respuestas guardadas');
      console.log('🟢 Llamando a onComplete()...');
      
      // Llamar a onComplete para cerrar y volver a selección de ascensores
      await onComplete();
      
      console.log('✅ onComplete() ejecutado, finalizando...');
      
      // Forzar re-render limpiando estado local
      setSaving(false);
      
    } catch (error) {
      console.error('Error al completar checklist:', error);
      alert('Error al completar el checklist. Por favor intenta de nuevo.');
      setSaving(false);
    }
  };

  useEffect(() => {
    if (changeCount >= 5) {
      handleAutoSave();
    }
  }, [changeCount]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const progress = getProgress();

  const groupedQuestions = questions.reduce((groups, question) => {
    if (!groups[question.section]) {
      groups[question.section] = [];
    }
    groups[question.section].push(question);
    return groups;
  }, {} as Record<string, Question[]>);

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header de Progreso */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">
            Checklist de Mantenimiento
          </h2>
          <p className="text-sm text-slate-600">
            Responde todas las preguntas. Las respuestas rechazadas requieren observaciones y al menos 1 foto.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="flex items-center gap-3">
            <div className="w-40 bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-700">
              {progress.answered} / {progress.total} respondidas ({progress.percentage}%)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {lastSaved && (
              <span>
                Último guardado: <span className="font-medium">{formatDateTime(lastSaved)}</span>
              </span>
            )}
            {changeCount > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                Cambios sin guardar: {changeCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Auto-guardado indicador */}
      <div className="flex justify-end items-center gap-3 text-xs">
        {changeCount > 0 && (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertCircle className="w-4 h-4" />
            {changeCount} cambio{changeCount !== 1 ? 's' : ''} sin guardar
          </span>
        )}
        {lastSaved && changeCount === 0 && (
          <span className="text-green-600">
            ✓ Guardado {formatDateTime(lastSaved)}
          </span>
        )}
      </div>

      {/* Mensaje de validación si falta algo */}
      {!canComplete() && progress.answered > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Checklist Incompleto</p>
            <p className="text-sm text-amber-800">
              Todas las preguntas rechazadas deben incluir observaciones y al menos 1 fotografía.
            </p>
          </div>
        </div>
      )}

      {/* Secciones del checklist */}
      <div className="space-y-4 pb-32">
        {Object.entries(groupedQuestions).map(([section, sectionQuestions]) => (
          <div key={section} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(section)}
              className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100"
            >
              <span className="font-semibold text-slate-800">{section}</span>
              {expandedSections.has(section) ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </button>

            {expandedSections.has(section) && (
              <div className="divide-y divide-slate-100">
                {sectionQuestions.map((question) => {
                  const answer = getAnswer(question.id);
                  const status = answer?.status ?? 'pending';

                  return (
                    <div key={question.id} className="p-4 hover:bg-slate-50 transition">
                      <div className="flex flex-col gap-3">
                        {/* Número + Pregunta en la misma línea */}
                        <div className="flex items-start gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-semibold text-slate-700 flex-shrink-0 mt-0.5">
                            {question.question_number}
                          </span>
                          <p className="font-medium text-slate-900 flex-1">{question.question_text}</p>
                        </div>

                        {/* Frecuencia debajo de la pregunta */}
                        <p className="text-xs text-slate-500 ml-8">
                          Frecuencia:{' '}
                          {question.frequency === 'M'
                            ? 'Mensual'
                            : question.frequency === 'T'
                            ? 'Trimestral'
                            : 'Semestral'}
                          {question.is_hydraulic_only && ' • Solo ascensores hidráulicos'}
                        </p>

                        {/* Botones de respuesta debajo - más pequeños */}
                        <div className="flex gap-2 ml-8">
                          <button
                            onClick={() => handleAnswerChange(question.id, 'approved')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                              status === 'approved'
                                ? 'bg-green-600 text-white'
                                : 'bg-white border border-slate-300 text-slate-700 hover:border-green-500'
                            }`}
                            title="Aprobar"
                          >
                            <Check className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleAnswerChange(question.id, 'rejected')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                              status === 'rejected'
                                ? 'bg-red-600 text-white'
                                : 'bg-white border border-slate-300 text-slate-700 hover:border-red-500'
                            }`}
                            title="Rechazar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Observaciones y fotos para respuestas rechazadas */}
                        {status === 'rejected' && (
                          <div className="ml-8 space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            {/* Tipo de solicitud */}
                            <div>
                              <label className="block text-sm font-semibold text-red-900 mb-2">
                                Tipo de Solicitud
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { value: 'reparacion', label: 'Reparación', color: 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200' },
                                  { value: 'repuestos', label: 'Repuestos', color: 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200' },
                                  { value: 'soporte', label: 'Soporte', color: 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200' },
                                  { value: 'inspeccion', label: 'Inspección', color: 'bg-teal-100 border-teal-300 text-teal-800 hover:bg-teal-200' },
                                ].map((type) => (
                                  <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => handleRequestTypeChange(question.id, type.value as Answer['request_type'])}
                                    className={`px-3 py-2 rounded-lg border-2 font-medium text-sm transition ${
                                      answer?.request_type === type.value
                                        ? type.color + ' ring-2 ring-offset-1 ring-red-400'
                                        : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                                    }`}
                                  >
                                    {type.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Prioridad */}
                            <div>
                              <label className="block text-sm font-semibold text-red-900 mb-2">
                                Prioridad
                              </label>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { value: 'baja', label: 'Baja', color: 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200' },
                                  { value: 'media', label: 'Media', color: 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200' },
                                  { value: 'alta', label: 'Alta', color: 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200' },
                                  { value: 'critica', label: 'Crítica', color: 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200' },
                                ].map((priority) => (
                                  <button
                                    key={priority.value}
                                    type="button"
                                    onClick={() => handleRequestPriorityChange(question.id, priority.value as Answer['request_priority'])}
                                    className={`px-3 py-2 rounded-lg border-2 font-medium text-sm transition ${
                                      answer?.request_priority === priority.value
                                        ? priority.color + ' ring-2 ring-offset-1 ring-red-400'
                                        : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                                    }`}
                                  >
                                    {priority.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-red-900 mb-2">
                                Observaciones (Obligatorias)
                              </label>
                              <textarea
                                value={answer?.observations || ''}
                                onChange={(e) =>
                                  handleObservationsChange(question.id, e.target.value)
                                }
                                placeholder="Describe el problema encontrado..."
                                rows={3}
                                className="w-full px-4 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-red-900 mb-2">
                                Evidencia Fotográfica (mínimo 1 foto)
                              </label>
                              <PhotoCapture
                                questionId={question.id}
                                checklistId={checklistId}
                                existingPhotos={{
                                  photo1: answer?.photo_1_url || undefined,
                                  photo2: answer?.photo_2_url || undefined,
                                }}
                                onPhotosChange={(photo1Url, photo2Url) =>
                                  handlePhotosChange(question.id, photo1Url, photo2Url)
                                }
                              />
                              <p className="mt-2 text-xs text-red-700">
                                • Foto 1 es obligatoria cuando la respuesta es Rechazado. Foto 2 es opcional.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Botones al final del checklist */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-200 shadow-2xl p-4 z-40">
        <div className="max-w-4xl mx-auto flex gap-3">
          {/* Botón Guardar */}
          <button
            onClick={handleManualSave}
            disabled={saving || changeCount === 0}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg text-lg font-bold
                        shadow-lg transition transform ${
                          !saving && changeCount > 0
                            ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                        }`}
          >
            <Save className="w-6 h-6" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>

          {/* Botón Completar */}
          <button
            onClick={handleCompleteClick}
            disabled={!canComplete() || saving}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg text-lg font-bold
                        text-white shadow-lg transition transform ${
                          canComplete() && !saving
                            ? 'bg-green-600 hover:bg-green-700 hover:scale-[1.02] active:scale-[0.98]'
                            : 'bg-slate-400 cursor-not-allowed opacity-60'
                        }`}
          >
            <Check className="w-6 h-6" />
            {saving ? 'Guardando...' : 'Completar Checklist'}
          </button>
        </div>
      </div>
    </div>
  );
}
