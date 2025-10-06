/**
 * Hook for fetching and subscribing to game state
 */

import { useEffect } from "react";
import { ToriiQueryBuilder, KeysClause } from "@dojoengine/sdk";
import { useDojo } from "../dojo/DojoContext";
import { useGameStore, GameData } from "../store/gameStore";
import { NAMESPACE } from "../dojo/config";

export function useGameState(gameId: string | null) {
  const { sdk, isInitialized } = useDojo();
  const { setGameData, setError, account } = useGameStore();

  // Fetch game state using GraphQL (same as vanilla JS)
  const fetchGameState = async () => {
    if (!gameId || !account) return;

    try {
      console.log("📊 Fetching game state for:", gameId);

      // Query game state from Torii GraphQL endpoint
      const response = await fetch("http://localhost:8081/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `{ 
            entities(keys: ["${gameId}"]) { 
              edges { 
                node { 
                  keys 
                  models { 
                    __typename
                    ... on battleship_Game {
                      id
                      p1
                      p2
                      status
                      turn_player
                      turn_no
                      board_size
                      winner
                      last_action
                    }
                  }
                } 
              } 
            } 
          }`,
        }),
      });

      const result = await response.json();
      console.log("📦 GraphQL response:", result);

      if (result.data?.entities?.edges && result.data.entities.edges.length > 0) {
        const gameNode = result.data.entities.edges[0].node;
        const gameModel = gameNode.models?.find((m: any) => m.__typename === "battleship_Game");

        if (gameModel) {
          const gameData: GameData = {
            game_id: gameModel.id || gameId,
            player_1: gameModel.p1 || "",
            player_2: gameModel.p2 || "",
            status: parseInt(gameModel.status || "0"),
            current_turn: gameModel.turn_player || "",
            p1_board_hash: "", // Will need separate query for board commits
            p2_board_hash: "",
            p1_hits: 0, // TODO: Parse from game state
            p2_hits: 0,
          };

          setGameData(gameData);
          console.log("✅ Game state updated:", gameData);
        } else {
          console.log("⚠️ No Game model found in entity");
        }
      } else {
        console.log("⚠️ No game entities found");
      }
    } catch (err: any) {
      console.error("❌ Failed to fetch game state:", err);
      setError(err.message || "Failed to fetch game state");
    }
  };

  // Subscribe to game state updates
  useEffect(() => {
    if (!sdk || !isInitialized || !gameId) return;

    let subscription: any;

    (async () => {
      try {
        console.log("📡 Subscribing to game updates...");

        const [_, sub] = await sdk.subscribeEntityQuery({
          query: new ToriiQueryBuilder()
            .withClause(KeysClause([`${NAMESPACE}-Game`], [gameId], "VariableLen").build()),
          callback: ({ data, error }) => {
            if (data) {
              console.log("📡 Game update received");
              fetchGameState(); // Refresh state when update received
            }
            if (error) {
              console.error("Subscription error:", error);
            }
          },
        });

        subscription = sub;
        console.log("✅ Subscribed to game updates");

        // Initial fetch
        await fetchGameState();
      } catch (err: any) {
        console.error("❌ Failed to subscribe:", err);
        setError(err.message || "Failed to subscribe to game updates");
      }
    })();

    // Cleanup
    return () => {
      if (subscription) {
        console.log("🔌 Unsubscribing from game updates");
        subscription.cancel();
      }
    };
  }, [sdk, isInitialized, gameId]);

  return { fetchGameState };
}
