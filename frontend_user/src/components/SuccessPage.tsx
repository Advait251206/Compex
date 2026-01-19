import { CheckCircle } from 'lucide-react';

interface SuccessProps {
  ticketId: string;
  email: string;
}

export default function SuccessPage({ ticketId, email }: SuccessProps) {
  // Since backend generates PDF and sends via email, we can also offer a direct download link if endpoints support it.
  // Currently backend sends email. We can add a "Resend Ticket" button later.
  
  return (
    <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '3rem', textAlign: 'center' }}>
      <CheckCircle size={80} className="text-success" style={{ margin: '0 auto 1.5rem auto' }} />
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#51cf66' }}>SUCCESS!</h1>
      
      <p style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
        Your ticket has been generated and sent to <br/>
        <strong style={{ color: 'white' }}>{email}</strong>
      </p>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Ticket ID</p>
        <code style={{ fontSize: '1.2rem', color: '#a5b4fc', letterSpacing: '2px' }}>{ticketId.slice(-8).toUpperCase()}</code>
      </div>

      <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>
        Please check your email (including spam folder) for the PDF ticket containing your unique QR Code. 
        You will need to show this QR code at the event entrance.
      </p>
      
      <button className="btn-primary" onClick={() => window.location.reload()}>
         Register Another Person
      </button>
    </div>
  );
}
