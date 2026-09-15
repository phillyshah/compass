import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  Compass, ArrowRight, Brain, Target, FileText, Users,
  TrendingUp, Bell, CheckCircle2, Zap, Eye, Sparkles,
} from 'lucide-react';

export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fn = mode === 'signup' ? signUp : signIn;
    const { error } = await fn(email, password);
    if (error) setError(error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-ink-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div className="font-display font-bold text-ink-900 text-lg">Compass</div>
          </div>
          <button onClick={onGetStarted} className="btn-primary text-sm">
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-ink-50 to-ocean-50" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-brand-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-ocean-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-ink-200 shadow-sm text-xs font-medium text-ink-600 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                AI-powered internship intelligence
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-ink-950 leading-[1.05] text-balance">
                Land the right internship, <span className="text-brand-600">not just any internship.</span>
              </h1>
              <p className="mt-6 text-lg text-ink-600 leading-relaxed max-w-lg">
                Project Compass monitors thousands of companies in real time, surfaces opportunities matched to your profile, and tells you exactly what to do next — every single day.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={onGetStarted} className="btn-primary text-base px-6 py-3">
                  Start free <ArrowRight className="w-4 h-4" />
                </button>
                <a href="#features" className="btn-secondary text-base px-6 py-3">
                  See how it works
                </a>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-ink-500">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-500" /> No credit card</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-500" /> Built for students</div>
              </div>
            </div>

            {/* Auth card */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div id="auth-card" className="card p-6 sm:p-8 shadow-elevated max-w-md mx-auto scroll-mt-20">
                <div className="flex gap-1 p-1 bg-ink-100 rounded-lg mb-6">
                  <button
                    onClick={() => setMode('signup')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'signup' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}
                  >
                    Create account
                  </button>
                  <button
                    onClick={() => setMode('signin')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'signin' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}
                  >
                    Sign in
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@university.edu"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="input"
                    />
                  </div>
                  {error && (
                    <div className="text-sm text-danger-600 bg-danger-50 px-3 py-2 rounded-lg">
                      {error}
                    </div>
                  )}
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
                  </button>
                </form>

                <p className="text-xs text-ink-400 text-center mt-4">
                  By continuing, you agree to our Terms and Privacy Policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-y border-ink-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: '18,000+', label: 'Companies monitored' },
            { value: '50,000+', label: 'Internships tracked' },
            { value: '4x', label: 'Faster application prep' },
            { value: '92%', label: 'Relevant signal accuracy' },
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-2xl sm:text-3xl font-display font-bold text-ink-900">{stat.value}</div>
              <div className="text-sm text-ink-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-ink-900">
            Everything you need to win the internship search
          </h2>
          <p className="mt-4 text-lg text-ink-500">
            From discovery to offer, Compass guides every step with real-time intelligence and AI-powered recommendations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Brain, title: 'Daily Intelligence Briefing', desc: 'Wake up to a personalized dashboard with the most important actions for your search — new openings, deadlines, and company signals.', color: 'text-brand-600 bg-brand-50' },
            { icon: Compass, title: 'Smart Discovery', desc: 'Search and filter thousands of internships by role, location, compensation, and work mode. Save what interests you.', color: 'text-ocean-600 bg-ocean-50' },
            { icon: Target, title: 'Company Targeting', desc: 'Track companies you care about. Compass monitors them 24/7 and alerts you when something relevant happens.', color: 'text-accent-600 bg-accent-50' },
            { icon: FileText, title: 'Application Pipeline', desc: 'Visual kanban board tracks every application from saved to offer. Never miss a deadline or follow-up again.', color: 'text-success-600 bg-success-50' },
            { icon: Users, title: 'Networking Contacts', desc: 'Build and manage your contact list with follow-up reminders. Turn cold outreach into warm connections.', color: 'text-danger-600 bg-danger-50' },
            { icon: TrendingUp, title: 'Company Intelligence', desc: 'Real-time signals on funding, hiring, leadership changes, and more — filtered to what matters for your targets.', color: 'text-ink-700 bg-ink-100' },
          ].map(f => (
            <div key={f.title} className="card-hover p-6 group">
              <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-display font-bold text-ink-900 mb-2">{f.title}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-ink-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold">
              Three steps to your next internship
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Eye, title: 'Tell Compass about you', desc: 'Complete a quick onboarding — your major, graduation year, target roles, and preferences.' },
              { step: '02', icon: Zap, title: 'Get your daily plan', desc: 'Each morning, Compass surfaces the highest-impact actions: new openings, deadlines, and outreach targets.' },
              { step: '03', icon: Bell, title: 'Act and track', desc: 'Apply, connect, and track progress. Compass learns and refines recommendations over time.' },
            ].map(s => (
              <div key={s.step} className="relative">
                <div className="text-5xl font-display font-extrabold text-brand-500/30 mb-4">{s.step}</div>
                <div className="w-12 h-12 rounded-xl bg-brand-600/20 flex items-center justify-center mb-4">
                  <s.icon className="w-6 h-6 text-brand-400" />
                </div>
                <h3 className="text-xl font-display font-bold mb-2">{s.title}</h3>
                <p className="text-ink-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-display font-bold text-ink-900 mb-4">
          Ready to find your next internship?
        </h2>
        <p className="text-lg text-ink-500 mb-8 max-w-xl mx-auto">
          Join thousands of students using Compass to navigate the internship search with confidence.
        </p>
        <button onClick={onGetStarted} className="btn-primary text-base px-8 py-3.5">
          Get started free <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-ink-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-ink-900">Compass</span>
          </div>
          <p className="text-sm text-ink-400">© 2026 Project Compass. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
