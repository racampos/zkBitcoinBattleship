# React Migration Plan

**Status:** 📋 Planning Phase  
**Priority:** High (required for 3D graphical board upgrade)  
**Estimated Time:** 6-8 hours total

---

## Why Migrate to React?

### Current State

- ✅ Battleship game built with vanilla JavaScript + DOM manipulation
- ✅ Works well but limited for complex UI updates
- ✅ ASCII-based board display (functional but not polished)

### Motivations

1. **3D Board Upgrade**: Planning to replace ASCII board with 3D graphics (Three.js)
   - `react-three-fiber` is the industry standard for Three.js + React
   - Declarative 3D components much easier than imperative Three.js
2. **Bitcoin Integration**: Already built with React/TSX components
   - Zustand stores designed for React hooks
   - All Bitcoin UI components are React (XverseConnectButton, DepositModal, etc.)
3. **Better State Management**: Complex game state easier with React hooks + Zustand
4. **Component Architecture**: Cleaner separation of concerns
5. **Future Features**: Faster development with reusable components

---

## Migration Phases

### Phase 1: React Setup (30 minutes)

#### 1.1 Install Dependencies

```bash
cd apps/client
pnpm add react react-dom
pnpm add -D @vitejs/plugin-react @types/react @types/react-dom
```

#### 1.2 Update Vite Configuration

File: `apps/client/vite.config.js`

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [
    react(), // Add React plugin
    mkcert(),
    wasm(),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": "/src", // Optional: clean imports
    },
  },
});
```

#### 1.3 Create TypeScript Config (Optional but Recommended)

File: `apps/client/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### 1.4 Create New Entry Points

- Keep `index.html` + `game.js` as backup (rename to `index-legacy.html`)
- Create new `index.html` + `src/App.tsx` for React version

---

### Phase 2: Core Game Components (2-3 hours)

#### 2.1 Extract Game Logic into Hooks

**File: `src/hooks/useDojo.ts`**

```typescript
import { useEffect, useState } from "react";
import { Account } from "starknet";
import { init } from "@dojoengine/sdk";
import manifest from "../../chain/dojo/manifest_dev.json";

export function useDojo(account: Account | null) {
  const [torii, setTorii] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!account) return;

    const initDojo = async () => {
      const toriiClient = await init({
        client: {
          worldAddress: manifest.world.address,
          toriiUrl: "http://localhost:8081",
          rpcUrl: "http://localhost:5050",
          relayUrl: "http://localhost:50051",
        },
        domain: {
          name: "zk-battleship",
          version: "1.0",
          chainId: "KATANA",
          revision: "1",
        },
      });

      setTorii(toriiClient);
      setInitialized(true);
    };

    initDojo();
  }, [account]);

  return { torii, initialized };
}
```

**File: `src/hooks/useGame.ts`**

```typescript
// Port game.js logic into React hook
export function useGame(account: Account | null, manifest: any) {
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myBoard, setMyBoard] = useState<number[][] | null>(null);
  const [opponentBoard, setOpponentBoard] = useState<(null | 'hit' | 'miss')[][]>([...]);

  // Contract call functions
  const createGame = async (boardSize: number) => { ... };
  const commitBoard = async () => { ... };
  const fireShot = async (x: number, y: number) => { ... };
  const applyProof = async (x: number, y: number, result: number) => { ... };

  return {
    gameId,
    gameState,
    myBoard,
    opponentBoard,
    createGame,
    commitBoard,
    fireShot,
    applyProof,
  };
}
```

**File: `src/hooks/useController.ts`**

```typescript
// Cartridge Controller integration
import Controller from "@cartridge/controller";
import { useEffect, useState } from "react";

export function useController() {
  const [controller] = useState(() => new Controller(controllerOpts));
  const [account, setAccount] = useState<Account | null>(null);
  const [connected, setConnected] = useState(false);

  // Auto-reconnect on mount
  useEffect(() => {
    const reconnect = async () => {
      try {
        const acc = await controller.probe();
        if (acc) {
          setAccount(acc);
          setConnected(true);
        }
      } catch (error) {
        console.log("No existing session");
      }
    };
    reconnect();
  }, [controller]);

  const connect = async () => {
    const acc = await controller.connect();
    setAccount(acc);
    setConnected(true);
  };

  return { controller, account, connected, connect };
}
```

#### 2.2 Create Component Structure

```
src/
├── components/
│   ├── game/
│   │   ├── GameBoard.tsx          // Defense board (your ships)
│   │   ├── AttackBoard.tsx        // Opponent board (track shots)
│   │   ├── CoordinateInput.tsx    // Row/column selectors
│   │   ├── GameControls.tsx       // Fire, Apply Proof buttons
│   │   ├── GameStatus.tsx         // Turn, status display
│   │   └── ShipPlacement.tsx      // Random board generator UI
│   ├── bitcoin/                    // Already exists!
│   │   ├── XverseConnectButton.tsx
│   │   ├── DepositModal.tsx
│   │   └── ... (rest of Bitcoin components)
│   └── shared/
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── StatusIndicator.tsx
├── hooks/
│   ├── useDojo.ts
│   ├── useGame.ts
│   ├── useController.ts
│   ├── useBitcoinWallet.ts        // Already exists!
│   └── useAtomiqSwap.ts           // Already exists!
├── services/                       // Already exists!
│   ├── xverse.ts
│   ├── atomiq.ts
│   └── types/
├── store/                          // Already exists!
│   ├── btcWalletStore.ts
│   └── swapStore.ts
├── utils/
│   ├── board.ts                   // Board validation, random placement
│   ├── contracts.ts               // Contract address helpers
│   └── formatting.ts              // Address shortening, etc.
└── App.tsx                         // Main app component
```

#### 2.3 Build Basic React UI (Keep 2D for Now)

**File: `src/App.tsx`**

```tsx
import { useController } from "./hooks/useController";
import { useDojo } from "./hooks/useDojo";
import { useGame } from "./hooks/useGame";
import { GameBoard } from "./components/game/GameBoard";
import { AttackBoard } from "./components/game/AttackBoard";
import { GameControls } from "./components/game/GameControls";
import manifest from "../chain/dojo/manifest_dev.json";

export default function App() {
  const { account, connected, connect } = useController();
  const { torii, initialized } = useDojo(account);
  const game = useGame(account, manifest);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header>
        <h1>⚔️ ZK Battleship</h1>
        {!connected && <button onClick={connect}>Connect Wallet</button>}
        {connected && <div>Connected: {account?.address}</div>}
      </header>

      <main>
        {game.gameId && (
          <>
            <GameBoard board={game.myBoard} />
            <AttackBoard board={game.opponentBoard} />
            <GameControls game={game} />
          </>
        )}
      </main>
    </div>
  );
}
```

#### 2.4 Testing Checkpoint

- ✅ Game connects to Dojo/Torii
- ✅ Can create games
- ✅ Board displays (simple 2D grid for now)
- ✅ Can fire shots and apply proofs
- ✅ Game state updates correctly

---

### Phase 3: Integrate Bitcoin Components (1 hour)

This phase is **easy** because all Bitcoin code is already React!

**File: `src/App.tsx` (add Bitcoin panel)**

```tsx
import { XverseConnectButton } from "./components/bitcoin/XverseConnectButton";
import { DepositModal } from "./components/bitcoin/DepositModal";
import { BTCBalanceDisplay } from "./components/bitcoin/BTCBalanceDisplay";
import { useBitcoinWallet } from "./hooks/useBitcoinWallet";

export default function App() {
  // ... existing code ...
  const btcWallet = useBitcoinWallet();
  const [showDeposit, setShowDeposit] = useState(false);

  return (
    <div>
      {/* Game UI */}
      <main>...</main>

      {/* Bitcoin Panel */}
      <aside className="fixed right-0 top-0 w-80 h-full bg-gray-800 p-4">
        <h2>₿ Bitcoin Wallet</h2>
        <XverseConnectButton />
        {btcWallet.connected && (
          <>
            <BTCBalanceDisplay balance={mockBalance} />
            <button onClick={() => setShowDeposit(true)}>Deposit BTC</button>
          </>
        )}
      </aside>

      <DepositModal
        isOpen={showDeposit}
        onClose={() => setShowDeposit(false)}
        onSuccess={(amount) => console.log("Deposited:", amount)}
      />
    </div>
  );
}
```

**That's it!** All your Bitcoin components just work.

---

### Phase 4: 3D Board Upgrade (3-4 hours)

#### 4.1 Install 3D Dependencies

```bash
pnpm add three @react-three/fiber @react-three/drei
pnpm add -D @types/three
```

#### 4.2 Create 3D Board Component

**File: `src/components/game/GameBoard3D.tsx`**

```tsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Sky } from "@react-three/drei";
import { Ship } from "./Ship3D";
import { WaterPlane } from "./WaterPlane";
import { HitMarker } from "./HitMarker";

export function GameBoard3D({ board, hits }) {
  return (
    <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {/* Environment */}
      <Sky />
      <WaterPlane />
      <Grid args={[10, 10]} />

      {/* Ships */}
      {board.map((row, y) =>
        row.map((cell, x) =>
          cell === 1 ? <Ship key={`${x}-${y}`} position={[x, 0, y]} /> : null
        )
      )}

      {/* Hit markers */}
      {hits.map(({ x, y, hit }) => (
        <HitMarker key={`${x}-${y}`} position={[x, 0.1, y]} hit={hit} />
      ))}

      <OrbitControls />
    </Canvas>
  );
}
```

**File: `src/components/game/Ship3D.tsx`**

```tsx
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Ship({ position }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Gentle bobbing animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.8, 0.2, 0.8]} />
      <meshStandardMaterial color="#2196F3" metalness={0.8} roughness={0.2} />
    </mesh>
  );
}
```

**File: `src/components/game/WaterPlane.tsx`**

```tsx
export function WaterPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.5, -0.5, 4.5]}>
      <planeGeometry args={[12, 12, 32, 32]} />
      <meshStandardMaterial
        color="#0077be"
        transparent
        opacity={0.6}
        metalness={0.5}
        roughness={0.3}
      />
    </mesh>
  );
}
```

#### 4.3 Replace 2D Board with 3D

Simply swap `<GameBoard />` with `<GameBoard3D />` in `App.tsx`.

#### 4.4 Polish & Animations

- Ship models (use GLTF loader or procedural geometry)
- Water shader with waves
- Explosion effects for hits
- Camera animations for turns
- Smooth transitions

---

### Phase 5: Cleanup & Polish (30 minutes)

#### 5.1 Remove Legacy Code

```bash
# Backup first!
mv index.html index-legacy.html
mv game.js game-legacy.js

# Remove after confirming React version works
rm index-legacy.html game-legacy.js controller.js
```

#### 5.2 Update Documentation

- Update README with new React setup instructions
- Document component structure
- Add screenshots/GIFs of 3D board

#### 5.3 Performance Optimization

- Memoize expensive components
- Optimize 3D rendering (instancing for multiple ships)
- Lazy load Bitcoin components

---

## Migration Checklist

### Phase 1: Setup

- [ ] Install React, React DOM, Vite plugin
- [ ] Update `vite.config.js`
- [ ] Create `tsconfig.json` (optional)
- [ ] Create new `index.html` and `src/App.tsx`
- [ ] Test: Can load React app

### Phase 2: Core Game

- [ ] Create `useDojo` hook
- [ ] Create `useController` hook
- [ ] Create `useGame` hook with all game logic
- [ ] Build basic 2D board components
- [ ] Port game creation flow
- [ ] Port board commitment flow
- [ ] Port shooting/proof flow
- [ ] Test: Full game playable in React (2D)

### Phase 3: Bitcoin Integration

- [ ] Add Bitcoin panel to UI
- [ ] Test Xverse connection in React app
- [ ] Test deposit modal flow
- [ ] Test swap status tracking
- [ ] Test: Bitcoin components work in game

### Phase 4: 3D Upgrade

- [ ] Install react-three-fiber + drei
- [ ] Create 3D board component
- [ ] Create ship 3D models
- [ ] Create water plane
- [ ] Create hit markers
- [ ] Add animations
- [ ] Add camera controls
- [ ] Polish lighting/materials
- [ ] Test: 3D board displays correctly
- [ ] Test: Interactions work with 3D board

### Phase 5: Cleanup

- [ ] Remove legacy vanilla JS files
- [ ] Update documentation
- [ ] Performance optimization
- [ ] Final testing
- [ ] Deploy

---

## Benefits After Migration

### For Development

- ✅ **Faster feature development**: Reusable components
- ✅ **Better state management**: Hooks + Zustand
- ✅ **Type safety**: TypeScript throughout
- ✅ **Hot reload**: Vite HMR works great with React

### For Users

- ✅ **Better UX**: Smooth animations, 3D graphics
- ✅ **Responsive**: React handles UI updates efficiently
- ✅ **Professional look**: Modern, polished interface

### For Bitcoin Integration

- ✅ **Seamless**: Bitcoin components already React
- ✅ **Consistent**: Same architecture throughout
- ✅ **Maintainable**: One paradigm, not two

---

## Risks & Mitigation

### Risk 1: Dojo SDK Compatibility

**Mitigation**: Dojo SDK is framework-agnostic. Works with React, Vue, vanilla JS.

### Risk 2: Learning Curve

**Mitigation**: I'll handle the migration. You can focus on 3D design/polish.

### Risk 3: Breaking Changes

**Mitigation**: Keep legacy version as backup until React version fully tested.

### Risk 4: Performance

**Mitigation**: React is highly optimized. 3D rendering handled by Three.js (same performance as vanilla).

---

## Timeline

| Phase               | Duration      | Can Start     |
| ------------------- | ------------- | ------------- |
| Phase 1: Setup      | 30 min        | Now           |
| Phase 2: Core Game  | 2-3 hours     | After Phase 1 |
| Phase 3: Bitcoin    | 1 hour        | After Phase 2 |
| Phase 4: 3D Upgrade | 3-4 hours     | After Phase 3 |
| Phase 5: Cleanup    | 30 min        | After Phase 4 |
| **Total**           | **6-8 hours** | -             |

---

## Next Steps

1. ✅ **Finish Bitcoin demo testing** (current task)
2. 📋 **Review this migration plan** (you're here!)
3. 🚀 **Begin Phase 1** when ready
4. 🎯 **Iterate through phases 1-5**
5. 🎉 **Launch with 3D board + Bitcoin integration!**

---

**Ready to migrate after Bitcoin testing is complete!**
