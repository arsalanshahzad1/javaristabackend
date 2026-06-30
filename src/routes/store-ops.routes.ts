import { Router } from 'express';
import {
  listRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  addQualityPhoto,
  deleteQualityPhoto,
  logPrepTime,
  getPerformance,
  checkRecipeCert,
} from '../controllers/store-ops.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { managerOrAdminMiddleware } from '../middleware/managerOrAdmin.middleware';
import { requireRole } from '../middleware/requireRole';

const router = Router();

const employeeOrAdmin = [authMiddleware, requireRole('barista', 'trainee', 'shift_supervisor', 'store_manager', 'assistant_manager', 'area_manager', 'regional_manager', 'coo', 'cfo', 'ceo', 'owner', 'hr_manager', 'marketing_manager')];
const adminOnly = [authMiddleware, adminMiddleware];
const managerOrAdmin = [authMiddleware, managerOrAdminMiddleware];

// My recipes — any authenticated user (must be before /recipes/:slug to avoid conflict)
router.get('/my-recipes', authMiddleware, listRecipes);

// Recipe CRUD
router.get('/recipes', ...employeeOrAdmin, listRecipes);
router.get('/recipes/:slug', ...employeeOrAdmin, getRecipe);
router.post('/recipes', ...adminOnly, createRecipe);
router.put('/recipes/:slug', ...adminOnly, updateRecipe);

// Quality photos (by _id, management+)
router.post('/recipes/:id/quality-photos', ...managerOrAdmin, addQualityPhoto);
router.delete('/recipes/:id/quality-photos/:photoId', ...managerOrAdmin, deleteQualityPhoto);

// Certification pre-check (any authenticated user)
router.get('/recipes/:id/cert-check', authMiddleware, checkRecipeCert);

// Prep-time logging (any employee)
router.post('/recipes/:id/prep-log', authMiddleware, logPrepTime);

// Performance data (management+)
router.get('/recipes/:id/performance', ...managerOrAdmin, getPerformance);

export default router;
