import { Types } from 'mongoose';
import LearningPath from '../models/LearningPath';
import LearningPathEnrollment, { ILearningPathEnrollment } from '../models/LearningPathEnrollment';
import User from '../models/User';
import Store from '../models/Store';
import { createNotification } from './notification.service';
import { triggerScoreRecompute } from './score-events.service';

// ─── Prerequisite Check ───────────────────────────────────────────────────────

/**
 * Checks whether a user has completed all prerequisite learning paths
 * required before enrolling in the given path.
 *
 * @returns { passed, missing } — passed is true only when every prerequisite
 *   has a completed enrollment for this user.
 */
export async function checkPrerequisites(
  userId: string,
  learningPathId: string
): Promise<{ passed: boolean; missing: Array<{ id: string; title: string }> }> {
  try {
    const path = await LearningPath.findById(learningPathId).populate<{
      prerequisites: Array<{ _id: Types.ObjectId; title: string }>;
    }>('prerequisites', '_id title');

    if (!path) {
      throw new Error('Learning path not found');
    }

    if (!path.prerequisites || path.prerequisites.length === 0) {
      return { passed: true, missing: [] };
    }

    const missing: Array<{ id: string; title: string }> = [];

    for (const prereq of path.prerequisites as Array<{ _id: Types.ObjectId; title: string }>) {
      const completed = await LearningPathEnrollment.exists({
        userId: new Types.ObjectId(userId),
        learningPathId: prereq._id,
        status: 'completed',
      });

      if (!completed) {
        missing.push({ id: prereq._id.toString(), title: prereq.title });
      }
    }

    return { passed: missing.length === 0, missing };
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

// ─── Enroll User ──────────────────────────────────────────────────────────────

/**
 * Enrolls a user in a learning path after validating that no duplicate
 * enrollment exists and all prerequisites are satisfied.
 *
 * @throws if already enrolled or prerequisites are not met.
 */
export async function enrollUser(params: {
  userId: string;
  learningPathId: string;
  storeId: string;
  enrolledBy: string;
  dueDate?: Date;
}): Promise<ILearningPathEnrollment> {
  try {
    const { userId, learningPathId, storeId, enrolledBy, dueDate } = params;

    const existing = await LearningPathEnrollment.exists({
      userId: new Types.ObjectId(userId),
      learningPathId: new Types.ObjectId(learningPathId),
    });

    if (existing) {
      throw new Error('User is already enrolled in this path');
    }

    const { passed, missing } = await checkPrerequisites(userId, learningPathId);
    if (!passed) {
      const titles = missing.map((m) => `"${m.title}"`).join(', ');
      throw new Error(`Prerequisites not completed: ${titles}`);
    }

    const path = await LearningPath.findById(learningPathId).select('courses');
    if (!path) {
      throw new Error('Learning path not found');
    }

    const enrollment = await LearningPathEnrollment.create({
      userId: new Types.ObjectId(userId),
      learningPathId: new Types.ObjectId(learningPathId),
      storeId: new Types.ObjectId(storeId),
      enrolledBy: new Types.ObjectId(enrolledBy),
      dueDate,
      status: 'enrolled',
      progress: {
        totalItems: path.courses.length,
        completedItems: 0,
        totalReadingTimeSec: 0,
        quizScores: [],
        videoProgress: [],
      },
    });

    return enrollment;
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

// ─── Record Reading Time ──────────────────────────────────────────────────────

/**
 * Adds reading seconds to an enrollment's accumulated reading time and
 * optionally advances the maximum scroll depth, then triggers a completion
 * evaluation.
 *
 * @param params.scrollDepthPercent - How far the user scrolled (0–100).
 *   Only stored when it exceeds the previously recorded maximum; never
 *   decreases the stored value.
 */
export async function recordReadingTime(params: {
  enrollmentId: string;
  userId: string;
  additionalSeconds: number;
  /** Optional scroll depth reached this session (0–100). */
  scrollDepthPercent?: number;
}): Promise<void> {
  try {
    const { enrollmentId, userId, additionalSeconds, scrollDepthPercent } = params;

    const enrollment = await LearningPathEnrollment.findById(enrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');
    if (enrollment.userId.toString() !== userId) throw new Error('Unauthorized');

    enrollment.progress.totalReadingTimeSec += additionalSeconds;

    if (
      scrollDepthPercent !== undefined &&
      scrollDepthPercent > enrollment.progress.maxScrollDepthPercent
    ) {
      enrollment.progress.maxScrollDepthPercent = scrollDepthPercent;
    }

    enrollment.lastActivityAt = new Date();
    await enrollment.save();

    await evaluateCompletion(enrollment);
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

// ─── Record Video Progress ────────────────────────────────────────────────────

/**
 * Updates the watched percentage for a specific video item in an enrollment.
 * Only advances the percentage — never decreases it.
 */
export async function recordVideoProgress(params: {
  enrollmentId: string;
  userId: string;
  itemId: string;
  watchedPercent: number;
}): Promise<void> {
  try {
    const { enrollmentId, userId, itemId, watchedPercent } = params;

    const enrollment = await LearningPathEnrollment.findById(enrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');
    if (enrollment.userId.toString() !== userId) throw new Error('Unauthorized');

    const itemObjId = new Types.ObjectId(itemId);
    const existing = enrollment.progress.videoProgress.find(
      (v) => v.itemId.toString() === itemId
    );

    if (existing) {
      if (watchedPercent > existing.watchedPercent) {
        existing.watchedPercent = watchedPercent;
      }
      existing.lastWatchedAt = new Date();
    } else {
      enrollment.progress.videoProgress.push({
        itemId: itemObjId,
        watchedPercent,
        lastWatchedAt: new Date(),
      });
    }

    enrollment.lastActivityAt = new Date();
    await enrollment.save();

    await evaluateCompletion(enrollment);
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

// ─── Record Quiz Score ────────────────────────────────────────────────────────

/**
 * Records or updates a quiz score for a specific item.
 * Increments attempts on repeat submissions; only keeps the highest score.
 * Sets passedAt when the score meets the path's minQuizScore threshold.
 */
export async function recordQuizScore(params: {
  enrollmentId: string;
  userId: string;
  itemId: string;
  score: number;
}): Promise<void> {
  try {
    const { enrollmentId, userId, itemId, score } = params;

    const enrollment = await LearningPathEnrollment.findById(enrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');
    if (enrollment.userId.toString() !== userId) throw new Error('Unauthorized');

    const pathDoc = await LearningPath.findById(enrollment.learningPathId).select('completionRequirements');
    const minQuizScore = pathDoc?.completionRequirements?.minQuizScore ?? 0;

    const itemObjId = new Types.ObjectId(itemId);
    const existing = enrollment.progress.quizScores.find(
      (q) => q.itemId.toString() === itemId
    );

    if (existing) {
      existing.attempts += 1;
      if (score > existing.score) {
        existing.score = score;
      }
      if (!existing.passedAt && existing.score >= minQuizScore) {
        existing.passedAt = new Date();
      }
    } else {
      const entry: {
        itemId: Types.ObjectId;
        score: number;
        attempts: number;
        passedAt?: Date;
      } = { itemId: itemObjId, score, attempts: 1 };
      if (score >= minQuizScore) entry.passedAt = new Date();
      enrollment.progress.quizScores.push(entry);
    }

    enrollment.lastActivityAt = new Date();
    await enrollment.save();

    await evaluateCompletion(enrollment);

    triggerScoreRecompute(enrollment.userId.toString(), 'quiz_score_recorded').catch(() => {});
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

// ─── Evaluate Completion ──────────────────────────────────────────────────────

/**
 * Checks whether all completion requirements for an enrollment's learning path
 * have been met. Transitions the enrollment to 'completed' (with a notification)
 * or advances it to 'in_progress' as appropriate.
 */
export async function evaluateCompletion(
  enrollment: ILearningPathEnrollment
): Promise<void> {
  try {
    if (enrollment.status === 'completed' || enrollment.status === 'withdrawn') {
      return;
    }

    const path = await LearningPath.findById(enrollment.learningPathId);
    if (!path) return;

    const req = path.completionRequirements;
    const prog = enrollment.progress;

    // When a minimum reading time is configured, the learner must also have
    // scrolled at least 80 % of the content — prevents "open and close" gaming.
    const readingOk =
      req.minReadingTimeSeconds === 0
        ? prog.totalReadingTimeSec >= 0
        : prog.totalReadingTimeSec >= req.minReadingTimeSeconds &&
          prog.maxScrollDepthPercent >= 80;

    const videoOk =
      req.minVideoCompletionPercent === 0 ||
      prog.videoProgress.every((v) => v.watchedPercent >= req.minVideoCompletionPercent);

    const quizOk =
      req.minQuizScore === 0 ||
      prog.quizScores.every((q) => q.passedAt != null);

    const allItemsOk = !req.requireAllItems ||
      prog.completedItems >= prog.totalItems;

    const allConditionsMet = readingOk && videoOk && quizOk && allItemsOk;

    if (allConditionsMet) {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
      await enrollment.save();

      await createNotification({
        userId: enrollment.userId,
        type: 'general',
        title: 'Learning Path Completed',
        body: `You have completed "${path.title}".`,
      });

      triggerScoreRecompute(enrollment.userId.toString(), 'learning_path_completed').catch(() => {});
    } else if (enrollment.status === 'enrolled') {
      enrollment.status = 'in_progress';
      await enrollment.save();
    }
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

// ─── Enroll Store ─────────────────────────────────────────────────────────────

/**
 * Enrolls all active users in a store into a learning path.
 * Users already enrolled are counted as skipped. Users blocked by missing
 * prerequisites are skipped and the reason is added to errors[].
 */
export async function enrollStore(params: {
  learningPathId: string;
  storeId: string;
  enrolledBy: string;
  dueDate?: Date;
}): Promise<{ enrolled: number; skipped: number; errors: string[] }> {
  const { learningPathId, storeId, enrolledBy, dueDate } = params;

  const users = await User.find({ storeId, isActive: true }).select('_id');

  let enrolled = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      await enrollUser({ userId: user._id.toString(), learningPathId, storeId, enrolledBy, dueDate });
      enrolled++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('already enrolled')) {
        skipped++;
      } else if (message.includes('Prerequisites not completed')) {
        skipped++;
        errors.push(`User ${user._id}: ${message}`);
      } else {
        errors.push(`User ${user._id}: ${message}`);
      }
    }
  }

  return { enrolled, skipped, errors };
}

// ─── Enroll Region ────────────────────────────────────────────────────────────

/**
 * Enrolls all active users in every store belonging to a region into a
 * learning path. Aggregates results from enrollStore for each store found.
 */
export async function enrollRegion(params: {
  learningPathId: string;
  regionId: string;
  enrolledBy: string;
  dueDate?: Date;
}): Promise<{ enrolled: number; skipped: number; errors: string[] }> {
  const { learningPathId, regionId, enrolledBy, dueDate } = params;

  const stores = await Store.find({ regionId, isActive: true }).select('_id');

  let enrolled = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const store of stores) {
    const result = await enrollStore({
      learningPathId,
      storeId: store._id.toString(),
      enrolledBy,
      dueDate,
    });
    enrolled += result.enrolled;
    skipped += result.skipped;
    errors.push(...result.errors);
  }

  return { enrolled, skipped, errors };
}
