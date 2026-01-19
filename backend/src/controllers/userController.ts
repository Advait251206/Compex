import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Ticket from '../models/Ticket';
import { TicketStatus } from '../utils/constants';
import { sendOTPEmail, sendTicketEmail } from '../services/emailService';
import pdfService from '../services/pdfService';
import QRCode from 'qrcode';
import crypto from 'crypto';

// Generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Validation rules
export const registerValidation = [
  body('holderName').trim().optional({ checkFalsy: true }), // Optional for Step 1
  body('holderEmail').isEmail().withMessage('Valid email is required'),
  body('holderPhone').trim().optional(),
  body('holderGender').optional(),
  body('holderDob').optional(),
  body('holderReferralSource').optional()
];

export const otpValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
];

// User Registration - Step 1: Submit form and send OTP
// Step 1: Send OTP (Initiate Registration)
export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { holderName, holderEmail } = req.body;

    // Check if email already has a COMPLETED ticket
    const existingTicket = await Ticket.findOne({ holderEmail: holderEmail.toLowerCase() });
    
    // If ticket exists and is VERIFIED, block
    if (existingTicket && existingTicket.status === TicketStatus.VERIFIED) {
      return res.status(409).json({ message: 'This email is already registered.' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    if (existingTicket) {
      // Update existing pending ticket
      existingTicket.holderName = holderName || existingTicket.holderName; // Keep name if not provided
      existingTicket.otp = otp;
      existingTicket.otpExpiry = otpExpiry;
      existingTicket.status = TicketStatus.PENDING;
      existingTicket.isEmailVerified = false; // Reset verification on new OTP
      await existingTicket.save();
    } else {
      // Create new pending ticket
      await Ticket.create({
        holderName: holderName || 'Attendee', // Default if not provided
        holderEmail: holderEmail.toLowerCase(),
        otp,
        otpExpiry,
        status: TicketStatus.PENDING,
        isEmailVerified: false
      });
    }

    await sendOTPEmail(holderEmail, otp, holderName || 'Attendee');

    res.status(200).json({ message: 'OTP sent successfully.' });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP.' });
  }
};

// Step 2: Verify OTP
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const ticket = await Ticket.findOne({ 
      holderEmail: email.toLowerCase(),
      otp,
      otpExpiry: { $gt: new Date() }
    });

    if (!ticket) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    ticket.isEmailVerified = true;
    ticket.otp = undefined;
    ticket.otpExpiry = undefined;
    await ticket.save();

    res.status(200).json({ message: 'Email verified successfully.' });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Failed to verify OTP.' });
  }
};

// Step 3: Complete Registration
export const completeRegistration = async (req: Request, res: Response) => {
  try {
    const { holderEmail, holderName, holderPhone, holderGender, holderDob, holderReferralSource, holderReferralDetails } = req.body;

    const ticket = await Ticket.findOne({ holderEmail: holderEmail.toLowerCase() });

    if (!ticket) {
      return res.status(404).json({ message: 'Registration session not found.' });
    }

    // Prevent overwriting an already verified ticket
    if (ticket.status === TicketStatus.VERIFIED) {
        return res.status(409).json({ message: 'Ticket already generated for this email.' });
    }

    if (!ticket.isEmailVerified) {
      return res.status(400).json({ message: 'Email not verified.' });
    }

    // Update details
    ticket.holderName = holderName;
    ticket.holderPhone = holderPhone;
    ticket.holderGender = holderGender;
    ticket.holderDob = holderDob;
    ticket.holderReferralSource = holderReferralSource;
    ticket.holderReferralDetails = holderReferralDetails;
    
    // Identify as verified ticket
    ticket.status = TicketStatus.VERIFIED;
    
    // Generate QR Data String
    const qrData = `COMPEX-${ticket._id}-${crypto.randomBytes(8).toString('hex')}`;
    ticket.qrCodeData = qrData;
    await ticket.save();

    // Generate PDF Ticket (Includes QR generation internally)
    const pdfBuffer = await pdfService.generateTicket({
        ticketId: ticket._id.toString(),
        holderName: ticket.holderName,
        eventName: 'COMP-EX 2026',
        email: ticket.holderEmail,
        phone: ticket.holderPhone,
        gender: ticket.holderGender,
        dob: ticket.holderDob,
        qrCodeData: qrData
    });

    await sendTicketEmail(ticket.holderEmail, ticket.holderName, pdfBuffer, ticket._id.toString());

    res.status(200).json({ 
      message: 'Registration complete!',
      ticket: {
        id: ticket._id
      }
    });

  } catch (error: any) {
    console.error('Complete registration error:', error);
    res.status(500).json({ message: 'Registration failed.' });
  }
};

// Resend OTP
export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const ticket = await Ticket.findOne({ 
      holderEmail: email.toLowerCase(),
      status: TicketStatus.PENDING
    });

    if (!ticket) {
      return res.status(404).json({ message: 'No pending registration found for this email' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    ticket.otp = otp;
    ticket.otpExpiry = otpExpiry;
    await ticket.save();

    // Send OTP email
    await sendOTPEmail(ticket.holderEmail, otp, ticket.holderName);

    res.status(200).json({ message: 'OTP resent successfully' });
  } catch (error: any) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Failed to resend OTP' });
  }
};

// Check if email already has a ticket (for real-time validation)
export const checkEmailStatus = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const ticket = await Ticket.findOne({ holderEmail: email.toLowerCase() });

    if (ticket && ticket.status === TicketStatus.VERIFIED) {
      return res.status(200).json({ 
        exists: true, 
        message: 'This email is already registered.'
      });
    }

    return res.status(200).json({ 
      exists: false, 
      message: 'Email is available.' 
    });

  } catch (error: any) {
    console.error('Check email error:', error);
    res.status(500).json({ message: 'Failed to check email status' });
  }
};

// --- View Ticket / Login Flow ---

export const sendLoginOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    // Find VERIFIED ticket
    const ticket = await Ticket.findOne({ 
      holderEmail: email.toLowerCase(),
      status: TicketStatus.VERIFIED
    });

    if (!ticket) {
      return res.status(404).json({ message: 'No registered ticket found for this email.' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    ticket.otp = otp;
    ticket.otpExpiry = otpExpiry;
    await ticket.save();

    await sendOTPEmail(ticket.holderEmail, otp, ticket.holderName);

    res.status(200).json({ message: 'OTP sent to your email.' });
  } catch (error: any) {
    console.error('Send Login OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP.' });
  }
};

export const verifyLoginOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    
    const ticket = await Ticket.findOne({ 
      holderEmail: email.toLowerCase(),
      otp,
      otpExpiry: { $gt: new Date() },
      status: TicketStatus.VERIFIED
    });

    if (!ticket) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Clear OTP
    ticket.otp = undefined;
    ticket.otpExpiry = undefined;
    await ticket.save();

    const qrCodeUrl = await QRCode.toDataURL(ticket.qrCodeData || `COMPEX-${ticket._id}`);

    res.status(200).json({ 
      message: 'Login successful.',
      ticket: {
        id: ticket._id,
        holderName: ticket.holderName,
        email: ticket.holderEmail,
        phone: ticket.holderPhone,
        gender: ticket.holderGender,
        dob: ticket.holderDob,
        qrCode: qrCodeUrl
      }
    });
  } catch (error: any) {
    console.error('Verify Login OTP error:', error);
    res.status(500).json({ message: 'Login failed.' });
  }
};

// --- Ticket Actions ---

// Download PDF
export const downloadTicket = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const ticket = await Ticket.findById(id);

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const pdfBuffer = await pdfService.generateTicket({
            ticketId: ticket._id.toString(),
            holderName: ticket.holderName,
            eventName: 'COMP-EX 2026',
            email: ticket.holderEmail,
            phone: ticket.holderPhone,
            gender: ticket.holderGender,
            dob: ticket.holderDob,
            qrCodeData: ticket.qrCodeData || ticket._id.toString()
        });

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="CompEx-Ticket-${ticket._id.toString().slice(-6)}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Download ticket error:', error);
        res.status(500).json({ message: 'Failed to download ticket' });
    }
};

// Resend Email
export const resendTicketEmailController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const ticket = await Ticket.findById(id);

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const pdfBuffer = await pdfService.generateTicket({
            ticketId: ticket._id.toString(),
            holderName: ticket.holderName,
            eventName: 'COMP-EX 2026',
            email: ticket.holderEmail,
            phone: ticket.holderPhone,
            gender: ticket.holderGender,
            dob: ticket.holderDob,
            qrCodeData: ticket.qrCodeData || ticket._id.toString()
        });

        await sendTicketEmail(ticket.holderEmail, ticket.holderName, pdfBuffer, ticket._id.toString());
        
        res.status(200).json({ message: 'Ticket email sent successfully!' });

    } catch (error) {
        console.error('Resend ticket email error:', error);
        res.status(500).json({ message: 'Failed to send email' });
    }
};
