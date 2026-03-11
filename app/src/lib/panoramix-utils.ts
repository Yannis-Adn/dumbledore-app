import type { PanoramixEvent, PanoramixSlot } from './panoramix-api';

/** Extract the Gandalf course ID from a Panoramix event (via tpIds) */
export function getGandalfCourseId(pe: PanoramixEvent): number | null {
  const tp = pe.moduleRef?.tpIds?.find((t) => t.source === 'gandalf');
  return tp ? parseInt(tp.id, 10) : null;
}

/** Get the display name of the first registered student/group in a slot */
export function getSlotGroupName(slot: PanoramixSlot): string | null {
  const first = slot.registeredStudents?.[0];
  if (!first) return null;
  if (first.members) return first.members.map(m => `${m.firstName} ${m.lastName}`).join(', ');
  return `${first.firstName ?? ''} ${first.lastName ?? ''}`.trim() || null;
}
