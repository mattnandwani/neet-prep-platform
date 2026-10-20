import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Activity, ArrowRight, Atom, BookOpen, Brain, CalendarDays, CheckCircle2, ChevronRight, Clock3, FlaskConical, GraduationCap, Leaf, LockKeyhole, LogIn, Mail, Pause, Play, ShieldCheck, Sparkles, Target, Trophy, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

type SessionUser = { id: string; email?: string };
type StudentProfile = { display_name: string | null; target_exam_year: number | null; target_score: number | null; daily_study_minutes: number | null };
type DayPlan = { day: string; enabled: boolean; start: string; end: string };
type StudySession = { id: string; started_at: string; session_type: string };

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const motivation = [
  'Your future self is built by the next honest hour.',
  'A difficult chapter today is a weaker fear tomorrow.',
  'You do not need a perfect day. You need a real start.',
  'Every reviewed mistake gives your next attempt an advantage.',
  '600 is a target, not magic. Let the evidence show the way.',
  'Consistency is quiet until the score makes it visible.',
  'Study for understanding first; speed will grow from familiarity.'
];
const defaultSchedule = days.map((day, i) => ({ day, enabled: i < 5, start: i < 5 ? '19:00' : '09:00', end: i < 5 ? '23:00' : '21:00' }));

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
  const [profile, setProfile] = useState<StudentProfile>({ display_name: '', target_exam_year: 2028, target_score: 600, daily_study_minutes: 180 });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [schedule, setSchedule] = useState<DayPlan[]>(defaultSchedule);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata');
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [sessionType, setSessionType] = useState('Focused study');
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [confirmationState, setConfirmationState] = useState<'none' | 'confirmed' | 'error'>('none');
  const [quote] = useState(() => motivation[Math.floor(Math.random() * motivation.length)]);
  const [attempts, setAttempts] = useState<Array<{ score: number; duration_seconds: number | null; created_at: string }>>([]);

  useEffect(() => {
    if (window.location.hash.includes('access_token=') && (window.location.hash.includes('type=signup') || window.location.hash.includes('type=email_change'))) {
      setConfirmationState('confirmed');
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!supabase || !user) { setProfileLoaded(false); return; }
      setProfileLoaded(false);
      const { data, error: profileError } = await supabase.from('profiles').select('display_name,target_exam_year,target_score,daily_study_minutes,study_timezone,weekly_schedule').eq('id', user.id).maybeSingle();
      if (!active) return;
      if (data) {
        setProfile({ display_name: data.display_name ?? '', target_exam_year: data.target_exam_year ?? 2028, target_score: data.target_score ?? 600, daily_study_minutes: data.daily_study_minutes ?? 180 });
        if (data.study_timezone) setTimezone(data.study_timezone);
        if (Array.isArray(data.weekly_schedule) && data.weekly_schedule.length === 7) setSchedule(data.weekly_schedule);
      }
      if (profileError) setError('Your account is signed in, but the profile could not load. Check that the database setup has been applied.');
      setProfileLoaded(true);
    }
    void loadProfile();
    if (supabase && user) {
      void supabase.from('study_sessions').select('id,started_at,session_type').eq('user_id', user.id).is('ended_at', null).order('started_at', { ascending: false }).limit(1).maybeSingle().then(({ data }) => { if (active && data) { setActiveSession(data as StudySession); setSessionStartedAt(new Date(data.started_at).getTime()); } });
      void supabase.from('test_attempts').select('score,duration_seconds,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10).then(({ data }) => { if (active && data) setAttempts(data); });
    }
    return () => { active = false; };
  }, [user?.id]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;
    setProfileBusy(true); setError(''); setNotice('');
    const payload = { id: user.id, display_name: profile.display_name?.trim() || null, target_exam_year: Number(profile.target_exam_year), target_score: Number(profile.target_score), daily_study_minutes: Number(profile.daily_study_minutes), study_timezone: timezone, weekly_schedule: schedule, updated_at: new Date().toISOString() };
    const { error: saveError } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    setProfileBusy(false);
    if (saveError) { setError('Could not save your study goals. Check the database setup and try again.'); return; }
    setNotice('Your study goals have been saved.');
  }


  async function saveSchedule() {
    if (!supabase || !user) return;
    setScheduleBusy(true); setError(''); setNotice('');
    const { error: scheduleError } = await supabase.from('profiles').update({ study_timezone: timezone, weekly_schedule: schedule, updated_at: new Date().toISOString() }).eq('id', user.id);
    setScheduleBusy(false);
    if (scheduleError) { setError('Calendar setup is not available in the database yet. Apply the latest migration, then try again.'); return; }
    setNotice('Your weekly study calendar has been saved.');
  }

  async function startStudySession() {
    if (!supabase || !user) return;
    setError('');
    const started = new Date();
    const { data, error: startError } = await supabase.from('study_sessions').insert({ user_id: user.id, session_type: sessionType, started_at: started.toISOString(), timezone }).select('id,started_at,session_type').single();
    if (startError) { setError('Study tracking needs the latest database migration before it can start.'); return; }
    setActiveSession(data as StudySession); setSessionStartedAt(started.getTime()); setSessionSeconds(0);
    setNotice('Session started. Keep this tab open while you work; online presence alone cannot prove that you are studying.');
  }

  async function stopStudySession() {
    if (!supabase || !user || !activeSession || !sessionStartedAt) return;
    const ended = new Date();
    const duration = Math.max(1, Math.round((ended.getTime() - sessionStartedAt) / 1000));
    const { error: stopError } = await supabase.from('study_sessions').update({ ended_at: ended.toISOString(), duration_seconds: duration, status: 'completed' }).eq('id', activeSession.id).eq('user_id', user.id);
    if (stopError) { setError('Could not save this session. Please try again.'); return; }
    setActiveSession(null); setSessionStartedAt(null); setSessionSeconds(0);
    setNotice(`Study session saved: ${Math.round(duration / 60)} minutes.`);
  }

  useEffect(() => {
    if (!activeSession || !sessionStartedAt) return;
    const tick = () => setSessionSeconds(Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [activeSession?.id, sessionStartedAt]);

  function formatSeconds(total: number) {
    const h = Math.floor(total / 3600).toString().padStart(2, '0');
    const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return h + ':' + m + ':' + s;
  }

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
        const { error: authError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
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
        {confirmationState !== 'none' && <section className={'confirmation-banner ' + (confirmationState === 'confirmed' ? 'confirmation-success' : '')}><div className="confirmation-icon"><CheckCircle2 size={25}/></div><div><span className="eyebrow">EMAIL CONFIRMATION</span><h2>{confirmationState === 'confirmed' ? 'You’re confirmed. Your next chapter starts now.' : 'We could not confirm that link.'}</h2><p>{confirmationState === 'confirmed' ? quote : 'Try signing in. If your email is verified, you can continue to your study dashboard.'}</p></div><button className="button button-dark" onClick={() => { setConfirmationState('none'); setAuthOpen(true); setAuthMode('signin'); }}>{confirmationState === 'confirmed' ? 'Go to my study space' : 'Sign in'} <ArrowRight size={16}/></button></section>}
        {user && <section className="dashboard-section" aria-labelledby="dashboard-title">
          <div className="dashboard-welcome"><div><span className="eyebrow muted">YOUR PERSONAL STUDY SPACE</span><h1 id="dashboard-title">{profile.display_name?.trim() ? `Welcome, ${profile.display_name.trim()}.` : 'Welcome back.'}</h1><p>{quote}</p></div><div className="dashboard-badge"><GraduationCap size={20}/><span>NEET preparation</span></div></div>
          <div className="dashboard-metrics"><article><span className="dash-metric-icon"><BookOpen size={18}/></span><small>Chapters completed</small><strong>0</strong><span>Study library coming next</span></article><article><span className="dash-metric-icon"><Target size={18}/></span><small>Target score</small><strong>{profile.target_score ?? 600}<em>/720</em></strong><span>Your personal goal</span></article><article><span className="dash-metric-icon"><Clock3 size={18}/></span><small>Daily study target</small><strong>{Math.round((profile.daily_study_minutes ?? 180) / 60 * 10) / 10}<em> hrs</em></strong><span>Planned time, not tracked time</span></article></div>
          <div className="dashboard-columns"><section className="dashboard-panel"><div className="dashboard-panel-heading"><div><span className="eyebrow muted">YOUR TARGETS</span><h2>Make this plan yours.</h2></div><span className="panel-step">01</span></div><form className="profile-form" onSubmit={saveProfile}><label htmlFor="display-name">What should we call you?</label><input id="display-name" value={profile.display_name ?? ''} onChange={e => setProfile(p => ({...p,display_name:e.target.value}))} placeholder="Your name" maxLength={80}/><div className="profile-fields"><div><label htmlFor="exam-year">Target NEET year</label><select id="exam-year" value={profile.target_exam_year ?? 2028} onChange={e => setProfile(p => ({...p,target_exam_year:Number(e.target.value)}))}>{Array.from({length:15},(_,i)=>2026+i).map(year=><option key={year} value={year}>{year}</option>)}</select></div><div><label htmlFor="target-score">Target score / 720</label><input id="target-score" type="number" min="0" max="720" value={profile.target_score ?? 600} onChange={e => setProfile(p => ({...p,target_score:Number(e.target.value)}))} required/></div></div><label htmlFor="daily-minutes">Daily study target (minutes)</label><input id="daily-minutes" type="number" min="0" max="1440" step="15" value={profile.daily_study_minutes ?? 180} onChange={e => setProfile(p => ({...p,daily_study_minutes:Number(e.target.value)}))} required/><button className="button button-primary" disabled={profileBusy || !profileLoaded}>{profileBusy ? 'Saving…' : 'Save my goals'} <ArrowRight size={16}/></button>{!profileLoaded && <p className="profile-help">Loading your saved profile…</p>}</form>{error && <p className="form-error" role="alert">{error}</p>}</section><section className="dashboard-panel next-panel"><span className="eyebrow muted">UP NEXT</span><h2>Your study journey</h2><div className="next-step"><span className="next-number">1</span><div><b>Build your foundation</b><p>Choose a subject and explore its chapters.</p></div><LockKeyhole size={16}/></div><div className="next-step"><span className="next-number">2</span><div><b>Practise with purpose</b><p>Attempt questions and review explanations.</p></div><LockKeyhole size={16}/></div><div className="next-step"><span className="next-number">3</span><div><b>Track your progress</b><p>See strengths, gaps and revision priorities.</p></div><LockKeyhole size={16}/></div><p className="dashboard-note">These learning features are not available yet. We're building them next.</p></section></div>
          <section className="dashboard-panel calendar-panel"><div className="dashboard-panel-heading"><div><span className="eyebrow muted">YOUR WEEKLY CALENDAR</span><h2>Plan when you’ll study.</h2></div><CalendarDays size={23}/></div><p className="calendar-intro">Choose your study days and time windows. Times are saved in your selected timezone.</p><div className="timezone-row"><label htmlFor="study-timezone">Time zone</label><select id="study-timezone" value={timezone} onChange={e => setTimezone(e.target.value)}><option value={timezone}>{timezone} (detected)</option><option value="Asia/Kolkata">Asia/Kolkata — India</option><option value="America/New_York">America/New_York</option><option value="America/Los_Angeles">America/Los_Angeles</option><option value="Europe/London">Europe/London</option><option value="UTC">UTC</option></select></div><div className="weekly-schedule">{schedule.map((plan, index) => <div className="schedule-row" key={plan.day}><label className="schedule-day"><input type="checkbox" checked={plan.enabled} onChange={e => setSchedule(items => items.map((item, i) => i === index ? {...item, enabled:e.target.checked} : item))}/><span>{plan.day}</span></label><input aria-label={plan.day + ' start time'} type="time" value={plan.start} disabled={!plan.enabled} onChange={e => setSchedule(items => items.map((item, i) => i === index ? {...item, start:e.target.value} : item))}/><span className="schedule-to">to</span><input aria-label={plan.day + ' end time'} type="time" value={plan.end} disabled={!plan.enabled} onChange={e => setSchedule(items => items.map((item, i) => i === index ? {...item, end:e.target.value} : item))}/></div>)}</div><button className="button button-primary" onClick={saveSchedule} disabled={scheduleBusy || !profileLoaded}>{scheduleBusy ? 'Saving calendar…' : 'Save weekly calendar'} <ArrowRight size={16}/></button><div className="session-tracker"><div><span className="eyebrow">LIVE STUDY SESSION</span><h3>{activeSession ? 'Session in progress' : 'Track a real study block'}</h3><p>{activeSession ? 'Timer running · ' + activeSession.session_type : 'Start this when you begin studying, practising, or taking a paper.'}</p></div><strong className="session-clock">{formatSeconds(sessionSeconds)}</strong><div className="session-controls">{!activeSession ? <><select aria-label="Session type" value={sessionType} onChange={e => setSessionType(e.target.value)}><option>Focused study</option><option>Practice questions</option><option>Mock test</option><option>Revision</option><option>Break</option></select><button className="button button-dark" onClick={startStudySession}><Play size={15}/> Start session</button></> : <button className="button button-primary" onClick={stopStudySession}><Pause size={15}/> Finish and save</button>}</div><p className="tracking-note">Honest tracking: the app records the session you start and stop. Online presence alone cannot prove that you are studying.</p></div></section>
          <section className="dashboard-panel forecast-panel"><span className="eyebrow muted">YOUR 600+ OUTLOOK</span><h2>How close are you to your target?</h2>{attempts.length ? <><p>Based on your latest {attempts.length} saved test attempts, your recent average is <strong>{Math.round(attempts.reduce((sum,a)=>sum+a.score,0)/attempts.length)}</strong>. This is a progress indicator, not a guaranteed probability.</p><div className="forecast-track"><span style={{width:Math.min(100,Math.round((attempts.reduce((sum,a)=>sum+a.score,0)/attempts.length/Math.max(1,Number(profile.target_score)||600))*100))+'%'}}/></div><p className="forecast-foot">Target: {profile.target_score}/720 · Test response times and accuracy will be included once the test engine records them.</p></> : <p>No test evidence yet, so a credible probability would be made up. Once you take timed tests, we’ll calculate a trend from score, accuracy, time used, attempted questions, and consistency—not just guess a percentage.</p>}</section>
        </section>}
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
