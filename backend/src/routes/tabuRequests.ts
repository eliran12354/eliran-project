import { Router } from 'express';
import { createTabuRequest } from '../controllers/tabuRequestController.js';

const router = Router();

router.post('/', createTabuRequest);

export default router;
