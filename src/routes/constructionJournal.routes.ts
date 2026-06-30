import { Router } from 'express';
import {
  listJournals,
  getJournal,
  createJournal,
  updateJournal,
  deleteJournal,
  addJournalPhoto,
  removeJournalPhoto,
} from '../controllers/constructionJournal.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/requireRole';
import { uploadRecipePhoto } from '../config/cloudinary';

const router = Router();

const investorAccess = [authMiddleware, requireRole('investor', 'owner', 'ceo', 'coo', 'cfo')];
const adminOnly = [authMiddleware, requireRole('owner')];

router.get('/', ...investorAccess, listJournals);
router.get('/:id', ...investorAccess, getJournal);
router.post('/', ...adminOnly, createJournal);
router.put('/:id', ...adminOnly, updateJournal);
router.delete('/:id', ...adminOnly, deleteJournal);
router.post('/:id/photos', ...adminOnly, uploadRecipePhoto.single('photo'), addJournalPhoto);
router.delete('/:id/photos/:photoIndex', ...adminOnly, removeJournalPhoto);

export default router;
