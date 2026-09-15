import { type ReactNode, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard, Compass, Target, FileText, Brain,
  Users, User, LogOut, Menu, X, Bell, Search,
} from 'lucide-react';

export type Page = 'today' | 'discover' | 'targets' | 'applications' | 'intelligence' | 'contacts' | 'profile';

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'today', label: 'Today', icon: LayoutDashboard },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'targets', label: 'Targets', icon: Target },
  { id: 'applications', label: 'Applications', icon: FileText },
  { id: 'intelligence', label: 'Intelligence', icon: Brain },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'profile', label: 'Profile', icon: User },
];

export function AppShell({ page, onNavigate, children }: { page: Page; onNavigate: (p: Page) => void; children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Student';
  const initials = fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const handleNav = (p: Page) => {
    onNavigate(p);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-ink-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-ink-200/60 shrink-0">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-ink-900 leading-none">Compass</div>
            <div className="text-[10px] text-ink-400 font-medium uppercase tracking-wider mt-0.5">Internship Intelligence</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={page === item.id ? 'sidebar-link-active w-full' : 'sidebar-link w-full'}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-ink-200/60">
          <button
            onClick={() => handleNav('profile')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-ink-100 transition-colors w-full text-left"
          >
            <div className="w-9 h-9 bg-ink-700 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-ink-900 truncate">{fullName}</div>
              <div className="text-xs text-ink-400 truncate">{profile?.major || 'Set your major'}</div>
            </div>
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-500 hover:bg-danger-50 hover:text-danger-600 transition-colors w-full mt-1"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 animate-fade-in">
          <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col animate-slide-in-right">
            <div className="px-5 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
                  <Compass className="w-5 h-5 text-white" />
                </div>
                <div className="font-display font-bold text-ink-900">Compass</div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-2 space-y-0.5">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={page === item.id ? 'sidebar-link-active w-full' : 'sidebar-link w-full'}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="px-3 py-3 border-t border-ink-200/60">
              <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-500 hover:bg-danger-50 hover:text-danger-600 w-full">
                <LogOut className="w-[18px] h-[18px]" />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-ink-200/60 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-ink-600 hover:bg-ink-100">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-md flex items-center justify-center">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-ink-900">Compass</span>
          </div>
          <button className="p-1.5 rounded-lg text-ink-600 hover:bg-ink-100">
            <Bell className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
