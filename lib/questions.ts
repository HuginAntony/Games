import { Question } from '@/types/game';

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
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
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
 * Fetch 10 random general-knowledge questions from the local API.
 * Includes retry logic for handling rate limits and transient errors.
 */
export async function fetchQuestions(amount = 10): Promise<Question[]> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`/api/questions?amount=${amount}`);
      
      if (!res.ok) {
        console.warn(`API returned ${res.status}, attempt ${attempt + 1}/3`);
        if (attempt < 2 && res.status >= 500) {
          // Server error, wait and retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error(`API error: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Handle error responses from API
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No questions available');
      }
      
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`Question fetch attempt ${attempt + 1} failed:`, lastError.message);
      
      // Wait before retrying
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch questions after 3 attempts');
}
