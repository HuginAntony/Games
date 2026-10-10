import { NextResponse } from 'next/server';
import { loadQuestionDeck } from '@/lib/opentdb';
import { validateSettings } from '@/lib/game-engine';

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const settings = validateSettings({
      ...(params.has('amount') ? { rounds: Number(params.get('amount')) } : {}),
      ...(params.has('category') ? { category: params.get('category') } : {}),
      ...(params.has('difficulty') ? { difficulty: params.get('difficulty') } : {}),
    });
    const deck = await loadQuestionDeck(settings, process.env.QUIZ_QUESTION_SOURCE === 'curated');
    return NextResponse.json(deck.questions, { headers: { 'X-Quiz-Source': deck.source, 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Invalid question settings.' }, { status: 400 });
  }
}
