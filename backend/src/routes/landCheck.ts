import { Router } from 'express';
import {
  getParcel,
  searchDealsByAddress,
  getUrbanRenewalMitchamim,
} from '../controllers/landCheckController.js';

const router = Router();

router.get('/parcel', getParcel);
router.get('/deals-by-address', searchDealsByAddress);
router.get('/mitchamim', getUrbanRenewalMitchamim);

export default router;
