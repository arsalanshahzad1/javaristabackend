import cron from 'node-cron';
import ChecklistTemplate, { IChecklistTemplate } from '../models/checklist-template.model';
import ChecklistSubmission from '../models/checklist-submission.model';
import Store from '../models/Store';
import User, { type UserRole } from '../models/User';
import Notification from '../models/Notification';
import { createNotification } from '../services/notification.service';
import { Types } from 'mongoose';

/**
 * Returns true if the template's recurrence schedule applies to today's date.
 * Templates with recurrence type 'none' are always skipped.
 */
function isDueToday(template: IChecklistTemplate, now: Date): boolean {
  const rec = template.recurrence;
  switch (rec.type) {
    case 'daily':
      return true;
    case 'weekly':
      return rec.dayOfWeek === now.getDay();
    case 'monthly':
      return rec.dayOfMonth === now.getDate();
    case 'quarterly': {
      // Fire on the 1st day of each quarter (Jan, Apr, Jul, Oct).
      const month = now.getMonth();
      return now.getDate() === 1 && (month === 0 || month === 3 || month === 6 || month === 9);
    }
    default:
      return false;
  }
}

/**
 * Builds the Date object representing the due moment for this template today.
 * Returns null when dueTime is not set (cannot compute deadline).
 */
function buildDueDateTime(template: IChecklistTemplate, now: Date): Date | null {
  const timeStr = template.dueTime ?? template.recurrence?.time;
  if (!timeStr) return null;

  const [rawH, rawM] = timeStr.split(':').map(Number);
  if (isNaN(rawH) || isNaN(rawM)) return null;

  const due = new Date(now);
  due.setHours(rawH, rawM, 0, 0);
  return due;
}

/** Core logic — safe to call directly in tests. */
export async function checkMissedChecklists(): Promise<void> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  let templatesChecked = 0;
  let notificationsSent = 0;

  try {
    const templates = await ChecklistTemplate.find({
      isActive: true,
      isScheduled: true,
      'missedNotification.enabled': true,
    });

    for (const template of templates) {
      try {
        if (!isDueToday(template, now)) continue;

        const dueDateTime = buildDueDateTime(template, now);
        if (!dueDateTime) continue;

        const gracePeriodMinutes = template.missedNotification?.gracePeriodMinutes ?? 30;
        const graceEnd = new Date(dueDateTime.getTime() + gracePeriodMinutes * 60_000);

        if (now <= graceEnd) continue; // still within grace window

        const minutesPastGrace = (now.getTime() - graceEnd.getTime()) / 60_000;

        // Determine which stores this template applies to.
        const storeFilter: Record<string, unknown> = { isActive: true };
        if (template.storeTypes && template.storeTypes.length > 0) {
          storeFilter['storeType'] = { $in: template.storeTypes };
        }
        const stores = await Store.find(storeFilter).select('_id name storeType');

        for (const store of stores) {
          try {
            const storeIdStr = (store._id as Types.ObjectId).toString();

            const submissionExists = await ChecklistSubmission.exists({
              template: template._id,
              storeId: storeIdStr,
              createdAt: { $gte: startOfDay },
            });

            if (submissionExists) continue;

            const steps = template.missedNotification?.escalationSteps ?? [];
            for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
              const step = steps[stepIdx];
              if (step.delayMinutes > minutesPastGrace) continue;

              const dedupKey = `missed-${template._id}-${storeIdStr}-${todayStr}-step${stepIdx}`;

              // Skip if this exact step was already notified today.
              const alreadySent = await Notification.exists({ dedupKey });
              if (alreadySent) continue;

              const users = await User.find({
                storeId: storeIdStr,
                role: { $in: step.notifyRoles as UserRole[] },
                isActive: true,
              }).select('_id role');

              const defaultMessage =
                step.message ||
                `Checklist "${template.title}" was not submitted for store ${store.name ?? storeIdStr}. ` +
                  `${Math.round(minutesPastGrace)} min past deadline.`;

              for (const user of users) {
                await createNotification({
                  userId: user._id as Types.ObjectId,
                  type: 'missed_checklist',
                  title: `Missed Checklist: ${template.title}`,
                  body: defaultMessage,
                  link: `/checklists/submissions?storeId=${storeIdStr}&checklistId=${template._id}`,
                  relatedId: template._id as Types.ObjectId,
                  relatedType: 'ChecklistTemplate',
                  storeId: store._id as Types.ObjectId,
                  checklistId: template._id as Types.ObjectId,
                  recipientRole: (user as { role?: string }).role,
                  severity: template.severity ?? 'medium',
                  dedupKey,
                });
                notificationsSent++;
              }
            }

            templatesChecked++;
          } catch (storeErr) {
            console.error(
              `[missedChecklist] Error processing store ${store._id} for template ${template._id}:`,
              storeErr,
            );
          }
        }
      } catch (templateErr) {
        console.error(`[missedChecklist] Error processing template ${template._id}:`, templateErr);
      }
    }

    console.log(
      `[${new Date().toISOString()}] [missedChecklist] Run complete — templates checked: ${templatesChecked}, notifications sent: ${notificationsSent}`,
    );
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [missedChecklist] Job error:`, err);
  }
}

/** Registers the every-5-minute cron and logs startup. */
export function startMissedChecklistJob(): void {
  cron.schedule('*/5 * * * *', () => {
    void checkMissedChecklists();
  });
  console.log('Missed-checklist job scheduled (every 5 minutes)');
}
