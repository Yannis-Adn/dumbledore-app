import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth';
import { useToast } from '@/context/toast';
import type { PanoramixCohortGroup } from '@/lib/panoramix-api';
import {
  buildTopicId,
  buildCohortKey,
  buildCohortLabel,
  sendNtfyNotification,
  getNtfyConfig,
  saveNtfyConfig,
  REMINDER_OPTIONS,
  DEFAULT_REMINDERS,
  type NtfyConfig,
} from '@/lib/ntfy';
import PageLoader from '@/components/PageLoader';
import {
  Bell,
  BellRing,
  Check,
  Copy,
  Loader2,
  AlertCircle,
  Smartphone,
  ExternalLink,
  Clock,
  Plus,
  X,
  CalendarDays,
  Flag,
  Lock,
  Send,
} from 'lucide-react';

function ReminderSelector({
  reminders,
  onChange,
  disabled,
}: {
  reminders: number[];
  onChange: (reminders: number[]) => void;
  disabled?: boolean;
}) {
  const handleChange = (index: number, value: number) => {
    const next = [...reminders];
    next[index] = value;
    onChange(next);
  };

  const handleRemove = (index: number) => {
    onChange(reminders.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (reminders.length >= 3) return;
    const used = new Set(reminders);
    const available = REMINDER_OPTIONS.find((o) => !used.has(o.value));
    onChange([...reminders, available?.value ?? 60]);
  };

  return (
    <div className="space-y-2">
      {reminders.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-text-muted dark:text-text-dark-muted shrink-0" />
          <select
            value={value}
            disabled={disabled}
            onChange={(e) => handleChange(index, Number(e.target.value))}
            className="flex-1 px-3 py-2 rounded-xl border border-border dark:border-border-dark bg-surface-dim dark:bg-surface-dark text-text dark:text-text-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {REMINDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} avant
              </option>
            ))}
          </select>
          <button
            onClick={() => handleRemove(index)}
            disabled={disabled}
            className="p-1.5 text-text-muted dark:text-text-dark-muted hover:text-danger transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Supprimer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      {reminders.length < 3 && (
        <button
          onClick={handleAdd}
          disabled={disabled}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter un rappel
        </button>
      )}
    </div>
  );
}

export default function PushNotifications() {
  const { panoramixApi, panoramixToken, user, handleApiError, isDemo } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cohortGroup, setCohortGroup] = useState<PanoramixCohortGroup | null>(null);
  const [config, setConfig] = useState<NtfyConfig | null>(getNtfyConfig());
  const [testStatus, setTestStatus] = useState<{
    type: string;
    status: 'sending' | 'success' | 'error';
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const enabled = !!config?.enabled;

  useEffect(() => {
    if (!panoramixApi) return;
    setLoading(true);
    panoramixApi
      .getUserCohortGroups()
      .then((groups) => {
        if (groups.length > 0) {
          setCohortGroup(groups[0]);
        } else {
          setError('Aucun groupe de cohorte trouve pour ton compte.');
        }
      })
      .catch((e) => {
        handleApiError(e);
        setError(e instanceof Error ? e.message : 'Impossible de recuperer ta cohorte.');
      })
      .finally(() => setLoading(false));
  }, [panoramixApi]);

  const cohortKey = cohortGroup ? buildCohortKey(cohortGroup) : '';
  const cohortLabel = cohortGroup ? buildCohortLabel(cohortGroup) : '';

  const DEMO_TOPIC = 'code-pour-tester';
  // Always compute the deterministic topic from the user's name
  const computedTopicId = user
    ? buildTopicId(user.fullname.split(' ')[0] ?? 'user', user.fullname.split(' ').slice(1).join(' ') ?? 'x')
    : null;
  const topicId = isDemo ? DEMO_TOPIC : computedTopicId;
  const effectiveTopicId = isDemo ? DEMO_TOPIC : (computedTopicId ?? null);

  const handleEnable = async () => {
    if (!topicId || !panoramixToken) return;
    const newConfig: NtfyConfig = {
      enabled: true,
      topicId,
      cohortKey,
      cohortLabel,
      reminders: DEFAULT_REMINDERS,
      notifyUnregistered: true,
      notifyNewEvents: true,
    };
    saveNtfyConfig(newConfig);
    setConfig(newConfig);

    try {
      await fetch('/api/register-notif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panoramixRefreshToken: panoramixToken,
          topicId,
          cohortKey,
          reminders: DEFAULT_REMINDERS,
          notifyUnregistered: true,
          notifyNewEvents: true,
        }),
      });
    } catch {
      // Expected to fail in dev mode
    }
  };

  const syncConfigToBackend = useCallback(
    (cfg: NtfyConfig) => {
      if (!panoramixToken) return;
      fetch('/api/refresh-notif-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panoramixRefreshToken: panoramixToken,
          topicId: cfg.topicId,
          cohortKey: cfg.cohortKey,
          reminders: cfg.reminders,
          notifyUnregistered: cfg.notifyUnregistered,
          notifyNewEvents: cfg.notifyNewEvents,
        }),
      }).catch((e) => { if (import.meta.env.DEV) console.warn('Backend sync failed:', e); });
    },
    [panoramixToken],
  );

  // Migrate: if stored topicId differs from the deterministic one, update config + backend
  useEffect(() => {
    if (config?.enabled && computedTopicId && config.topicId !== computedTopicId) {
      const updated = { ...config, topicId: computedTopicId };
      saveNtfyConfig(updated);
      setConfig(updated);
      syncConfigToBackend(updated);
    }
  }, [computedTopicId]);

  const updateConfig = useCallback(
    (patch: Partial<NtfyConfig>) => {
      if (!config) return;
      const updated = { ...config, ...patch };
      saveNtfyConfig(updated);
      setConfig(updated);
      syncConfigToBackend(updated);
    },
    [config, syncConfigToBackend],
  );

  const handleTest = async (type: 'panoramix' | 'gandalf') => {
    if (!effectiveTopicId) return;
    setTestStatus({ type, status: 'sending' });

    const notifications = {
      panoramix: {
        title: 'Follow-up 1 · Zoidberg2.0 — T-DEV-810',
        message: '14:00 – 14:30 · Salle 210',
        priority: 3 as const,
        tags: ['calendar'],
      },
      gandalf: {
        title: 'Rendu — Zoidberg2.0, T-DEV-810',
        message: 'Dans une semaine, 23h42',
        priority: 3 as const,
        tags: ['triangular_flag_on_post'],
      },
    };

    const labels = { panoramix: 'Panoramix', gandalf: 'Rendu' };

    try {
      const ok = await sendNtfyNotification(effectiveTopicId, notifications[type]);
      setTestStatus({ type, status: ok ? 'success' : 'error' });
      if (ok) {
        addToast({ type: 'success', message: 'Notification distribuée !', duration: 4000 });
      } else {
        addToast({ type: 'error', message: `Echec de l'envoi de la notification "${labels[type]}".`, duration: 5000 });
      }
    } catch {
      setTestStatus({ type, status: 'error' });
      addToast({ type: 'error', message: `Echec de l'envoi de la notification "${labels[type]}".`, duration: 5000 });
    }
    setTimeout(() => setTestStatus(null), 4000);
  };

  const handleCopy = async () => {
    const topic = effectiveTopicId ?? topicId;
    if (!topic) return;
    await navigator.clipboard.writeText(topic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentReminders = config?.reminders ?? DEFAULT_REMINDERS;

  if (loading) {
    return <PageLoader className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-center py-20" size="sm" />;
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-start gap-2 p-4 rounded-xl bg-danger/10 text-danger text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text dark:text-text-dark flex items-center gap-2">
          <Bell className="w-6 h-6" />
          Push Notifications
        </h1>
        <p className="text-text-muted dark:text-text-dark-muted mt-1">
          Recois des notifications sur ton telephone pour tes evenements a venir.
        </p>
      </div>

      {isDemo && (
        <div className="mb-4 p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-warning">
            <strong>Mode demo</strong> — Code partage <code className="font-mono bg-warning/10 px-1 rounded">code-pour-tester</code>.
            Toute personne abonnee a ce canal recevra tes notifications de test.
          </p>
        </div>
      )}

      {/* ── Code card (top, full width) ──────────────────────────────────────── */}
      <div className={`p-5 rounded-2xl border mb-6 ${enabled ? 'border-success/30 bg-success/5' : 'border-border dark:border-border-dark bg-surface dark:bg-surface-dark-dim'}`}>
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${enabled ? 'bg-success/15' : 'bg-primary/10'}`}>
              {enabled ? <BellRing className="w-4 h-4 text-success" /> : <Bell className="w-4 h-4 text-primary" />}
            </div>
            <div>
              <h2 className="font-medium text-text dark:text-text-dark">
                {isDemo ? 'Code de demonstration' : 'Ton code ntfy'}
              </h2>
              <p className="text-xs text-text-muted dark:text-text-dark-muted">
                {isDemo
                  ? 'Code partage pour tester les notifications.'
                  : enabled
                    ? 'Copie ce code dans l\'app ntfy pour recevoir tes notifications.'
                    : 'Active les notifications pour obtenir ton code personnel.'}
              </p>
            </div>
          </div>
        </div>

        {enabled ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-dim dark:bg-surface-dark">
            <code className="flex-1 text-center text-lg font-mono font-semibold text-text dark:text-text-dark tracking-wide">
              {effectiveTopicId}
            </code>
            <button
              onClick={handleCopy}
              className="p-2.5 text-text-muted dark:text-text-dark-muted hover:text-primary transition-colors rounded-xl hover:bg-primary/10 shrink-0"
              title="Copier le code"
            >
              {copied ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        ) : (
          <button
            onClick={handleEnable}
            className="w-full py-3 rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Bell className="w-4 h-4" />
            Activer les notifications push
          </button>
        )}

        {enabled && cohortLabel && (
          <p className="text-xs text-text-muted dark:text-text-dark-muted mt-3">
            Promo : {config.cohortLabel}
          </p>
        )}
      </div>

      {/* ── Two-column layout: Onboarding (left) + Settings (right) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Left: Onboarding / tutorial */}
        <div className="p-5 rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark-dim">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-accent/10">
              <Smartphone className="w-4 h-4 text-accent" />
            </div>
            <h3 className="font-medium text-text dark:text-text-dark">Comment s'abonner</h3>
          </div>

          <div className="space-y-5">
            {/* Step 1 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <span className="text-[11px] font-bold text-primary">1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text dark:text-text-dark mb-1">
                  Telecharge l'app ntfy
                </p>
                <p className="text-xs text-text-muted dark:text-text-dark-muted mb-2">
                  Application gratuite de notifications push.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://apps.apple.com/app/ntfy/id1625396347"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition-colors"
                  >
                    App Store <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=io.heckel.ntfy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition-colors"
                  >
                    Google Play <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <span className="text-[11px] font-bold text-primary">2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text dark:text-text-dark mb-1">
                  Copie {isDemo ? 'le code de demo' : 'ton code'}
                </p>
                <p className="text-xs text-text-muted dark:text-text-dark-muted">
                  {enabled
                    ? isDemo
                      ? 'Le code de demonstration est affiche ci-dessus. Copie-le avec le bouton.'
                      : 'Ton code personnel est affiche ci-dessus. Copie-le avec le bouton.'
                    : 'Active d\'abord les notifications ci-dessus pour obtenir ton code.'}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <span className="text-[11px] font-bold text-primary">3</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text dark:text-text-dark mb-1">
                  Abonne-toi dans ntfy
                </p>
                <p className="text-xs text-text-muted dark:text-text-dark-muted">
                  Ouvre l'app ntfy, appuie sur "+" et colle le code pour t'abonner au canal.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <span className="text-[11px] font-bold text-primary">4</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text dark:text-text-dark mb-1">
                  Envoie un test
                </p>
                <p className="text-xs text-text-muted dark:text-text-dark-muted">
                  Utilise les boutons ci-dessous pour verifier que tu recois bien les notifications sur ton telephone.
                </p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="mt-5 pt-4 border-t border-border/30 dark:border-border-dark/30">
            <p className="text-[11px] text-text-muted dark:text-text-dark-muted leading-relaxed">
              <strong className="text-text dark:text-text-dark">Comment ca marche :</strong>{' '}
              Notifications via{' '}
              <a
                href="https://ntfy.sh"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-dark transition-colors"
              >
                ntfy.sh
              </a>
              {' '}(open-source, gratuit). Ton emploi du temps est verifie automatiquement.
              Au moins un membre de ta promo doit ouvrir Dumbledore une fois par semaine.
            </p>
          </div>
        </div>

        {/* Right: Settings */}
        <div className="space-y-4">
          {/* Panoramix reminders */}
          <div className={`p-5 rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark-dim ${!enabled ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-primary/10">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-medium text-text dark:text-text-dark">Evenements Panoramix</h3>
              <span className="text-xs text-text-muted dark:text-text-dark-muted">(max 3)</span>
            </div>
            <p className="text-xs text-text-muted dark:text-text-dark-muted mb-4 ml-11">
              Cours, follow-ups, soutenances, reviews...
            </p>
            <ReminderSelector
              reminders={currentReminders}
              onChange={(reminders) => updateConfig({ reminders })}
              disabled={!enabled}
            />

            {/* Toggle: notify for unregistered events */}
            <div className="mt-4 pt-4 border-t border-border/30 dark:border-border-dark/30 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-text dark:text-text-dark">Events non inscrits</p>
                <p className="text-[11px] text-text-muted dark:text-text-dark-muted mt-0.5">
                  Recevoir les rappels même pour les events ou tu n'es pas inscrit
                </p>
              </div>
              <button
                onClick={() => updateConfig({ notifyUnregistered: !(config?.notifyUnregistered ?? true) })}
                disabled={!enabled}
                className={`relative shrink-0 w-10 h-[22px] rounded-full transition-colors disabled:cursor-not-allowed ${
                  (config?.notifyUnregistered ?? true)
                    ? 'bg-primary'
                    : 'bg-text-muted/30 dark:bg-text-dark-muted/30'
                }`}
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${
                    (config?.notifyUnregistered ?? true) ? 'translate-x-[18px]' : ''
                  }`}
                />
              </button>
            </div>

            {/* Toggle: notify for new events */}
            <div className="mt-3 pt-3 border-t border-border/30 dark:border-border-dark/30 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-text dark:text-text-dark">Nouveaux events</p>
                <p className="text-[11px] text-text-muted dark:text-text-dark-muted mt-0.5">
                  Etre notifie quand un nouvel event est ajouté sur Panoramix
                </p>
              </div>
              <button
                onClick={() => updateConfig({ notifyNewEvents: !(config?.notifyNewEvents ?? true) })}
                disabled={!enabled}
                className={`relative shrink-0 w-10 h-[22px] rounded-full transition-colors disabled:cursor-not-allowed ${
                  (config?.notifyNewEvents ?? true)
                    ? 'bg-primary'
                    : 'bg-text-muted/30 dark:bg-text-dark-muted/30'
                }`}
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${
                    (config?.notifyNewEvents ?? true) ? 'translate-x-[18px]' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Gandalf deadlines */}
          <div className={`p-5 rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark-dim ${!enabled ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-warning/10">
                <Flag className="w-4 h-4 text-warning" />
              </div>
              <h3 className="font-medium text-text dark:text-text-dark">Rendus Gandalf</h3>
              <span className="inline-flex items-center gap-1 text-xs bg-text-muted/10 dark:bg-text-dark-muted/10 text-text-muted dark:text-text-dark-muted px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" />
                obligatoire
              </span>
            </div>
            <p className="text-xs text-text-muted dark:text-text-dark-muted mb-4 ml-11">
              Date de rendu des projets
            </p>
            <div className="flex items-center gap-2 opacity-50 cursor-not-allowed select-none">
              <Clock className="w-4 h-4 text-text-muted dark:text-text-dark-muted shrink-0" />
              <div className="flex-1 px-3 py-2 rounded-xl border border-border dark:border-border-dark bg-surface-dim dark:bg-surface-dark text-text-muted dark:text-text-dark-muted text-sm">
                1 semaine avant
              </div>
              <div className="w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Test notifications (bottom, full width) ──────────────────────── */}
      <div className={`p-5 rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark-dim ${!enabled ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <Send className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-text dark:text-text-dark">Tester les notifications</h3>
            <p className="text-xs text-text-muted dark:text-text-dark-muted">
              {enabled
                ? 'Envoie une notification test pour verifier que tout fonctionne.'
                : 'Active les notifications pour envoyer des tests.'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([
            { type: 'panoramix' as const, label: 'Panoramix', desc: 'Rappel follow-up', Icon: CalendarDays, color: 'bg-primary-dark hover:bg-primary' },
            { type: 'gandalf' as const, label: 'Rendu', desc: 'Deadline projet', Icon: Flag, color: 'bg-warning hover:bg-warning/80' },
          ]).map(({ type, label, desc, Icon, color }) => (
            <button
              key={type}
              onClick={() => handleTest(type)}
              disabled={!enabled || testStatus?.status === 'sending'}
              className={`px-3 py-3 rounded-xl ${color} text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1.5`}
            >
              <span className="flex items-center gap-1.5">
                {testStatus?.type === type && testStatus.status === 'sending' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : testStatus?.type === type && testStatus.status === 'success' ? (
                  <Check className="w-4 h-4" />
                ) : testStatus?.type === type && testStatus.status === 'error' ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                {label}
              </span>
              <span className="text-[10px] opacity-75 font-normal">{desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
