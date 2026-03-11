import { useState } from 'react';
import { useAuth } from '@/context/auth';
import { KeyRound, Shield, Loader2, AlertCircle, Check, Eye, EyeOff, Puzzle, RefreshCw } from 'lucide-react';

function maskToken(token: string): string {
  if (token.length <= 16) return '****';
  return token.slice(0, 8) + '...' + token.slice(-8);
}

function TokenField({
  label,
  icon: Icon,
  currentToken,
  onSave,
  saving,
}: {
  label: string;
  icon: typeof KeyRound;
  currentToken: string | null;
  onSave: (value: string) => Promise<void>;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    setError(null);
    setSuccess(false);
    try {
      await onSave(value.trim());
      setSuccess(true);
      setEditing(false);
      setValue('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la mise à jour du token');
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark-dim">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-medium text-text dark:text-text-dark">{label}</h3>
        {success && (
          <span className="ml-auto flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="w-3.5 h-3.5" /> Mis à jour
          </span>
        )}
      </div>

      {/* Current token display */}
      {currentToken && (
        <div className="mb-4">
          <p className="text-xs text-text-muted dark:text-text-dark-muted mb-1.5">Token actuel</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-surface-dim dark:bg-surface-dark text-xs font-mono text-text dark:text-text-dark truncate">
              {showCurrent ? currentToken : maskToken(currentToken)}
            </code>
            <button
              onClick={() => setShowCurrent(!showCurrent)}
              className="p-2 text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark transition-colors rounded-lg hover:bg-surface-dim dark:hover:bg-surface-dark"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Edit section */}
      {editing ? (
        <div className="space-y-3">
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Colle le nouveau token..."
            className="w-full px-3 py-2.5 rounded-xl border border-border dark:border-border-dark bg-surface-dim dark:bg-surface-dark text-text dark:text-text-dark placeholder:text-text-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            autoFocus
          />
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 text-danger text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !value.trim()}
              className="px-4 py-2 rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Enregistrer
            </button>
            <button
              onClick={() => { setEditing(false); setValue(''); setError(null); }}
              className="px-4 py-2 rounded-xl border border-border dark:border-border-dark text-text-muted dark:text-text-dark-muted hover:text-text dark:hover:text-text-dark text-sm transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-primary hover:text-primary-dark transition-colors font-medium"
        >
          Mettre à jour le token
        </button>
      )}
    </div>
  );
}

export default function TokenManagement() {
  const { token, panoramixToken, updateTokens } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleSaveMoodle = async (value: string) => {
    setSaving(true);
    try {
      await updateTokens({ moodle: value });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePanoramix = async (value: string) => {
    setSaving(true);
    try {
      await updateTokens({ panoramix: value });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text dark:text-text-dark">Gestion des tokens</h1>
        <p className="text-text-muted dark:text-text-dark-muted mt-1">
          Gérez vos tokens d'authentification pour Gandalf et Panoramix.
        </p>
      </div>

      <div className="space-y-4">
        <TokenField
          label="MoodleSession (Gandalf)"
          icon={KeyRound}
          currentToken={token}
          onSave={handleSaveMoodle}
          saving={saving}
        />
        <TokenField
          label="Panoramix JWT"
          icon={Shield}
          currentToken={panoramixToken}
          onSave={handleSavePanoramix}
          saving={saving}
        />
      </div>

      {/* Extension tip */}
      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="shrink-0 p-1.5 rounded-lg bg-primary/10 mt-0.5">
            <Puzzle className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-text dark:text-text-dark mb-1">
              Tu as l'extension installée ?
            </p>
            <p className="text-xs text-text-muted dark:text-text-dark-muted">
              Pas besoin de copier-coller. Recharge simplement{' '}
              <a href="https://gandalf.epitech.eu" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">gandalf.epitech.eu</a>
              {' '}ou{' '}
              <a href="https://panoramix.epitest.eu" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">panoramix.epitest.eu</a>
              {' '}(F5), puis recharge Dumbledore — les tokens sont capturés automatiquement.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-dark hover:bg-primary text-white text-xs font-medium transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Recharger Dumbledore
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 p-4 rounded-xl bg-accent/5 border border-accent/20">
        <p className="text-xs text-text-muted dark:text-text-dark-muted">
          <strong className="text-text dark:text-text-dark">Expiration :</strong>{' '}
          Les tokens MoodleSession expirent après ~2h d'inactivité.
          Les tokens JWT Panoramix durent ~7 jours.
        </p>
      </div>
    </div>
  );
}
