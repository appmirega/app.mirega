import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET /api/clients - Listar todos los clientes
    if (req.method === 'GET') {
      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          *,
          profile:profiles(id, email, full_name, phone),
          elevators:elevators(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({ 
        success: true, 
        data: clients,
        count: clients?.length || 0 
      });
    }

    // POST /api/clients - Crear nuevo cliente
    if (req.method === 'POST') {
      const { 
        company_name, 
        building_name, 
        address, 
        contact_email, 
        contact_phone,
        rut,
        city,
        region,
        profile_id 
      } = req.body;

      // Validaciones
      if (!company_name || !building_name || !contact_email) {
        return res.status(400).json({
          success: false,
          error: 'Campos requeridos: company_name, building_name, contact_email'
        });
      }

      // Validar formato email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact_email)) {
        return res.status(400).json({
          success: false,
          error: 'Formato de email inválido'
        });
      }

      // Validar RUT chileno si se proporciona
      if (rut && !validateRUT(rut)) {
        return res.status(400).json({
          success: false,
          error: 'RUT inválido'
        });
      }

      const { data: client, error } = await supabase
        .from('clients')
        .insert({
          company_name,
          building_name,
          address,
          contact_email: contact_email.toLowerCase().trim(),
          contact_phone,
          rut,
          city,
          region,
          profile_id
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ 
        success: true, 
        data: client,
        message: 'Cliente creado exitosamente' 
      });
    }

    return res.status(405).json({ 
      success: false, 
      error: 'Método no permitido' 
    });

  } catch (error: any) {
    console.error('Error en /api/clients:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Error interno del servidor' 
    });
  }
}

// Función para validar RUT chileno
function validateRUT(rut: string): boolean {
  // Eliminar puntos y guión
  const cleanRUT = rut.replace(/\./g, '').replace(/-/g, '');
  
  if (cleanRUT.length < 2) return false;
  
  const body = cleanRUT.slice(0, -1);
  const dv = cleanRUT.slice(-1).toUpperCase();
  
  // Calcular dígito verificador
  let sum = 0;
  let multiplier = 2;
  
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body.charAt(i)) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const calculatedDV = 11 - (sum % 11);
  const expectedDV = calculatedDV === 11 ? '0' : calculatedDV === 10 ? 'K' : calculatedDV.toString();
  
  return dv === expectedDV;
}
