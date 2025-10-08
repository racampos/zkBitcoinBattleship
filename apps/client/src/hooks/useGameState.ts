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

      // Query 1: Get game state from Torii GraphQL endpoint
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

      if (result.data?.entities?.edges && result.data.entities.edges.length > 0) {
        const gameNode = result.data.entities.edges[0].node;
        const gameModel = gameNode.models?.find((m: any) => m.__typename === "battleship_Game");

        if (gameModel) {
          // Query 2: Get ShipAliveCount for both players to calculate hits
          const shipAliveResponse = await fetch("http://localhost:8081/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `{ 
                entities(first: 100) { 
                  edges { 
                    node { 
                      models { 
                        __typename
                        ... on battleship_ShipAliveCount {
                          game_id
                          player
                          remaining_hits
                        }
                      }
                    } 
                  } 
                } 
              }`,
            }),
          });

          const shipAliveResult = await shipAliveResponse.json();
          
          // Find ShipAliveCount for both players in this game
          let p1RemainingHits = 17; // Default: no hits yet
          let p2RemainingHits = 17;
          
          // Normalize gameId for comparison (remove leading zeros, ensure lowercase)
          const normalizeHex = (hex: string) => {
            if (!hex) return "";
            // Remove 0x prefix, remove leading zeros, add 0x back, lowercase
            const cleaned = hex.replace(/^0x/, "").replace(/^0+/, "") || "0";
            return "0x" + cleaned.toLowerCase();
          };
          
          const normalizedGameId = normalizeHex(gameId);

          let foundCount = 0;
          shipAliveResult.data?.entities?.edges?.forEach((edge: any) => {
            const model = edge.node?.models?.find((m: any) => m.__typename === "battleship_ShipAliveCount");
            if (model) {
              const normalizedModelGameId = normalizeHex(model.game_id);
              
              if (normalizedModelGameId === normalizedGameId) {
                foundCount++;
                const playerAddr = normalizeHex(model.player);
                const p1Addr = normalizeHex(gameModel.p1);
                const p2Addr = normalizeHex(gameModel.p2);
                
                if (playerAddr === p1Addr) {
                  p1RemainingHits = model.remaining_hits != null ? parseInt(model.remaining_hits) : 17;
                } else if (playerAddr === p2Addr) {
                  p2RemainingHits = model.remaining_hits != null ? parseInt(model.remaining_hits) : 17;
                }
              }
            }
          });

          // Calculate hits: starts at 17, each hit decrements remaining_hits
          const p1Hits = 17 - p1RemainingHits; // Hits against P1 (P1's ships hit)
          const p2Hits = 17 - p2RemainingHits; // Hits against P2 (P2's ships hit)

          const gameData: GameData = {
            game_id: gameModel.id || gameId,
            player_1: gameModel.p1 || "",
            player_2: gameModel.p2 || "",
            status: parseInt(gameModel.status || "0"),
            current_turn: gameModel.turn_player || "",
            p1_board_hash: "", // Will need separate query for board commits
            p2_board_hash: "",
            p1_hits: p2Hits, // P1's score = hits they landed on P2
            p2_hits: p1Hits, // P2's score = hits they landed on P1
          };

          setGameData(gameData);
          console.log("✅ Game state updated");
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
