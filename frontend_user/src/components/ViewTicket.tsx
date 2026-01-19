import { useState } from 'react';
import api from '../api';
// unused import removed

interface ViewTicketProps {
  onSuccess: (ticket: any) => void;
}

export default function ViewTicket({ onSuccess }: ViewTicketProps) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setError(null);
    try {
      // Pre-check to avoid 404 console error
      const checkRes = await api.post('/user/check-email', { email });
      
      // If email does NOT exist (or not verified), checkRes.data.exists will be false
      // logic: check-email returns exists:true ONLY if Verified ticket exists.
      if (!checkRes.data.exists) {
           setError("No registered ticket found for this email.");
           setLoading(false);
           return;
      }

      await api.post('/user/send-login-otp', { email });
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to find ticket with this email.');
    } finally {
      if (step === 'email') setLoading(false); // Only stop loading if we didn't switch steps
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/user/verify-login-otp', { email, otp });
      onSuccess(res.data.ticket);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  const RequiredStar = () => <span style={{ color: 'var(--error-color)' }}> *</span>;

  return (
    <div className="auth-page-container">
      <div className="glass-card">
        <h2 className="text-center" style={{ color: '#a5b4fc', textShadow: '0 0 10px rgba(165, 180, 252, 0.3)' }}>
          VIEW YOUR TICKET
        </h2>
        <p className="text-center" style={{ marginBottom: '2rem', letterSpacing: '1px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
          {step === 'email' ? 'Enter your registered email' : `Enter OTP sent to ${email}`}
        </p>

        {error && <div className="error-msg" style={{ position: 'relative', marginBottom: '1rem', color: '#ff6b6b', textAlign: 'center' }}>{error}</div>}

        {step === 'email' ? (
          <form onSubmit={handleSendOtp}>
            <div className="input-group">
              <label className="input-label">Email Address<RequiredStar /></label>
              <input 
                className="form-input" 
                type="email" 
                required
                placeholder="Attendee's Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
              {loading ? <div className="spinner"></div> : 'SEND OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
             <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Enter 6-digit OTP" 
                  className="form-input text-center" 
                  value={otp}
                  maxLength={6}
                  onChange={(e) => setOtp(e.target.value)}
                  style={{ fontSize: '1.2rem', letterSpacing: '2px', textAlign: 'center' }}
                  autoFocus
                />
             </div>
             <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
                {loading ? <div className="spinner"></div> : 'VIEW TICKET'}
             </button>
             <button 
                type="button" 
                onClick={() => setStep('email')}
                style={{ width: '100%', marginTop: '1rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', textDecoration: 'underline' }}
             >
                Change Email
             </button>
          </form>
        )}
      </div>
    </div>
  );
}
