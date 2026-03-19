const VAPI_API_KEY = process.env.VAPI_API_KEY!;
const VAPI_BASE_URL = 'https://api.vapi.ai';

interface VapiAssistantConfig {
  name: string;
  model: {
    provider: 'openai';
    model: string;
    systemMessage: string;
    temperature?: number;
  };
  voice: {
    provider: 'elevenlabs' | '11labs' | 'cartesia' | 'deepgram';
    voiceId: string;
  };
  firstMessage: string;
  endCallMessage?: string;
  transcriber?: {
    provider: 'deepgram';
    model: string;
    language: string;
  };
  silenceTimeoutSeconds?: number;
  maxDurationSeconds?: number;
  backgroundSound?: 'office' | 'off';
  recordingEnabled?: boolean;
}

interface VapiCallConfig {
  assistantId?: string;
  assistant?: VapiAssistantConfig;
  phoneNumberId?: string;
  customer: {
    number: string;
    name?: string;
  };
  metadata?: Record<string, string>;
}

interface VapiCallResponse {
  id: string;
  status: string;
  assistantId: string;
  phoneNumberId: string;
  customer: { number: string };
  createdAt: string;
  updatedAt: string;
}

async function vapiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${VAPI_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`VAPI API error (${res.status}): ${error}`);
  }

  return res.json();
}

/** Create or update a VAPI assistant */
export async function createAssistant(config: VapiAssistantConfig) {
  return vapiRequest<{ id: string }>('/assistant', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

/** Initiate an outbound call via VAPI */
export async function makeOutboundCall(config: VapiCallConfig): Promise<VapiCallResponse> {
  return vapiRequest<VapiCallResponse>('/call/phone', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

/** Get call details */
export async function getCall(callId: string) {
  return vapiRequest<VapiCallResponse>(`/call/${callId}`);
}

/** List calls */
export async function listCalls(limit = 50) {
  return vapiRequest<VapiCallResponse[]>(`/call?limit=${limit}`);
}

/** Stop an active call */
export async function endCall(callId: string) {
  return vapiRequest(`/call/${callId}/stop`, { method: 'POST' });
}

/** Create a default VOXI sales assistant for an organization */
export function buildAssistantConfig(orgName: string, prompt: string, greeting: string): VapiAssistantConfig {
  return {
    name: `VOXI — ${orgName}`,
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      systemMessage: prompt,
      temperature: 0.7,
    },
    voice: {
      provider: 'cartesia',
      voiceId: 'b7d50908-b17c-442d-ad8d-7c56e74dd5a3', // Russian female voice
    },
    firstMessage: greeting,
    endCallMessage: 'Спасибо за ваше время! До свидания.',
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'ru',
    },
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 300,
    backgroundSound: 'office',
    recordingEnabled: true,
  };
}

/** Default prompt template for investment sales */
export const DEFAULT_INVESTMENT_PROMPT = `Ты — AI-ассистент компании Nurbol Invest. Твоя задача — квалифицировать потенциальных клиентов по инвестиционным продуктам.

ПРАВИЛА:
1. Говори на русском языке, вежливо и профессионально
2. Представься: "Здравствуйте, меня зовут Алия, я из компании Nurbol Invest"
3. Уточни интерес клиента: какой тип инвестиций интересует
4. Узнай бюджет (диапазон)
5. Узнай сроки (когда планирует начать)
6. Предложи назначить встречу с инвестиционным консультантом
7. Если клиент не заинтересован — вежливо попрощайся

КВАЛИФИКАЦИЯ:
- Бюджет > 5 млн тенге = горячий лид
- Бюджет 1-5 млн тенге = тёплый лид
- Бюджет < 1 млн тенге = холодный лид

НЕ ДЕЛАЙ:
- Не давай конкретных финансовых советов
- Не называй точные процентные ставки
- Не критикуй конкурентов`;

export const DEFAULT_GREETING = 'Здравствуйте! Меня зовут Алия, я из компании Nurbol Invest. Вам удобно сейчас поговорить?';
