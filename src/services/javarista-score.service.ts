import User, { IUser } from '../models/User';
import CourseEnrollment from '../models/course-enrollment.model';
import UserProgress from '../models/UserProgress';
import ChecklistSchedule from '../models/ChecklistSchedule';
import Certification from '../models/certification.model';

/**
 * Recomputes the JavaRista Score for a given user and persists it.
 *
 * Weights (max 100 pts total):
 *   - Training compliance  : 30 pts  (completed course enrollments / total)
 *   - Manual compliance    : 20 pts  (completed manuals / total)
 *   - Checklist compliance : 25 pts  (completed schedules / total)
 *   - Certifications       : 15 pts  (1 pt per active cert, capped at 15)
 *   - Promotion readiness  : +10 pts (bonus if promotionReadiness === 'ready')
 *
 * @param userId   - MongoDB ObjectId string of the target user
 * @param reason   - Short label describing what triggered this recompute
 * @returns The updated user document (with javaRistaScore, lastComputedAt, lastComputeReason set)
 */
export interface ScoreBreakdownItem {
  label: string;
  points: number;
  maxPoints: number;
}

interface ScoreComponents {
  total: number;
  breakdown: ScoreBreakdownItem[];
}

async function computeScoreComponents(
  userId: string
): Promise<{ user: IUser; components: ScoreComponents }> {
  const user = await User.findById(userId);
  if (!user) throw new Error(`User not found: ${userId}`);

  const [enrollments, manualProgress, schedules, activeCerts] = await Promise.all([
    CourseEnrollment.find({ user: userId }).populate('course', 'lessons'),
    UserProgress.find({ user: userId }),
    (ChecklistSchedule as unknown as {
      find: (q: Record<string, unknown>) => Promise<Array<{ status?: string }>>;
    }).find({ assignedTo: userId }),
    Certification.countDocuments({ user: userId, status: 'active' }),
  ]);

  // Training compliance: 30 points max
  const totalCourses = enrollments.length;
  const completedCourses = enrollments.filter((e) => e.completedAt).length;
  const trainingScore = totalCourses > 0
    ? Math.round((completedCourses / totalCourses) * 30)
    : 0;

  // Manual compliance: 20 points max
  const totalManuals = manualProgress.length;
  const completedManuals = manualProgress.filter(
    (p: unknown) => (p as { completed?: boolean }).completed
  ).length;
  const manualScore = totalManuals > 0
    ? Math.round((completedManuals / totalManuals) * 20)
    : 0;

  // Checklist compliance: 25 points max
  const totalSchedules = schedules.length;
  const completedSchedules = schedules.filter((s) => s.status === 'completed').length;
  const checklistScore = totalSchedules > 0
    ? Math.round((completedSchedules / totalSchedules) * 25)
    : 0;

  // Certifications: 15 points max (1 pt per active cert)
  const certScore = Math.min(15, activeCerts);

  // Promotion readiness bonus: +10 if ready
  const readinessBonus = user.promotionReadiness === 'ready' ? 10 : 0;

  const total = Math.min(100, trainingScore + manualScore + checklistScore + certScore + readinessBonus);

  return {
    user,
    components: {
      total,
      breakdown: [
        { label: 'Training', points: trainingScore, maxPoints: 30 },
        { label: 'Manuals', points: manualScore, maxPoints: 20 },
        { label: 'Checklists', points: checklistScore, maxPoints: 25 },
        { label: 'Certifications', points: certScore, maxPoints: 15 },
        { label: 'Promotion Readiness', points: readinessBonus, maxPoints: 10 },
      ],
    },
  };
}

export async function computeAndSaveScore(
  userId: string,
  reason = 'manual'
): Promise<IUser> {
  const { user, components } = await computeScoreComponents(userId);

  user.javaRistaScore = components.total;
  user.lastComputedAt = new Date();
  user.lastComputeReason = reason;
  await user.save();

  return user;
}

/** Read-only score breakdown for display — does not persist or change lastComputedAt/lastComputeReason. */
export async function getScoreBreakdown(userId: string): Promise<{
  total: number;
  breakdown: ScoreBreakdownItem[];
  lastComputedAt: Date | undefined;
  lastComputeReason: string | undefined;
}> {
  const { user, components } = await computeScoreComponents(userId);
  return {
    total: components.total,
    breakdown: components.breakdown,
    lastComputedAt: user.lastComputedAt,
    lastComputeReason: user.lastComputeReason,
  };
}
