import { Router, type Request, type Response } from 'express';
import { upsertRegistration } from '../lib/store.js';
import { PanoramixServerAPI } from '../lib/panoramix-server.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { panoramixRefreshToken, topicId, cohortKey, reminders, notifyUnregistered, notifyNewEvents } = req.body;
  if (!panoramixRefreshToken || !topicId || !cohortKey) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // Validate token
  const api = new PanoramixServerAPI(panoramixRefreshToken);
  const valid = await api.init();
  if (!valid) {
    res.status(401).json({ error: 'Invalid Panoramix token' });
    return;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(panoramixRefreshToken.split('.')[1], 'base64').toString(),
    );

    await upsertRegistration(payload._id, {
      refreshToken: panoramixRefreshToken,
      topicId,
      cohortKey,
      reminders: Array.isArray(reminders) ? reminders : [1440, 60, 5],
      notifyUnregistered: notifyUnregistered !== false,
      notifyNewEvents: notifyNewEvents !== false,
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({ ok: true });
  } catch {
    res.status(400).json({ error: 'Invalid token format' });
  }
});

export default router;
