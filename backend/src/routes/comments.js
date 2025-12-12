import express from 'express';
import commentController from '../controllers/commentController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All comment routes require authentication
router.use(authMiddleware);

export default router;