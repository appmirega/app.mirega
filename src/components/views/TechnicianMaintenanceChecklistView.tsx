  const handleDownloadPDF = async (record: MaintenanceHistory) => {
    try {
      setDownloadingPDF(true);

      // 1) Datos del checklist (cliente, ascensor, técnico, certificaciones)
      const { data: checklistData, error } = await supabase
        .from('mnt_checklists')
        .select(
          `
          id,
          month,
          year,
          completion_date,
          last_certification_date,
          next_certification_date,
          certification_not_legible,
          client:clients(
            id,
            company_name,
            address
          ),
          elevator:elevators(
            brand,
            model,
            serial_number,
            is_hydraulic,
            location_name
          ),
          profiles:profiles!mnt_checklists_technician_id_fkey(
            full_name,
            email
          )
        `,
        )
        .eq('id', record.id)
        .maybeSingle();

      if (error) throw error;
      if (!checklistData) throw new Error('No se encontró información del checklist');

      const isHydraulicElevator = !!checklistData.elevator.is_hydraulic;
      const currentMonth = checklistData.month as number;

      // 2) Todas las preguntas del checklist
      const { data: questionsData, error: questionsError } = await supabase
        .from('mnt_checklist_questions')
        .select(
          `
          id,
          question_number,
          section,
          question_text,
          frequency,
          is_hydraulic_only
        `,
        )
        .order('question_number');

      if (questionsError) throw questionsError;

      // 3) Todas las respuestas de este checklist
      const { data: answersData, error: ansError } = await supabase
        .from('mnt_checklist_answers')
        .select(
          `
          question_id,
          status,
          observations,
          photo_1_url,
          photo_2_url
        `,
        )
        .eq('checklist_id', checklistData.id);

      if (ansError) throw ansError;

      const answersMap = new Map<
        string,
        {
          question_id: string;
          status: 'approved' | 'rejected' | 'pending';
          observations: string | null;
          photo_1_url: string | null;
          photo_2_url: string | null;
        }
      >();

      (answersData || []).forEach((a: any) => {
        answersMap.set(a.question_id, a);
      });

      const quarters = [3, 6, 9, 12];
      const semesters = [3, 9];

      // 4) Construir filas para el PDF
      const pdfQuestions: {
        number: number;
        section: string;
        text: string;
        status:
          | 'approved'
          | 'rejected'
          | 'not_applicable'
          | 'out_of_period';
        observations?: string | null;
      }[] = [];

      const rejectedQuestions: typeof pdfQuestions = [];

      (questionsData || []).forEach((q: any) => {
        const answer = answersMap.get(q.id);

        const isHydraulicOnly = !!q.is_hydraulic_only;
        const frequency = q.frequency as 'M' | 'T' | 'S';

        let inPeriod = false;
        if (frequency === 'M') inPeriod = true;
        if (frequency === 'T') inPeriod = quarters.includes(currentMonth);
        if (frequency === 'S') inPeriod = semesters.includes(currentMonth);

        let status:
          | 'approved'
          | 'rejected'
          | 'not_applicable'
          | 'out_of_period';

        // No aplica por tipo de ascensor
        if (isHydraulicOnly && !isHydraulicElevator) {
          status = 'not_applicable';
        } else if (!inPeriod) {
          // Pregunta que no corresponde a este periodo
          status = 'out_of_period';
        } else if (answer?.status === 'rejected') {
          status = 'rejected';
        } else if (answer?.status === 'approved') {
          status = 'approved';
        } else {
          // En teoría no debería pasar en un checklist "completed",
          // pero por seguridad lo marcamos como fuera de periodo.
          status = 'out_of_period';
        }

        const row = {
          number: q.question_number as number,
          section: q.section as string,
          text: q.question_text as string,
          status,
          observations: answer?.observations ?? null,
        };

        pdfQuestions.push(row);
        if (status === 'rejected') {
          rejectedQuestions.push(row);
        }
      });

      const totalRejected = rejectedQuestions.length;
      const observationSummary =
        totalRejected === 0
          ? 'Sin observaciones'
          : `Presenta ${totalRejected} observaciones.`;

      // 5) Firma (si existe) desde mnt_checklist_signatures (tomo la última)
      const { data: signatureRow } = await supabase
        .from('mnt_checklist_signatures')
        .select('checklist_id, signer_name, signature_data, signed_at')
        .eq('checklist_id', checklistData.id)
        .order('signed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const signatureDataUrl: string | null =
        (signatureRow && signatureRow.signature_data) || null;

      // 6) Estado de certificación
      let certStatus: CertificationStatus = 'sin_info';

      if (checklistData.certification_not_legible) {
        certStatus = 'no_legible';
      } else if (checklistData.next_certification_date) {
        const nextDate = new Date(checklistData.next_certification_date);
        const today = new Date();
        const diffDays =
          (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays < 0) certStatus = 'vencida';
        else if (diffDays <= 30) certStatus = 'por_vencer';
        else certStatus = 'vigente';
      }

      // 7) Armar datos para el PDF con el nuevo diseño
      const pdfData = {
        clientName: checklistData.client.company_name,
        clientCode: checklistData.client.id || checklistData.client.company_name,
        clientAddress: checklistData.client.address,
        elevatorCode: checklistData.elevator.serial_number,
        elevatorAlias: checklistData.elevator.location_name,
        month: checklistData.month,
        year: checklistData.year,
        technicianName: checklistData.profiles.full_name,
        certificationStatus: certStatus,
        observationSummary,
        questions: pdfQuestions,
        rejectedQuestions,
        signatureDataUrl,
      };

      const pdfBlob = await generateMaintenanceChecklistPDF(pdfData);

      // Nombre simple de archivo (puedes cambiarlo luego si quieres)
      const filename = `MANTENIMIENTO_${checklistData.client.company_name || 'CLIENTE'}_${
        checklistData.elevator.serial_number || 'ASCENSOR'
      }_${checklistData.year}_${String(checklistData.month).padStart(2, '0')}.pdf`;

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Error al generar el PDF del mantenimiento');
    } finally {
      setDownloadingPDF(false);
    }
  };

