import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '@clerk/clerk-react';
import { ticketAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './AdminScanner.css';

const AdminScanner = () => {
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const [scanResult, setScanResult] = useState<any>(null);
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [isMirrored, setIsMirrored] = useState(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const isProcessing = useRef<boolean>(false);

    useEffect(() => {
        let timeoutId: any = null;

        const initScanner = () => {
             // Clear existing instance if any (safety)
             if (scannerRef.current) {
                 scannerRef.current.clear().catch(console.error);
             }

             timeoutId = setTimeout(() => {
                const scanner = new Html5QrcodeScanner(
                    "reader",
                    { 
                        fps: 10, 
                        qrbox: { width: 350, height: 350 },
                        supportedScanTypes: [0], // Camera Only
                        showTorchButtonIfSupported: true,
                        rememberLastUsedCamera: false // <--- PREVENTS AUTO-START
                    }, 
                    /* verbose= */ false
                );
                
                scanner.render(onScanSuccess, onScanFailure);
                scannerRef.current = scanner;
            }, 100);
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab Hidden -> KILL CAMERA (Turn off light)
                if (scannerRef.current) {
                    console.log("Tab hidden: Clearing scanner to release camera.");
                    scannerRef.current.clear().catch(console.error);
                    scannerRef.current = null;
                }
            } else {
                // Tab Visible -> Re-initialize (User will see "Start" button again)
                console.log("Tab visible: Re-initializing scanner.");
                initScanner();
            }
        };

        // Initial Start
        initScanner();

        // Listen for tab switching
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
             if (timeoutId) clearTimeout(timeoutId);
             document.removeEventListener("visibilitychange", handleVisibilityChange);
             if (scannerRef.current) {
                 scannerRef.current.clear().catch(console.error);
             }
        };
    }, []);

    // ... existing handlers ...

    const onScanSuccess = async (decodedText: string, _decodedResult: any) => {
        // ... (keep logic same) implementation handled by surrounding code, 
        // effectively I am just inserting state above and button below
        if (isProcessing.current) return;
        isProcessing.current = true;

        if (decodedText === lastScanned) {
            // Already handled
        }
        
        setLastScanned(decodedText);

        try {
            const token = await getToken();
            if (!token) {
                isProcessing.current = false;
                return;
            }

            // Pause scanner visuals optionally or just show loading
            setScanResult({ status: 'loading', message: 'Verifying...' });
            
            if (scannerRef.current) {
                try {
                   scannerRef.current.pause(true); 
                } catch(e) { }
            }

            const response = await ticketAPI.scanTicket(decodedText, token);
            setScanResult({ 
                status: 'success', 
                message: response.data.message, 
                ticket: response.data.data 
            });
            
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3');
            audio.play().catch(() => {});

        } catch (err: any) {
            console.error(err);
            const errMsg = err.response?.data?.message || 'Verification Failed';
            setScanResult({ status: 'error', message: errMsg, data: err.response?.data?.data });
            
            if (scannerRef.current) {
                try {
                   scannerRef.current.pause(true); 
                } catch(e) { }
            }

            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-negative-answer-lose-2032.mp3');
            audio.play().catch(() => {});
        }
    };

    const onScanFailure = (_error: any) => {
    };

    const handleReset = () => {
        setScanResult(null);
        setLastScanned(null);
        isProcessing.current = false;
        
        if (scannerRef.current) {
             try {
                scannerRef.current.resume();
             } catch(e) { }
        }
    };

    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'flex-start',
            width: '100%', 
            minHeight: 'calc(100vh - 6rem)', /* Allow grow, but center-ish if short */
            padding: '1rem',
            paddingTop: '1rem',
            marginBottom: '4rem' /* Extra space for scrolling to bottom */
        }}>
            <div className="glass-card" style={{ 
                maxWidth: '800px', 
                width: '100%', 
                padding: '1.5rem', 
                marginTop: '0' 
            }}>
                <h2 className="text-center" style={{ color: '#00f3ff', marginBottom: '1.5rem', fontFamily: 'Orbitron' }}>
                    ADMIN SCANNER
                </h2>

                <div className={`scanner-container ${isMirrored ? 'mirrored-mode' : ''}`}>
                    <div id="reader"></div>
                    
                    {/* Mirror Toggle Button */}
                    <button 
                        onClick={() => setIsMirrored(!isMirrored)}
                        title="Flip Camera View"
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            zIndex: 30,
                            background: 'rgba(0, 0, 0, 0.6)',
                            border: '1px solid #00f3ff',
                            color: '#00f3ff',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12l5-5m0 0l5 5m-5-5v17"></path>
                            <path d="M22 12l-5 5m0 0l-5-5m5 5V5"></path>
                        </svg>
                    </button>

                    {/* Overlay Enhancements */}
                    <div className="scanner-frame"></div>
                    {!scanResult && <div className="scan-line"></div>}
                </div>

                {/* Result Display */}
                {scanResult && (
                    <div className="result-card" style={{ 
                        marginTop: '2rem', 
                        padding: '1.5rem', 
                        borderRadius: '12px',
                        background: scanResult.status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 
                                    scanResult.status === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)',
                        border: `1px solid ${scanResult.status === 'success' ? '#10b981' : scanResult.status === 'error' ? '#ef4444' : '#ffffff'}`,
                        textAlign: 'center'
                    }}>
                        <h3 style={{ 
                            color: scanResult.status === 'success' ? '#34d399' : scanResult.status === 'error' ? '#f87171' : 'white',
                            fontSize: '1.5rem',
                            marginBottom: '0.5rem'
                        }}>
                             {scanResult.status === 'loading' ? '⏳ PROCESSING...' : 
                              scanResult.status === 'success' ? '✅ AUTHORIZED' : 
                              '⛔ REJECTED'}
                        </h3>
                        <p style={{ color: 'white', fontSize: '1.1rem' }}>{scanResult.message}</p>
                        
                        {/* Show Ticket Details on Success */}
                        {scanResult.status === 'success' && scanResult.ticket && (
                            <div style={{ marginTop: '1rem', textAlign: 'left', fontSize: '0.9rem', color: '#a5b4fc', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px' }}>
                                <p><strong>Holder:</strong> {scanResult.ticket.holderName}</p>
                                <p><strong>Ticket ID:</strong> {scanResult.ticket._id.substring(0,8)}...</p>
                                <p style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '0.5rem' }}>Verified just now</p>
                            </div>
                        )}

                        {/* Show Details on duplicate scan */}
                        {scanResult.status === 'error' && scanResult.data && (
                             <div style={{ marginTop: '1rem', textAlign: 'left', fontSize: '0.9rem', color: '#fca5a5', background: 'rgba(50,0,0,0.3)', padding: '1rem', borderRadius: '8px' }}>
                                <p><strong>Previously checked in:</strong></p>
                                <p>{(() => {
                                    const date = new Date(scanResult.data.checkedInAt);
                                    const day = date.getDate();
                                    const suffix = ["th", "st", "nd", "rd"][((day % 100) - 20) % 10] || ["th", "st", "nd", "rd"][day % 10] || "th";
                                    return `${day}${suffix} ${date.toLocaleString('en-US', { month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`;
                                })()}</p>
                                <p><strong>Holder:</strong> {scanResult.data.holderName}</p>
                             </div>
                        )}

                        <button 
                            onClick={handleReset}
                            className="btn-primary"
                            style={{ marginTop: '1.5rem', width: '100%', background: '#3b82f6' }}
                        >
                            SCAN NEXT
                        </button>
                    </div>
                )}

                <button 
                    onClick={() => navigate('/dashboard')}
                    style={{ 
                        marginTop: '2rem', 
                        background: 'transparent', 
                        border: '1px solid rgba(255,255,255,0.3)', 
                        color: 'white', 
                        padding: '0.75rem', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        width: '100%'
                    }}
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
};

export default AdminScanner;
