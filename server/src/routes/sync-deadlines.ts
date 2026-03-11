import { Router, type Request, type Response } from 'express';
import { syncDeadlines, type GandalfDeadline } from '../lib/store.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { topicId, deadlines } = req.body;
  if (!topicId || !Array.isArray(deadlines)) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const valid: GandalfDeadline[] = deadlines
    .filter(
      (d: unknown): d is GandalfDeadline =>
        typeof d === 'object' &&
        d !== null &&
        typeof (d as GandalfDeadline).eventId === 'string' &&
        typeof (d as GandalfDeadline).deadline === 'number',
    )
    .map((d) => ({
      eventId: d.eventId,
      name: d.name || '',
      courseName: d.courseName || '',
      courseCode: d.courseCode || '',
      deadline: d.deadline,
    }));

  await syncDeadlines(topicId, valid);
  res.status(200).json({ ok: true, count: valid.length });
});

export default router;
