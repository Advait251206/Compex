import express from 'express';
import { 
  sendOtp,
  verifyOtp,
  completeRegistration,
  resendOtp,
  sendLoginOtp,
  verifyLoginOtp,
  registerValidation,
  otpValidation,
  checkEmailStatus,
  downloadTicket,
  resendTicketEmailController
} from '../controllers/userController';

const router = express.Router();

// User registration flow (public)
router.post('/initiate-verification', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/complete-registration', completeRegistration);
router.post('/check-email', checkEmailStatus);
router.post('/resend-otp', resendOtp);

// View Ticket Flow
router.post('/send-login-otp', sendLoginOtp);
router.post('/verify-login-otp', verifyLoginOtp);

// Ticket Actions
router.get('/ticket/:id/download', downloadTicket);
router.post('/ticket/:id/email', resendTicketEmailController);

export default router;
