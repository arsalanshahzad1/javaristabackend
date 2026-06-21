import { Router } from 'express';
import {
  getMyCertifications,
  getAllCertifications,
  getUserCertifications,
  issueCertification,
  revokeCertification,
  verifyCertificate,
} from '../controllers/certification.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

// Public — QR-code / link verification
router.get('/verify/:certificateNumber', verifyCertificate);

// Authenticated
router.get('/mine', authMiddleware, getMyCertifications);
router.get('/user/:userId', authMiddleware, getUserCertifications);

// Admin only
router.get('/', authMiddleware, adminMiddleware, getAllCertifications);
router.post('/', authMiddleware, adminMiddleware, issueCertification);
router.put('/:id/revoke', authMiddleware, adminMiddleware, revokeCertification);

export default router;
