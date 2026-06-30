import { Router } from 'express';
import {
  getMyCertifications,
  getAllCertifications,
  getUserCertifications,
  issueCertification,
  revokeCertification,
  verifyCertificate,
  getCertificationPaths,
  getMyRelevantPaths,
  getCertificationTracks,
  createCertificationPath,
  updateCertificationPath,
  deleteCertificationPath,
  uploadCertBadge,
  removeCertBadge,
} from '../controllers/certification.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { uploadCertificationBadge } from '../config/cloudinary';

const router = Router();

// Public — QR-code / link verification
router.get('/verify/:certificateNumber', verifyCertificate);

// Paths — authenticated (order matters: /paths/my before /paths/:id)
router.get('/paths/my', authMiddleware, getMyRelevantPaths);
router.get('/tracks', authMiddleware, getCertificationTracks);
router.get('/paths', authMiddleware, getCertificationPaths);
router.post('/paths', authMiddleware, adminMiddleware, createCertificationPath);
router.put('/paths/:id', authMiddleware, adminMiddleware, updateCertificationPath);
router.delete('/paths/:id', authMiddleware, adminMiddleware, deleteCertificationPath);

// Authenticated
router.get('/mine', authMiddleware, getMyCertifications);
router.get('/user/:userId', authMiddleware, getUserCertifications);

// Admin only
router.get('/', authMiddleware, adminMiddleware, getAllCertifications);
router.post('/', authMiddleware, adminMiddleware, issueCertification);
router.put('/:id/revoke', authMiddleware, adminMiddleware, revokeCertification);

// Badge management (admin only)
router.post('/:id/badge', authMiddleware, adminMiddleware, uploadCertificationBadge.single('badge'), uploadCertBadge);
router.delete('/:id/badge', authMiddleware, adminMiddleware, removeCertBadge);

export default router;
