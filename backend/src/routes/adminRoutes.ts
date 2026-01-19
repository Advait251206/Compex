import express from 'express';
import { validateTicket, checkInTicket, getAllTickets, getDashboardStats } from '../controllers/adminController';
import { clerkAuth } from '../middleware/clerkAuth';

const router = express.Router();

// All admin routes are protected by Clerk authentication
router.use(clerkAuth);

// Admin scanner endpoints
router.post('/validate-ticket', validateTicket);
router.post('/checkin', checkInTicket);
router.get('/tickets', getAllTickets);
router.get('/stats', getDashboardStats);

export default router;
