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

    const checkCommitStatus = async () => {
      setIsChecking(true);
      try {
        const response = await fetch("http://localhost:8081/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `{
              entities(keys: ["${gameId}", "${account.address}"]) {
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
        const boardCommit = result.data?.entities?.edges[0]?.node?.models?.find(
          (m: any) => m.__typename === "battleship_BoardCommit"
        );

        if (boardCommit?.commitment) {
          console.log("✅ Board committed successfully");
          setIsCommitted(true);
        } else {
          setIsCommitted(false);
        }
      } catch (error) {
        console.error("Error checking board commit status:", error);
        setIsCommitted(false);
      } finally {
        setIsChecking(false);
      }
    };

    // Check immediately
    checkCommitStatus();

    // Check again after 3 seconds (matches vanilla JS setTimeout approach)
    const timeout = setTimeout(checkCommitStatus, 3000);

    // Also poll every 3 seconds while not committed
    const interval = setInterval(() => {
      if (!isCommitted) {
        checkCommitStatus();
      }
    }, 3000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [gameId, account, isCommitted]);

  return { isCommitted, isChecking };
}
