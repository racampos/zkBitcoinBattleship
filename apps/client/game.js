/**
 * Battleship game logic
 * Handles transactions and UI updates
 */

const NAMESPACE = 'battleship';
let currentGameId = null;
let account = null;
let manifest = null;
let gameStateHistory = []; // Track state changes for debugging
let pendingShotCoordinates = null; // Store pending shot coords for defender (separate from input boxes)
let myBoard = null; // Store player's board layout

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

// Generate random board with ships
function generateRandomBoard() {
  const board = Array(10).fill(null).map(() => Array(10).fill(0));
  
  // Traditional Battleship ships with their sizes
  const ships = [
    { name: 'Carrier', size: 5 },
    { name: 'Battleship', size: 4 },
    { name: 'Cruiser', size: 3 },
    { name: 'Submarine', size: 3 },
    { name: 'Destroyer', size: 2 }
  ];
  
  // Helper: Check if ship can be placed at position
  function canPlaceShip(x, y, size, isHorizontal) {
    if (isHorizontal) {
      // Check bounds
      if (x + size > 10) return false;
      // Check collision
      for (let i = 0; i < size; i++) {
        if (board[y][x + i] !== 0) return false;
      }
    } else {
      // Vertical
      if (y + size > 10) return false;
      for (let i = 0; i < size; i++) {
        if (board[y + i][x] !== 0) return false;
      }
    }
    return true;
  }
  
  // Helper: Place ship on board
  function placeShip(x, y, size, isHorizontal) {
    if (isHorizontal) {
      for (let i = 0; i < size; i++) {
        board[y][x + i] = 1;
      }
    } else {
      for (let i = 0; i < size; i++) {
        board[y + i][x] = 1;
      }
    }
  }
  
  // Place each ship
  for (const ship of ships) {
    let placed = false;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (!placed && attempts < maxAttempts) {
      const x = Math.floor(Math.random() * 10);
      const y = Math.floor(Math.random() * 10);
      const isHorizontal = Math.random() < 0.5;
      
      if (canPlaceShip(x, y, ship.size, isHorizontal)) {
        placeShip(x, y, ship.size, isHorizontal);
        console.log(`✅ Placed ${ship.name} (size ${ship.size}) at (${x}, ${y}) ${isHorizontal ? 'horizontally' : 'vertically'}`);
        placed = true;
      }
      attempts++;
    }
    
    if (!placed) {
      console.error(`❌ Failed to place ${ship.name} after ${maxAttempts} attempts. Retrying board generation...`);
      // Recursive retry: generate a completely new board
      return generateRandomBoard();
    }
  }
  
  // Verify total cells
  let totalCells = 0;
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      if (board[y][x] === 1) totalCells++;
    }
  }
  
  console.log(`🎯 Board generated successfully! ${ships.length} ships placed, ${totalCells} total cells (expected 17)`);
  return board;
}

// Display board as ASCII grid with consistent character widths (Battleship style: A-J rows, 1-10 columns)
function displayBoard(board, elementId = 'board-grid') {
  const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  
  // Header with column numbers 1-10 (proper alignment)
  let html = '<div style="color: #4CAF50; font-weight: bold; margin-bottom: 4px;">&nbsp;&nbsp;1 2 3 4 5 6 7 8 9 10</div>';
  
  for (let y = 0; y < 10; y++) {
    let row = `<div style="margin: 2px 0;">${rowLabels[y]}  `;
    for (let x = 0; x < 10; x++) {
      const cell = board[y][x];
      if (cell === 1) {
        row += '<span style="color: #4CAF50; font-weight: bold;">S</span> '; // Ship (green)
      } else if (cell === 2) {
        row += '<span style="color: #F44336; font-weight: bold;">X</span> '; // Hit (red)
      } else if (cell === 3) {
        row += '<span style="color: #2196F3;">o</span> '; // Miss (blue)
      } else {
        row += '<span style="color: #555;">·</span> '; // Water (gray)
      }
    }
    row += '</div>';
    html += row;
  }
  document.getElementById(elementId).innerHTML = html;
}

function initGame(acc, man) {
  account = acc;
  manifest = man;
  
  // Generate player's defense board (my ships)
  window._currentBoard = generateRandomBoard();
  displayBoard(window._currentBoard, 'board-grid');
  
  // Initialize opponent tracking board (starts empty - all water)
  window._opponentBoard = [];
  for (let i = 0; i < 10; i++) {
    window._opponentBoard[i] = new Array(10).fill(0);
  }
  displayBoard(window._opponentBoard, 'opponent-board-grid');
  
  // Expose refreshGameState globally for Torii subscription callback
  window.refreshGameState = refreshGameState;
  
  // Torii subscription will trigger refreshGameState() on model updates
  // No polling needed - real-time updates via subscription!
  
  // Keyboard shortcut for Dev Mode (Ctrl+D)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault(); // Prevent browser bookmark dialog
      const devSection = document.getElementById('dev-mode-section');
      devSection.style.display = devSection.style.display === 'none' ? 'block' : 'none';
      console.log('🔧 Dev mode toggled');
    }
  });

  // Create Open Game
  document.getElementById('create-open-game-button').onclick = async () => {
    await createOpenGame();
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
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    document.getElementById('shot-row').value = rows[Math.floor(Math.random() * 10)];
    document.getElementById('shot-col').value = Math.floor(Math.random() * 10) + 1; // 1-10
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

  document.getElementById('game-id-display').textContent = `Joining game... ${gameId.substring(0, 20)}...`;
  document.getElementById('game-id-display').style.display = 'block';

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
        
        // Update game management section
        document.getElementById('game-id-display').textContent = '✅ Joined as P2! Commit your board.';
        document.getElementById('game-id-display').style.display = 'block';
        
        // Show board section for P2
        document.getElementById('board-section').style.display = 'block';
        document.getElementById('commit-board-button').disabled = false;
        document.getElementById('board-status').textContent = 'Commit your board to continue!';
        
        console.log('✅ Successfully joined as P2. Game status:', game.status);
      } else if (attempts > 10) {
        clearInterval(checkJoined);
        document.getElementById('game-id-display').textContent = `⚠️ Join may have failed. Check console.`;
      }
    }, 1000);

  } catch (error) {
    console.error('❌ Error joining game:', error);
    console.error('Full error:', JSON.stringify(error, null, 2));
    document.getElementById('game-id-display').textContent = `Error: ${error.message || 'Join failed'}`;
    document.getElementById('game-id-display').style.display = 'block';
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
          
          // Show "Game created!" section with copy button
          const shareUrl = `${window.location.origin}${window.location.pathname}?game=${gameId}`;
          const shareSection = document.getElementById('share-url-section');
          shareSection.style.display = 'block';
          
          const copyButton = document.getElementById('copy-url-button');
          copyButton.onclick = () => {
            navigator.clipboard.writeText(shareUrl);
            copyButton.textContent = '✅ Copied!';
            setTimeout(() => {
              copyButton.textContent = '📋 Copy URL';
            }, 2000);
          };
          
          // Show board section - player needs to commit board
          document.getElementById('board-section').style.display = 'block';
          document.getElementById('commit-board-button').disabled = false;
          document.getElementById('board-status').textContent = 'Commit your board to continue!';
          
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
    
    // Disable button immediately
    const commitButton = document.getElementById('commit-board-button');
    commitButton.disabled = true;
    
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
        document.getElementById('board-status').textContent = `✅ Board committed! Game ready.`;
        // Keep button disabled on success
        
        // Show gameplay sections now that board is committed  
        setTimeout(() => {
          document.getElementById('gameplay-section').style.display = 'block';
          document.getElementById('game-state-section').style.display = 'block';
          console.log('🎮 Gameplay sections now visible!');
        }, 500);
      } else {
        logGameState('Board Commit FAILED', { reason: 'Not found in Torii - transaction likely reverted' });
        document.getElementById('board-status').textContent = `⚠️ Board commit may have failed. Check console.`;
        // Re-enable button on failure
        commitButton.disabled = false;
        alert('Board commit transaction was sent but not found in game state. It likely reverted. Check console for tx hash.');
      }
    }, 3000);

  } catch (error) {
    logGameState('Board Commit ERROR', { error: error.message });
    console.error('Board commit error:', error);
    document.getElementById('board-status').textContent = `❌ Error: ${error.message}`;
    // Re-enable button on error
    document.getElementById('commit-board-button').disabled = false;
    alert(`Board commit failed!\n\nError: ${error.message}`);
  }
}

async function fireShot() {
  // Disable button IMMEDIATELY to prevent double-clicks
  const fireButton = document.getElementById('fire-shot-button');
  fireButton.disabled = true;
  
  // Convert A-J, 1-10 to 0-9, 0-9 for internal use
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const rowInput = document.getElementById('shot-row').value.toUpperCase();
  const colInput = parseInt(document.getElementById('shot-col').value);
  
  const y = rows.indexOf(rowInput);
  const x = colInput - 1; // Convert 1-10 to 0-9
  
  if (y === -1 || x < 0 || x > 9) {
    alert('Invalid coordinates! Row must be A-J, Column must be 1-10');
    fireButton.disabled = false; // Re-enable on validation error
    return;
  }

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
        const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        logGameState('Fire Shot SUCCESS', { x, y });
        document.getElementById('game-status').textContent = `✅ Shot fired at ${rows[y]}${x+1}! Waiting for defender...`;
        // Keep button disabled on success - will be re-enabled by game state updates
        
        // Mark on opponent board as "pending" (will update to hit/miss later)
        // For now, just mark that we fired there
        console.log(`🎯 Fired at: ${rows[y]}${x+1} (${x}, ${y}) - Waiting for proof result...`);
        
        // Wait for Torii to update state
        setTimeout(() => refreshGameState(), 2000);
      } else {
        logGameState('Fire Shot FAILED', { x, y, errors: result.errors });
        document.getElementById('game-status').textContent = `❌ Fire shot failed!`;
        // Re-enable button on failure
        fireButton.disabled = false;
        alert(`Fire shot FAILED!\n\nErrors:\n${result.errors.join('\n')}\n\nCheck console for details.`);
      }
    }, 3000);
    
  } catch (error) {
    logGameState('Fire Shot FAILED', { error: error.message, x, y });
    console.error('Fire shot error:', error);
    document.getElementById('game-status').textContent = `❌ Fire shot failed: ${error.message}`;
    // Re-enable button on error
    document.getElementById('fire-shot-button').disabled = false;
    alert(`Fire shot failed!\n\nError: ${error.message}\n\nPossible reasons:\n- Not your turn\n- Boards not committed\n- Already pending shot\n- Out of bounds`);
  }
}

async function applyProof() {
  // Use the stored pending shot coordinates (NOT from input boxes)
  if (!pendingShotCoordinates) {
    alert('No pending shot to apply proof for!');
    return;
  }
  
  const x = pendingShotCoordinates.x;
  const y = pendingShotCoordinates.y;
  
  console.log(`🛡️ Applying proof for opponent's shot at (${x}, ${y})`);
  
  if (x < 0 || x > 9 || y < 0 || y > 9) {
    alert('Invalid coordinates!');
    return;
  }
  
  // Check if this shot hit a ship on OUR board (defender's perspective)
  const wasHit = window._currentBoard && window._currentBoard[y][x] === 1;
  const result = wasHit ? '1' : '0'; // 1 = hit, 0 = miss
  console.log(`🎯 Defender applying proof for shot at (${x}, ${y}): ${wasHit ? 'HIT' : 'MISS'} (result=${result})`);
  
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
        
        // Hide pending shot banner and disable button after successful proof
        document.getElementById('pending-shot-display').style.display = 'none';
        document.getElementById('apply-proof-button').disabled = true;
        pendingShotCoordinates = null; // Clear stored coordinates
        
        // Update board with the shot result (we know locally!)
        console.log('🔍 Checking board for hit/miss...', {
          boardExists: !!window._currentBoard,
          x: x,
          y: y
        });
        
        if (window._currentBoard) {
          const shotX = parseInt(x);
          const shotY = parseInt(y);
          console.log('🎯 Board value at', shotX, shotY, '=', window._currentBoard[shotY][shotX]);
          const wasShip = window._currentBoard[shotY][shotX] === 1;
          
          // 2 = hit, 3 = miss
          window._currentBoard[shotY][shotX] = wasShip ? 2 : 3;
          displayBoard(window._currentBoard);
          
          const hitOrMiss = wasShip ? 'HIT' : 'MISS';
          console.log(`💥 Shot at (${shotX}, ${shotY}) was a ${hitOrMiss}!`);
        } else {
          console.error('❌ NO BOARD EXISTS! Cannot update hit/miss visual.');
        }
        
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

// Refresh game state from Torii (called by subscription callback or manually)
async function refreshGameState() {
  if (!currentGameId) {
    alert('No game ID set. Create a game first or enter game ID.');
    return;
  }

  try {
    // Query 1: Get Game entity
    const gameResponse = await fetch('http://localhost:8081/graphql', {
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

    // Query 2: Get ALL BoardCommit entities for this game
    const commitsResponse = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          battleshipBoardCommitModels(where: { game_id: "${currentGameId}" }) {
            edges {
              node {
                player
                commitment
                game_id
              }
            }
          }
        }`
      })
    });

    const gameResult = await gameResponse.json();
    const commitsResult = await commitsResponse.json();
    
    console.log('✅ Game state refreshed:', gameResult);
    console.log('✅ Board commits query result:', commitsResult);

    // Extract BoardCommit data from the dedicated query
    const allBoardCommits = [];
    if (commitsResult.data?.battleshipBoardCommitModels?.edges) {
      commitsResult.data.battleshipBoardCommitModels.edges.forEach(edge => {
        if (edge.node) {
          allBoardCommits.push(edge.node);
        }
      });
    }
    
    console.log('📋 Board commits found:', allBoardCommits.length, allBoardCommits.map(bc => ({ 
      player: bc.player?.substring(0, 10) + '...', 
      commitment: bc.commitment?.substring(0, 10) + '...' 
    })));

    // Extract Game data and update UI
    if (gameResult.data?.entities?.edges) {
      // Now process Game models
      gameResult.data.entities.edges.forEach(edge => {
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
              
              // Check if both boards are committed (from collected board commits)
              const p1Committed = allBoardCommits.find(bc => 
                bc.player?.toLowerCase() === model.p1?.toLowerCase()
              );
              const p2Committed = allBoardCommits.find(bc => 
                bc.player?.toLowerCase() === model.p2?.toLowerCase()
              );
              const bothBoardsCommitted = p1Committed && p2Committed;
              
              // Log board commit status for debugging
              if (model.status === 1) {
                logGameState('Board Commit Check', {
                  p1Committed: !!p1Committed,
                  p2Committed: !!p2Committed,
                  bothCommitted: bothBoardsCommitted,
                  totalCommits: allBoardCommits.length
                });
              }
              
              // ALWAYS sync button states to actual game state (no optimistic updates)
              console.log('🔍 Checking button state:', { 
                status: model.status, 
                isMyTurn, 
                bothBoardsCommitted,
                turnPlayer: model.turn_player,
                myAddress: account.address 
              });
              
              if (model.status === 1) { // Started
                if (isMyTurn && bothBoardsCommitted) {
                  // My turn to attack - enable coordinate inputs (only if both boards committed)
                  console.log('✅ ENABLING Fire Shot button');
                  document.getElementById('fire-shot-button').disabled = false;
                  document.getElementById('fire-shot-button').style.display = 'inline-block';
                  document.getElementById('pending-shot-display').style.display = 'none'; // Hide banner with Apply Proof
                  document.getElementById('shot-row').disabled = false;
                  document.getElementById('shot-col').disabled = false;
                  document.getElementById('random-coords-button').disabled = false;
                  document.getElementById('game-status').textContent = `🎯 Your turn! (Turn ${model.turn_no})`;
                  logGameState('Button State', { fire: 'enabled', apply: 'in-banner', reason: 'My turn to attack' });
                } else if (isMyTurn && !bothBoardsCommitted) {
                  // My turn but boards not committed yet
                  document.getElementById('fire-shot-button').disabled = true;
                  document.getElementById('fire-shot-button').style.display = 'inline-block';
                  document.getElementById('pending-shot-display').style.display = 'none';
                  document.getElementById('shot-row').disabled = true;
                  document.getElementById('shot-col').disabled = true;
                  document.getElementById('random-coords-button').disabled = true;
                  document.getElementById('game-status').textContent = `⏳ Waiting for both players to commit boards...`;
                  logGameState('Button State', { fire: 'disabled', apply: 'hidden', reason: 'Boards not committed yet' });
                } else if (isP1 || isP2) {
                  // Opponent's turn - I defend, disable coordinate inputs (they're set by opponent's shot)
                  document.getElementById('fire-shot-button').style.display = 'none'; // Hide Fire Shot
                  document.getElementById('shot-row').disabled = true;
                  document.getElementById('shot-col').disabled = true;
                  document.getElementById('random-coords-button').disabled = true;
                  document.getElementById('game-status').textContent = `🛡️ Opponent's turn. Waiting for their shot... (Turn ${model.turn_no})`;
                  logGameState('Button State', { fire: 'hidden', apply: 'in-banner', reason: 'Defending' });
                  
                  // Check for pending shot (will show banner with Apply Proof button if shot exists)
                  queryPendingShot(currentGameId, model.turn_no);
                } else {
                  // Spectator
                  document.getElementById('fire-shot-button').disabled = true;
                  document.getElementById('fire-shot-button').style.display = 'inline-block';
                  document.getElementById('pending-shot-display').style.display = 'none';
                  document.getElementById('shot-row').disabled = true;
                  document.getElementById('shot-col').disabled = true;
                  document.getElementById('random-coords-button').disabled = true;
                  document.getElementById('game-status').textContent = '👀 Spectating...';
                }
              } else if (model.status === 0) { // Created
                document.getElementById('fire-shot-button').disabled = true;
                document.getElementById('fire-shot-button').style.display = 'inline-block';
                document.getElementById('pending-shot-display').style.display = 'none';
                document.getElementById('shot-row').disabled = true;
                document.getElementById('shot-col').disabled = true;
                document.getElementById('random-coords-button').disabled = true;
                const waitingForP2 = model.p2 === '0x0';
                document.getElementById('game-status').textContent = waitingForP2 
                  ? '⏳ Waiting for P2 to join...' 
                  : '⏳ Both players joined. Waiting for start...';
                logGameState('Button State', { fire: 'disabled', apply: 'hidden', reason: 'Game not started', p2Set: !waitingForP2 });
              } else if (model.status === 2) { // Finished
                document.getElementById('fire-shot-button').disabled = true;
                document.getElementById('fire-shot-button').style.display = 'inline-block';
                document.getElementById('pending-shot-display').style.display = 'none';
                document.getElementById('shot-row').disabled = true;
                document.getElementById('shot-col').disabled = true;
                document.getElementById('random-coords-button').disabled = true;
                const winnerIsMe = model.winner?.toLowerCase() === account.address.toLowerCase();
                document.getElementById('game-status').textContent = winnerIsMe ? '🏆 You won!' : '😞 You lost!';
                logGameState('Button State', { fire: 'disabled', apply: 'hidden', reason: 'Game finished' });
              }
            }
          });
        }
      });
    }

  } catch (error) {
    console.error('Error refreshing game state:', error);
  }
  
  // Update opponent board to show MY shots (if I'm the attacker)
  if (currentGameId && account) {
    await updateOpponentBoard(currentGameId, account.address);
  }
}

// Query CellHit data and update board display
async function updateBoardWithHits(gameId, player) {
  try {
    console.log('🔍 Querying CellHit data for player:', player);
    
    // Query all CellHit entities
    const response = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{ entities(first: 100) { edges { node { models { __typename ... on battleship_CellHit { game_id player x y hit } } } } } }`
      })
    });
    
    const result = await response.json();
    
    console.log('🔍 Raw query result:', result);
    
    // Find all hits for this game and player (the one being attacked)
    // Normalize addresses for comparison (lowercase, no padding differences)
    const normalizeAddr = (addr) => addr?.toLowerCase().replace(/^0x0+/, '0x');
    const normalizedPlayer = normalizeAddr(player);
    const normalizedGameId = gameId?.toLowerCase();
    
    const cellHits = [];
    result.data?.entities?.edges.forEach(edge => {
      const cellHitModel = edge.node?.models?.find(m => m.__typename === 'battleship_CellHit');
      if (cellHitModel) {
        console.log('🔍 Checking CellHit:', {
          game_id: cellHitModel.game_id,
          player: cellHitModel.player,
          normalized_player: normalizeAddr(cellHitModel.player),
          target_player: normalizedPlayer,
          match: normalizeAddr(cellHitModel.player) === normalizedPlayer && cellHitModel.game_id?.toLowerCase() === normalizedGameId
        });
        
        if (normalizeAddr(cellHitModel.player) === normalizedPlayer && 
            cellHitModel.game_id?.toLowerCase() === normalizedGameId) {
          cellHits.push(cellHitModel);
        }
      }
    });
    
    console.log('📊 Found cell hits:', cellHits);
    
    // Ensure board exists
    if (!window._currentBoard) {
      console.log('⚠️ Board not generated yet, creating placeholder');
      window._currentBoard = generateRandomBoard();
      displayBoard(window._currentBoard);
    }
    
    // Update board with hits
    if (cellHits.length > 0) {
      cellHits.forEach(hit => {
        const x = parseInt(hit.x);
        const y = parseInt(hit.y);
        if (x >= 0 && x < 10 && y >= 0 && y < 10) {
          // 2 = hit, 3 = miss
          window._currentBoard[y][x] = hit.hit ? 2 : 3;
        }
      });
      
      // Redisplay board
      displayBoard(window._currentBoard);
      console.log('✅ Board updated with', cellHits.length, 'hits/misses');
    }
  } catch (error) {
    console.error('Error updating board with hits:', error);
  }
}

// Query completed shots and update opponent tracking board (MY shots against opponent)
async function updateOpponentBoard(gameId, myAddress) {
  try {
    if (!window._opponentBoard || !myAddress) return;
    
    console.log('🔍 Querying MY completed shots for opponent board...');
    
    // Query Shot entities where I was the attacker
    const response = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{ entities(first: 100) { edges { node { models { __typename ... on battleship_AttackerShot { game_id attacker x y fired } ... on battleship_Shot { game_id turn_no x y result } } } } } }`
      })
    });
    
    const result = await response.json();
    
    // Find MY shots (where I'm the attacker) and their results
    const myShots = new Map(); // Map of "x,y" -> result
    
    // First pass: collect all MY AttackerShot coordinates
    result.data?.entities?.edges.forEach(edge => {
      const attackerShot = edge.node?.models?.find(m => 
        m.__typename === 'battleship_AttackerShot' && 
        m.game_id === gameId &&
        m.attacker?.toLowerCase() === myAddress?.toLowerCase() &&
        m.fired
      );
      
      if (attackerShot) {
        const key = `${attackerShot.x},${attackerShot.y}`;
        myShots.set(key, null); // Mark as fired, result unknown yet
      }
    });
    
    // Second pass: find Shot results for MY coordinates
    result.data?.entities?.edges.forEach(edge => {
      const shot = edge.node?.models?.find(m => 
        m.__typename === 'battleship_Shot' && 
        m.game_id === gameId
      );
      
      if (shot) {
        const key = `${shot.x},${shot.y}`;
        if (myShots.has(key)) {
          // This is MY shot with a result
          const resultValue = parseInt(shot.result);
          myShots.set(key, resultValue);
          console.log(`📍 Found result for MY shot at (${shot.x}, ${shot.y}): raw=${shot.result} (type=${typeof shot.result}), parsed=${resultValue}, interpretation=${resultValue === 1 ? 'HIT' : 'MISS'}`);
        }
      }
    });
    
    console.log(`📊 Total MY shots tracked: ${myShots.size}`);
    console.log(`📊 MY shots with results:`, Array.from(myShots.entries()).filter(([k, v]) => v !== null));
    
    // Update opponent board with MY shots only
    myShots.forEach((shotResult, coordKey) => {
      const [x, y] = coordKey.split(',').map(Number);
      
      if (x >= 0 && x < 10 && y >= 0 && y < 10 && shotResult !== null) {
        // result: 1 = hit, 0 = miss
        const cellValue = shotResult === 1 ? 2 : 3;
        window._opponentBoard[y][x] = cellValue;
        console.log(`🎯 Updated opponent board[${y}][${x}] = ${cellValue} (${shotResult === 1 ? 'X' : 'o'})`);
      }
    });
    
    // Redisplay opponent board
    if (myShots.size > 0) {
      displayBoard(window._opponentBoard, 'opponent-board-grid');
      console.log(`✅ Updated opponent board with ${myShots.size} of MY shots`);
    }
  } catch (error) {
    console.error('Error updating opponent board:', error);
  }
}

// Query for pending shot when defending
async function queryPendingShot(gameId, turnNo) {
  try {
    console.log('🔍 Querying for pending shot:', { gameId, turnNo });
    
    // Query all PendingShots and filter for our game
    const response = await fetch('http://localhost:8081/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{ entities(first: 100) { edges { node { models { __typename ... on battleship_PendingShot { game_id turn_no x y shooter } } } } } }`
      })
    });
    
    const result = await response.json();
    
    // Find PendingShot for our game and turn
    let pendingShot = null;
    result.data?.entities?.edges.forEach(edge => {
      const ps = edge.node?.models?.find(m => 
        m.__typename === 'battleship_PendingShot' && 
        m.game_id === gameId && 
        m.turn_no === turnNo
      );
      if (ps) pendingShot = ps;
    });
    
    console.log('📡 Pending shot search result:', pendingShot || 'Not found');
    
    if (pendingShot) {
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      const x = parseInt(pendingShot.x);
      const y = parseInt(pendingShot.y);
      const displayCoords = `${rows[y]}${x+1}`;
      
      // Store pending shot coordinates globally (for applyProof to use)
      pendingShotCoordinates = { x, y };
      
      // Display Battleship-style coordinates
      document.getElementById('pending-coords').textContent = displayCoords;
      document.getElementById('pending-shot-display').style.display = 'block';
      
      // Enable Apply Proof button
      document.getElementById('apply-proof-button').disabled = false;
      
      // DO NOT populate input boxes - those are for attacker mode only!
      
      // Only log once to avoid spam
      if (!window._lastPendingShot || window._lastPendingShot !== `${x},${y}`) {
        logGameState('Pending Shot Found', { x, y, display: displayCoords });
        console.log(`🎯🎯🎯 Opponent fired at: ${displayCoords} 🎯🎯🎯`);
        window._lastPendingShot = `${x},${y}`;
      }
    } else {
      document.getElementById('pending-shot-display').style.display = 'none';
      document.getElementById('apply-proof-button').disabled = true;
      pendingShotCoordinates = null;
      window._lastPendingShot = null;
    }
  } catch (error) {
    console.error('Error querying pending shot:', error);
  }
}

export { initGame, setGameIdFromUrl, joinGame };

