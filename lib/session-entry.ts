import { DEFAULT_SETTINGS, GameSettings } from '@/types/game';
import { validateSettings } from '@/lib/game-engine';

export interface SessionEntry {
  nickname: string;
  avatar: string;
  create: boolean;
  settings: GameSettings;
  untimed: boolean;
}
const key = (room: string) => `wisquiz:entry:${room}`;
export function saveSessionEntry(room: string, entry: SessionEntry) {
  try { sessionStorage.setItem(key(room), JSON.stringify(entry)); }
  catch { throw new Error('Allow session storage in this browser to continue from the lounge.'); }
}
export function loadSessionEntry(room: string): SessionEntry | null {
  try {
    const entry = JSON.parse(sessionStorage.getItem(key(room)) || 'null');
    if (!entry || typeof entry.nickname !== 'string' || !entry.nickname.trim() || typeof entry.avatar !== 'string') return null;
    return { nickname: entry.nickname.trim().slice(0, 20), avatar: entry.avatar.slice(0, 16), create: entry.create === true, settings: validateSettings(entry.settings || DEFAULT_SETTINGS), untimed: entry.untimed === true };
  } catch { return null; }
}
