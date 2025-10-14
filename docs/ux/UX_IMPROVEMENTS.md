# UX Improvements & Polish Tasks

**Status:** Game loop functional ✅ - Now focusing on user experience
**Priority:** High - These directly impact playability

---

## 🎨 Visual & UI Improvements

### 1. Board Visualization (HIGH PRIORITY)
**Current:** No visual representation of the board
**Needed:** Show player's own ship positions

**MVP Implementation:**
- ASCII-style grid (10×10) with simple characters
- Ships: `S` or `🚢`
- Empty: `.` or `~`
- Hits: `X` or `💥`
- Misses: `O` or `💦`

**Location:** New section above Gameplay

**Example:**
```
Your Board:
  0 1 2 3 4 5 6 7 8 9
0 S S S . . . . . . .
1 . . . S . . X . . .
2 . . . S . . . . . O
...
```

**Future:** Three.js 3D rendering with animations

**Estimated Time:** 1-2 hours

---

### 2. Hide Dev Mode Section
**Current:** Orange "Dev Mode" section visible and cluttering UI
**Needed:** Hide by default, show only when needed

**Implementation:**
```html
<div class="section" style="display: none;" id="dev-mode-section">
```

Add a toggle button or keyboard shortcut (Shift+D) to show/hide

**Estimated Time:** 5 minutes

---

### 3. Progressive UI Display
**Current:** All sections visible from start - confusing
**Needed:** Show sections only when relevant

**Flow:**
```
1. Connection → Show only Controller section
2. Connected → Show Game Management
3. Game Created/Joined → Show Board Commitment
4. Both Boards Committed → Show Gameplay + Game State
```

**Implementation:**
- Start with sections hidden (`display: none`)
- Show progressively as player completes steps
- Add visual indicators (✅ checkmarks for completed steps)

**Estimated Time:** 30 mins - 1 hour

---

## 🔄 Real-Time Updates

### 4. Auto-Refresh from Torii (HIGH PRIORITY)
**Current:** Manual "Refresh Game State" button required
**Problem:** Players don't see opponent's actions automatically
**Needed:** Real-time automatic updates

**Root Issue:** 
```javascript
// This error in console:
Error running game: TypeError: i.build is not a function
    at Object.subscribeEntityQuery
```

The Torii subscription is broken! Need to fix the query builder.

**Current Code (Broken):**
```javascript
new ToriiQueryBuilder()
  .withClause(KeysClause(['battleship-Game'], ['*'], 'Hashed'))
  .build()
```

**Investigation Needed:**
- Check Dojo SDK 1.7.6 documentation for correct QueryBuilder syntax
- Might need to use different API
- Reference working dojo-intro example

**Impact:** Once fixed, UI auto-updates when opponent acts!

**Estimated Time:** 1-2 hours

---

## 🎯 Gameplay UX

### 5. Defender Shot Notification
**Current:** No indication that attacker fired
**Needed:** Visual alert when shot is fired

**Requirements:**
- Show when opponent has fired
- Display the shot coordinates prominently
- Auto-populate defense coordinates
- Clear visual distinction (red banner/alert)

**Current Attempt:** 
- `queryPendingShot()` function exists but not triggering
- Pending shot display HTML exists but hidden

**Fix:**
- Debug why queryPendingShot isn't being called
- Ensure it triggers on state refresh
- Make the red banner more prominent

**Estimated Time:** 30 mins

---

### 6. Conditional Button States
**Current:** Apply Proof enabled even before shot fired
**Needed:** Enable only after PendingShot exists

**Implementation:**
```javascript
// Check for PendingShot in state updates
if (pendingShot && !isMyTurn) {
  // Enable Apply Proof
  // Show shot coordinates
} else {
  // Disable Apply Proof  
  // Hide shot notification
}
```

**Estimated Time:** 20 mins

---

## 📋 Additional Improvements (Lower Priority)

### 7. Shot History Display
- Show list of all shots fired
- Mark hits vs misses
- Show on both boards

### 8. Turn Timer
- Show time remaining for current turn
- Visual countdown
- Auto-timeout after limit

### 9. Game Status Messages
- "Waiting for opponent..."
- "Your turn to fire!"
- "Opponent is thinking..."
- Clear action prompts

### 10. Error Handling Polish
- Prettier error modals
- Helpful recovery suggestions
- Transaction retry option

### 11. Loading States
- Spinners during transactions
- Progress indicators
- "Waiting for blockchain..." messages

---

## 🎯 Implementation Priority

**Phase 1: Critical UX (2-4 hours)**
1. Fix Torii auto-refresh (#4) - HIGHEST IMPACT
2. Board visualization (#1) - Core gameplay
3. Defender shot notification (#5,#6) - Critical for gameplay
4. Progressive UI (#3) - Reduces confusion

**Phase 2: Polish (1-2 hours)**
5. Hide Dev Mode (#2)
6. Shot history
7. Better status messages

**Phase 3: Advanced (Future)**
8. Three.js board
9. Animations
10. Sound effects
11. Tournament mode

---

## 📝 Next Session Plan

**Immediate:**
1. Fix Torii subscription (auto-refresh)
2. Add simple board visualization
3. Fix pending shot notification

**Then:**
4. Test to 17 hits → win
5. Add ZK circuits

**Stretch:**
6. Visual polish
7. Bitcoin integration

---

**All issues documented and prioritized!**
Ready to tackle systematically. 🚀

