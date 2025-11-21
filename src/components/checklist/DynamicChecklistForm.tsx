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

  // Carga preguntas y respuestas
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

  // Filtro de preguntas por frecuencia y tipo
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
      status: 'pending',
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
      }));

      for (const answer of answersToSave) {
        const { error } = await supabase
          .from('mnt_checklist_answers')
          .upsert(answer, {
            onConflict: 'checklist_id,question_id',
          });

        if (error) throw error;
      }

      // 🔧 Auto-guardado: usamos la columna existente `updated_at`
      if (isAutoSave) {
        const { error: updateError } = await supabase
          .from('mnt_checklists')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', checklistId);

        if (updateError) throw updateError;
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

  // ✅ Todas las rechazadas deben tener observación + 1 foto mínima
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

      re

