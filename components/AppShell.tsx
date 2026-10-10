'use client';
import Link from 'next/link';
import { createContext, useContext, useEffect, useState } from 'react';
type Theme = 'midnight' | 'prism' | 'neon';
const Preferences = createContext({ reducedMotion: false });
export const usePreferences = () => useContext(Preferences);
export function AppShell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('midnight');
  const [muted, setMuted] = useState(true);
  const [motion, setMotion] = useState(false);
  const [systemMotion, setSystemMotion] = useState(false);
  const [offline, setOffline] = useState(false);
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wisquiz:theme');
      if (saved === 'midnight' || saved === 'prism' || saved === 'neon') setTheme(saved);
      setMuted(localStorage.getItem('quizblitz-muted') !== 'false');
      setMotion(localStorage.getItem('wisquiz:motion') === 'reduced');
    } catch { /* Preferences are optional. */ }
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setSystemMotion(media.matches);
    updateMotion(); media.addEventListener('change', updateMotion);
    const updateConnection = () => setOffline(!navigator.onLine);
    updateConnection();
    window.addEventListener('online', updateConnection); window.addEventListener('offline', updateConnection);
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => { media.removeEventListener('change', updateMotion); window.removeEventListener('online', updateConnection); window.removeEventListener('offline', updateConnection); };
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { document.documentElement.dataset.motion = motion || systemMotion ? 'reduced' : 'full'; }, [motion, systemMotion]);
  function save(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Keep session preference. */ } }
  return <Preferences.Provider value={{ reducedMotion: motion || systemMotion }}><div className="app-frame">
    <header className="app-header"><Link href="/" className="brand" aria-label="WisQuiz home"><span>Wis<span className="brand-accent">Quiz</span><i aria-hidden="true">ϟ</i></span><small>WISDOM EVOLUTION</small></Link><div className="header-actions"><button className="button quiet small" aria-pressed={!muted} onClick={() => { setMuted(!muted); save('quizblitz-muted', String(!muted)); }}>{muted ? 'Sound off' : 'Sound on'}</button><button className="button quiet small" aria-expanded={settings} aria-controls="preferences" onClick={() => setSettings(!settings)}>Appearance</button></div></header>
    {settings && <section className="preferences panel" id="preferences" aria-label="Appearance preferences"><label>Table theme<select value={theme} onChange={e => { const next = e.target.value as Theme; setTheme(next); save('wisquiz:theme', next); }}><option value="midnight">Midnight Social</option><option value="prism">Prism Lounge</option><option value="neon">Neon Studio</option></select></label><label className="check"><input type="checkbox" checked={motion || systemMotion} disabled={systemMotion} onChange={e => { setMotion(e.target.checked); save('wisquiz:motion', e.target.checked ? 'reduced' : 'full'); }} /> Reduce motion {systemMotion && '(device preference)'}</label><button className="button quiet small" onClick={() => setSettings(false)}>Close appearance</button></section>}
    {offline && <p className="notice" role="status">You're offline. <a href="/game/solo?offline=1">Play the starter pack</a> on this device.</p>}
    {children}<footer className="app-footer"><span>Good company. Great questions.</span><span>Simultaneous multiplayer · Your device, your answer</span></footer>
  </div></Preferences.Provider>;
}
