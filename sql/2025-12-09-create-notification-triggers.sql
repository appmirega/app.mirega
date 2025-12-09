-- Función para crear notificación cuando se completa un checklist
CREATE OR REPLACE FUNCTION notify_checklist_completed()
RETURNS TRIGGER AS $$
DECLARE
  client_data RECORD;
  elevator_data RECORD;
  admin_ids UUID[];
BEGIN
  -- Solo si el estado cambia a 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Obtener datos del cliente y ascensor
    SELECT c.id, c.company_name, c.building_name 
    INTO client_data
    FROM clients c
    WHERE c.id = NEW.client_id;
    
    SELECT e.elevator_number, e.location_name
    INTO elevator_data
    FROM elevators e
    WHERE e.id = NEW.elevator_id;
    
    -- Obtener IDs de todos los administradores
    SELECT array_agg(id) INTO admin_ids
    FROM profiles
    WHERE role = 'admin';
    
    -- Notificar a todos los administradores
    IF admin_ids IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, checklist_id, client_id, elevator_id)
      SELECT 
        unnest(admin_ids),
        'checklist_completed',
        'Checklist de Mantenimiento Completado',
        format('Checklist completado para %s - Ascensor #%s en %s',
          COALESCE(client_data.company_name, client_data.building_name),
          elevator_data.elevator_number,
          elevator_data.location_name
        ),
        NEW.id,
        client_data.id,
        elevator_data.id;
    END IF;
    
    -- Notificar al cliente (obtener usuario del cliente)
    INSERT INTO notifications (user_id, type, title, message, checklist_id, client_id, elevator_id)
    SELECT 
      p.id,
      'maintenance',
      'Mantenimiento Realizado',
      format('Se completó el mantenimiento del Ascensor #%s en %s',
        elevator_data.elevator_number,
        elevator_data.location_name
      ),
      NEW.id,
      client_data.id,
      elevator_data.id
    FROM profiles p
    WHERE p.client_id = client_data.id AND p.role = 'client';
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para checklist completado
DROP TRIGGER IF NOT EXISTS trigger_notify_checklist_completed ON mnt_checklists;
CREATE TRIGGER trigger_notify_checklist_completed
  AFTER UPDATE ON mnt_checklists
  FOR EACH ROW
  EXECUTE FUNCTION notify_checklist_completed();


-- Función para crear notificación cuando se genera un PDF
CREATE OR REPLACE FUNCTION notify_pdf_generated()
RETURNS TRIGGER AS $$
DECLARE
  client_data RECORD;
  elevator_data RECORD;
BEGIN
  -- Solo si se agrega una URL de PDF
  IF NEW.pdf_url IS NOT NULL AND (OLD.pdf_url IS NULL OR OLD.pdf_url != NEW.pdf_url) THEN
    
    -- Obtener datos del cliente y ascensor
    SELECT c.id, c.company_name, c.building_name 
    INTO client_data
    FROM clients c
    WHERE c.id = NEW.client_id;
    
    SELECT e.elevator_number, e.location_name
    INTO elevator_data
    FROM elevators e
    WHERE e.id = NEW.elevator_id;
    
    -- Notificar al cliente
    INSERT INTO notifications (user_id, type, title, message, link, checklist_id, client_id, elevator_id)
    SELECT 
      p.id,
      'pdf_generated',
      'Reporte PDF Disponible',
      format('El reporte PDF del mantenimiento del Ascensor #%s está disponible',
        elevator_data.elevator_number
      ),
      NEW.pdf_url,
      NEW.id,
      client_data.id,
      elevator_data.id
    FROM profiles p
    WHERE p.client_id = client_data.id AND p.role = 'client';
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para PDF generado
DROP TRIGGER IF NOT EXISTS trigger_notify_pdf_generated ON mnt_checklists;
CREATE TRIGGER trigger_notify_pdf_generated
  AFTER UPDATE ON mnt_checklists
  FOR EACH ROW
  EXECUTE FUNCTION notify_pdf_generated();


-- Función para crear notificación cuando se crea una solicitud de servicio
CREATE OR REPLACE FUNCTION notify_service_request_created()
RETURNS TRIGGER AS $$
DECLARE
  client_data RECORD;
  elevator_data RECORD;
  admin_ids UUID[];
  priority_text TEXT;
BEGIN
  -- Obtener datos del cliente y ascensor
  SELECT c.id, c.company_name, c.building_name 
  INTO client_data
  FROM clients c
  WHERE c.id = NEW.client_id;
  
  SELECT e.elevator_number, e.location_name
  INTO elevator_data
  FROM elevators e
  WHERE e.id = NEW.elevator_id;
  
  -- Mapear prioridad
  priority_text := CASE NEW.priority
    WHEN 'critical' THEN '🔴 CRÍTICA'
    WHEN 'high' THEN '🟠 ALTA'
    WHEN 'medium' THEN '🟡 MEDIA'
    ELSE '🟢 BAJA'
  END;
  
  -- Obtener IDs de todos los administradores
  SELECT array_agg(id) INTO admin_ids
  FROM profiles
  WHERE role = 'admin';
  
  -- Notificar a todos los administradores
  IF admin_ids IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, service_request_id, client_id, elevator_id)
    SELECT 
      unnest(admin_ids),
      'service_request',
      format('Nueva Solicitud %s', priority_text),
      format('%s - Ascensor #%s: %s',
        COALESCE(client_data.company_name, client_data.building_name),
        elevator_data.elevator_number,
        NEW.title
      ),
      NEW.id,
      client_data.id,
      elevator_data.id;
  END IF;
  
  -- Notificar al cliente
  INSERT INTO notifications (user_id, type, title, message, service_request_id, client_id, elevator_id)
  SELECT 
    p.id,
    'service_request',
    'Nueva Solicitud de Servicio',
    format('Se ha creado una solicitud para el Ascensor #%s: %s',
      elevator_data.elevator_number,
      NEW.title
    ),
    NEW.id,
    client_data.id,
    elevator_data.id
  FROM profiles p
  WHERE p.client_id = client_data.id AND p.role = 'client';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para solicitud de servicio creada
DROP TRIGGER IF NOT EXISTS trigger_notify_service_request_created ON service_requests;
CREATE TRIGGER trigger_notify_service_request_created
  AFTER INSERT ON service_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_service_request_created();
