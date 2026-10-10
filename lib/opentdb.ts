import { GameSettings, Question, DEFAULT_SETTINGS, QuestionSource } from '../types/game';
import { getCuratedQuestions, shuffle } from './questions';

const categoryIds = { science: 17, history: 23, geography: 22, entertainment: 11, sports: 21 };
export function decodeEntities(value: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', lrm: '', rlm: '', hellip: '…', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', eacute: 'é', ouml: 'ö', auml: 'ä', uuml: 'ü', ndash: '–', mdash: '—' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
    if (!entity.startsWith('#')) return named[entity.toLowerCase()] ?? whole;
    const point = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : whole;
  });
}
export async function fetchQuestionsFromOtdb(amount = 10, settings: GameSettings = DEFAULT_SETTINGS): Promise<Question[]> {
  if (!Number.isInteger(amount) || amount < 1 || amount > 20) throw new Error('Choose between 1 and 20 questions.');
  const url = new URL('https://opentdb.com/api.php');
  url.searchParams.set('amount', String(amount));
  url.searchParams.set('type', 'multiple');
  if (settings.category !== 'mixed') url.searchParams.set('category', String(categoryIds[settings.category]));
  if (settings.difficulty !== 'mixed') url.searchParams.set('difficulty', settings.difficulty);
  const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error('Trivia provider unavailable.');
  const data = await response.json() as { response_code: number; results: unknown[] };
  if (data.response_code !== 0 || !Array.isArray(data.results) || data.results.length !== amount) throw new Error('Trivia provider did not return a complete deck.');
  return data.results.map(value => {
    const q = value as Record<string, unknown>;
    if (typeof q.question !== 'string' || typeof q.category !== 'string' || typeof q.correct_answer !== 'string' || !Array.isArray(q.incorrect_answers) || q.incorrect_answers.length !== 3 || !q.incorrect_answers.every(a => typeof a === 'string')) throw new Error('Invalid trivia question.');
    const correct = decodeEntities(q.correct_answer);
    const answers = shuffle([correct, ...q.incorrect_answers.map(a => decodeEntities(a as string))]);
    if (new Set(answers).size !== 4) throw new Error('Ambiguous trivia answers.');
    return { category: decodeEntities(q.category), question: decodeEntities(q.question), correctIndex: answers.indexOf(correct), answers, difficulty: q.difficulty as Question['difficulty'] };
  });
}
export async function loadQuestionDeck(settings: GameSettings, forceCurated = false): Promise<{ questions: Question[]; source: QuestionSource }> {
  if (!forceCurated) {
    try { return { questions: await fetchQuestionsFromOtdb(settings.rounds, settings), source: 'opentdb' }; } catch { /* Bounded outage fallback to the bundled deck. */ }
  }
  return { questions: getCuratedQuestions(settings), source: 'curated' };
}
