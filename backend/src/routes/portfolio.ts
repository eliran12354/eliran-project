import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getItems, addItem, removeItem } from '../controllers/portfolioController.js';

const router = Router();

router.use(requireAuth);

router.get('/items', getItems);
router.post('/items', addItem);
router.delete('/items', removeItem);

export default router;
