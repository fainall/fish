// ─────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: delete-account
// Borra la cuenta del usuario autenticado y TODOS sus datos.
//
// El cliente no puede borrar de auth.users → se usa el service_role (que
// Supabase inyecta automáticamente en el runtime de Edge Functions). Se
// verifica el JWT del llamante para borrar SOLO su propia cuenta.
//
// El borrado de auth.users cascadea (ON DELETE CASCADE) a public.users y a
// todas las tablas ligadas al usuario (acuarios, peces, fotos, posts, etc.).
//
// Requisito legal (Google Play / App Store): eliminación de cuenta en la app.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: 'Función no configurada.' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return json({ error: 'No autenticado.' }, 401);

  try {
    // 1. Verificar el JWT y obtener el usuario que llama
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ error: 'Sesión inválida.' }, 401);
    }
    const userId = userData.user.id;

    // 2. Borrar con el admin client (service_role). Cascada elimina sus datos.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error('[delete-account] deleteUser error:', delErr.message);
      return json({ error: 'No se pudo eliminar la cuenta.' }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error('[delete-account] failed:', e);
    return json({ error: 'Error al eliminar la cuenta.' }, 500);
  }
});
