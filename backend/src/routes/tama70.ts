import { Router } from 'express';
import { getTama70 } from '../controllers/tama70Controller.js';

const router = Router();

router.get('/geojson', getTama70);

export default router;
