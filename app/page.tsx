'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateCode } from '@/lib/room-factory';
import { DEFAULT_SETTINGS, GameSettings } from '@/types/game';
import { AvatarPicker, SettingsForm } from '@/components/PartyUi';

export default function HomePage() {
  const router = useRouter();
  const form = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'host' | 'join' | 'solo' | null>(null);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('⚡');
  const [code, setCode] = useState('');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [error, setError] = useState('');
  const [untimed, setUntimed] = useState(false);
  useEffect(() => { try { setNickname(localStorage.getItem('wisquiz:name') || ''); setAvatar(localStorage.getItem('wisquiz:avatar') || '⚡'); } catch { /* Optional preference. */ } }, []);
  useEffect(() => { if (mode) form.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [mode]);
  function enter() {
    const name = nickname.trim();
    if (!name) { setError('Enter a nickname to take your seat.'); return; }
    if (mode === 'join' && !/^[A-Z2-9]{6}$/.test(code)) { setError('Enter a valid six-character room code.'); return; }
    try { localStorage.setItem('wisquiz:name', name); localStorage.setItem('wisquiz:avatar', avatar); } catch { /* Identity can still be provided to the room. */ }
    const query = new URLSearchParams({ name, avatar });
    if (mode !== 'join') for (const [key, value] of Object.entries(settings)) query.set(key, String(value));
    if (mode === 'host') query.set('host', '1');
    if (mode === 'solo') { if (untimed) query.set('untimed', '1'); router.push('/game/solo?' + query); }
    else router.push('/lobby/' + (mode === 'host' ? generateCode() : code) + '?' + query);
  }
  const packs = [{ value: 'mixed', title: 'The big mix', description: 'A little of everything', symbol: '✦' }, { value: 'science', title: 'Science & space', description: 'Think beyond the obvious', symbol: '◎' }, { value: 'entertainment', title: 'Screen & sound', description: 'For the culture lovers', symbol: '♫' }, { value: 'geography', title: 'World explorer', description: 'Places, people, possibilities', symbol: '↗' }] as const;
  return <main className="content"><div className="hero"><div><p className="eyebrow">Your next great game night</p><h1>Good company.<br />Great questions.</h1><p className="sub">Bring your people to the table. Everyone answers together, on their own device. A little knowledge, a little suspense, plenty to talk about.</p><div className="actions"><button className="button primary" onClick={() => { setMode('host'); setError(''); }}>Host a party ↗</button><button className="button quiet" onClick={() => { setMode('join'); setError(''); }}>Join with code</button></div><div className="hero-secondary"><button className="text-button" onClick={() => { setMode('solo'); setError(''); }}>Solo practice →</button><a className="text-button" href="/game/solo?offline=1">Play starter pack offline →</a></div><p className="tiny" style={{ marginTop: 18 }}>2–12 online · No account needed · No waiting for turns</p></div><div className="hero-art" aria-hidden="true"><div className="section-head"><span className="eyebrow">THE PARTY TABLE</span><span className="tiny">✦ WISQUIZ</span></div><p className="art-heading">Curiosity is your superpower.</p><div className="art-cards"><div className="art-card">✧<small>DISCOVER</small></div><div className="art-card">◎<small>CONNECT</small></div><div className="art-card">ϟ<small>COMPETE</small></div></div><p className="tiny center">A fresh question. A shared reveal. One more round.</p></div></div>
    <div className="section-head"><h3>Pick your curiosity</h3><span className="tiny">Your party, your pack</span></div><div className="category-grid">{packs.map(pack => <button key={pack.value} className="category-card" aria-pressed={settings.category === pack.value} onClick={() => { setSettings(s => ({ ...s, category: pack.value })); setMode('host'); }}><span className="symbol" aria-hidden="true">{pack.symbol}</span><h3>{pack.title}</h3><small>{pack.description}</small></button>)}</div>
    {mode && <div className="home-form panel" ref={form}><div className="section-head"><h2>{mode === 'host' ? 'Take your seat.' : mode === 'join' ? 'Meet your people.' : 'A little time for curiosity.'}</h2><button className="text-button" onClick={() => setMode(null)}>Close</button></div><form onSubmit={e => { e.preventDefault(); enter(); }} className="stack"><label>Your nickname<input autoFocus placeholder="Enter nickname…" maxLength={20} value={nickname} onChange={e => { setNickname(e.target.value); setError(''); }} /></label><div><label style={{ marginBottom: 10 }}>Choose your avatar</label><AvatarPicker value={avatar} onChange={setAvatar} /></div>{mode === 'join' ? <label>Room code<input autoComplete="off" placeholder="PRSM42" maxLength={6} value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }} /></label> : <SettingsForm value={settings} onChange={change => setSettings(s => ({ ...s, ...change }))} />}{mode === 'solo' && <label className="check"><input type="checkbox" checked={untimed} onChange={e => setUntimed(e.target.checked)} /> Untimed practice · accuracy only</label>}{error && <p className="notice error" role="alert">{error}</p>}<button className="button primary" type="submit">{mode === 'host' ? 'Create room →' : mode === 'join' ? 'Join room →' : 'Start solo practice →'}</button></form></div>}
  </main>;
}
