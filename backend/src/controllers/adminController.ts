import { Request, Response } from 'express';
import Ticket from '../models/Ticket';
import { TicketStatus } from '../utils/constants';

// Validate scanned QR code
export const validateTicket = async (req: Request, res: Response) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ message: 'QR data is required' });
    }

    // Find ticket by QR data
    const ticket = await Ticket.findOne({ qrCodeData: qrData });

    if (!ticket) {
      return res.status(404).json({ message: 'Invalid ticket' });
    }

    // Check if ticket is verified
    if (ticket.status !== TicketStatus.VERIFIED) {
      return res.status(400).json({ 
        message: 'Ticket is not verified or has been cancelled',
        status: ticket.status
      });
    }

    // Check if already checked in
    if (ticket.isCheckedIn) {
      return res.status(409).json({ 
        message: 'Ticket already checked in',
        data: {
          holderName: ticket.holderName,
          checkedInAt: ticket.checkInTime
        }
      });
    }

    // Return ticket details
    res.status(200).json({
      message: 'Valid ticket',
      data: {
        _id: ticket._id,
        ticketId: ticket._id,
        holderName: ticket.holderName,
        holderEmail: ticket.holderEmail,
        holderPhone: ticket.holderPhone,
        holderGender: ticket.holderGender,
        holderDob: ticket.holderDob,
        isCheckedIn: ticket.isCheckedIn
      }
    });
  } catch (error: any) {
    console.error('Validate ticket error:', error);
    res.status(500).json({ message: 'Validation failed' });
  }
};

// Check-in ticket
export const checkInTicket = async (req: Request, res: Response) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ message: 'QR data is required' });
    }

    // Find ticket
    const ticket = await Ticket.findOne({ qrCodeData: qrData });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Verify status
    if (ticket.status !== TicketStatus.VERIFIED) {
      return res.status(400).json({ message: 'Ticket cannot be checked in' });
    }

    // Check if already checked in
    if (ticket.isCheckedIn) {
      return res.status(409).json({ 
        message: 'Ticket already checked in',
        data: {
          holderName: ticket.holderName,
          checkedInAt: ticket.checkInTime
        }
      });
    }

    // Mark as checked in
    ticket.isCheckedIn = true;
    ticket.checkInTime = new Date();
    await ticket.save();

    res.status(200).json({
      message: 'Check-in successful',
      data: {
        _id: ticket._id,
        holderName: ticket.holderName,
        checkedInAt: ticket.checkInTime
      }
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Check-in failed' });
  }
};

// Get all tickets (optional admin view)
export const getAllTickets = async (req: Request, res: Response) => {
  try {
    const tickets = await Ticket.find()
      .select('-otp -otpExpiry')
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: tickets.length,
      tickets
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch tickets' });
  }
};

// Get dashboard stats
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalTickets = await Ticket.countDocuments();
    const checkedIn = await Ticket.countDocuments({ isCheckedIn: true });
    const verified = await Ticket.countDocuments({ status: TicketStatus.VERIFIED });
    const pending = await Ticket.countDocuments({ status: TicketStatus.PENDING });
    const cancelled = await Ticket.countDocuments({ status: TicketStatus.CANCELLED });

    // Get recent check-ins
    const recentCheckIns = await Ticket.find({ isCheckedIn: true })
      .sort({ checkInTime: -1 })
      .limit(5)
      .select('holderName checkInTime holderEmail');

    res.status(200).json({
      metrics: {
        totalTickets,
        checkedIn,
        verified,
        pending,
        cancelled
      },
      recentCheckIns
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};


