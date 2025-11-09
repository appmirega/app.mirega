import { supabase } from '../lib/supabase';
import { safeJson } from '../lib/safeJson';

export type CreateUserPayload = {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'technician' | 'client' | 'developer';
};

export async function createUserViaApi(payload: CreateUserPayload) {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');

  if (isLocal) {
    return await createUserLocally(payload);
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No hay sesión activa');

  const resp = await fetch('/api/users/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await safeJson(resp);

  if (!resp.ok || !result?.ok) {
    console.error('Create user failed:', result);
    throw new Error(result?.error || 'Error al crear usuario');
  }

  return result;
}

async function createUserLocally(payload: CreateUserPayload) {
  const { email, password, full_name, phone, role } = payload;

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        phone: phone || null,
        role,
      },
    },
  });

  if (signUpError) {
    throw new Error(signUpError.message);
  }

  if (!authData.user?.id) {
    throw new Error('No se obtuvo el ID del usuario');
  }

  const userId = authData.user.id;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
        full_name,
        phone: phone || null,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (profileError) {
    throw new Error(`Error al crear perfil: ${profileError.message}`);
  }

  return { ok: true, user_id: userId, profile };
}

export async function deleteUserViaApi(userId: string) {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');

  if (isLocal) {
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      throw new Error(`Error al eliminar perfil: ${profileError.message}`);
    }

    return { ok: true, message: 'Usuario eliminado correctamente' };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No hay sesión activa');

  const resp = await fetch('/api/users/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ user_id: userId }),
  });

  const result = await safeJson(resp);

  if (!resp.ok || !result?.ok) {
    console.error('Delete user failed:', result);
    throw new Error(result?.error || 'Error al eliminar usuario');
  }

  return result;
}

export async function updateUserProfile(userId: string, updates: Partial<{ full_name: string; phone: string; email: string }>) {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    throw new Error(`Error al actualizar perfil: ${error.message}`);
  }

  return { ok: true, message: 'Perfil actualizado correctamente' };
}
