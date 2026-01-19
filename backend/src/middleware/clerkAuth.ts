import { Request, Response, NextFunction } from 'express';
import { Clerk } from '@clerk/clerk-sdk-node';

const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

export const clerkAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authorization token provided' });
    }

    const sessionClaims = await clerk.verifyToken(token);
    
    if (!sessionClaims) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Attach user info to request
    (req as any).clerkUserId = sessionClaims.sub;

    // Admin Authorization Check
    // Hardcoded allowed admin emails
    const adminEmails = ['advaitkawale@gmail.com', 'compex251206@gmail.com'];
    
    if (adminEmails.length > 0) {
      const user = await clerk.users.getUser(sessionClaims.sub);
      const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();

      if (!userEmail || !adminEmails.includes(userEmail)) {
        return res.status(403).json({ message: 'Access denied: Admin privileges required' });
      }
    }

    next();
  } catch (error: any) {
    console.error('Clerk auth error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};
