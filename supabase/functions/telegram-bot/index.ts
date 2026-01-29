import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TELEGRAM_API = 'https://api.telegram.org/bot'

interface TelegramMessage {
  message_id: number
  from: {
    id: number
    first_name: string
    username?: string
  }
  chat: {
    id: number
    type: string
  }
  text?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

async function sendMessage(botToken: string, chatId: number, text: string, parseMode = 'HTML') {
  const response = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  })
  return response.json()
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ru-RU', { 
    style: 'currency', 
    currency: 'RUB',
    maximumFractionDigits: 0 
  }).format(amount)
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
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const update: TelegramUpdate = await req.json()
    const message = update.message

    if (!message?.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const chatId = message.chat.id
    const telegramId = message.from.id
    const text = message.text.trim()
    const [command, ...args] = text.split(' ')

    // Check if user is linked
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .eq('telegram_id', telegramId)
      .maybeSingle()

    // Handle /start command with link code
    if (command === '/start') {
      const linkCode = args[0]
      
      if (!linkCode) {
        if (profile) {
          await sendMessage(TELEGRAM_BOT_TOKEN, chatId, 
            `👋 Привет, <b>${profile.display_name || 'друг'}</b>!\n\n` +
            `Твой аккаунт уже привязан к CrystalBudget.\n\n` +
            `📋 <b>Доступные команды:</b>\n` +
            `/balance — текущий баланс\n` +
            `/add [сумма] [описание] — добавить доход\n` +
            `/categories — список категорий\n` +
            `/help — справка`
          )
        } else {
          await sendMessage(TELEGRAM_BOT_TOKEN, chatId,
            `👋 Добро пожаловать в <b>CrystalBudget</b>!\n\n` +
            `Чтобы начать, привяжи свой аккаунт:\n` +
            `1. Открой приложение CrystalBudget\n` +
            `2. Перейди в настройки профиля\n` +
            `3. Нажми "Привязать Telegram"\n` +
            `4. Скопируй код и отправь сюда:\n` +
            `/start ТВОЙ_КОД`
          )
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Link account with code
      const { data: linkProfile, error: linkError } = await supabase
        .from('profiles')
        .update({ 
          telegram_id: telegramId, 
          telegram_link_code: null,
          telegram_linked_at: new Date().toISOString()
        })
        .eq('telegram_link_code', linkCode)
        .select('display_name, email')
        .maybeSingle()

      if (linkError || !linkProfile) {
        await sendMessage(TELEGRAM_BOT_TOKEN, chatId,
          `❌ Код не найден или уже использован.\n\n` +
          `Получи новый код в настройках приложения.`
        )
      } else {
        await sendMessage(TELEGRAM_BOT_TOKEN, chatId,
          `✅ Аккаунт успешно привязан!\n\n` +
          `Добро пожаловать, <b>${linkProfile.display_name || linkProfile.email || 'друг'}</b>!\n\n` +
          `Теперь ты можешь управлять бюджетом прямо из Telegram.\n` +
          `Отправь /help для списка команд.`
        )
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // All other commands require linked account
    if (!profile) {
      await sendMessage(TELEGRAM_BOT_TOKEN, chatId,
        `⚠️ Аккаунт не привязан.\n\n` +
        `Отправь /start чтобы узнать как привязать.`
      )
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = profile.user_id

    // /balance - show current balance and distribution
    if (command === '/balance') {
      // Get total income
      const { data: incomes } = await supabase
        .from('incomes')
        .select('amount')
        .eq('user_id', userId)

      const totalIncome = incomes?.reduce((sum, i) => sum + Number(i.amount), 0) || 0

      // Get expense categories with allocations
      const { data: categories } = await supabase
        .from('expense_categories')
        .select('name, allocation_type, allocation_value, icon')
        .eq('user_id', userId)
        .order('name')

      let response = `💰 <b>Баланс CrystalBudget</b>\n\n`
      response += `📥 Общий доход: <b>${formatMoney(totalIncome)}</b>\n\n`

      if (categories && categories.length > 0) {
        response += `📊 <b>Распределение:</b>\n`
        let allocated = 0
        
        for (const cat of categories) {
          const amount = cat.allocation_type === 'percentage' 
            ? (totalIncome * cat.allocation_value / 100)
            : cat.allocation_value
          allocated += amount
          
          const icon = cat.icon || '📁'
          const allocation = cat.allocation_type === 'percentage' 
            ? `${cat.allocation_value}%` 
            : formatMoney(cat.allocation_value)
          
          response += `${icon} ${cat.name}: ${formatMoney(amount)} (${allocation})\n`
        }
        
        const remaining = totalIncome - allocated
        response += `\n💵 Остаток: <b>${formatMoney(remaining)}</b>`
      } else {
        response += `Категории ещё не созданы. Создай их в приложении или командой /newcat`
      }

      await sendMessage(TELEGRAM_BOT_TOKEN, chatId, response)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // /add [amount] [description] - add income
    if (command === '/add') {
      const amountStr = args[0]
      const description = args.slice(1).join(' ') || null

      if (!amountStr) {
        await sendMessage(TELEGRAM_BOT_TOKEN, chatId,
          `⚠️ Укажи сумму дохода.\n\n` +
          `Пример: /add 50000 Зарплата`
        )
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const amount = parseFloat(amountStr.replace(/[^\d.-]/g, ''))
      
      if (isNaN(amount) || amount <= 0) {
        await sendMessage(TELEGRAM_BOT_TOKEN, chatId,
          `❌ Неверная сумма. Укажи положительное число.\n\n` +
          `Пример: /add 50000 Зарплата`
        )
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error: insertError } = await supabase
        .from('incomes')
        .insert({
          user_id: userId,
          amount,
          description,
        })

      if (insertError) {
        await sendMessage(TELEGRAM_BOT_TOKEN, chatId, `❌ Ошибка при добавлении: ${insertError.message}`)
      } else {
        // Get new total
        const { data: incomes } = await supabase
          .from('incomes')
          .select('amount')
          .eq('user_id', userId)

        const newTotal = incomes?.reduce((sum, i) => sum + Number(i.amount), 0) || 0

        await sendMessage(TELEGRAM_BOT_TOKEN, chatId,
          `✅ <b>Доход добавлен!</b>\n\n` +
          `💵 Сумма: ${formatMoney(amount)}\n` +
          (description ? `📝 Описание: ${description}\n\n` : '\n') +
          `📊 Новый баланс: <b>${formatMoney(newTotal)}</b>`
        )
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // /categories - list expense categories
    if (command === '/categories') {
      const { data: categories } = await supabase
        .from('expense_categories')
        .select('name, allocation_type, allocation_value, icon, color')
        .eq('user_id', userId)
        .order('name')

      if (!categories || categories.length === 0) {
        await sendMessage(TELEGRAM_BOT_TOKEN, chatId,
          `📁 <b>Категории расходов</b>\n\n` +
          `У тебя пока нет категорий.\n` +
          `Создай их в приложении CrystalBudget.`
        )
      } else {
        let response = `📁 <b>Категории расходов</b>\n\n`
        
        for (const cat of categories) {
          const icon = cat.icon || '📁'
          const allocation = cat.allocation_type === 'percentage' 
            ? `${cat.allocation_value}%` 
            : formatMoney(cat.allocation_value)
          
          response += `${icon} <b>${cat.name}</b> — ${allocation}\n`
        }
        
        response += `\nВсего категорий: ${categories.length}`
        await sendMessage(TELEGRAM_BOT_TOKEN, chatId, response)
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // /help - show help
    if (command === '/help') {
      await sendMessage(TELEGRAM_BOT_TOKEN, chatId,
        `📖 <b>Справка CrystalBudget</b>\n\n` +
        `<b>Основные команды:</b>\n` +
        `/balance — текущий баланс и распределение\n` +
        `/add [сумма] [описание] — добавить доход\n` +
        `/categories — список категорий расходов\n\n` +
        `<b>Примеры:</b>\n` +
        `<code>/add 50000 Зарплата</code>\n` +
        `<code>/add 10000 Фриланс</code>\n\n` +
        `💡 Управляй категориями в веб-приложении для полного контроля.`
      )
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Unknown command
    await sendMessage(TELEGRAM_BOT_TOKEN, chatId,
      `🤔 Не понял команду.\n\nОтправь /help для списка доступных команд.`
    )

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    console.error('Telegram bot error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})