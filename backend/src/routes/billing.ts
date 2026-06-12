import express, { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createCheckout, createPortal, getStatus, handleWebhook } from '../controllers/billingController.js';

const router = Router();

// Public: CHING calls this. Raw body is required for HMAC signature verification,
// so /api/billing is excluded from the global JSON parser in index.ts.
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

router.use(express.json());
router.use(requireAuth);

router.post('/checkout', createCheckout);
router.post('/portal', createPortal);
router.get('/status', getStatus);

export default router;
