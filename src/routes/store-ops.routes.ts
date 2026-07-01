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
import { requireEmployeePermission } from '../middleware/requireEmployeePermission';

const router = Router();

// Corporate roles bypass; employee-tier users need recipe.view
const canViewRecipes = [authMiddleware, requireEmployeePermission('recipe.view')];
const adminOnly = [authMiddleware, adminMiddleware];
const managerOrAdmin = [authMiddleware, managerOrAdminMiddleware];

// My recipes — auth only (unchanged: no role restriction)
router.get('/my-recipes', authMiddleware, listRecipes);

// Recipe list/detail — recipe.view permission
router.get('/recipes', ...canViewRecipes, listRecipes);
router.get('/recipes/:slug', ...canViewRecipes, getRecipe);

// Admin-only write operations (unchanged)
router.post('/recipes', ...adminOnly, createRecipe);
router.put('/recipes/:slug', ...adminOnly, updateRecipe);

// Quality photos — manager+ (unchanged)
router.post('/recipes/:id/quality-photos', ...managerOrAdmin, addQualityPhoto);
router.delete('/recipes/:id/quality-photos/:photoId', ...managerOrAdmin, deleteQualityPhoto);

// Cert check — auth only (unchanged)
router.get('/recipes/:id/cert-check', authMiddleware, checkRecipeCert);

// Prep-time logging — auth only (unchanged)
router.post('/recipes/:id/prep-log', authMiddleware, logPrepTime);

// Performance data — manager+ (unchanged)
router.get('/recipes/:id/performance', ...managerOrAdmin, getPerformance);

export default router;
