const NTFY_BASE = 'https://ntfy.sh';

export async function sendNotification(
  topicId: string,
  opts: {
    title: string;
    message: string;
    priority?: number;
    tags?: string[];
    click?: string;
  },
): Promise<boolean> {
  const payload: Record<string, unknown> = {
    topic: topicId,
    title: opts.title,
    message: opts.message,
    priority: opts.priority ?? 3,
  };
  if (opts.tags?.length) payload.tags = opts.tags;
  if (opts.click) payload.click = opts.click;

  const res = await fetch(NTFY_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.ok;
}
