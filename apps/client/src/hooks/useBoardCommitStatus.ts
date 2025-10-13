/**
 * Hook to check if a player's board has been committed
 * Queries Torii for the BoardCommit model
 */

import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";

export function useBoardCommitStatus() {
  const { gameId, account } = useGameStore();
  const [isCommitted, setIsCommitted] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!gameId || !account) {
      setIsCommitted(false);
      return;
    }

    let isMounted = true;
    let isCurrentlyCommitted = false;

    const checkCommitStatus = async () => {
      // Don't check if already committed
      if (isCurrentlyCommitted) return;
      
      setIsChecking(true);
      try {
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
                      ... on battleship_BoardCommit {
                        commitment
                        player
                        game_id
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
        
        // Find BoardCommit for this game and player
        let boardCommit: any = null;
        for (const edge of entities) {
          const commit = edge.node?.models?.find(
            (m: any) => m.__typename === "battleship_BoardCommit" &&
                       m.game_id === gameId &&
                       m.player === account.address
          );
          if (commit) {
            boardCommit = commit;
            break;
          }
        }

        if (!isMounted) return; // Don't update state if unmounted

        // Check if commitment exists and is not zero (can be "0", "0x0", or 0)
        const hasCommitment = boardCommit?.commitment && 
                             boardCommit.commitment !== "0" && 
                             boardCommit.commitment !== "0x0" &&
                             boardCommit.commitment !== 0;

        if (hasCommitment) {
          console.log("✅ Board committed successfully", boardCommit.commitment);
          isCurrentlyCommitted = true;
          setIsCommitted(true);
        } else {
          console.log("ℹ️ Board not committed yet", { 
            found: !!boardCommit, 
            commitment: boardCommit?.commitment 
          });
          setIsCommitted(false);
        }
      } catch (error) {
        console.error("Error checking board commit status:", error);
        if (isMounted) {
          setIsCommitted(false);
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    // Check immediately
    checkCommitStatus();

    // Poll every 2 seconds until committed
    const interval = setInterval(() => {
      checkCommitStatus();
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [gameId, account]); // Remove isCommitted from dependencies!

  return { isCommitted, isChecking };
}
