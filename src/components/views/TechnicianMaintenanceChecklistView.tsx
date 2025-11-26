const handleDownloadPDF = async (record: MaintenanceHistory) => {
  try {
    setDownloadingPDF(true);

    // 1) Datos principales del checklist
    const { data: checklistData, error: checklistError } = await supabase
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

    if (checklistError) {
      console.error('Error cargando checklist para PDF:', checklistError);
      throw checklistError;
    }
    if (!checklistData) {
      throw new Error('No se encontró información del checklist');
    }

    const currentMonth = checklistData.month as number;

    // 2) Preguntas del checklist
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

    if (questionsError) {
      console.error('Error cargando preguntas para PDF:', questionsError);
      throw questionsError;
    }

    // 3) Respuestas de este checklist
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

    if (ansError) {
      console.error('Error cargando respuestas para PDF:', ansError);
      throw ansError;
    }

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

    const pdfQuestions: {
      number: number;
      section: string;
      text: string;
      status: 'approved' | 'rejected' | 'not_applicable' | 'out_of_period';
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

      let status: 'approved' | 'rejected' | 'not_applicable' | 'out_of_period';

      if (isHydraulicOnly && !checklistData.elevator?.is_hydraulic) {
        // ⚠️ Por si acaso, si no existe is_hydraulic en este select, lo tratamos como no hidráulico
        status = 'not_applicable';
      } else if (!inPeriod) {
        status = 'out_of_period';
      } else if (answer?.status === 'rejected') {
        status = 'rejected';
      } else if (answer?.status === 'approved') {
        status = 'approved';
      } else {
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

    // 4) Firma (última firma registrada para este checklist, si existe)
    const { data: signatureRow, error: sigError } = await supabase
      .from('mnt_checklist_signatures')
      .select('checklist_id, signer_name, signature_data, signed_at')
      .eq('checklist_id', checklistData.id)
      .order('signed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sigError) {
      console.error('Error cargando firma para PDF:', sigError);
      // no lanzamos error, el PDF igual puede generarse sin firma
    }

    const signature =
      signatureRow && signatureRow.signature_data
        ? {
            signerName: signatureRow.signer_name ?? '',
            signatureDataUrl: signatureRow.signature_data ?? '',
            signedAt: signatureRow.signed_at ?? '',
          }
        : null;

    // 5) Estado de certificación
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

    // 6) Construir los datos para el PDF (adaptador nuevo)
    const pdfBlob = await generateMaintenanceChecklistPDF({
      checklistId: checklistData.id,
      clientName: checklistData.client.company_name,
      clientCode: checklistData.client.id,
      clientAddress: checklistData.client.address ?? '',
      elevatorAlias: checklistData.elevator?.location_name ?? '',
      month: checklistData.month,
      year: checklistData.year,
      completionDate: checklistData.completion_date ?? '',
      lastCertificationDate: checklistData.last_certification_date ?? null,
      nextCertificationDate: checklistData.next_certification_date ?? null,
      certificationNotLegible: checklistData.certification_not_legible ?? false,
      technicianName: checklistData.profiles.full_name,
      technicianEmail: checklistData.profiles.email ?? '',
      certificationStatus: certStatus,
      observationSummary,
      questions: pdfQuestions,
      rejectedQuestions,
      signatureDataUrl: signature?.signatureDataUrl,
      signature: signature,
    });

    const filename =
