import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Activity, ArrowRight, Atom, BookOpen, Brain, CheckCircle2, ChevronRight, Clock3, FlaskConical, GraduationCap, Leaf, LockKeyhole, LogIn, Mail, ShieldCheck, Sparkles, Target, Trophy, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

type SessionUser = { id: string; email?: string };

const subjects = [
  { name: 'Biology', chapters: 'Botany & Zoology', progress: 0, icon: Leaf, tone: 'green' },
  { name: 'Physics', chapters: 'Concepts & numericals', progress: 0, icon: Atom, tone: 'blue' },
  { name: 'Chemistry', chapters: 'Physical, Organic & Inorganic', progress: 0, icon: FlaskConical, tone: 'orange' },
];

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!supabase) {
      setError('Supabase is not connected yet. Add the project URL and publishable key to your local environment or Cloudflare settings.');
      return;
    }
    setBusy(true);
    try {
      if (authMode === 'signup') {
        const { error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        setNotice('Check your inbox for the verification email. After verifying, return here to sign in.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        setNotice('Signed in successfully.');
        setAuthOpen(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setNotice('You have signed out.');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="NEET Prep home"><span className="brand-mark"><GraduationCap size={23} /></span><span>NEET<span className="brand-light">Prep</span></span></a>
        <nav className="nav-links"><a href="#subjects">Study</a><a href="#practice">Practice</a><a href="#how-it-works">How it works</a></nav>
        <div className="top-actions">
          {user ? <><span className="signed-in">{user.email}</span><button className="button button-outline" onClick={signOut}>Sign out</button></> : <button className="button button-dark" onClick={() => { setAuthOpen(true); setAuthMode('signup'); }}> <LogIn size={16} /> Sign in</button>}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="live-dot" /> YOUR NEET JOURNEY, ONE STEP AT A TIME</div>
            <h1>Make your effort<br /><span>count.</span></h1>
            <p className="hero-text">A calmer, clearer way to prepare for NEET. Build concepts, practise with purpose, and understand where to focus next.</p>
            <div className="hero-actions"><button className="button button-primary" onClick={() => { setAuthOpen(true); setAuthMode('signup'); }}>Start your preparation <ArrowRight size={17} /></button><a className="text-link" href="#subjects">Explore subjects <ChevronRight size={16} /></a></div>
            <div className="trust-line"><ShieldCheck size={16} /> Your progress is personal. Your pace is yours.</div>
          </div>
          <div className="hero-visual" aria-label="Study dashboard preview">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="floating-card card-top"><span className="mini-icon purple"><Target size={17} /></span><span><b>One focused session</b><small>Today is a fresh start</small></span><CheckCircle2 className="card-check" size={18} /></div>
            <div className="study-card">
              <div className="study-card-head"><span className="mini-icon mint"><Activity size={18} /></span><span><small>YOUR STUDY SPACE</small><b>Build your baseline</b></span><span className="pill">LET'S BEGIN</span></div>
              <div className="metric-grid"><div><small>Chapters explored</small><strong>00 <span>/ —</span></strong></div><div><small>Practice accuracy</small><strong>— <span>%</span></strong></div></div>
              <div className="progress-label"><span>Preparation journey</span><b>Ready when you are</b></div><div className="progress-track"><span /></div>
              <div className="study-card-foot"><span><Clock3 size={14} /> Start with 25 minutes</span><span>01 / 01</span></div>
            </div>
            <div className="floating-card card-bottom"><span className="mini-icon amber"><Sparkles size={17} /></span><span><b>Small wins add up</b><small>Consistency over cramming</small></span></div>
          </div>
        </section>

        <section className="proof-strip"><div><BookOpen size={19}/><span><b>NCERT-first</b><small>Learn from core concepts</small></span></div><div><Brain size={19}/><span><b>Practice with purpose</b><small>Learn from every answer</small></span></div><div><Trophy size={19}/><span><b>Track your progress</b><small>Find your next best step</small></span></div></section>

        <section id="subjects" className="section-block">
          <div className="section-heading"><div><span className="eyebrow muted">YOUR FOUNDATION</span><h2>Three subjects. One clear plan.</h2><p>Start with the subject you want to strengthen today.</p></div><span className="section-count">01 — 03</span></div>
          <div className="subject-grid">{subjects.map(({ name, chapters, progress, icon: Icon, tone }) => <article className="subject-card" key={name}><div className={'subject-icon ' + tone}><Icon size={22}/></div><div className="subject-title-row"><h3>{name}</h3><span className="chapter-count">Coming in stages</span></div><p>{chapters}</p><div className="subject-progress"><span style={{ width: progress + '%' }}/></div><div className="subject-card-foot"><span>Study path being prepared</span><LockKeyhole size={15}/></div></article>)}</div>
        </section>

        <section id="practice" className="practice-banner"><div className="practice-symbol"><Brain size={27}/></div><div><span className="eyebrow">BUILT FOR ACTIVE RECALL</span><h2>Don't just read it. Retrieve it.</h2><p>Timed practice, answer review, and chapter-wise tests will be introduced in the next build stages.</p></div><button className="button button-white" onClick={() => { setAuthOpen(true); setAuthMode('signup'); }}>Get started <ArrowRight size={16}/></button></section>

        <section id="how-it-works" className="how-section"><span className="eyebrow muted">A BETTER ROUTINE</span><h2>Progress you can actually understand.</h2><div className="how-grid"><div><span>01</span><h3>Learn the concept</h3><p>Build a reliable foundation before you chase speed.</p></div><div><span>02</span><h3>Practise deliberately</h3><p>Use questions to uncover gaps, not just count correct answers.</p></div><div><span>03</span><h3>Review and repeat</h3><p>Turn mistakes into a clear next step for your study plan.</p></div></div></section>
      </main>

      <footer className="footer"><a className="brand" href="#"><span className="brand-mark"><GraduationCap size={20}/></span><span>NEET<span className="brand-light">Prep</span></span></a><span>Built for steady progress, not empty promises.</span><span className="footer-status"><span className={'status-dot ' + (isSupabaseConfigured ? 'configured' : '')}/>{isSupabaseConfigured ? 'Backend configured' : 'Backend setup pending'}</span></footer>

      {notice && <div className="notice" role="status"><CheckCircle2 size={18}/>{notice}<button aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={16}/></button></div>}
      {authOpen && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setAuthOpen(false); }}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" aria-label="Close" onClick={() => setAuthOpen(false)}><X size={19}/></button><span className="brand-mark modal-mark"><GraduationCap size={23}/></span><span className="eyebrow muted">YOUR STUDY SPACE</span><h2 id="auth-title">{authMode === 'signup' ? 'Start with a fresh page.' : 'Welcome back.'}</h2><p>{authMode === 'signup' ? 'Create your account to begin your preparation journey.' : 'Sign in to return to your study space.'}</p><form onSubmit={submitAuth}><label htmlFor="email">Email address</label><div className="field"><Mail size={17}/><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com"/></div><label htmlFor="password">Password</label><input className="password-field" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} placeholder="At least 8 characters"/>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'} <ArrowRight size={16}/></button></form><button className="mode-switch" onClick={() => { setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setError(''); setNotice(''); }}>{authMode === 'signup' ? 'Already registered? Sign in' : 'New here? Create an account'}</button>{!isSupabaseConfigured && <p className="setup-hint">Setup note: account creation will work after the Supabase environment values are configured.</p>}</section></div>}
    </div>
  );
}
