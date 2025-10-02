/**
 * Battleship game logic
 * Handles transactions and UI updates
 */

const NAMESPACE = 'battleship';
let currentGameId = null;
let account = null;
let manifest = null;

function initGame(acc, man) {
  account = acc;
  manifest = man;

  // Create Game
  document.getElementById('create-game-button').onclick = async () => {
    await createGame();
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

  // Gameplay
  document.getElementById('fire-shot-button').onclick = async () => {
    await fireShot();
  };

  document.getElementById('apply-proof-button').onclick = async () => {
    await applyProof();
  };
}

async function createGame() {
  const p2 = '0x42b249d1633812d903f303d640a4261f58fead5aa24925a9efc1dd9d76fb555'; // Hardcoded for testing

  const tx = await account.execute({
    contractAddress: getContractAddress('battleship-game_management'),
    entrypoint: 'create_game',
    calldata: [p2, '10'], // p2 address, board_size
  });

  console.log('Create game tx:', tx.transaction_hash);
  document.getElementById('game-id-display').textContent = `Creating... tx: ${tx.transaction_hash}`;

  // For simplicity, derive game ID client-side or wait for event
  // In production, parse return value from transaction
  document.getElementById('coin-commit-button').disabled = false;
  document.getElementById('commit-board-button').disabled = false;
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

  const tx = await account.execute({
    contractAddress: getContractAddress('battleship-coin_flip'),
    entrypoint: 'start_game_reveal',
    calldata: [currentGameId, nonce],
  });

  console.log('Coin flip reveal tx:', tx.transaction_hash);
  document.getElementById('coin-status').textContent = `Revealed! Game should start. tx: ${tx.transaction_hash}`;
  document.getElementById('fire-shot-button').disabled = false;
}

async function commitBoard() {
  if (!currentGameId) {
    currentGameId = prompt('Enter game ID:');
    if (!currentGameId) return;
  }

  const commitment = '0x' + '2'.repeat(64); // Mock commitment
  const rulesHash = '0x' + 'a'.repeat(64); // Mock rules hash
  const proof = []; // Empty array for now (Span issue)

  const tx = await account.execute({
    contractAddress: getContractAddress('battleship-board_commit'),
    entrypoint: 'commit_board',
    calldata: [currentGameId, commitment, rulesHash, proof.length, ...proof],
  });

  console.log('Board commit tx:', tx.transaction_hash);
  document.getElementById('board-status').textContent = `Board committed! tx: ${tx.transaction_hash}`;
}

async function fireShot() {
  const x = document.getElementById('shot-x').value;
  const y = document.getElementById('shot-y').value;

  const tx = await account.execute({
    contractAddress: getContractAddress('battleship-gameplay'),
    entrypoint: 'fire_shot',
    calldata: [currentGameId, x, y],
  });

  console.log('Fire shot tx:', tx.transaction_hash);
  document.getElementById('game-status').textContent = `Shot fired at (${x},${y})! tx: ${tx.transaction_hash}`;
  document.getElementById('apply-proof-button').disabled = false;
}

async function applyProof() {
  const x = document.getElementById('shot-x').value;
  const y = document.getElementById('shot-y').value;
  const result = '1'; // Mock result (hit)
  const nullifier = '0x' + '4'.repeat(64); // Mock nullifier
  const rulesHash = '0x' + 'a'.repeat(64); // Mock rules hash
  const proof = []; // Empty array

  const tx = await account.execute({
    contractAddress: getContractAddress('battleship-proof_verify'),
    entrypoint: 'apply_shot_proof',
    calldata: [currentGameId, x, y, result, nullifier, rulesHash, proof.length, ...proof],
  });

  console.log('Apply proof tx:', tx.transaction_hash);
  document.getElementById('game-status').textContent = `Proof applied! tx: ${tx.transaction_hash}`;
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
        document.getElementById('status-display').textContent = game.status;
        document.getElementById('turn-display').textContent = game.turn_no;
        document.getElementById('p1-display').textContent = game.p1?.substring(0, 10) + '...';
        document.getElementById('p2-display').textContent = game.p2?.substring(0, 10) + '...';

        // Store game ID for later use
        if (!currentGameId) {
          currentGameId = game.id;
          document.getElementById('game-id-display').textContent = `Game ID: ${game.id}`;
        }
      }
    }
  });
}

export { initGame, updateFromEntitiesData };

