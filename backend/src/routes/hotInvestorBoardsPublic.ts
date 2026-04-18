import { Router } from 'express';
import { getPublicHotInvestorBoards } from '../controllers/hotInvestorBoardsController.js';

const router = Router();

router.get('/', getPublicHotInvestorBoards);

export default router;
