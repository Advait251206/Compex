import mongoose, { Document, Schema } from 'mongoose';
import { Gender, TicketStatus } from '../utils/constants';

export interface ITicket extends Document {
  holderName: string;
  holderEmail: string;
  holderPhone: string;
  holderGender: Gender;
  holderDob: Date;
  holderReferralSource?: string;
  holderReferralDetails?: string;
  holderBuyingInterest?: string;
  holderBuyingInterestDetails?: string;
  status: TicketStatus;
  isEmailVerified: boolean;
  isCheckedIn: boolean;
  checkInTime?: Date;
  otp?: string;
  otpExpiry?: Date;
  qrCodeData?: string;  // Unique ID for QR
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    holderName: {
      type: String,
      required: [true, 'Holder name is required'],
      trim: true
    },
    holderEmail: {
      type: String,
      required: [true, 'Holder email is required'],
      trim: true,
      lowercase: true,
      unique: true,  // One email = One ticket
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    holderPhone: {
      type: String,
      trim: true
    },
    holderGender: {
      type: String,
      enum: Object.values(Gender)
    },
    holderDob: {
      type: Date
    },
    holderReferralSource: {
      type: String
    },
    holderReferralDetails: {
      type: String,
      default: ''
    },
    holderBuyingInterest: {
      type: String
    },
    holderBuyingInterestDetails: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      default: TicketStatus.PENDING
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isCheckedIn: {
      type: Boolean,
      default: false
    },
    checkInTime: {
      type: Date
    },
    otp: {
      type: String
    },
    otpExpiry: {
      type: Date
    },
    qrCodeData: {
      type: String,
      unique: true,
      sparse: true  // Allow null values while enforcing uniqueness
    }
  },
  {
    timestamps: true
  }
);

const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema);

export default Ticket;
