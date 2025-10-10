/**
 * LightningStaking Component
 * Handles Lightning BTC → WBTC swap and staking flow
 * User-friendly Bitcoin-native experience
 */

import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { AtomiqService } from '../../services/atomiq';
import { QRCodeDisplay } from './QRCodeDisplay';
import { useGameContracts } from '../../hooks/useGameContracts';
import { useWBTCContracts } from '../../hooks/useWBTCContracts';

type Status = 'idle' | 'creating' | 'awaiting_payment' | 'claiming' | 'approving' | 'staking' | 'done' | 'error';

export function LightningStaking() {
  const { account, gameId } = useGameStore();
  const { stakeForGame } = useGameContracts(account);
  const { approveWBTC, checkAllowance, WBTC_ADDRESS, STAKE_AMOUNT_SATS } = useWBTCContracts(account);
  
  const [status, setStatus] = useState<Status>('idle');
  const [invoice, setInvoice] = useState<string>('');
  const [swap, setSwap] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [wbtcReceived, setWbtcReceived] = useState<bigint>(0n);

  const handleStakeBTC = async () => {
    if (!account || !gameId) return;
    
    try {
      setStatus('creating');
      setError('');
      
      // 1. Initialize Atomiq
      console.log('⚡ Initializing Atomiq SDK...');
      const atomiq = AtomiqService.getInstance();
      await atomiq.initialize();
      
      // 2. Create Lightning swap (1k sats → WBTC on Starknet mainnet)
      console.log('⚡ Creating Lightning → WBTC swap for 1,000 sats...');
      
      // Ensure address is properly padded to 66 characters (0x + 64 hex digits)
      const paddedAddress = account.address.startsWith('0x') 
        ? '0x' + account.address.slice(2).padStart(64, '0')
        : '0x' + account.address.padStart(64, '0');
      
      console.log('📍 Destination address (padded):', paddedAddress);
      
      const swap = await atomiq.createDepositSwap(
        STAKE_AMOUNT_SATS, // 10k sats
        paddedAddress // Properly padded Cartridge address
      );
      setSwap(swap);
      
      // 3. Get Lightning invoice
      const invoiceStr = atomiq.getInvoice(swap);
      if (!invoiceStr) {
        throw new Error('Failed to generate Lightning invoice');
      }
      
      setInvoice(invoiceStr);
      setStatus('awaiting_payment');
      
      console.log('📄 Lightning invoice created:', invoiceStr);
      console.log('⏳ Waiting for payment...');
      
      // 4. Wait for payment (with timeout)
      const paid = await atomiq.waitForPayment(swap, 600000); // 10 min timeout
      
      if (!paid) {
        throw new Error('Payment timeout - invoice expired after 10 minutes');
      }
      
      console.log('✅ Payment received!');
      setStatus('claiming');
      
      // 5. Commit swap (using transaction builder approach)
      console.log('📝 Committing swap on Starknet...');
      await atomiq.commitSwap(swap, account);
      console.log('✅ Swap committed!');
      
      // 6. Claim WBTC on Starknet (already waits for confirmation internally)
      console.log('💰 Claiming WBTC on Starknet...');
      await atomiq.claimSwap(swap, account);
      console.log('✅ WBTC claimed successfully!');
      
      // 7. Get WBTC amount received
      const outputData = swap.getOutput();
      const wbtcAmount = (outputData as any).rawAmount || STAKE_AMOUNT_SATS;
      
      console.log(`💰 Received ${wbtcAmount} WBTC (${wbtcAmount.toString()} sats)`);
      setWbtcReceived(wbtcAmount);
      
      // Success! WBTC is now in user's wallet
      // Let them use the regular "Stake" button which handles multicalls better
      setStatus('done');
      console.log('✅ Lightning → WBTC swap complete! Use the "Stake" button above to complete staking.');
      
    } catch (err: any) {
      console.error('❌ Lightning staking failed:', err);
      setError(err.message || 'Unknown error occurred');
      setStatus('error');
    }
  };
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('✅ Invoice copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback: show prompt
      prompt('Copy this Lightning invoice:', text);
    }
  };
  
  const resetFlow = () => {
    setStatus('idle');
    setInvoice('');
    setSwap(null);
    setError('');
    setWbtcReceived(0n);
  };
  
  return (
    <div className="lightning-staking" style={{ marginBottom: '20px' }}>
      {status === 'idle' && (
        <button onClick={handleStakeBTC} className="primary" style={{ width: '100%', fontSize: '16px', padding: '12px' }}>
          ⚡ Stake 1,000 sats via Lightning
        </button>
      )}
      
      {status === 'creating' && (
        <div className="status-box" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>⏳ Creating Lightning invoice...</div>
          <div style={{ fontSize: '13px', color: '#888' }}>Please wait...</div>
        </div>
      )}
      
      {status === 'awaiting_payment' && invoice && (
        <div className="status-box" style={{ textAlign: 'center', padding: '20px' }}>
          <h3 style={{ marginBottom: '15px', color: '#FFA726' }}>⚡ Pay with Lightning</h3>
          <p style={{ marginBottom: '15px', color: '#ccc' }}>
            Scan QR code or copy invoice to pay from any Lightning wallet:
          </p>
          
          <QRCodeDisplay value={invoice} />
          
          <div style={{ marginTop: '20px' }}>
            <code style={{ 
              display: 'block', 
              background: '#1a1a1a', 
              padding: '12px', 
              borderRadius: '6px',
              fontSize: '10px',
              wordBreak: 'break-all',
              marginBottom: '12px',
              maxHeight: '80px',
              overflow: 'auto',
              color: '#4CAF50'
            }}>
              {invoice}
            </code>
            <button onClick={() => copyToClipboard(invoice)} className="secondary" style={{ width: '100%' }}>
              📋 Copy Invoice
            </button>
          </div>
          
          <div style={{ 
            marginTop: '20px', 
            padding: '12px',
            background: '#2a1a1a',
            borderRadius: '6px',
            border: '1px solid #FFA726'
          }}>
            <div style={{ fontSize: '12px', color: '#FFA726', marginBottom: '6px' }}>
              💡 Supported Wallets:
            </div>
            <div style={{ fontSize: '11px', color: '#888' }}>
              Phoenix, Breez, Strike, Wallet of Satoshi, Zeus, Muun, and more!
            </div>
          </div>
          
          <p style={{ marginTop: '20px', fontSize: '13px', color: '#666' }}>
            ⏳ Waiting for payment... (expires in 10 minutes)
          </p>
        </div>
      )}
      
      {status === 'claiming' && (
        <div className="status-box" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>⏳ Claiming WBTC on Starknet...</div>
          <div style={{ fontSize: '13px', color: '#888' }}>
            Payment received! Completing swap...
          </div>
        </div>
      )}
      
      {(status === 'claiming' || status === 'approving' || status === 'staking') && (
        <div className="status-box" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>
            {status === 'claiming' && '⏳ Committing & Claiming WBTC on Starknet...'}
            {status === 'approving' && '💰 Approving WBTC for staking...'}
            {status === 'staking' && '🔒 Staking WBTC for the game...'}
          </div>
          <div style={{ fontSize: '13px', color: '#888' }}>
            This may take a moment.
          </div>
        </div>
      )}
      
      {status === 'done' && (
        <div className="status-box success" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', marginBottom: '10px' }}>✅ WBTC Received!</div>
          <div style={{ fontSize: '14px', color: '#4CAF50', marginBottom: '10px' }}>
            Successfully swapped Lightning BTC to {wbtcReceived.toString()} WBTC!
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>
            WBTC is now in your wallet. Use the <strong>"Stake {wbtcReceived.toString()} sats"</strong> button above to complete staking.
          </div>
          <button onClick={resetFlow} className="secondary" style={{ width: '100%' }}>
            Start Another Swap
          </button>
        </div>
      )}
      
      {status === 'error' && (
        <div className="status-box" style={{ borderColor: '#F44336', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px', color: '#F44336' }}>❌ Error</div>
          <div style={{ fontSize: '14px', color: '#F44336', marginBottom: '15px' }}>
            {error}
          </div>
          <button onClick={resetFlow} className="secondary" style={{ width: '100%' }}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

