import { NextResponse } from 'next/server';

const FISH_API_KEY = process.env.FISH_AUDIO_API_KEY;

export async function GET(request: Request) {
  try {
    if (!FISH_API_KEY) {
      return NextResponse.json({ error: 'Fish Audio API key not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'ru';
    const search = searchParams.get('search') || '';
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '20';
    const sortBy = searchParams.get('sort_by') || 'task_count';

    const params = new URLSearchParams({
      language,
      page_number: page,
      page_size: pageSize,
      sort_by: sortBy,
      ...(search ? { title: search } : {}),
    });

    const res = await fetch(`https://api.fish.audio/model?${params}`, {
      headers: { 'Authorization': `Bearer ${FISH_API_KEY}` },
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error }, { status: res.status });
    }

    const data = await res.json();

    const tagTranslations: Record<string, string> = {
      male: "Мужской",
      female: "Женский",
      young: "Молодой",
      "middle-aged": "Средний возраст",
      old: "Пожилой",
      narration: "Нарратив",
      deep: "Глубокий",
      calm: "Спокойный",
      energetic: "Энергичный",
      serious: "Серьёзный",
      cheerful: "Весёлый",
      professional: "Профессиональный",
      Russian: "Русский",
      authoritative: "Авторитетный",
    };

    const voices = (data.items || []).map((v: any) => ({
      id: v._id,
      name: v.title,
      description: v.description || '',
      author: v.author?.nickname || '',
      languages: v.languages || [],
      tags: (v.tags || []).map((t: string) => tagTranslations[t] || t).slice(0, 4),
      likes: v.like_count || 0,
      uses: v.task_count || 0,
      hasCover: !!v.cover_image,
    }));

    return NextResponse.json({
      voices,
      total: data.total || voices.length,
    });
  } catch (error) {
    console.error('Voices list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch voices' },
      { status: 500 }
    );
  }
}
