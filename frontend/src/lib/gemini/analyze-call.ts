const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

interface CallAnalysis {
  summary: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  qualificationScore: number;
  clientName: string | null;
  budget: string | null;
  interest: string | null;
  timeline: string | null;
  nextStep: string | null;
}

export async function analyzeCallTranscript(
  transcript: { role: string; content: string }[]
): Promise<CallAnalysis> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set");
  }

  const conversationText = transcript
    .map((t) => `${t.role === "assistant" ? "AI" : "Клиент"}: ${t.content}`)
    .join("\n");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Ты аналитик звонков. Анализируй транскрипты и возвращай JSON. Всегда отвечай на русском.",
        },
        {
          role: "user",
          content: `Проанализируй транскрипт звонка AI-ассистента с клиентом инвестиционной компании.

ТРАНСКРИПТ:
${conversationText}

Верни ТОЛЬКО JSON без markdown (без \`\`\`):
{"summary":"Краткое резюме 2-3 предложения","sentiment":"POSITIVE или NEUTRAL или NEGATIVE","qualificationScore":число 0-100,"clientName":"имя или null","budget":"бюджет или null","interest":"тип инвестиций или null","timeline":"сроки или null","nextStep":"следующий шаг или null"}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Groq API error (${res.status}): ${error}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse response");
  }

  const analysis: CallAnalysis = JSON.parse(jsonMatch[0]);

  analysis.qualificationScore = Math.max(0, Math.min(100, Math.round(analysis.qualificationScore || 0)));

  if (!["POSITIVE", "NEUTRAL", "NEGATIVE"].includes(analysis.sentiment)) {
    analysis.sentiment = "NEUTRAL";
  }

  return analysis;
}
