-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('maintenance', 'emergency', 'service_request', 'quote', 'elevator_stopped', 'checklist_completed', 'pdf_generated')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  
  -- Referencias opcionales para contexto
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  elevator_id UUID REFERENCES elevators(id) ON DELETE CASCADE,
  checklist_id UUID REFERENCES mnt_checklists(id) ON DELETE CASCADE,
  service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Comentarios
COMMENT ON TABLE notifications IS 'Sistema de notificaciones para usuarios';
COMMENT ON COLUMN notifications.type IS 'Tipo de notificación: maintenance, emergency, service_request, quote, elevator_stopped, checklist_completed, pdf_generated';
COMMENT ON COLUMN notifications.is_read IS 'Indica si la notificación ha sido leída';
COMMENT ON COLUMN notifications.link IS 'URL opcional para navegar al contenido relacionado';

-- Políticas RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden marcar sus notificaciones como leídas
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Solo el sistema puede crear notificaciones (se hará via triggers o funciones)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
