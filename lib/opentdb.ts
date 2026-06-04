/**
 * lib/opentdb.ts
 * Core question fetching from the Open Trivia DB — no relative URLs,
 * safe to import from both the Next.js API route and the PartyKit server.
 */
import { Question } from '../types/game';

interface OtdbQuestion {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface OtdbResponse {
  response_code: number;
  results: OtdbQuestion[];
}

/** Decode HTML entities returned by Open Trivia DB (no library needed). */
export function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lrm;/g, '')
    .replace(/&rlm;/g, '')
    .replace(/&hellip;/g, '…')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019');
}

/** Shuffle an array in-place using Fisher-Yates and return it. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Fetch `amount` random multiple-choice questions from the Open Trivia DB.
 * Includes retry logic for rate-limit (response_code 5) and transient errors.
 * Retries up to 3 times with exponential back-off.
 */
export async function fetchQuestionsFromOtdb(amount = 10): Promise<Question[]> {
  const url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      // Exponential back-off: 1s, 2s
      await new Promise<void>((r) => setTimeout(r, 1000 * attempt));
    }

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

      if (!res.ok) {
        lastError = new Error(`OpenTDB HTTP ${res.status}`);
        if (res.status === 429 || res.status >= 500) continue;
        break;
      }

      const data: OtdbResponse = await res.json();

      if (data.response_code === 5) {
        // Rate limit — retry
        lastError = new Error('OpenTDB rate limited (code 5)');
        continue;
      }

      if (data.response_code !== 0 || !data.results?.length) {
        throw new Error(`OpenTDB response_code ${data.response_code}`);
      }

      return data.results.map((q): Question => {
        const answers = shuffle([
          decodeEntities(q.correct_answer),
          ...q.incorrect_answers.map(decodeEntities),
        ]);
        const correctIndex = answers.indexOf(decodeEntities(q.correct_answer));
        return {
          category: decodeEntities(q.category),
          question: decodeEntities(q.question),
          answers,
          correctIndex,
        };
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('Failed to fetch questions from OpenTDB');
}
