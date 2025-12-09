-- Agregar referencia al checklist y respuesta en service_requests
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS checklist_id UUID REFERENCES mnt_checklists(id),
ADD COLUMN IF NOT EXISTS checklist_answer_id UUID;

-- Comentarios
COMMENT ON COLUMN service_requests.checklist_id IS 'Referencia al checklist de mantenimiento que generó esta solicitud';
COMMENT ON COLUMN service_requests.checklist_answer_id IS 'ID de la pregunta/respuesta específica del checklist';
