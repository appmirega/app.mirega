  const handleSelectElevator = async (elevator: Elevator) => {
    setSelectedElevator(elevator);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    try {
      // Buscamos cualquier checklist de ESTE ascensor en este mes/año
      const { data: existingChecklist, error } = await supabase
        .from('mnt_checklists')
        .select('*')
        .eq('elevator_id', elevator.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error buscando checklist existente:', error);
      }

      if (existingChecklist) {
        // Si ya está completado, no dejamos crear otro
        if (existingChecklist.status === 'completed') {
          alert(
            'Este ascensor ya tiene un checklist de mantenimiento registrado para este mes. No se pueden crear más.'
          );
          return;
        }

        // Si existe y NO está completado (in_progress u otro estado), retomamos ese mismo
        setActiveChecklist({
          id: existingChecklist.id,
          elevator_id: elevator.id,
          elevator,
          month: currentMonth,
          year: currentYear,
        });
        setViewMode('checklist');
        return;
      }

      // Si no hay ningún checklist para este ascensor en el mes → pasar a certificación
      setViewMode('certification');
    } catch (err) {
      console.error('Error en handleSelectElevator:', err);
      alert('Error al verificar checklist existente. Intenta nuevamente.');
    }
  };
