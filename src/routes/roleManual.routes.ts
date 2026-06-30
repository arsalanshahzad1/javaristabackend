import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/requireRole';
import {
  getManuals,
  getMyManual,
  getManual,
  createManual,
  updateManual,
  deleteManual,
  addSection,
  updateSection,
  deleteSection,
  addItem,
  updateItem,
  deleteItem,
} from '../controllers/roleManual.controller';

const router = Router();

const managerOrAdmin = requireRole(
  'owner',
  'ceo',
  'coo',
  'cfo',
  'regional_manager',
  'area_manager',
  'hr_manager',
  'marketing_manager'
);

// Public authenticated routes
router.get('/', authMiddleware, getManuals);
router.get('/my', authMiddleware, getMyManual);
router.get('/:id', authMiddleware, getManual);

// Admin / management routes — manual CRUD
router.post('/', authMiddleware, managerOrAdmin, createManual);
router.put('/:id', authMiddleware, managerOrAdmin, updateManual);
router.delete('/:id', authMiddleware, managerOrAdmin, deleteManual);

// Section CRUD
router.post('/:id/sections', authMiddleware, managerOrAdmin, addSection);
router.put('/:id/sections/:sectionId', authMiddleware, managerOrAdmin, updateSection);
router.delete('/:id/sections/:sectionId', authMiddleware, managerOrAdmin, deleteSection);

// Item CRUD
router.post('/:id/sections/:sectionId/items', authMiddleware, managerOrAdmin, addItem);
router.put('/:id/sections/:sectionId/items/:itemId', authMiddleware, managerOrAdmin, updateItem);
router.delete('/:id/sections/:sectionId/items/:itemId', authMiddleware, managerOrAdmin, deleteItem);

export default router;
