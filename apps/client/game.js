/**
 * Battleship game logic
 * Handles transactions and UI updates
 */

const NAMESPACE = 'battleship';
let currentGameId = null;
let account = null;
let manifest = null;
let gameStateHistory = []; // Track state changes for debugging

function logGameState(event, details) {
  const timestamp = new Date().toLocaleTimeString();
  const entry = { timestamp, event, details };
  gameStateHistory.push(entry);
  console.log(`📝 [${timestamp}] ${event}:`, details);
  
  // Keep last 20 entries
  if (gameStateHistory.length > 20) {
    gameStateHistory.shift();
  }
}

// Export function to view history
window.viewGameHistory = () => {
  console.table(gameStateHistory);
  return gameStateHistory;
};

// Check transaction receipt for revert
async function checkTransactionReceipt(txHash) {
  try {
    const response = await fetch('http://localhost:5050', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'starknet_getTransactionReceipt',
        params: [txHash],
        id: 1
      })
    });

    const data = await response.json();
    const receipt = data.result;

    if (receipt.execution_status === 'REVERTED') {
      const revertReason = receipt.revert_reason || 'Unknown error';
      
      // Extract readable error codes
      const errorMatch = revertReason.match(/0x([0-9a-f]+) \('([^']+)'\)/g);
      const errors = errorMatch ? errorMatch.map(m => {
        const match = m.match(/\('([^']+)'\)/);
        return match ? match[1] : m;
      }) : ['Unknown error'];

      logGameState('Transaction REVERTED', { 
        tx: txHash, 
        errors: errors,
        fullReason: revertReason.substring(0, 200) 
      });

      return { success: false, errors, fullReason: revertReason };
    }

    logGameState('Transaction SUCCESS', { tx: txHash });
    return { success: true };

  } catch (error) {
    console.error('Error checking receipt:', error);
    return { success: false, errors: ['Failed to check receipt'] };
  }
}

// Export a function to set game ID from URL
function setGameIdFromUrl(gameId) {
  currentGameId = gameId;
  console.log('✅ Game ID loaded from URL:', gameId);
}

function initGame(acc, man) {
  account = acc;
  manifest = man;

  // Create Open Game
  document.getElementById('create-open-game-button').onclick = async () => {
    await createOpenGame();
  };

  // Join Game
  document.getElementById('join-game-button').onclick = async () => {
    await joinGame();
  };

  // Refresh Game State
  document.getElementById('refresh-game-button').onclick = async () => {
    await refreshGameState();
  };

  // Dev Mode: Enable All Buttons
  document.getElementById('skip-to-gameplay-button').onclick = () => {
    if (!currentGameId) {
      alert('Create a game first!');
      return;
    }
    document.getElementById('fire-shot-button').disabled = false;
    document.getElementById('apply-proof-button').disabled = false;
    document.getElementById('game-status').textContent = '🔧 Dev Mode: All buttons enabled (bypass turn checks)';
    console.log('🔧 Dev mode: Enabled all gameplay buttons for testing');
  };

  // Coin Flip
  document.getElementById('coin-commit-button').onclick = async () => {
    await coinFlipCommit();
  };

  document.getElementById('coin-reveal-button').onclick = async () => {
    await coinFlipReveal();
  };

  // Board Commit
  document.getElementById('commit-board-button').onclick = async () => {
    await commitBoard();
  };

  // Random coordinates button
  document.getElementById('random-coords-button').onclick = () => {
    document.getElementById('shot-x').value = Math.floor(Math.random() * 10);
    document.getElementById('shot-y').value = Math.floor(Math.random() * 10);
  };

  // Auto-set pending shot coordinates
  document.getElementById('auto-set-coords').onclick = () => {
    const x = document.getElementById('pending-x').textContent;
    const y = document.getElementById('pending-y').textContent;
    document.getElementById('shot-x').value = x;
    document.getElementById('shot-y').value = y;
  };

  // Gameplay
  document.getElementById('fire-shot-button').onclick = async () => {
    await fireShot();
  };

  document.getElementById('apply-proof-button').onclick = async () => {
    await applyProof();
  };
}

async function createOpenGame() {
  const zero_address = '0x0'; // Open game - anyone can join
  
  // Generate truly unique nonce: timestamp + random bytes
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const random1 = Math.random().toString(16).substring(2).padStart(16, '0');
  const random2 = Math.random().toString(16).substring(2).padStart(16, '0');
  const random3 = Math.random().toString(16).substring(2).padStart(16, '0');
  const randomNonce = '0x' + timestamp + random1 + random2 + random3;

  document.getElementById('create-open-game-button').disabled = true;
  document.getElementById('game-id-display').textContent = 'Creating open game...';

  try {
    console.log('🎲 Using nonce:', randomNonce);
    logGameState('Create Game', { nonce: randomNonce });
    
    const tx = await account.execute({
      contractAddress: getContractAddress('battleship-game_management'),
      entrypoint: 'create_game',
      calldata: [zero_address, '10', randomNonce], // p2, board_size, nonce
    });

    console.log('✅ Create game tx:', tx.transaction_hash);
    document.getElementById('game-id-display').textContent = `Waiting for Torii to index... tx: ${tx.transaction_hash}`;

    // Poll Torii to fetch the newly created game
    pollForNewGame(tx.transaction_hash);

  } catch (error) {
    console.error('Error creating game:', error);
    document.getElementById('game-id-display').textContent = `Error: ${error.message}`;
    document.getElementById('create-open-game-button').disabled = false;
  }
}

async function joinGame() {
  let gameId = currentGameId; // Use from URL if available
  
  if (!gameId) {
    gameId = prompt('Enter game ID to join:');
    if (!gameId) return;
  }

  document.getElementById('join-game-button').disabled = true;
  document.getElementById('game-id-display').textContent = `Joining game... ${gameId.substring(0, 20)}...`;

  try {
    console.log('🔄 Executing join_game with game_id:', gameId);
    
    const tx = await account.execute({
      contractAddress: getContractAddress('battleship-game_management'),
      entrypoint: 'join_game',
      calldata: [gameId],
    });

    console.log('✅ Join game tx sent:', tx.transaction_hash);
    document.getElementById('game-id-display').textContent = `Joining... tx: ${tx.transaction_hash}`;

    // Set the game ID and wait for confirmation
    currentGameId = gameId;
    
    // Poll to verify P2 was actually set
    let attempts = 0;
    const checkJoined = setInterval(async () => {
      attempts++;
      await refreshGameState();
      
      // Check if we're now P2
      const response = await fetch('http://localhost:8081/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{ entities(keys: ["${gameId}"]) { edges { node { models { __typename ... on battleship_Game { p2 status } } } } } }`
        })
      });
      
      const result = await response.json();
      const game = result.data?.entities?.edges[0]?.node?.models?.find(m => m.__typename === 'battleship_Game');
      
      if (game?.p2 && game.p2 !== '0x0') {
        clearInterval(checkJoined);
        document.getElementById('game-id-display').textContent = `✅ Joined as P2! Game started.`;
        document.getElementById('commit-board-button').disabled = false;
        console.log('✅ Successfully joined as P2. Game status:', game.status);
      } else if (attempts > 10) {
        clearInterval(checkJoined);
        document.getElementById('game-id-display').textContent = `⚠️ Join may have failed. Check console.`;
        document.getElementById('join-game-button').disabled = false;
      }
    }, 1000);

  } catch (error) {
    console.error('❌ Error joining game:', error);
    console.error('Full error:', JSON.stringify(error, null, 2));
    document.getElementById('game-id-display').textContent = `Error: ${error.message || 'Join failed'}`;
    document.getElementById('join-game-button').disabled = false;
    alert(`Join failed: ${error.message || 'Unknown error'}. Check console for details.`);
  }
}

// Poll for the newly created game by checking the transaction receipt
async function pollForNewGame(txHash) {
  const maxAttempts = 10;
  let attempts = 0;
  
  console.log('🔍 Polling for game ID from tx:', txHash);

  const checkInterval = setInterval(async () => {
    attempts++;
    
    try {
      // Get transaction receipt which contains the return value (game_id)
      const response = await fetch('http://localhost:5050', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'starknet_getTransactionReceipt',
          params: [txHash],
          id: 1
        })
      });

      const data = await response.json();
      const receipt = data.result;
      
      if (receipt && receipt.execution_status === 'SUCCEEDED') {
        // Look for Game model update event which contains the game_id
        const gameEvent = receipt.events?.find(e => 
          e.keys && e.keys.length > 2 && e.keys[1]?.includes('19ecd3fc') // Game model selector
        );
        
        // Game ID is in data[1] (field value), not keys[2] (entity hash)
        const gameId = gameEvent?.data?.[1];
        
        if (gameId) {
          currentGameId = gameId;
          document.getElementById('game-id-display').textContent = `✅ Game ID: ${gameId.substring(0, 20)}...`;
          document.getElementById('coin-commit-button').disabled = false;
          document.getElementById('commit-board-button').disabled = false;
          document.getElementById('coin-status').textContent = 'Ready to commit!';
          document.getElementById('board-status').textContent = 'Ready to commit board!';
          
          // Update share URL
          const shareUrl = `${window.location.origin}${window.location.pathname}?game=${gameId}`;
          document.getElementById('share-url').textContent = shareUrl;
          document.getElementById('share-url').innerHTML = `<a href="${shareUrl}" target="_blank">${shareUrl}</a>`;
          
          console.log('✅ Game created with ID:', gameId);
          console.log('📤 Share this URL with opponent:', shareUrl);
          clearInterval(checkInterval);
        }
      }
    } catch (error) {
      console.log('Waiting for Torii... attempt', attempts);
    }

    if (attempts >= maxAttempts) {
      clearInterval(checkInterval);
      document.getElementById('game-id-display').textContent = 'Timeout waiting for game. Check console.';
      document.getElementById('create-game-button').disabled = false;
    }
  }, 1000); // Check every second
}

async function coinFlipCommit() {
  if (!currentGameId) {
    currentGameId = prompt('Enter game ID:');
    if (!currentGameId) return;
  }

  const commitHash = '0x' + '1'.repeat(64); // Mock commit hash

  const tx = await account.execute({
    contractAddress: getContractAddress('battleship-coin_flip'),
    entrypoint: 'start_game_commit',
    calldata: [currentGameId, commitHash],
  });

  console.log('Coin flip commit tx:', tx.transaction_hash);
  document.getElementById('coin-status').textContent = `Committed! tx: ${tx.transaction_hash}`;
  document.getElementById('coin-reveal-button').disabled = false;
}

async function coinFlipReveal() {
  const nonce = '0x1'; // Mock nonce (in production, compute from commitment)

  try {
    const tx = await account.execute({
      contractAddress: getContractAddress('battleship-coin_flip'),
      entrypoint: 'start_game_reveal',
      calldata: [currentGameId, nonce],
    });

    console.log('Coin flip reveal tx:', tx.transaction_hash);
    document.getElementById('coin-status').textContent = `Revealed! tx: ${tx.transaction_hash}`;
    
    // Wait for transaction and check game state
    setTimeout(async () => {
      // Game starts when BOTH players have committed AND revealed
      document.getElementById('coin-status').textContent = '⏳ Waiting for both players to commit & reveal...';
      
      // Enable fire shot - user can try, guards will prevent if not ready
      document.getElementById('fire-shot-button').disabled = false;
      document.getElementById('game-status').textContent = '🎯 Click "Refresh Game State" to check if game started';
    }, 2000);
  } catch (error) {
    console.error('Coin flip reveal error:', error);
    document.getElementById('coin-status').textContent = `Error: ${error.message}`;
  }
}

async function commitBoard() {
  if (!currentGameId) {
    currentGameId = prompt('Enter game ID:');
    if (!currentGameId) return;
  }

  const commitment = '0x' + '2'.repeat(64); // Mock commitment  
  const rulesHash = '0x' + 'a'.repeat(64); // Mock rules hash

  try {
    logGameState('Board Commit Attempt', { gameId: currentGameId, commitment });
    
    const tx = await account.execute({
      contractAddress: getContractAddress('battleship-board_commit'),
      entrypoint: 'commit_board',
      calldata: [currentGameId, commitment, rulesHash], // No proof parameter!
    });

    logGameState('Board Commit TX Sent', { tx: tx.transaction_hash });
    console.log('Board commit tx:', tx.transaction_hash);
    document.getElementById('board-status').textContent = `Committing... tx: ${tx.transaction_hash}`;
    
    // Wait and verify it actually worked
    setTimeout(async () => {
      // Query Torii to see if our board commit exists
      const response = await fetch('http://localhost:8081/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{ entities(keys: ["${currentGameId}", "${account.address}"]) { edges { node { models { __typename ... on battleship_BoardCommit { commitment } } } } } }`
        })
      });
      
      const result = await response.json();
      const boardCommit = result.data?.entities?.edges[0]?.node?.models?.find(m => m.__typename === 'battleship_BoardCommit');
      
      if (boardCommit) {
        logGameState('Board Commit VERIFIED', { commitment: boardCommit.commitment });
        document.getElementById('board-status').textContent = `✅ Board committed successfully!`;
      } else {
        logGameState('Board Commit FAILED', { reason: 'Not found in Torii - transaction likely reverted' });
        document.getElementById('board-status').textContent = `⚠️ Board commit may have failed. Check console.`;
        alert('Board commit transaction was sent but not found in game state. It likely reverted. Check console for tx hash.');
      }
    }, 3000);

  } catch (error) {
    logGameState('Board Commit ERROR', { error: error.message });
    console.error('Board commit error:', error);
    document.getElementById('board-status').textContent = `❌ Error: ${error.message}`;
    alert(`Board commit failed!\n\nError: ${error.message}`);
  }
}

async function fireShot() {
  const x = document.getElementById('shot-x').value;
  const y = document.getElementById('shot-y').value;

  try {
    logGameState('Fire Shot Attempt', { x, y, gameId: currentGameId });
    
    const tx = await account.execute({
      contractAddress: getContractAddress('battleship-gameplay'),
      entrypoint: 'fire_shot',
      calldata: [currentGameId, x, y],
    });

    logGameState('Fire Shot TX Sent', { x, y, tx: tx.transaction_hash });
    document.getElementById('game-status').textContent = `Checking transaction... tx: ${tx.transaction_hash.substring(0, 10)}...`;
    
    // Check if transaction actually succeeded
    setTimeout(async () => {
      const result = await checkTransactionReceipt(tx.transaction_hash);
      
      if (result.success) {
        logGameState('Fire Shot SUCCESS', { x, y });
        document.getElementById('game-status').textContent = `✅ Shot fired at (${x},${y})! Waiting for defender...`;
        
        // Store the shot coordinates for P2 to see
        console.log(`🎯 P1 fired at: (${x}, ${y}) - P2 must apply proof with these EXACT coordinates!`);
        
        // Auto-increment X for next shot (after storing current coords)
        document.getElementById('shot-x').value = (parseInt(x) + 1) % 10;
        
        // Wait for Torii to update state
        setTimeout(() => refreshGameState(), 2000);
      } else {
        logGameState('Fire Shot FAILED', { x, y, errors: result.errors });
        document.getElementById('game-status').textContent = `❌ Fire shot failed!`;
        alert(`Fire shot FAILED!\n\nErrors:\n${result.errors.join('\n')}\n\nCheck console for details.`);
      }
    }, 3000);
    
  } catch (error) {
    logGameState('Fire Shot FAILED', { error: error.message, x, y });
    console.error('Fire shot error:', error);
    document.getElementById('game-status').textContent = `❌ Fire shot failed: ${error.message}`;
    alert(`Fire shot failed!\n\nError: ${error.message}\n\nPossible reasons:\n- Not your turn\n- Boards not committed\n- Already pending shot\n- Out of bounds`);
  }
}

async function applyProof() {
  const x = document.getElementById('shot-x').value;
  const y = document.getElementById('shot-y').value;
  const result = '1'; // Mock result (hit)
  const nullifier = '0x' + Math.random().toString(16).substring(2).padStart(64, '0'); // Random nullifier
  const rulesHash = '0x' + 'a'.repeat(64); // Mock rules hash

  try {
    logGameState('Apply Proof Attempt', { x, y, result, gameId: currentGameId });
    
    const tx = await account.execute({
      contractAddress: getContractAddress('battleship-proof_verify'),
      entrypoint: 'apply_shot_proof',
      calldata: [currentGameId, x, y, result, nullifier, rulesHash], // No proof parameter!
    });

    logGameState('Apply Proof TX Sent', { x, y, result, tx: tx.transaction_hash });
    document.getElementById('game-status').textContent = `Checking transaction... tx: ${tx.transaction_hash.substring(0, 10)}...`;

    // Check if transaction actually succeeded
    setTimeout(async () => {
      const receipt = await checkTransactionReceipt(tx.transaction_hash);
      
      if (receipt.success) {
        logGameState('Apply Proof SUCCESS', { x, y, result });
        document.getElementById('game-status').textContent = `✅ Proof applied! Waiting for turn flip...`;
        
        // Refresh state after a delay
        setTimeout(async () => {
          await refreshGameState();
          logGameState('Post-Proof Refresh', { message: 'Turn should have flipped!' });
        }, 2000);
      } else {
        logGameState('Apply Proof FAILED', { x, y, errors: receipt.errors });
        document.getElementById('game-status').textContent = `❌ Apply proof failed!`;
        alert(`Apply proof FAILED!\n\nErrors:\n${receipt.errors.join('\n')}\n\nCheck console for details.`);
      }
    }, 3000);

  } catch (error) {
    logGameState('Apply Proof FAILED', { error: error.message, x, y });
    console.error('Apply proof error:', error);
    document.getElementById('game-status').textContent = `❌ Apply proof failed: ${error.message}`;
    alert(`Apply proof failed!\n\nError: ${error.message}\n\nPossible reasons:\n- No pending shot\n- Wrong coordinates\n- Not the defender\n- Nullifier replay`);
  }
}

function getContractAddress(tag) {
  const contract = manifest.contracts.find((c) => c.tag === tag);
  if (!contract) {
    throw new Error(`Contract not found: ${tag}`);
  }
  return contract.address;
}

function updateFromEntitiesData(entities) {
  entities.forEach((entity) => {
    if (entity.models && entity.models[NAMESPACE]) {
      const models = entity.models[NAMESPACE];

      if (models.Game) {
        const game = models.Game;
        
        // Update display
        document.getElementById('status-display').textContent = game.status;
        document.getElementById('turn-display').textContent = game.turn_no;
        document.getElementById('p1-display').textContent = game.p1?.substring(0, 10) + '...';
        document.getElementById('p2-display').textContent = game.p2?.substring(0, 10) + '...';

        // Store game ID for later use
        if (!currentGameId) {
          currentGameId = game.id;
          document.getElementById('game-id-display').textContent = `Game ID: ${game.id}`;
        }

        // Enable gameplay when game is started (status = 1)
        if (game.status === 1 || game.status === '1') {
          document.getElementById('fire-shot-button').disabled = false;
          document.getElementById('game-status').textContent = '🎯 Game Started! Fire away!';
          console.log('✅ Game started! Turn player:', game.turn_player);
        } else if (game.status === 0 || game.status === '0') {
          document.getElementById('game-status').textContent = '⏳ Game created, waiting for coin-flip...';
        } else if (game.status === 2 || game.status === '2') {
          document.getElementById('game-status').textContent = '🏆 Game finished! Winner: ' + game.winner?.substring(0, 10) + '...';
          document.getElementById('fire-shot-button').disabled = true;
        }
      }
    }
  });
}

// Manually refresh game state from Torii
async function refreshGameState() {
  if (!currentGameId) {
    alert('No game ID set. Create a game first or enter game ID.');
    return;
  }

  try {
    const response = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{ 
          entities(keys: ["${currentGameId}"]) { 
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
        }`
      })
    });

    const result = await response.json();
    console.log('✅ Game state refreshed:', result);

    // Extract Game data and update UI
    if (result.data?.entities?.edges) {
      result.data.entities.edges.forEach(edge => {
        if (edge.node.models) {
          edge.node.models.forEach(model => {
            if (model.__typename === 'battleship_Game') {
              // Update UI with game data (handle 0 as valid value, not falsy)
              document.getElementById('status-display').textContent = 
                model.status !== undefined ? model.status : '-';
              document.getElementById('turn-display').textContent = 
                model.turn_no !== undefined ? model.turn_no : '-';
              document.getElementById('p1-display').textContent = 
                model.p1 ? model.p1.substring(0, 10) + '...' : '-';
              document.getElementById('p2-display').textContent = 
                model.p2 ? model.p2.substring(0, 10) + '...' : '-';
              
              // Status names for clarity
              const statusNames = ['Created', 'Started', 'Finished', 'Cancelled'];
              const statusName = statusNames[model.status] || model.status;
              
              const isP1 = model.p1?.toLowerCase() === account.address.toLowerCase();
              const isP2 = model.p2?.toLowerCase() === account.address.toLowerCase();
              const isMyTurn = model.turn_player?.toLowerCase() === account.address.toLowerCase();
              const role = isP1 ? 'P1' : isP2 ? 'P2' : 'Spectator';
              
              // Log comprehensive state
              logGameState('State Update', {
                status: `${model.status} (${statusName})`,
                turn: model.turn_no,
                turnPlayer: model.turn_player,
                myRole: role,
                isMyTurn: isMyTurn,
                p1: model.p1,
                p2: model.p2,
                myAddress: account.address
              });
              
              // ALWAYS sync button states to actual game state (no optimistic updates)
              if (model.status === 1) { // Started
                if (isMyTurn) {
                  // My turn to attack
                  document.getElementById('fire-shot-button').disabled = false;
                  document.getElementById('apply-proof-button').disabled = true;
                  document.getElementById('pending-shot-display').style.display = 'none';
                  document.getElementById('game-status').textContent = `🎯 Your turn! (Turn ${model.turn_no})`;
                  logGameState('Button State', { fire: 'enabled', apply: 'disabled', reason: 'My turn to attack' });
                } else if (isP1 || isP2) {
                  // Opponent's turn - I defend
                  document.getElementById('fire-shot-button').disabled = true;
                  document.getElementById('apply-proof-button').disabled = false;
                  document.getElementById('game-status').textContent = `🛡️ Opponent's turn. Waiting for their shot... (Turn ${model.turn_no})`;
                  logGameState('Button State', { fire: 'disabled', apply: 'enabled', reason: 'Defending' });
                  
                  // Check for pending shot
                  queryPendingShot(currentGameId, model.turn_no);
                } else {
                  // Spectator
                  document.getElementById('fire-shot-button').disabled = true;
                  document.getElementById('apply-proof-button').disabled = true;
                  document.getElementById('game-status').textContent = '👀 Spectating...';
                }
              } else if (model.status === 0) { // Created
                document.getElementById('fire-shot-button').disabled = true;
                document.getElementById('apply-proof-button').disabled = true;
                const waitingForP2 = model.p2 === '0x0';
                document.getElementById('game-status').textContent = waitingForP2 
                  ? '⏳ Waiting for P2 to join...' 
                  : '⏳ Both players joined. Waiting for start...';
                logGameState('Button State', { fire: 'disabled', apply: 'disabled', reason: 'Game not started', p2Set: !waitingForP2 });
              } else if (model.status === 2) { // Finished
                document.getElementById('fire-shot-button').disabled = true;
                document.getElementById('apply-proof-button').disabled = true;
                const winnerIsMe = model.winner?.toLowerCase() === account.address.toLowerCase();
                document.getElementById('game-status').textContent = winnerIsMe ? '🏆 You won!' : '😞 You lost!';
                logGameState('Button State', { fire: 'disabled', apply: 'disabled', reason: 'Game finished' });
              }
            }
          });
        }
      });
    }

  } catch (error) {
    console.error('Error refreshing game state:', error);
  }
}

// Query for pending shot when defending
async function queryPendingShot(gameId, turnNo) {
  try {
    const response = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{ entities(keys: ["${gameId}", "${turnNo}"]) { edges { node { models { __typename ... on battleship_PendingShot { x y shooter } } } } } }`
      })
    });
    
    const result = await response.json();
    const pendingShot = result.data?.entities?.edges[0]?.node?.models?.find(m => m.__typename === 'battleship_PendingShot');
    
    if (pendingShot) {
      document.getElementById('pending-x').textContent = pendingShot.x;
      document.getElementById('pending-y').textContent = pendingShot.y;
      document.getElementById('pending-shot-display').style.display = 'block';
      
      // Auto-set coordinates
      document.getElementById('shot-x').value = pendingShot.x;
      document.getElementById('shot-y').value = pendingShot.y;
      
      logGameState('Pending Shot Found', { x: pendingShot.x, y: pendingShot.y });
      console.log('🎯 Opponent fired at:', pendingShot.x, pendingShot.y);
    } else {
      document.getElementById('pending-shot-display').style.display = 'none';
    }
  } catch (error) {
    console.error('Error querying pending shot:', error);
  }
}

export { initGame, updateFromEntitiesData, setGameIdFromUrl };

