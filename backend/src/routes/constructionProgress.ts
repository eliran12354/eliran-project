import { Router } from 'express';
import { getConstructionProgress } from '../controllers/constructionProgressController.js';

const router = Router();

router.get('/', getConstructionProgress);

export default router;
