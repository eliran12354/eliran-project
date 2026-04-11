import { Router } from 'express';
import { signup, login } from '../controllers/authController.js';
import { forgotPassword, resetPassword } from '../controllers/passwordResetController.js';
import { forgotPasswordRateLimit } from '../middleware/forgotPasswordRateLimit.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPasswordRateLimit, forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
