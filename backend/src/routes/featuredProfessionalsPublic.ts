import { Router } from 'express';
import { getPublicFeaturedProfessionals } from '../controllers/featuredProfessionalsController.js';

const router = Router();

router.get('/', getPublicFeaturedProfessionals);

export default router;
