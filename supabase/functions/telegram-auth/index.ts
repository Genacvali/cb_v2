import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

async function verifyTelegramAuth(user: TelegramUser, botToken: string): Promise<boolean> {
  const { hash, ...userData } = user
  
  // Create data check string
  const dataCheckArr = Object.entries(userData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
  const dataCheckString = dataCheckArr.join('\n')
  
  // Create secret key from bot token
  const encoder = new TextEncoder()
  const secretKeyData = await crypto.subtle.digest('SHA-256', encoder.encode(botToken))
  
  // Calculate HMAC-SHA-256
  const key = await crypto.subtle.importKey(
    'raw',
    secretKeyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(dataCheckString))
  const calculatedHash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  // Verify hash matches
  if (calculatedHash !== hash) {
    return false
  }
  
  // Check auth_date is not too old (allow 1 day)
  const authDate = user.auth_date
  const now = Math.floor(Date.now() / 1000)
  if (now - authDate > 86400) {
    return false
  }
  
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured')
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const telegramUser: TelegramUser = await req.json()

    // Verify Telegram authentication
    const isValid = await verifyTelegramAuth(telegramUser, TELEGRAM_BOT_TOKEN)
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid Telegram authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user exists with this telegram_id
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id, email')
      .eq('telegram_id', telegramUser.id)
      .maybeSingle()

    let userId: string

    if (existingProfile) {
      // User exists, use their account
      userId = existingProfile.user_id
    } else {
      // Create new user with Telegram ID
      const email = `telegram_${telegramUser.id}@telegram.local`
      const password = crypto.randomUUID() // Random password, user won't use it
      
      const { data: authUser, error: signUpError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramUser.id,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          username: telegramUser.username,
          avatar_url: telegramUser.photo_url,
        },
      })

      if (signUpError) {
        // Check if user already exists with this email
        const { data: existingAuth } = await supabase.auth.admin.listUsers()
        const existing = existingAuth?.users.find(u => u.email === email)
        
        if (existing) {
          userId = existing.id
        } else {
          throw signUpError
        }
      } else {
        userId = authUser.user.id
      }

      // Update profile with telegram info
      await supabase
        .from('profiles')
        .update({
          telegram_id: telegramUser.id,
          telegram_linked_at: new Date().toISOString(),
          display_name: telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : ''),
        })
        .eq('user_id', userId)
    }

    // Generate session tokens for the user
    const { data: session, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: existingProfile?.email || `telegram_${telegramUser.id}@telegram.local`,
    })

    if (sessionError) {
      throw sessionError
    }

    // Sign in the user to get tokens
    const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: existingProfile?.email || `telegram_${telegramUser.id}@telegram.local`,
    })

    // We need to actually create a session - use signInWithPassword equivalent
    // Since we can't do that directly, we'll use a workaround with custom token
    
    // Generate a custom access token for the user
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError) throw userError

    // Create session using admin API
    const { data: sessionData, error: createSessionError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: userData.user.email!,
    })

    if (createSessionError) {
      throw createSessionError
    }

    // Parse the token from the link
    const tokenUrl = new URL(sessionData.properties.action_link)
    const token = tokenUrl.searchParams.get('token')

    if (!token) {
      throw new Error('Failed to generate session token')
    }

    // Exchange the recovery token for a session
    const { data: exchangeData, error: exchangeError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    })

    if (exchangeError) {
      throw exchangeError
    }

    return new Response(JSON.stringify({
      access_token: exchangeData.session?.access_token,
      refresh_token: exchangeData.session?.refresh_token,
      user: exchangeData.user,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    console.error('Telegram auth error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})