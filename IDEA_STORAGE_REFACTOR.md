# Idea Storage Refactor - Single Source of Truth

## Overview
Refactored the entire idea storage system to use **`lockedIdeaManager`** as the **single source of truth** across the application.

## What Changed

### ✅ Single Source of Truth
- **`lockedIdeaManager`** is now the ONLY way to store/retrieve ideas
- All tiles, dashboard, analysis read from locked idea
- Removed 10+ redundant localStorage keys

### ✅ Database Persistence
- Added `locked_idea` column to `profiles` table
- Lock action → saves to database automatically
- Reset action → clears from database
- Cross-device sync via database

### ✅ Simplified API
```typescript
// New simple hook
import { useLockedIdea } from '@/hooks/useLockedIdea';

const { 
  idea,           // The one and only idea
  hasIdea,        // Boolean check
  lockIdea,       // Lock (persists to DB)
  unlockIdea,     // Clear (removes from DB)
  isPinned,       // Pin status
  setPinned       // Set pin
} = useLockedIdea();
```

## Files Modified

### Core Logic
- ✅ `src/lib/lockedIdeaManager.ts` - Enhanced with DB persistence
- ✅ `src/hooks/useLockedIdea.ts` - New simplified hook

### Database
- ✅ Migration: Added `locked_idea` to `profiles` table
- ✅ Automatic sync on lock/unlock

### Dashboard Tiles (All Updated)
- ✅ `BaseTile.tsx`
- ✅ `DataTile.tsx`
- ✅ `OptimizedDataTile.tsx`
- ✅ `ExtendedInsightsGrid.tsx`
- ✅ `QuickStatsTile.tsx`
- ✅ (10+ more tiles now use `useLockedIdea()`)

### Main Components
- ✅ `EnhancedIdeaChat.tsx` - Reset clears from DB
- ✅ `Dashboard.tsx` - Uses locked idea only

## Removed/Deprecated

### 🗑️ Removed localStorage Keys
- `currentIdea`
- `dashboardIdea`
- `ideaText`
- `userIdea`
- `pmf.user.idea`
- `ideaSummaryName` (managed by locked manager)
- `appIdea` (JSON format removed)
- All session-specific idea duplicates

### 🗑️ Deprecated Hooks
- `useIdeaContext` - Still exists for backward compat but should not be used for new code

## How It Works

### 1. Locking an Idea
```typescript
const { lockIdea } = useLockedIdea();

// User clicks "Lock My Idea" button
lockIdea("My amazing startup idea...");

// This:
// ✅ Saves to localStorage (pmfCurrentIdea)
// ✅ Saves to database (profiles.locked_idea)
// ✅ Cleans up old idea keys
// ✅ Notifies all listeners
```

### 2. Reading the Idea
```typescript
const { idea } = useLockedIdea();

// All tiles use this:
<DataTile idea={idea} />

// Database sync happens automatically if not in localStorage
```

### 3. Reset/Clear
```typescript
const { unlockIdea } = useLockedIdea();

// User clicks "Reset" button
unlockIdea();

// This:
// ✅ Removes from localStorage
// ✅ Removes from database
// ✅ Cleans up all related keys
// ✅ Notifies all listeners
```

## Benefits

### 🎯 Consistency
- No more idea mismatches across tiles
- Single source = single truth

### 🚀 Performance
- Reduced localStorage pollution
- Efficient database sync (only when needed)
- Cross-device sync

### 🛡️ Reliability
- Database persistence prevents data loss
- Automatic migration from old keys
- Graceful fallbacks

### 🧹 Maintainability
- Simple API surface
- Clear ownership (lock button controls everything)
- Easy to debug (one place to look)

## Migration Path for Old Data

The `lockedIdeaManager` automatically migrates from old keys:
1. Checks `pmfCurrentIdea` first (primary key)
2. Falls back to legacy keys if not found
3. Migrates to primary key automatically
4. Cleans up old keys after migration

## Testing Checklist

- ✅ Lock idea → persists to database
- ✅ Unlock idea → clears from database
- ✅ Reset → clears everywhere
- ✅ All dashboard tiles show same idea
- ✅ Cross-device sync works
- ✅ Old localStorage keys cleaned up

## Future Improvements

1. **Real-time sync** - Use Supabase subscriptions for instant cross-device updates
2. **Idea history** - Store previous locked ideas in database
3. **Conflict resolution** - Handle concurrent edits from multiple devices
4. **Offline support** - Queue DB updates when offline

## Breaking Changes

⚠️ **None for users** - All changes are backward compatible

For developers:
- Don't use multiple idea keys anymore
- Use `useLockedIdea()` for all new code
- `useIdeaContext()` still works but is deprecated
