import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireServerAccess } from '../middleware/rbac.js';
import { schedules, schedule_tasks } from '../db/database.js';
import { schedulerWorker } from '../daemon/schedulerWorker.js';

const router = Router();

// GET /api/v1/servers/:id/schedules
router.get('/:id/schedules', authenticate, requireServerAccess('server.schedule.manage'), (req, res) => {
  const list = schedules.find({ server_id: req.server.id });
  const enriched = list.map(s => {
    const tasks = schedule_tasks.find({ schedule_id: s.id }).sort((a, b) => a.sequence - b.sequence);
    return { ...s, tasks };
  });
  return res.json({ success: true, data: enriched });
});

// POST /api/v1/servers/:id/schedules
router.post('/:id/schedules', authenticate, requireServerAccess('server.schedule.manage'), (req, res) => {
  const { name, cron_expression, is_active = 1, tasks = [] } = req.body;
  if (!name || !cron_expression) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Name and cron expression are required.' } });
  }

  const newSchedule = schedules.insert({
    server_id: req.server.id,
    name: name.trim(),
    cron_expression: cron_expression.trim(),
    is_active: is_active ? 1 : 0
  });

  tasks.forEach((task, index) => {
    schedule_tasks.insert({
      schedule_id: newSchedule.id,
      sequence: index + 1,
      action_type: task.action_type || 'command',
      payload: task.payload || '',
      time_offset: Number(task.time_offset) || 0
    });
  });

  schedulerWorker.reloadSchedules();
  return res.json({ success: true, data: newSchedule });
});

// POST /api/v1/servers/:id/schedules/:scheduleId/trigger
router.post('/:id/schedules/:scheduleId/trigger', authenticate, requireServerAccess('server.schedule.manage'), async (req, res) => {
  try {
    await schedulerWorker.triggerNow(Number(req.params.scheduleId));
    return res.json({ success: true, message: 'Schedule triggered successfully.' });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'TRIGGER_FAILED', message: err.message } });
  }
});

// DELETE /api/v1/servers/:id/schedules/:scheduleId
router.delete('/:id/schedules/:scheduleId', authenticate, requireServerAccess('server.schedule.manage'), (req, res) => {
  const schedId = Number(req.params.scheduleId);
  schedule_tasks.deleteWhere({ schedule_id: schedId });
  schedules.delete(schedId);
  schedulerWorker.reloadSchedules();
  return res.json({ success: true, message: 'Schedule deleted.' });
});

export default router;
