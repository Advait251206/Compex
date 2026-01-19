import { useState } from 'react';
import { Download, Mail, CheckCircle } from 'lucide-react';
import api from '../api';

interface TicketData {
  id: string;
  holderName: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  qrCode: string;
}

interface TicketDisplayProps {
  ticket: TicketData;
  onBack: () => void;
}

export default function TicketDisplay({ ticket, onBack }: TicketDisplayProps) {
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Exact 45-degree chamfered corners
  const chamferPoly = 'polygon(' +
    '30px 0, ' +                 // Top-Left start
    'calc(100% - 30px) 0, ' +    // Top-Right start
    '100% 30px, ' +              // Top-Right end
    '100% calc(100% - 30px), ' + // Bottom-Right start
    'calc(100% - 30px) 100%, ' + // Bottom-Right end
    '30px 100%, ' +              // Bottom-Left start
    '0 calc(100% - 30px), ' +    // Bottom-Left end
    '0 30px' +                   // Top-Left end
  ')';

  const handleDownload = () => {
    const url = `${api.defaults.baseURL}/user/ticket/${ticket.id}/download`;
    window.open(url, '_blank');
  };

  const handleEmail = async () => {
    setEmailLoading(true);
    try {
      await api.post(`/user/ticket/${ticket.id}/email`);
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to email ticket', err);
      alert('Failed to send email. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Helper for Data Rows - Compact
  const DataRow = ({ label, value }: { label: string, value: string }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem', alignItems: 'baseline' }}>
      <span style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'Courier New', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ color: '#ffffff', fontSize: '0.9rem', fontFamily: 'Courier New', fontWeight: 'bold', letterSpacing: '1px' }}>{value}</span>
    </div>
  );

  return (
    <div className="ticket-display-container" style={{ padding: '0.5rem', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Success Banner */}
      <div style={{ textAlign: 'center', marginBottom: '1rem', animation: 'fadeIn 0.5s ease-out', transform: 'scale(0.9)' }}>
         <div style={{ background: 'rgba(0, 243, 255, 0.1)', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1.5rem', borderRadius: '30px', border: '1px solid rgba(0, 243, 255, 0.3)' }}>
            <CheckCircle color="#00f3ff" size={16} />
            <span style={{ color: '#00f3ff', fontWeight: 'bold', letterSpacing: '2px', fontFamily: 'Courier New', fontSize: '0.9rem' }}>VERIFICATION SUCCESSFUL</span>
         </div>
         <h1 style={{ marginTop: '0.5rem', fontSize: '1.5rem', color: 'white', textShadow: '0 0 20px rgba(0,0,0,0.5)', fontFamily: 'Segoe UI, sans-serif' }}>
            WELCOME, {ticket.holderName.split(' ')[0].toUpperCase()}!
         </h1>
      </div>

      {/* TICKET CARD CONTAINER - The Cyan Border */}
      <div style={{ 
          position: 'relative', 
          width: '100%', 
          maxWidth: '750px', // Reduced width
          padding: '2px', 
          background: '#00f3ff', 
          clipPath: chamferPoly,
          animation: 'slideUp 0.6s ease-out',
          boxShadow: '0 0 40px rgba(0, 243, 255, 0.15)'
      }}>
        
        {/* INNER CONTENT - Black Background */}
        <div style={{ 
            background: '#050508', 
            width: '100%',
            height: '100%',
            clipPath: chamferPoly, 
            padding: '2rem 2.5rem', // Reduced padding
            boxSizing: 'border-box',
            position: 'relative' 
        }}>
            



            {/* HEADER SECTION */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #bc13fe', paddingBottom: '0.5rem', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
                <h2 style={{ margin: 0, color: '#ffffff', fontSize: '2rem', letterSpacing: '4px', fontFamily: 'Courier New, monospace', fontWeight: 'bold' }}>COMP-EX 2026</h2>
                <p style={{ margin: '5px 0 0 0', color: '#00f3ff', fontSize: '0.8rem', letterSpacing: '4px', fontFamily: 'Courier New', textTransform: 'uppercase', fontWeight: 'bold' }}>OFFICIAL ENTRY PASS PROTOCOL</p>
            </div>

            {/* CONTENT GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '1.5rem' }}>
              
              {/* Left Column: Data Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1rem' }}>
                 <DataRow label="TICKET ID" value={ticket.id.slice(-8).toUpperCase()} />
                 <DataRow label="ATTENDEE" value={ticket.holderName.toUpperCase()} />
                 <DataRow label="EMAIL" value={ticket.email} />
                 <DataRow label="PHONE" value={ticket.phone} />
                 <DataRow label="GENDER" value={ticket.gender ? ticket.gender.toUpperCase() : 'N/A'} />
                 <DataRow label="DOB" value={new Date(ticket.dob).toLocaleDateString('en-GB')} /> 
              </div>

              {/* Right Column: QR Code */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ 
                      padding: '8px', 
                      background: 'white', 
                      border: '4px solid #00f3ff', 
                      width: '160px', // Reduced size
                      height: '160px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                  }}>
                    <img src={ticket.qrCode} alt="Ticket QR" style={{ width: '100%', height: '100%' }} />
                  </div>
                  <span style={{ marginTop: '0.8rem', color: '#bc13fe', letterSpacing: '2px', fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'Courier New' }}>SCAN_ME</span>
              </div>
            </div>

            {/* FOOTER TEXT */}
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.55rem', color: '#64748b', fontFamily: 'Courier New', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    AUTHORIZED PERSONNEL ONLY • SYSTEM GENERATED • INVALID WITHOUT QR
                </p>
            </div>

        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button 
          onClick={handleDownload}
          className="btn-primary"
          style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              background: '#00f3ff', color: 'black', border: 'none', fontWeight: 'bold',
              padding: '0.8rem 1.5rem', fontSize: '0.9rem', clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'
          }}
        >
          <Download size={18} />
          DOWNLOAD PDF
        </button>
        
        <button 
          onClick={handleEmail}
          className="btn-secondary"
          disabled={emailLoading || emailSuccess}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: emailSuccess ? '#10b981' : 'transparent', 
            color: 'white', border: '1px solid rgba(255,255,255,0.2)',
            cursor: emailLoading ? 'not-allowed' : 'pointer',
             padding: '0.8rem 1.5rem', fontSize: '0.9rem', clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'
          }}
        >
           {emailSuccess ? <CheckCircle size={18} /> : <Mail size={18} />}
           {emailSuccess ? 'SENT!' : (emailLoading ? 'SENDING...' : 'EMAIL TICKET')}
        </button>

        <button 
          onClick={onBack}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'transparent', 
            color: 'white', border: '1px solid rgba(255,255,255,0.3)',
            cursor: 'pointer',
             padding: '0.8rem 1.5rem', fontSize: '0.9rem', clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
             transition: 'all 0.3s ease'
          }}
        >
           BACK TO HOME
        </button>
      </div>

       {/* Mobile Responsive Style Override */}
       <style>{`
         @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
         @media (max-width: 768px) {
           .ticket-display-container { padding: 1rem !important; }
           .ticket-display-container > div > div > div { /* Content Grid */
             grid-template-columns: 1fr !important;
             gap: 3rem !important;
             text-align: left;
           }
           .ticket-display-container > div > div > div > div:first-child { /* Left Column padding reset */
              padding-left: 0 !important;
           }
         }
       `}</style>
    </div>
  );
}
