import { useTheme, COLOR_THEMES, type ColorThemeId } from '@/context/theme';
import {
  Sun,
  Moon,
  Check,
  Bell,
  BookOpen,
  Calendar,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

function ThemePreview({ themeId, isDark }: { themeId: ColorThemeId; isDark: boolean }) {
  const preset = COLOR_THEMES.find((t) => t.id === themeId)!;
  const c = preset.colors;

  const bg = isDark ? c['--color-surface-dark'] : c['--color-surface-dim'];
  const surface = isDark ? c['--color-surface-dark-dim'] : c['--color-surface'];
  const text = isDark ? c['--color-text-dark'] : c['--color-text'];
  const muted = isDark ? c['--color-text-dark-muted'] : c['--color-text-muted'];
  const border = isDark ? c['--color-border-dark'] : c['--color-border'];
  const primary = c['--color-primary'];
  const success = c['--color-success'];
  const warning = c['--color-warning'];
  const danger = c['--color-danger'];

  return (
    <div
      className="rounded-xl overflow-hidden text-xs"
      style={{ background: bg, color: text }}
    >
      {/* Mini header */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ background: surface, borderBottom: `1px solid ${border}` }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: primary }} />
          <span className="font-semibold text-[11px]">Dumbledore</span>
        </div>
        <div className="w-5 h-5 rounded-full" style={{ background: `${primary}33` }} />
      </div>

      {/* Mini content */}
      <div className="p-3 space-y-2">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { color: primary, label: '12 cours' },
            { color: success, label: '8 done' },
            { color: warning, label: '3 soon' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg px-2 py-1.5 text-center"
              style={{ background: surface, border: `1px solid ${border}` }}
            >
              <div className="text-[10px] font-bold" style={{ color: s.color }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Cards */}
        <div className="space-y-1.5">
          {['Projet Web', 'DevOps'].map((name) => (
            <div
              key={name}
              className="rounded-lg px-2.5 py-2 flex items-center justify-between"
              style={{ background: surface, border: `1px solid ${border}` }}
            >
              <span className="text-[11px] font-medium">{name}</span>
              <div
                className="w-8 h-1.5 rounded-full"
                style={{ background: `${primary}40` }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ background: primary, width: name === 'Projet Web' ? '70%' : '40%' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Button */}
        <div
          className="rounded-lg px-2.5 py-1.5 text-center text-[10px] font-medium"
          style={{ background: primary, color: '#fff' }}
        >
          Action
        </div>

        {/* Status badges */}
        <div className="flex gap-1.5">
          {[
            { color: success, label: 'OK' },
            { color: warning, label: 'Warn' },
            { color: danger, label: 'Err' },
          ].map((b) => (
            <span
              key={b.label}
              className="rounded-full px-2 py-0.5 text-[9px] font-medium"
              style={{ background: `${b.color}20`, color: b.color }}
            >
              {b.label}
            </span>
          ))}
        </div>

        {/* Muted text */}
        <p className="text-[10px]" style={{ color: muted }}>
          Derniere mise a jour il y a 2h
        </p>
      </div>
    </div>
  );
}

export default function ThemeManagement() {
  const { theme, colorTheme, toggle, setColorTheme } = useTheme();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text dark:text-text-dark">Apparence</h1>
        <p className="text-sm text-text-muted dark:text-text-dark-muted mt-1">
          Personnalisez l'apparence de Dumbledore
        </p>
      </div>

      {/* Dark / Light toggle */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text dark:text-text-dark uppercase tracking-wider">Mode</h2>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            onClick={() => theme === 'dark' && toggle()}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
              theme === 'light'
                ? 'border-primary bg-primary/5 dark:bg-primary-dark/10 ring-2 ring-primary/30'
                : 'border-border dark:border-border-dark hover:border-primary/40'
            }`}
          >
            <Sun className={`w-5 h-5 ${theme === 'light' ? 'text-primary' : 'text-text-muted dark:text-text-dark-muted'}`} />
            <div className="text-left">
              <p className="text-sm font-medium text-text dark:text-text-dark">Clair</p>
            </div>
            {theme === 'light' && <Check className="w-4 h-4 text-primary ml-auto" />}
          </button>
          <button
            onClick={() => theme === 'light' && toggle()}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
              theme === 'dark'
                ? 'border-primary bg-primary/5 dark:bg-primary-dark/10 ring-2 ring-primary/30'
                : 'border-border dark:border-border-dark hover:border-primary/40'
            }`}
          >
            <Moon className={`w-5 h-5 ${theme === 'dark' ? 'text-primary' : 'text-text-muted dark:text-text-dark-muted'}`} />
            <div className="text-left">
              <p className="text-sm font-medium text-text dark:text-text-dark">Sombre</p>
            </div>
            {theme === 'dark' && <Check className="w-4 h-4 text-primary ml-auto" />}
          </button>
        </div>
      </section>

      {/* Color themes */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-text dark:text-text-dark uppercase tracking-wider">Palette de couleurs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COLOR_THEMES.map((preset) => {
            const isActive = colorTheme === preset.id;
            const primary = preset.colors['--color-primary'];
            return (
              <button
                key={preset.id}
                onClick={() => setColorTheme(preset.id)}
                className={`text-left rounded-2xl border transition-all overflow-hidden ${
                  isActive
                    ? 'ring-2 ring-primary/50 border-primary'
                    : 'border-border dark:border-border-dark hover:border-primary/40'
                }`}
              >
                {/* Theme header */}
                <div className="px-4 py-3 flex items-center justify-between bg-surface dark:bg-surface-dark-dim">
                  <div className="flex items-center gap-3">
                    {/* Color swatches */}
                    <div className="flex -space-x-1">
                      {[
                        preset.colors['--color-primary'],
                        preset.colors['--color-success'],
                        preset.colors['--color-warning'],
                        preset.colors['--color-danger'],
                      ].map((color, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full border-2 border-surface dark:border-surface-dark-dim"
                          style={{ background: color }}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-text dark:text-text-dark">
                      {preset.name}
                    </span>
                  </div>
                  {isActive && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: primary }}>
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className="p-3 grid grid-cols-2 gap-2">
                  <ThemePreview themeId={preset.id} isDark={false} />
                  <ThemePreview themeId={preset.id} isDark={true} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Live preview section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-text dark:text-text-dark uppercase tracking-wider">Apercu en direct</h2>
        <div className="rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark-dim p-6 space-y-5">
          {/* Sample cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: BookOpen, label: 'Cours actifs', value: '12', color: 'primary' },
              { icon: Calendar, label: 'Deadlines', value: '3', color: 'warning' },
              { icon: TrendingUp, label: 'Moyenne', value: '14.5', color: 'success' },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-border dark:border-border-dark bg-surface-dim dark:bg-surface-dark p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className={`w-4 h-4 text-${card.color}`} />
                  <span className="text-xs text-text-muted dark:text-text-dark-muted">{card.label}</span>
                </div>
                <p className={`text-xl font-bold text-${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Sample buttons */}
          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium">
              Bouton principal
            </button>
            <button className="px-4 py-2 rounded-xl border border-border dark:border-border-dark text-text dark:text-text-dark text-sm font-medium hover:bg-surface-dim dark:hover:bg-surface-dark">
              Secondaire
            </button>
            <button className="px-4 py-2 rounded-xl bg-danger/10 text-danger text-sm font-medium">
              Danger
            </button>
          </div>

          {/* Sample badges */}
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-success/15 text-success">Termine</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-warning/15 text-warning">En cours</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-danger/15 text-danger">En retard</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary">Info</span>
          </div>

          {/* Sample notification */}
          <div className="flex items-start gap-3 rounded-xl border border-border dark:border-border-dark bg-surface-dim dark:bg-surface-dark p-4">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text dark:text-text-dark">Nouvelle deadline</p>
              <p className="text-xs text-text-muted dark:text-text-dark-muted mt-0.5">
                Le projet T-WEB-800 doit etre rendu dans 3 jours
              </p>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-warning" />
            </div>
          </div>

          {/* Sample progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-text dark:text-text-dark">Progression du semestre</span>
              <span className="text-xs text-text-muted dark:text-text-dark-muted">68%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-dim dark:bg-surface-dark overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: '68%' }} />
            </div>
          </div>

          {/* Text samples */}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text dark:text-text-dark">Texte principal</p>
            <p className="text-sm text-text-muted dark:text-text-dark-muted">Texte secondaire / muted</p>
            <p className="text-sm text-primary">Texte accent / liens</p>
          </div>
        </div>
      </section>
    </div>
  );
}
