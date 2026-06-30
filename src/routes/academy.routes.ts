import { Router } from 'express';
import {
  getCourses,
  getCourse,
  getLesson,
  enrollCourse,
  getMyCourses,
  completeLesson,
  submitQuiz,
  getEnrollments,
  createCourse,
  updateCourse,
  createLesson,
  updateLesson,
  deleteLesson,
  getPaths,
  getMyPaths,
  createPath,
  updatePath,
  deletePath,
  enrollPath,
} from '../controllers/academy.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { optionalAuth } from '../middleware/optionalAuth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

router.get('/courses', optionalAuth, getCourses);
router.get('/enrollments', authMiddleware, adminMiddleware, getEnrollments);
router.get('/my-courses', authMiddleware, getMyCourses);
router.get('/courses/:slug', optionalAuth, getCourse);
router.get('/lessons/:id', authMiddleware, getLesson);
router.post('/courses', authMiddleware, adminMiddleware, createCourse);
router.put('/courses/:id', authMiddleware, adminMiddleware, updateCourse);
router.post('/lessons', authMiddleware, adminMiddleware, createLesson);
router.put('/lessons/:id', authMiddleware, adminMiddleware, updateLesson);
router.delete('/lessons/:id', authMiddleware, adminMiddleware, deleteLesson);
router.post('/courses/:id/enroll', authMiddleware, enrollCourse);
router.post('/lessons/:id/complete', authMiddleware, completeLesson);
router.post('/lessons/:id/quiz-submit', authMiddleware, submitQuiz);

// Learning paths
router.get('/paths', authMiddleware, getPaths);
router.get('/paths/my', authMiddleware, getMyPaths);
router.post('/paths', authMiddleware, adminMiddleware, createPath);
router.put('/paths/:id', authMiddleware, adminMiddleware, updatePath);
router.delete('/paths/:id', authMiddleware, adminMiddleware, deletePath);
router.post('/paths/:id/enroll', authMiddleware, enrollPath);

export default router;
