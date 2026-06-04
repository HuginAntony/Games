import { NextResponse } from 'next/server';
import { fetchQuestionsFromOtdb } from '@/lib/opentdb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = Math.min(50, Math.max(1, parseInt(searchParams.get('amount') || '10', 10)));
    const questions = await fetchQuestionsFromOtdb(amount);
    return NextResponse.json(questions);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Questions API error:', msg);
    const status = msg.includes('rate limit') || msg.includes('code 5') ? 429 : 503;
    return NextResponse.json({ error: msg }, { status });
  }
}
