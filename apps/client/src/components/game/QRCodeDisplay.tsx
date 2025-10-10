/**
 * QRCodeDisplay Component
 * Displays a QR code for Lightning invoices
 */

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
}

export function QRCodeDisplay({ value }: QRCodeDisplayProps) {
  const [qrUrl, setQrUrl] = useState('');
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (!value) return;
    
    QRCode.toDataURL(value, { 
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
      .then(setQrUrl)
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
        setError('Failed to generate QR code');
      });
  }, [value]);
  
  if (error) {
    return <div style={{ color: '#F44336' }}>{error}</div>;
  }
  
  if (!qrUrl) {
    return <div>Generating QR code...</div>;
  }
  
  return (
    <div style={{ textAlign: 'center' }}>
      <img 
        src={qrUrl} 
        alt="Lightning Invoice QR Code" 
        style={{ 
          maxWidth: '300px',
          width: '100%',
          height: 'auto',
          borderRadius: '8px',
          border: '4px solid #fff',
          background: '#fff'
        }} 
      />
    </div>
  );
}

