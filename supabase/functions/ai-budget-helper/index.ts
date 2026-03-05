const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CategorySummary {
  id: string;
  name: string;
  plannedTotal: number;
  currentAllocated: number;
  preferredAllocationType: 'percentage' | 'fixed';
}

interface AiHelperRequestBody {
  remainingAmount: number;
  currency: string;
  categories: CategorySummary[];
  incomeCategoryId: string | null;
  incomeCategoryName: string | null;
  allocationTypePreference: 'percentage' | 'fixed' | 'any';
}

interface AiSuggestionItem {
  category_id: string;
  amount: number;
  allocation_type: 'percentage' | 'fixed';
  comment?: string;
}

interface AiHelperResponseBody {
  suggestions: AiSuggestionItem[];
  totalSuggested: number;
  note?: string;
}

async function callOpenAI(payload: AiHelperRequestBody): Promise<AiHelperResponseBody> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-5-mini';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const typeInstruction =
    payload.allocationTypePreference === 'percentage'
      ? 'Используй ТОЛЬКО allocation_type:"percentage" для всех предложений.'
      : payload.allocationTypePreference === 'fixed'
      ? 'Используй ТОЛЬКО allocation_type:"fixed" для всех предложений.'
      : 'Используй тот тип (percentage/fixed), который уже используется в категории (preferredAllocationType).';

  const sourceInstruction = payload.incomeCategoryName
    ? `Распределяй остаток из категории дохода "${payload.incomeCategoryName}".`
    : 'Распределяй остаток из любого источника дохода.';

  const systemPrompt =
    'Ты финансовый ассистент. Твоя задача — распределить ВЕСЬ нераспределённый остаток бюджета (remainingAmount) ' +
    'между категориями расходов. Не придумывай новые категории.';

  const userPrompt =
    `Остаток для распределения: ${payload.remainingAmount} ${payload.currency}.\n` +
    `${sourceInstruction}\n` +
    `${typeInstruction}\n\n` +
    `Категории расходов:\n${JSON.stringify(payload.categories)}\n\n` +
    'Верни JSON строго в таком формате (без пояснений вне JSON):\n' +
    '{"suggestions":[{"category_id":"...","amount":число,"allocation_type":"fixed"|"percentage","comment":"..."}],"totalSuggested":число,"note":"..."}\n' +
    'Сумма всех amount должна равняться remainingAmount. comment — одно предложение на русском.';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      max_completion_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI error:', errorText);
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('OpenAI raw response:', JSON.stringify(data));

  // Support both Chat Completions and Responses API formats
  let content: string | null = null;

  if (data.choices?.[0]?.message?.content) {
    content = data.choices[0].message.content;
  } else if (Array.isArray(data.output)) {
    // New Responses API format
    for (const block of data.output) {
      if (block.type === 'message' && Array.isArray(block.content)) {
        for (const part of block.content) {
          if (part.type === 'output_text' || part.type === 'text') {
            content = part.text;
            break;
          }
        }
      }
      if (content) break;
    }
  }

  if (!content) {
    console.error('Could not extract content from response:', JSON.stringify(data));
    throw new Error('Empty response from OpenAI');
  }

  let parsed: AiHelperResponseBody;
  try {
    parsed = JSON.parse(content) as AiHelperResponseBody;
  } catch (e) {
    console.error('Failed to parse OpenAI JSON:', e, content);
    throw new Error('Failed to parse OpenAI response');
  }

  return parsed;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json()) as AiHelperRequestBody;

    if (
      !body ||
      typeof body.remainingAmount !== 'number' ||
      !Array.isArray(body.categories) ||
      !body.currency
    ) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.remainingAmount <= 0 || body.categories.length === 0) {
      const empty: AiHelperResponseBody = {
        suggestions: [],
        totalSuggested: 0,
        note: 'Нет нераспределённого остатка или нет категорий для распределения.',
      };
      return new Response(JSON.stringify(empty), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResult = await callOpenAI(body);

    return new Response(JSON.stringify(aiResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI helper error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
