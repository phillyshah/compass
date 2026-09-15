import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AppShell, type Page } from '@/components/AppShell';
import { LandingPage } from '@/pages/LandingPage';
import { Onboarding } from '@/pages/Onboarding';
import { TodayPage } from '@/pages/TodayPage';
import { DiscoverPage } from '@/pages/DiscoverPage';
import { TargetsPage } from '@/pages/TargetsPage';
import { ApplicationsPage } from '@/pages/ApplicationsPage';
import { IntelligencePage } from '@/pages/IntelligencePage';
import { ContactsPage } from '@/pages/ContactsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { Compass } from 'lucide-react';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [page, setPage] = useState<Page>('today');

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center animate-pulse-soft">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div className="text-sm text-ink-400">Loading Compass...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LandingPage onGetStarted={() => {
      document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }} />;
  }

  if (profile && !profile.onboarding_completed) {
    return <Onboarding onComplete={() => {}} />;
  }

  return (
    <AppShell page={page} onNavigate={setPage}>
      {page === 'today' && <TodayPage onNavigate={setPage} />}
      {page === 'discover' && <DiscoverPage />}
      {page === 'targets' && <TargetsPage />}
      {page === 'applications' && <ApplicationsPage />}
      {page === 'intelligence' && <IntelligencePage />}
      {page === 'contacts' && <ContactsPage />}
      {page === 'profile' && <ProfilePage />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
