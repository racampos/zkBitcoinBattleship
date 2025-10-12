/**
 * Hook to track staking status for current game
 * Polls Torii for Escrow entity to check if players have staked
 */

import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";

interface StakingStatus {
  escrowExists: boolean; // Does an Escrow entity exist for this game?
  p1Staked: boolean; // Has P1 staked?
  p2Staked: boolean; // Has P2 staked?
  iHaveStaked: boolean; // Have I staked?
  bothStaked: boolean; // Have both players staked?
  isChecking: boolean; // Are we currently checking?
}

const STAKE_AMOUNT_SATS = 1000n; // Updated to match contract (1,000 sats)

export function useStakingStatus(): StakingStatus {
  const { gameId, gameData, account, amIPlayer1 } = useGameStore();
  const [status, setStatus] = useState<StakingStatus>({
    escrowExists: false,
    p1Staked: false,
    p2Staked: false,
    iHaveStaked: false,
    bothStaked: false,
    isChecking: false,
  });

  useEffect(() => {
    if (!gameId || !gameData || !account) {
      setStatus({
        escrowExists: false,
        p1Staked: false,
        p2Staked: false,
        iHaveStaked: false,
        bothStaked: false,
        isChecking: false,
      });
      return;
    }

    let cancelled = false;

    const checkStakingStatus = async () => {
      if (cancelled) return;

      try {
        setStatus((prev) => ({ ...prev, isChecking: true }));

        // Query Escrow entity from Torii
        const response = await fetch("/torii-graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `{
              entities {
                edges {
                  node {
                    models {
                      __typename
                      ... on battleship_Escrow {
                        game_id
                        stake_p1
                        stake_p2
                      }
                    }
                  }
                }
              }
            }`,
          }),
        });

        const result = await response.json();
        const entities = result.data?.entities?.edges || [];

        // Find escrow for this game
        let escrowFound = false;
        let p1Staked = false;
        let p2Staked = false;

        entities.forEach((edge: any) => {
          edge.node?.models?.forEach((model: any) => {
            if (
              model.__typename === "battleship_Escrow" &&
              model.game_id === gameId
            ) {
              escrowFound = true;
              
              // Check if stakes meet requirement (1000 sats)
              const stake_p1 = BigInt(model.stake_p1 || "0");
              const stake_p2 = BigInt(model.stake_p2 || "0");
              
              p1Staked = stake_p1 >= STAKE_AMOUNT_SATS;
              p2Staked = stake_p2 >= STAKE_AMOUNT_SATS;
            }
          });
        });

        if (!cancelled) {
          const isP1 = amIPlayer1();
          const iHaveStaked = isP1 ? p1Staked : p2Staked;
          const bothStaked = p1Staked && p2Staked;

          setStatus({
            escrowExists: escrowFound,
            p1Staked,
            p2Staked,
            iHaveStaked,
            bothStaked,
            isChecking: false,
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.error("❌ Error checking staking status:", error);
          setStatus((prev) => ({ ...prev, isChecking: false }));
        }
      }
    };

    // Check immediately
    checkStakingStatus();

    // Poll every 3 seconds
    const interval = setInterval(checkStakingStatus, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [gameId, gameData, account, amIPlayer1]);

  return status;
}

