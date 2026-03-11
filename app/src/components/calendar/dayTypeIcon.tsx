import { Laptop, GraduationCap, Building2, CalendarOff } from 'lucide-react';
import type { DayType } from '@/lib/planning';

export function dayTypeIcon(type: DayType, remote: boolean) {
  if (remote) return <Laptop className="w-3 h-3" />;
  if (type === 'school') return <GraduationCap className="w-3 h-3" />;
  if (type === 'entreprise') return <Building2 className="w-3 h-3" />;
  if (type === 'holiday') return <CalendarOff className="w-3 h-3" />;
  return null;
}
