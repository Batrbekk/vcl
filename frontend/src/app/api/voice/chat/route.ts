import { NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(request: Request) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
    }

    const { message, history, systemPrompt } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Build messages array with emotion tags instruction
    const emotionInstruction = `

ИНТОНАЦИИ И ЭМОЦИИ:
Ты озвучиваешься через Fish Audio TTS. Используй теги для естественной речи:
- [short pause] или [pause] — для пауз между мыслями
- [excited] — когда рассказываешь о хорошем предложении
- [delight] — когда клиент заинтересован
- [sigh] — если клиент не заинтересован
- [inhale] — перед важной мыслью
- [clearing throat] — в начале фразы для естественности
- [low voice] — для доверительного тона
- [emphasis] — для акцента на ключевых словах

Пример: "Здравствуйте! [short pause] Меня зовут Алия [pause] из компании Nurbol Invest. [inhale] Мы предлагаем [excited] отличные инвестиционные возможности!"

ВАЖНО: используй теги умеренно (1-3 на ответ), не перебарщивай. Ответ должен звучать естественно.

ЗАВЕРШЕНИЕ РАЗГОВОРА:
Если клиент прощается (говорит "до свидания", "пока", "всего хорошего", "спасибо, не надо" и т.п.) — ответь коротким прощанием и добавь в конце тег [END_CALL]. Например: "Спасибо за ваше время! Хорошего дня! [END_CALL]"
Тег [END_CALL] обязателен при завершении — по нему система автоматически завершит звонок.`;

    const messages: any[] = [
      {
        role: "system",
        content: (systemPrompt || "Ты AI-ассистент. Говори на русском. Отвечай кратко.") + emotionInstruction,
      },
    ];

    // Add history
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.text,
        });
      }
    }

    // Add current message
    messages.push({ role: "user", content: message });

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error: `Groq error: ${error}` }, { status: res.status });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    );
  }
}
