import { Router } from 'express';
import {
  postUrbanRenewalNotificationSync,
  postDangerousBuildingsNotificationSync,
} from '../controllers/internalSyncController.js';

const router = Router();

router.post('/sync/urban-renewal-notifications', postUrbanRenewalNotificationSync);
router.post(
  '/sync/dangerous-buildings-notifications',
  postDangerousBuildingsNotificationSync
);

export default router;
