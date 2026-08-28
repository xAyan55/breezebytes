import cron from 'node-cron';
import { schedules, schedule_tasks, servers, activity_logs } from '../db/database.js';
import { processManager } from './processManager.js';
import { backupManager } from './backupManager.js';

class SchedulerWorker {
  constructor() {
    this.jobs = new Map(); // scheduleId -> cronJob
  }

  init() {
    console.log('[SCHEDULER] Initializing schedules worker...');
    this.reloadSchedules();
  }

  reloadSchedules() {
    // Stop all current cron jobs
    for (const [id, job] of this.jobs.entries()) {
      job.stop();
    }
    this.jobs.clear();

    const activeList = schedules.find({ is_active: 1 });
    for (const item of activeList) {
      if (cron.validate(item.cron_expression)) {
        try {
          const job = cron.schedule(item.cron_expression, async () => {
            await this.executeSchedule(item.id);
          });
          this.jobs.set(item.id, job);
        } catch (err) {
          console.error(`[SCHEDULER] Invalid cron expression for schedule #${item.id}:`, err.message);
        }
      }
    }
    console.log(`[SCHEDULER] Loaded ${this.jobs.size} active schedules.`);
  }

  async executeSchedule(scheduleId) {
    const schedule = schedules.findById(scheduleId);
    if (!schedule) return;

    const server = servers.findById(schedule.server_id);
    if (!server || server.is_suspended) return;

    console.log(`[SCHEDULER] Executing schedule "${schedule.name}" for server #${server.id}...`);
    schedules.update(schedule.id, { last_run_at: new Date().toISOString() });

    const tasks = schedule_tasks.find({ schedule_id: schedule.id }).sort((a, b) => a.sequence - b.sequence);

    for (const task of tasks) {
      if (task.time_offset > 0) {
        await new Promise(r => setTimeout(r, task.time_offset * 1000));
      }

      try {
        if (task.action_type === 'command' && task.payload) {
          if (processManager.getStatus(server.id) === 'running') {
            processManager.sendCommand(server.id, task.payload);
          }
        } else if (task.action_type === 'power_restart') {
          await processManager.restartServer(server.id);
        } else if (task.action_type === 'power_stop') {
          await processManager.stopServer(server.id);
        } else if (task.action_type === 'power_start') {
          await processManager.startServer(server.id);
        } else if (task.action_type === 'backup') {
          await backupManager.createBackup(server.id, task.payload || `Scheduled Backup (${schedule.name})`);
        }
      } catch (err) {
        console.error(`[SCHEDULER] Task execution failed for task #${task.id}:`, err.message);
      }
    }

    activity_logs.insert({
      server_id: server.id,
      action: 'schedule_execute',
      metadata: JSON.stringify({ scheduleId: schedule.id, name: schedule.name })
    });
  }

  async triggerNow(scheduleId) {
    await this.executeSchedule(scheduleId);
    return { success: true };
  }
}

export const schedulerWorker = new SchedulerWorker();
export default schedulerWorker;
