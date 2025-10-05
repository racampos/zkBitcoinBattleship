// Swap Status Tracker Component

import React from "react";
import { SwapStatus } from "../../services/types/swap.types";

interface SwapStatusTrackerProps {
  status: SwapStatus;
  error?: string;
}

interface StatusStep {
  id: SwapStatus;
  label: string;
  icon: string;
}

const DEPOSIT_STEPS: StatusStep[] = [
  { id: SwapStatus.QUOTING, label: "Getting Quote", icon: "🔍" },
  { id: SwapStatus.COMMITTING, label: "Creating Swap", icon: "📝" },
  { id: SwapStatus.AWAITING_PAYMENT, label: "Awaiting Payment", icon: "⏳" },
  { id: SwapStatus.PAYMENT_RECEIVED, label: "Payment Received", icon: "✅" },
  { id: SwapStatus.CLAIMING, label: "Claiming Funds", icon: "💰" },
  { id: SwapStatus.COMPLETED, label: "Complete", icon: "🎉" },
];

export const SwapStatusTracker: React.FC<SwapStatusTrackerProps> = ({
  status,
  error,
}) => {
  const getStatusIndex = () => {
    return DEPOSIT_STEPS.findIndex((step) => step.id === status);
  };

  const isStepCompleted = (stepIndex: number) => {
    const currentIndex = getStatusIndex();
    if (status === SwapStatus.FAILED || status === SwapStatus.EXPIRED) {
      return false;
    }
    return stepIndex < currentIndex;
  };

  const isStepActive = (stepIndex: number) => {
    const currentIndex = getStatusIndex();
    if (status === SwapStatus.FAILED || status === SwapStatus.EXPIRED) {
      return false;
    }
    return stepIndex === currentIndex;
  };

  const getStepStyle = (stepIndex: number) => {
    if (isStepCompleted(stepIndex)) {
      return "bg-green-500 text-white";
    }
    if (isStepActive(stepIndex)) {
      return "bg-blue-500 text-white animate-pulse";
    }
    return "bg-gray-200 dark:bg-gray-700 text-gray-400";
  };

  const getConnectorStyle = (stepIndex: number) => {
    if (isStepCompleted(stepIndex + 1)) {
      return "bg-green-500";
    }
    return "bg-gray-200 dark:bg-gray-700";
  };

  if (status === SwapStatus.FAILED || status === SwapStatus.EXPIRED) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <span className="text-2xl">❌</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400">
              {status === SwapStatus.FAILED ? "Swap Failed" : "Swap Expired"}
            </h3>
            {error && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status === SwapStatus.COMPLETED) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <span className="text-2xl">🎉</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-600 dark:text-green-400">
              Swap Complete!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Your funds are now available on Starknet
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
        Swap Progress
      </h3>

      <div className="space-y-4">
        {DEPOSIT_STEPS.map((step, index) => (
          <div key={step.id} className="relative">
            <div className="flex items-center gap-4">
              {/* Step Circle */}
              <div
                className={`
                  flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                  font-medium transition-all duration-300
                  ${getStepStyle(index)}
                `}
              >
                {isStepCompleted(index) ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span className="text-lg">{step.icon}</span>
                )}
              </div>

              {/* Step Label */}
              <div className="flex-1">
                <p
                  className={`
                    font-medium transition-colors
                    ${
                      isStepActive(index)
                        ? "text-blue-600 dark:text-blue-400"
                        : isStepCompleted(index)
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-400 dark:text-gray-500"
                    }
                  `}
                >
                  {step.label}
                </p>

                {/* Active Step Indicator */}
                {isStepActive(index) && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      In progress...
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Connector Line */}
            {index < DEPOSIT_STEPS.length - 1 && (
              <div className="ml-5 mt-2 mb-2">
                <div
                  className={`
                    w-0.5 h-8 transition-colors duration-300
                    ${getConnectorStyle(index)}
                  `}
                ></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Estimated Time */}
      {status === SwapStatus.AWAITING_PAYMENT && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            ⚡ Lightning payments typically complete in seconds
          </p>
        </div>
      )}
    </div>
  );
};

