import { Request, Response } from 'express';
import { Types } from 'mongoose';
import asyncHandler from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import Course from '../models/course.model';
import Lesson from '../models/lesson.model';
import CourseEnrollment from '../models/course-enrollment.model';
import LearningPath from '../models/LearningPath';
import { JwtPayload } from '../utils/jwt';
import { issueLevelCertification } from './certification.controller';

// Maps a user's auth state to which requiredRole values they may access.
// community < investor < employee — owner bypasses all restrictions.
function getAllowedRoles(user?: JwtPayload): string[] {
  if (!user) return ['community'];
  if (user.role === 'investor') return ['community', 'investor'];
  // All authenticated operational staff get full employee-tier access
  return ['community', 'investor', 'employee'];
}

// GET /api/academy/courses
export const getCourses = asyncHandler(async (req: Request, res: Response) => {
  const { category, level } = req.query;
  const isAdmin = req.user?.role === 'owner';
  const allowedRoles = getAllowedRoles(req.user);

  const filter: Record<string, unknown> = isAdmin
    ? {}
    : { isActive: true, requiredRole: { $in: allowedRoles } };

  if (category) filter['category'] = category;
  if (level !== undefined) {
    filter['level'] = level === 'null' ? null : Number(level);
  }

  const courses = await Course.find(filter)
    .select('-__v')
    .sort({ category: 1, order: 1, level: 1 })
    .populate('lessons', 'title order contentType durationSeconds');

  successResponse(res, 'Courses fetched', courses);
});

// GET /api/academy/courses/:slug
export const getCourse = asyncHandler(async (req: Request, res: Response) => {
  const allowedRoles = getAllowedRoles(req.user);
  const isAdmin = req.user?.role === 'owner';
  const courseParam = String(req.params['slug'] ?? '');
  const courseQuery = Types.ObjectId.isValid(courseParam)
    ? { _id: courseParam }
    : { slug: courseParam };

  const course = await Course.findOne(isAdmin ? courseQuery : { ...courseQuery, isActive: true }).populate(
    'lessons',
    'title order contentType durationSeconds videoUrl body questions'
  );

  if (!course) {
    errorResponse(res, 'Course not found', 404);
    return;
  }

  if (!isAdmin && !allowedRoles.includes(course.requiredRole)) {
    errorResponse(res, 'You do not have access to this course', 403);
    return;
  }

  successResponse(res, 'Course fetched', course);
});

// GET /api/academy/enrollments  (admin only)
export const getEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.query;
  const filter: Record<string, unknown> = {};

  if (courseId) {
    if (!Types.ObjectId.isValid(String(courseId))) {
      errorResponse(res, 'Invalid course ID', 400);
      return;
    }
    filter['course'] = courseId;
  }

  const enrollments = await CourseEnrollment.find(filter)
    .populate('user', 'name email')
    .populate('course', 'title lessons')
    .sort({ enrolledAt: -1 });

  const data = enrollments.map((enrollment) => {
    const course = enrollment.course as unknown as { lessons?: unknown[] };
    const totalLessons = course?.lessons?.length ?? 0;
    const progressPercent =
      totalLessons > 0 ? Math.round((enrollment.completedLessons.length / totalLessons) * 100) : 0;
    return { ...enrollment.toObject(), progressPercent };
  });

  successResponse(res, 'Enrollments fetched', data);
});

// POST /api/academy/courses  (admin only)
export const createCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.create({
    title: req.body.title,
    slug: req.body.slug,
    description: req.body.description,
    category: req.body.category,
    level: req.body.category === 'certification' ? req.body.level : null,
    order: req.body.order,
    thumbnail: req.body.thumbnail,
    requiredRole: req.body.requiredRole,
    isActive: req.body.isActive,
  });

  await course.populate('lessons', 'title order contentType durationSeconds videoUrl body questions');
  successResponse(res, 'Course created', course, 201);
});

// PUT /api/academy/courses/:id  (admin only)
export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const updates: Record<string, unknown> = {};
  if (req.body.title !== undefined) updates['title'] = req.body.title;
  if (req.body.slug !== undefined) updates['slug'] = req.body.slug;
  if (req.body.description !== undefined) updates['description'] = req.body.description;
  if (req.body.category !== undefined) {
    updates['category'] = req.body.category;
    updates['level'] = req.body.category === 'certification' ? req.body.level : null;
  } else if (req.body.level !== undefined) {
    updates['level'] = req.body.level;
  }
  if (req.body.order !== undefined) updates['order'] = req.body.order;
  if (req.body.thumbnail !== undefined) updates['thumbnail'] = req.body.thumbnail;
  if (req.body.requiredRole !== undefined) updates['requiredRole'] = req.body.requiredRole;
  if (req.body.isActive !== undefined) updates['isActive'] = req.body.isActive;

  const course = await Course.findByIdAndUpdate(req.params['id'], updates, {
    new: true,
    runValidators: true,
  }).populate('lessons', 'title order contentType durationSeconds videoUrl body questions');

  if (!course) {
    errorResponse(res, 'Course not found', 404);
    return;
  }

  successResponse(res, 'Course updated', course);
});

// POST /api/academy/lessons  (admin only)
export const createLesson = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.body.courseId);
  if (!course) {
    errorResponse(res, 'Course not found', 404);
    return;
  }

  const lesson = await Lesson.create({
    course: course._id,
    title: req.body.title,
    order: req.body.order,
    contentType: req.body.contentType,
    videoUrl: req.body.videoUrl,
    body: req.body.body,
    durationSeconds: req.body.durationSeconds,
    questions: req.body.questions ?? [],
  });

  await Course.findByIdAndUpdate(course._id, { $addToSet: { lessons: lesson._id } });
  successResponse(res, 'Lesson created', lesson, 201);
});

// PUT /api/academy/lessons/:id  (admin only)
export const updateLesson = asyncHandler(async (req: Request, res: Response) => {
  const lesson = await Lesson.findByIdAndUpdate(
    req.params['id'],
    {
      title: req.body.title,
      order: req.body.order,
      contentType: req.body.contentType,
      videoUrl: req.body.videoUrl,
      body: req.body.body,
      durationSeconds: req.body.durationSeconds,
      questions: req.body.questions ?? [],
    },
    { new: true, runValidators: true }
  );

  if (!lesson) {
    errorResponse(res, 'Lesson not found', 404);
    return;
  }

  successResponse(res, 'Lesson updated', lesson);
});

// DELETE /api/academy/lessons/:id  (admin only)
export const deleteLesson = asyncHandler(async (req: Request, res: Response) => {
  const lesson = await Lesson.findByIdAndDelete(req.params['id']);
  if (!lesson) {
    errorResponse(res, 'Lesson not found', 404);
    return;
  }

  await Course.findByIdAndUpdate(lesson.course, { $pull: { lessons: lesson._id } });
  successResponse(res, 'Lesson deleted');
});

// GET /api/academy/lessons/:id  (requires auth)
export const getLesson = asyncHandler(async (req: Request, res: Response) => {
  const lesson = await Lesson.findById(req.params['id']).populate(
    'course',
    'title slug requiredRole'
  );

  if (!lesson) {
    errorResponse(res, 'Lesson not found', 404);
    return;
  }

  const course = lesson.course as unknown as { requiredRole: string };
  const allowedRoles = getAllowedRoles(req.user);

  if (!allowedRoles.includes(course.requiredRole)) {
    errorResponse(res, 'You do not have access to this lesson', 403);
    return;
  }

  // Strip correctIndex from quiz questions before sending to client
  const lessonData = {
    ...lesson.toObject(),
    questions: lesson.questions.map((q) => ({
      question: q.question,
      options: q.options,
    })),
  };

  successResponse(res, 'Lesson fetched', lessonData);
});

// POST /api/academy/courses/:id/enroll  (requires auth)
export const enrollCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params['id']);

  if (!course || !course.isActive) {
    errorResponse(res, 'Course not found', 404);
    return;
  }

  const allowedRoles = getAllowedRoles(req.user);
  if (!allowedRoles.includes(course.requiredRole)) {
    errorResponse(res, 'You do not have access to this course', 403);
    return;
  }

  const existing = await CourseEnrollment.findOne({
    user: req.user!.userId,
    course: course._id,
  });

  if (existing) {
    errorResponse(res, 'Already enrolled in this course', 409);
    return;
  }

  const enrollment = await CourseEnrollment.create({
    user: req.user!.userId,
    course: course._id,
    enrolledAt: new Date(),
  });

  successResponse(res, 'Enrolled successfully', enrollment, 201);
});

// GET /api/academy/my-courses  (requires auth)
export const getMyCourses = asyncHandler(async (req: Request, res: Response) => {
  const enrollments = await CourseEnrollment.find({ user: req.user!.userId })
    .populate('course', 'title slug description category level thumbnail lessons order')
    .sort({ enrolledAt: -1 });

  const data = enrollments.map((enrollment) => {
    const course = enrollment.course as unknown as { lessons?: unknown[] };
    const totalLessons = course?.lessons?.length ?? 0;
    const completedCount = enrollment.completedLessons.length;
    const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    return { ...enrollment.toObject(), progressPercent };
  });

  successResponse(res, 'Enrollments fetched', data);
});

// POST /api/academy/lessons/:id/complete  (requires auth)
export const completeLesson = asyncHandler(async (req: Request, res: Response) => {
  const lesson = await Lesson.findById(req.params['id']);

  if (!lesson) {
    errorResponse(res, 'Lesson not found', 404);
    return;
  }

  // Quiz lessons require a passing score
  if (lesson.contentType === 'quiz') {
    const quizScore = req.body.quizScore;
    if (quizScore === undefined || quizScore === null) {
      errorResponse(res, 'quizScore is required for quiz lessons', 400);
      return;
    }
    if (Number(quizScore) < 60) {
      errorResponse(res, 'Quiz score must be at least 60% to complete this lesson', 400);
      return;
    }
  }

  const enrollment = await CourseEnrollment.findOne({
    user: req.user!.userId,
    course: lesson.course,
  }).populate('course', 'lessons level category');

  if (!enrollment) {
    errorResponse(res, 'You are not enrolled in this course', 400);
    return;
  }

  const lessonId = lesson._id as Types.ObjectId;
  const alreadyCompleted = enrollment.completedLessons.some(
    (id) => id.toString() === lessonId.toString()
  );

  if (!alreadyCompleted) {
    enrollment.completedLessons.push(lessonId);
  }

  const course = enrollment.course as unknown as { lessons?: unknown[]; level?: number; category?: string };
  const totalLessons = course?.lessons?.length ?? 0;
  const completedCount = enrollment.completedLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const justCompleted = progressPercent === 100 && !enrollment.completedAt;
  if (justCompleted) {
    enrollment.completedAt = new Date();
  }

  await enrollment.save();

  // Auto-issue the matching Javarista Level certification when a level course is finished.
  if (justCompleted && course.category === 'certification' && course.level) {
    issueLevelCertification(req.user!.userId, course.level).catch(() => {
      // Non-blocking: cert issuance failure should not affect the lesson response.
    });
  }

  successResponse(
    res,
    alreadyCompleted ? 'Lesson already completed' : 'Lesson marked complete',
    { ...enrollment.toObject(), progressPercent }
  );
});

// ── Learning Path controllers ────────────────────────────────────────────────

// GET /api/academy/paths
export const getPaths = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user?.role === 'owner';
  const filter = isAdmin ? {} : { isActive: true };
  const paths = await LearningPath.find(filter)
    .select('-__v')
    .sort({ createdAt: -1 })
    .populate('courses', 'title slug category level thumbnail lessons');
  successResponse(res, 'Learning paths fetched', paths);
});

// GET /api/academy/paths/my
export const getMyPaths = asyncHandler(async (req: Request, res: Response) => {
  const role = req.user!.role;
  const paths = await LearningPath.find({ isActive: true, targetRoles: role })
    .select('-__v')
    .populate('courses', 'title slug category level thumbnail lessons description');
  successResponse(res, 'My learning paths fetched', paths);
});

// POST /api/academy/paths
export const createPath = asyncHandler(async (req: Request, res: Response) => {
  const path = await LearningPath.create({
    title: req.body.title,
    description: req.body.description,
    targetRoles: req.body.targetRoles ?? [],
    targetStores: req.body.targetStores ?? [],
    targetRegions: req.body.targetRegions ?? [],
    courses: req.body.courses ?? [],
    prerequisites: req.body.prerequisites ?? [],
    category: req.body.category,
    estimatedWeeks: req.body.estimatedWeeks,
    isActive: req.body.isActive ?? true,
    createdBy: req.user!.userId,
  });
  successResponse(res, 'Learning path created', path, 201);
});

// PUT /api/academy/paths/:id
export const updatePath = asyncHandler(async (req: Request, res: Response) => {
  const updates: Record<string, unknown> = {};
  const fields = ['title', 'description', 'targetRoles', 'targetStores', 'targetRegions', 'courses', 'prerequisites', 'category', 'estimatedWeeks', 'isActive'];
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  const path = await LearningPath.findByIdAndUpdate(req.params['id'], updates, { new: true, runValidators: true });
  if (!path) { errorResponse(res, 'Learning path not found', 404); return; }
  successResponse(res, 'Learning path updated', path);
});

// DELETE /api/academy/paths/:id
export const deletePath = asyncHandler(async (req: Request, res: Response) => {
  const path = await LearningPath.findByIdAndDelete(req.params['id']);
  if (!path) { errorResponse(res, 'Learning path not found', 404); return; }
  successResponse(res, 'Learning path deleted');
});

// POST /api/academy/paths/:id/enroll
export const enrollPath = asyncHandler(async (req: Request, res: Response) => {
  const path = await LearningPath.findOne({ _id: req.params['id'], isActive: true });
  if (!path) { errorResponse(res, 'Learning path not found', 404); return; }
  await LearningPath.findByIdAndUpdate(path._id, { $inc: { enrollmentCount: 1 } });
  successResponse(res, 'Enrolled in learning path', { pathId: path._id });
});

// POST /api/academy/lessons/:id/quiz-submit  (requires auth)
export const submitQuiz = asyncHandler(async (req: Request, res: Response) => {
  const lesson = await Lesson.findById(req.params['id']).populate('course', 'requiredRole');

  if (!lesson) {
    errorResponse(res, 'Lesson not found', 404);
    return;
  }

  const course = lesson.course as unknown as { requiredRole: string };
  const allowedRoles = getAllowedRoles(req.user);

  if (!allowedRoles.includes(course.requiredRole)) {
    errorResponse(res, 'You do not have access to this lesson', 403);
    return;
  }

  if (lesson.contentType !== 'quiz') {
    errorResponse(res, 'This lesson is not a quiz', 400);
    return;
  }

  const answers = req.body.answers as unknown[];
  if (!Array.isArray(answers)) {
    errorResponse(res, 'answers must be an array', 400);
    return;
  }

  const questions = lesson.questions;
  const total = questions.length;
  let correct = 0;

  const breakdown = questions.map((q, i) => {
    const isCorrect = answers[i] === q.correctIndex;
    if (isCorrect) correct++;
    return { questionIndex: i, correct: isCorrect };
  });

  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = score >= 60;

  successResponse(res, 'Quiz submitted', { score, passed, correct, total, breakdown });
});
