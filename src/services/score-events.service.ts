import { computeAndSaveScore } from './javarista-score.service';

// Tracks in-flight recomputes to skip duplicate concurrent triggers.
// For multi-instance deployments, replace with a Redis lock.
const pendingRecomputes = new Set<string>();

/**
 * Fire-and-forget entry point for all automatic score recompute triggers.
 *
 * This function NEVER throws. Callers should not await it — use the pattern:
 *   triggerScoreRecompute(userId, reason).catch(() => {});
 *
 * @param userId - MongoDB ObjectId string of the user whose score should update
 * @param reason - Short label identifying what caused the recompute
 *                 (e.g. 'learning_path_completed', 'checklist_submitted')
 */
export async function triggerScoreRecompute(userId: string, reason: string): Promise<void> {
  if (pendingRecomputes.has(userId)) {
    console.log(`[ScoreRecompute] Skipped duplicate recompute for ${userId}`);
    return;
  }
  pendingRecomputes.add(userId);
  try {
    console.log(`[ScoreRecompute] Triggered for user ${userId} — reason: ${reason}`);
    const user = await computeAndSaveScore(userId, reason);
    console.log(`[ScoreRecompute] Done for user ${userId} — new score: ${user.javaRistaScore}`);
  } catch (err) {
    console.error(`[ScoreRecompute] Error for user ${userId} (reason: ${reason}):`, err);
  } finally {
    pendingRecomputes.delete(userId);
  }
}
