/**
 * Performance profile is assembled on the fly from multiple collections.
 * No Mongoose schema — this file defines the TypeScript response shapes only.
 */

export interface CourseInProgress {
  courseId: unknown;
  title: string;
  progressPercent: number;
}

export interface AcademyProfile {
  enrolledCourses: number;
  completedCourses: number;
  /** Highest completed javarista_level_X certification, 0 if none */
  currentLevel: number;
  coursesInProgress: CourseInProgress[];
}

export interface CertificationSummary {
  type: string;
  issuedAt: Date;
  certificateNumber: string;
}

export interface CertificationsProfile {
  total: number;
  list: CertificationSummary[];
}

export interface RecentChecklistSubmission {
  templateTitle: string;
  status: string;
  submittedAt: Date | undefined;
}

export interface ChecklistsProfile {
  totalSubmitted: number;
  totalApproved: number;
  totalFlagged: number;
  /** Percentage: (approved / submitted) * 100 */
  approvalRate: number;
  recentSubmissions: RecentChecklistSubmission[];
}

export interface BrewingProfile {
  totalBrews: number;
  avgRating: number | null;
  thisMonth: number;
}

export interface PerformanceProfile {
  user: {
    id: unknown;
    name: string;
    email: string;
    role: string;
  };
  academy: AcademyProfile;
  certifications: CertificationsProfile;
  checklists: ChecklistsProfile;
  brewing: BrewingProfile;
}

export interface TeamMemberSummary {
  user: {
    id: unknown;
    name: string;
    email: string;
    role: string;
  };
  currentLevel: number;
  totalBrews: number;
  approvalRate: number;
  completedCourses: number;
}
