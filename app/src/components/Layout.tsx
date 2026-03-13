import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import type { LucideIcon } from 'lucide-react';
import {
  LogOut,
  Sun,
  Moon,
  KeyRound,
  ChevronDown,
  User,
  BellRing,
  AlertTriangle,
  Github,
  Palette,
} from 'lucide-react';
import Changelog from '@/components/Changelog';

const MENU_ITEMS: { icon: LucideIcon; label: string; to: string }[] = [
  { icon: User, label: 'Stats', to: '/stats' },
  { icon: KeyRound, label: 'Manage tokens', to: '/tokens' },
  { icon: BellRing, label: 'Push Notifications', to: '/push-notifications' },
  { icon: Palette, label: 'Apparence', to: '/theme' },
];

export default function Layout() {
  const { user, logout, tokenExpired, isDemo } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-dim dark:bg-surface-dark">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-surface/80 dark:bg-surface-dark-dim/80 backdrop-blur-xl shadow-sm dark:shadow-none dark:border-b dark:border-border-dark">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2.5">
            <img src="/dumbledore-icon.png" alt="Dumbledore" className="w-8 h-8" />
            <span className="text-lg font-bold text-text dark:text-text-dark hidden sm:block">
              Dumbledore
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-primary/10 text-primary dark:bg-primary-dark/15 dark:text-primary-dark">
              Beta
            </span>
            {isDemo && (
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-warning/15 text-warning border border-warning/30">
                Demo
              </span>
            )}
          </NavLink>

          <div className="flex items-center gap-2">
            <a
              href="https://app.edsquare.fr/users/sign_in"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-xl hover:bg-surface-dim dark:hover:bg-surface-dark transition-colors"
              title="Edsquare"
            >
              <img src="/edsquare-logo.png" alt="Edsquare" className="h-4" />
            </a>

            <Changelog isDemo={isDemo} />

            <button
              onClick={toggle}
              className="p-2 text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark transition-colors rounded-xl hover:bg-surface-dim dark:hover:bg-surface-dark"
              title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Avatar dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-dim dark:hover:bg-surface-dark transition-colors"
              >
                {user?.profileimageurl ? (
                  <img
                    src={user.profileimageurl}
                    alt={user.fullname}
                    className="w-8 h-8 rounded-full ring-2 ring-surface-dim dark:ring-surface-dark"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full ring-2 ring-surface-dim dark:ring-surface-dark bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                    {user?.fullname?.charAt(0).toUpperCase() ?? '?'}
                  </span>
                )}
                <span className="text-sm font-medium text-text dark:text-text-dark hidden md:block">
                  {user?.fullname}
                </span>
                <ChevronDown className={`w-4 h-4 text-text-muted dark:text-text-dark-muted transition-transform hidden md:block ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark-dim shadow-lg py-1 z-50">
                  {/* User info (mobile) */}
                  <div className="px-4 py-2.5 border-b border-border dark:border-border-dark md:hidden">
                    <p className="text-sm font-medium text-text dark:text-text-dark truncate">
                      {user?.fullname}
                    </p>
                    <p className="text-xs text-text-muted dark:text-text-dark-muted truncate">
                      {user?.email}
                    </p>
                  </div>

                  {MENU_ITEMS.map(({ icon: Icon, label, to }) => (
                    <button
                      key={to}
                      onClick={() => { setDropdownOpen(false); navigate(to); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text dark:text-text-dark hover:bg-surface-dim dark:hover:bg-surface-dark transition-colors"
                    >
                      <Icon className="w-4 h-4 text-text-muted dark:text-text-dark-muted" />
                      {label}
                    </button>
                  ))}

                  <div className="border-t border-border dark:border-border-dark my-1" />

                  {isDemo && (
                    <div className="px-4 py-2 border-b border-border dark:border-border-dark">
                      <p className="text-[11px] text-warning font-medium">Mode démonstration</p>
                      <p className="text-[10px] text-text-muted dark:text-text-dark-muted mt-0.5">Les données affichées sont fictives.</p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {isDemo ? 'Exit demo' : 'Disconnect'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Token expiry banner */}
      {(tokenExpired.gandalf || tokenExpired.panoramix) && (
        <div className="bg-warning/10 border-b border-warning/30 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
            <p className="text-sm text-text dark:text-text-dark flex-1">
              {tokenExpired.gandalf && tokenExpired.panoramix
                ? 'Vos tokens Moodle et Panoramix ont expiré.'
                : tokenExpired.gandalf
                  ? 'Votre token MoodleSession a expiré.'
                  : 'Votre token Panoramix a expiré.'}
              {' '}
              <NavLink to="/tokens" className="text-primary font-medium hover:underline">
                Mettre à jour mes tokens
              </NavLink>
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="py-6 sm:py-8 flex-1">
        <Outlet />
      </main>

      <footer className="pb-4 sm:pb-5 px-4 sm:px-6">
        <a
          href="https://github.com/Yannis-Adn/dumbledore-app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted/40 dark:text-text-dark-muted/40 hover:text-primary dark:hover:text-primary-dark transition-colors"
        >
          <Github className="w-3.5 h-3.5" />
          Contribute on GitHub
        </a>
      </footer>
    </div>
  );
}
