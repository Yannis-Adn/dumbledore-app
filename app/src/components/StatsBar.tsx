import type { LucideIcon } from 'lucide-react';

interface Stat {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
}

interface Props {
  stats: Stat[];
}

export default function StatsBar({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-surface dark:bg-surface-dark-dim rounded-2xl shadow-sm dark:shadow-none dark:border dark:border-border-dark p-4 sm:p-5"
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl bg-surface-dim dark:bg-surface-dark ${stat.color}`}
            >
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text dark:text-text-dark">
                {stat.value}
              </p>
              <p className="text-xs text-text-muted dark:text-text-dark-muted">
                {stat.label}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
