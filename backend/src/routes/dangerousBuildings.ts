import { Router } from 'express';
import { getDangerousBuildings } from '../controllers/dangerousBuildingsController.js';

const router = Router();

router.get('/', getDangerousBuildings);

export default router;
