// Lightning Invoice Display Component with QR Code

import React, { useState } from "react";
import QRCode from "qrcode.react";

interface LightningInvoiceDisplayProps {
  invoice: string;
  amount?: bigint;
  expiresAt?: number;
  onCopy?: () => void;
}

export const LightningInvoiceDisplay: React.FC<
  LightningInvoiceDisplayProps
> = ({ invoice, amount, expiresAt, onCopy }) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Update countdown timer
  React.useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        setTimeLeft("Expired");
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatSats = (sats: bigint) => {
    return `${sats.toLocaleString()} sats`;
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          ⚡ Lightning Invoice
        </h3>
        {amount && (
          <p className="text-lg font-mono text-orange-600 dark:text-orange-400">
            {formatSats(amount)}
          </p>
        )}
      </div>

      {/* QR Code */}
      <div className="p-4 bg-white rounded-lg shadow-inner">
        <QRCode
          value={invoice}
          size={256}
          level="M"
          includeMargin={true}
          renderAs="svg"
        />
      </div>

      {/* Invoice String */}
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Invoice String
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={invoice}
            readOnly
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white overflow-hidden text-ellipsis"
          />
          <button
            onClick={handleCopy}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all
              ${
                copied
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }
            `}
          >
            {copied ? (
              <span className="flex items-center gap-1">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Timer */}
      {expiresAt && timeLeft && (
        <div
          className={`
          px-4 py-2 rounded-lg text-sm font-medium
          ${
            timeLeft === "Expired"
              ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
              : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          }
        `}
        >
          {timeLeft === "Expired" ? (
            "⏰ Invoice Expired"
          ) : (
            <span>⏱️ Expires in {timeLeft}</span>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          How to Pay:
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Scan QR code with any Lightning wallet</li>
          <li>• Or copy and paste the invoice string</li>
          <li>• Payment will be detected automatically</li>
        </ul>
      </div>
    </div>
  );
};

