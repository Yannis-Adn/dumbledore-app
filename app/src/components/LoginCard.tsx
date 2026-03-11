import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import {
  KeyRound, ExternalLink, Loader2, AlertCircle, Shield,
  ChevronDown, Download, Puzzle, FlaskConical,
} from 'lucide-react';

type BrowserTarget = 'chrome' | 'firefox';

function detectBrowser(): BrowserTarget {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'firefox';
  return 'chrome';
}

interface LoginCardProps {
  className?: string;
  glass?: boolean;
}

export default function LoginCard({ className = '', glass = false }: LoginCardProps) {
  const [moodleToken, setMoodleToken] = useState('');
  const [panoramixToken, setPanoramixToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [mode, setMode] = useState<'extension' | 'manual'>('extension');
  const [browserTarget, setBrowserTarget] = useState<BrowserTarget>(detectBrowser);
  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moodleToken.trim() || !panoramixToken.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await login(moodleToken.trim(), panoramixToken.trim());
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  const cardBg = glass
    ? 'bg-surface/60 dark:bg-surface-dark-dim/50 backdrop-blur-xl'
    : 'bg-surface dark:bg-surface-dark-dim';

  return (
    <div className={`w-full max-w-md ${className}`}>
      <div className={`${cardBg} rounded-2xl shadow-lg border border-border dark:border-border-dark overflow-hidden`}>

        {/* Tabs */}
        <div className="flex border-b border-border dark:border-border-dark">
          <button
            onClick={() => setMode('extension')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px ${
              mode === 'extension'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark'
            }`}
          >
            <Puzzle className="w-3.5 h-3.5" />
            Extension
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px ${
              mode === 'manual'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Manual
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {mode === 'extension' ? (
            <div className="space-y-4 animate-[modal-in_0.15s_ease-out]">
              <p className="text-xs text-text-muted dark:text-text-dark-muted">
                L'extension capture automatiquement vos tokens dès que vous visitez Gandalf ou Panoramix.
              </p>

              <div>
                <p className="text-xs font-medium text-text dark:text-text-dark mb-2 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                  Télécharger l'extension
                </p>
                <div className="flex gap-1.5 mb-2">
                  <button
                    onClick={() => setBrowserTarget('chrome')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors ${
                      browserTarget === 'chrome'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border dark:border-border-dark text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark'
                    }`}
                  >
                    Chrome / Arc / Edge
                  </button>
                  <button
                    onClick={() => setBrowserTarget('firefox')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors ${
                      browserTarget === 'firefox'
                        ? 'border-warning bg-warning/10 text-warning'
                        : 'border-border dark:border-border-dark text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark'
                    }`}
                  >
                    Firefox
                  </button>
                </div>
                <a
                  href={browserTarget === 'firefox' ? '/dumbledore-extension-firefox.zip' : '/dumbledore-extension-chrome.zip'}
                  download
                  className={`flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                    browserTarget === 'firefox'
                      ? 'border-warning/40 bg-warning/5 text-text dark:text-text-dark hover:border-warning hover:text-warning'
                      : 'border-border dark:border-border-dark bg-surface-dim dark:bg-surface-dark text-text dark:text-text-dark hover:border-primary hover:text-primary'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  {browserTarget === 'firefox' ? 'dumbledore-extension-firefox.zip' : 'dumbledore-extension-chrome.zip'}
                </a>
              </div>

              <div>
                <p className="text-xs font-medium text-text dark:text-text-dark mb-2 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                  {browserTarget === 'firefox' ? 'Installer sur Firefox' : 'Installer sur Chrome / Arc / Edge'}
                </p>
                {browserTarget === 'firefox' ? (
                  <ol className="text-xs text-text-muted dark:text-text-dark-muted space-y-1 list-decimal list-inside">
                    <li>Extraire le <code className="px-1 py-0.5 bg-surface-dim dark:bg-surface-dark rounded font-mono text-[11px]">.zip</code> téléchargé</li>
                    <li>Ouvrir <code className="px-1 py-0.5 bg-surface-dim dark:bg-surface-dark rounded font-mono text-[11px]">about:debugging#/runtime/this-firefox</code></li>
                    <li>Cliquer sur <span className="font-medium text-text dark:text-text-dark">"Charger un module temporaire"</span></li>
                    <li>Sélectionner le fichier <code className="px-1 py-0.5 bg-surface-dim dark:bg-surface-dark rounded font-mono text-[11px]">manifest.json</code></li>
                  </ol>
                ) : (
                  <ol className="text-xs text-text-muted dark:text-text-dark-muted space-y-1 list-decimal list-inside">
                    <li>Extraire le <code className="px-1 py-0.5 bg-surface-dim dark:bg-surface-dark rounded font-mono text-[11px]">.zip</code> téléchargé</li>
                    <li>Ouvrir <code className="px-1 py-0.5 bg-surface-dim dark:bg-surface-dark rounded font-mono text-[11px]">chrome://extensions</code></li>
                    <li>Activer le <span className="font-medium text-text dark:text-text-dark">Mode développeur</span></li>
                    <li>Cliquer sur <span className="font-medium text-text dark:text-text-dark">"Charger l'extension non empaquetée"</span></li>
                    <li>Sélectionner le dossier extrait</li>
                  </ol>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-text dark:text-text-dark mb-2 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                  Se connecter sur les deux sites
                </p>
                <div className="flex gap-2">
                  <a href="https://gandalf.epitech.eu" target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-border dark:border-border-dark text-xs text-text-muted dark:text-text-dark-muted hover:text-primary hover:border-primary transition-colors">
                    Gandalf <ExternalLink className="w-3 h-3" />
                  </a>
                  <a href="https://panoramix.epitest.eu" target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-border dark:border-border-dark text-xs text-text-muted dark:text-text-dark-muted hover:text-primary hover:border-primary transition-colors">
                    Panoramix <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="pt-1 border-t border-border dark:border-border-dark space-y-2">
                <p className="text-[11px] text-text-muted dark:text-text-dark-muted text-center">
                  Vos tokens seront capturés automatiquement. Revenez ici et vous serez connecté.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-2 px-4 rounded-xl bg-primary-dark hover:bg-primary text-white text-xs font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Connexion
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-[modal-in_0.15s_ease-out]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="moodle-token" className="block text-sm font-medium text-text dark:text-text-dark mb-1.5">
                    MoodleSession Token
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted dark:text-text-dark-muted" />
                    <input
                      id="moodle-token"
                      type="password"
                      value={moodleToken}
                      onChange={(e) => setMoodleToken(e.target.value)}
                      placeholder="Collez votre cookie MoodleSession"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border dark:border-border-dark bg-surface-dim dark:bg-surface-dark text-text dark:text-text-dark placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="panoramix-token" className="block text-sm font-medium text-text dark:text-text-dark mb-1.5">
                    Panoramix Token
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted dark:text-text-dark-muted" />
                    <input
                      id="panoramix-token"
                      type="password"
                      value={panoramixToken}
                      onChange={(e) => setPanoramixToken(e.target.value)}
                      placeholder="Collez votre cookie Panoramix JWT"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border dark:border-border-dark bg-surface-dim dark:bg-surface-dark text-text dark:text-text-dark placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 text-danger text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !moodleToken.trim() || !panoramixToken.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary-dark hover:bg-primary text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </button>
              </form>

              <button
                onClick={() => setShowHelp(!showHelp)}
                className="w-full mt-4 pt-3 border-t border-border dark:border-border-dark flex items-center justify-between text-xs text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark transition-colors"
              >
                <span>Comment obtenir vos tokens</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showHelp ? 'rotate-180' : ''}`} />
              </button>

              {showHelp && (
                <div className="mt-3 space-y-4 animate-[modal-in_0.15s_ease-out]">
                  <div>
                    <p className="text-xs font-medium text-text dark:text-text-dark mb-2 flex items-center gap-1.5">
                      <KeyRound className="w-3 h-3" /> MoodleSession Token
                    </p>
                    <ol className="text-xs text-text-muted dark:text-text-dark-muted space-y-1 list-decimal list-inside">
                      <li>Ouvrir <a href="https://gandalf.epitech.eu" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">gandalf.epitech.eu <ExternalLink className="w-3 h-3" /></a> et se connecter</li>
                      <li>Ouvrir DevTools (F12) &gt; Application &gt; Cookies</li>
                      <li>Copier la valeur de <code className="px-1 py-0.5 bg-surface-dim dark:bg-surface-dark rounded font-mono text-[11px]">MoodleSession</code></li>
                    </ol>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text dark:text-text-dark mb-2 flex items-center gap-1.5">
                      <Shield className="w-3 h-3" /> Panoramix Token
                    </p>
                    <ol className="text-xs text-text-muted dark:text-text-dark-muted space-y-1 list-decimal list-inside">
                      <li>Ouvrir <a href="https://panoramix.epitest.eu" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">panoramix.epitest.eu <ExternalLink className="w-3 h-3" /></a> et se connecter avec Microsoft</li>
                      <li>Ouvrir DevTools (F12) &gt; Application &gt; Cookies</li>
                      <li>Copier la valeur de <code className="px-1 py-0.5 bg-surface-dim dark:bg-surface-dark rounded font-mono text-[11px]">refresh_token</code></li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 px-1">
        <button
          onClick={() => { loginDemo(); navigate('/'); }}
          className="flex items-center gap-1.5 text-xs text-text-muted dark:text-text-dark-muted hover:text-primary dark:hover:text-primary transition-colors"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Essayer la démo MsC 1
        </button>
      </div>
    </div>
  );
}
