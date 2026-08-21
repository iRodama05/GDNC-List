import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Respuesta de seguridad inicial (Preflight) para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { gdName } = await req.json()
    
    // PASO 1: Buscar el perfil usando el nombre (con Date.now() para ignorar la caché)
    const profileRes = await fetch(`https://gdbrowser.com/api/profile/${gdName}?t=${Date.now()}`)
    if (!profileRes.ok) throw new Error("Jugador no encontrado en los servidores de GD.")
    
    const profileData = await profileRes.json()
    const accountID = profileData.accountID // Corregido a mayúsculas
    
    if (!accountID) throw new Error("No se pudo obtener el ID de la cuenta.")

    // PASO 2: Buscar los comentarios usando el accountID (también evadiendo la caché)
    const commentsRes = await fetch(`https://gdbrowser.com/api/comments/${accountID}?type=profile&t=${Date.now()}`)
    const commentsData = await commentsRes.json()

    // Devolvemos la info a tu página web
    return new Response(JSON.stringify(commentsData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})