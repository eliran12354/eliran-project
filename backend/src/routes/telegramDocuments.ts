import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  getAllTelegramDocuments,
  searchTelegramDocuments,
  getFilteredTelegramDocuments,
  createTelegramDocument,
} from '../controllers/telegramDocumentsController.js';

const router = Router();

router.get('/all', getAllTelegramDocuments);
router.get('/search', searchTelegramDocuments);
router.get('/', getFilteredTelegramDocuments);
router.post('/', requireAuth, requireAdmin, createTelegramDocument);

export default router;
