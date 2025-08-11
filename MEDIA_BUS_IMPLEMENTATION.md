# WISMeet Media Bus Implementation & Audio Stabilization

## Overview
This document outlines the implementation of the Media Bus system to stabilize audio and fix multi-participant tiles in WISMeet.

## Problem Statement
- **Audio Issues**: Mic/audio works for a few seconds, then quality tanks or goes silent
- **Video Issues**: When >1 participant joins, video tiles disappear, though camera access is granted
- **Root Cause**: Multiple mic capture pipelines (Stream SDK + transcription + monitor/recorder) competing and stopping each other

## Solution Architecture

### 1. Media Bus Provider (`components/MediaBusProvider.tsx`)
**Purpose**: Centralized microphone track management
- Single authoritative mic track owned by Stream SDK
- All other features clone the track (no extra getUserMedia calls)
- Automatic track refresh when SDK replaces/refreshes mic internally

**Key Features**:
- Uses Stream SDK's `call.microphone.getTrack()` as the source
- Listens to `microphoneStateChanged` events for track updates
- Provides `getAudioTrack()` function to descendants
- No direct getUserMedia calls

### 2. Feature Flags (`constants/featureFlags.ts`)
**Purpose**: Enable/disable features for easy rollback
```typescript
export const USE_MEDIA_BUS = true;       // centralize mic & clone downstream
export const USE_CUSTOM_GRID = true;     // explicit participant mapping
```

### 3. Custom Participants Grid (`components/ParticipantsGrid.tsx`)
**Purpose**: Explicit participant rendering with stable keys
- Guarantees tiles for all participants
- Uses `p.sessionId` as stable key
- Responsive grid layout (1-3 columns)
- Participant name overlay

### 4. Updated Meeting Room (`components/MeetingRoom.tsx`)
**Changes**:
- Wrapped with `MediaBusProvider`
- Updated `CallLayout()` to use custom grid when flag is enabled
- Added lightweight audio diagnostics (temporary)
- Preserved all existing functionality (chat, participants list, socket sync)

### 5. Updated Transcription Service (`components/MeetingTranscription.tsx`)
**Changes**:
- Uses MediaBus to get cloned audio track
- Creates `MediaStream` from cloned track
- Passes `inputStream` to transcription service
- Only stops cloned track, never the source

### 6. Enhanced Transcription Service (`lib/transcription-service.ts`)
**Changes**:
- Added `inputStream?: MediaStream` to `TranscriptionConfig`
- Stores input stream in constructor
- Uses cloned stream for transcription
- Maintains backward compatibility

### 7. Audio Monitor Helper (`lib/audio-monitor.ts`)
**New Function**: `initFromClonedMic()`
- Creates cloned stream from MediaBus track
- Provides audio level monitoring
- Only stops cloned track
- Returns monitoring controls

### 8. Audio Recorder Helper (`lib/audio-recorder.ts`)
**New Function**: `initRecorderFromClonedMic()`
- Creates cloned stream from MediaBus track
- Provides recording functionality
- Only stops cloned track
- Returns recording controls

## Implementation Details

### Media Bus Flow
1. **Stream SDK** captures microphone → `call.microphone.getTrack()`
2. **MediaBusProvider** holds reference to this track
3. **Transcription Service** clones track → `track.clone()`
4. **Audio Monitor/Recorder** clone track → `track.clone()`
5. **All services** operate on clones, never stop source track

### Custom Grid Implementation
```typescript
// Always renders all participants with stable keys
{participants.map((p) => (
  <div key={p.sessionId} className="relative rounded-2xl overflow-hidden bg-black">
    <ParticipantView participant={p} />
    <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
      {p.name ?? p.userId}
    </div>
  </div>
))}
```

### Feature Flag Usage
```typescript
// In CallLayout()
if (USE_CUSTOM_GRID) return <ParticipantsGrid />;

// Fallback to existing layouts
switch (layout) {
  case 'grid': return <PaginatedGridLayout />;
  // ... other cases
}
```

## Testing & Validation

### Functional Tests
1. **Solo Join**: Join room alone, speak for 2+ minutes
   - ✅ Audio remains clear, no drops
   - ✅ UI responsive

2. **Multi-Participant**: Join from another browser/device
   - ✅ Both tiles visible at all times
   - ✅ Camera stays rendering across layout toggles

3. **Transcription Toggle**: Start/stop transcription, switch tabs
   - ✅ Call audio remains stable
   - ✅ Only clone tracks affected

4. **Screen Sharing**: Share screen with multiple participants
   - ✅ PiP or grid still shows participants
   - ✅ No disappearing tiles

### Technical Validation
- ✅ No component calls `navigator.mediaDevices.getUserMedia` directly
- ✅ One primary mic track exists, all others are `.clone()`s
- ✅ No CSS path hides tiles when participants > 1
- ✅ Chat, auto-summary, participants list remain functional

## Rollback Strategy

### Quick Rollback
```typescript
// In constants/featureFlags.ts
export const USE_MEDIA_BUS = false;      // Disable media bus
export const USE_CUSTOM_GRID = false;    // Use original layouts
```

### Gradual Rollback
1. Disable `USE_CUSTOM_GRID` first (reverts to Stream layouts)
2. Test audio stability
3. If issues persist, disable `USE_MEDIA_BUS` (reverts to original transcription)

## Performance Impact

### Positive Impacts
- **Reduced getUserMedia calls**: Only Stream SDK calls getUserMedia
- **Stable audio**: No competing audio pipelines
- **Better participant rendering**: Explicit grid with stable keys
- **Improved reliability**: Centralized track management

### Monitoring
- Audio sender bitrate logging every 5 seconds
- Track state monitoring in MediaBusProvider
- Error handling for track cloning failures

## Future Enhancements

### Potential Improvements
1. **Audio Quality Monitoring**: Real-time audio level monitoring using cloned tracks
2. **Advanced Grid Layouts**: More sophisticated participant arrangements
3. **Track Analytics**: Detailed audio/video track statistics
4. **Automatic Recovery**: Self-healing for track failures

### Code Cleanup
1. Remove temporary audio diagnostics after verification
2. Optimize grid rendering performance
3. Add comprehensive error boundaries
4. Implement track health monitoring

## Conclusion

The Media Bus implementation successfully addresses the core issues:
- **Audio Stability**: Single authoritative mic track prevents conflicts
- **Video Reliability**: Custom grid ensures all participants are visible
- **Feature Preservation**: All existing functionality (chat, summaries, etc.) remains intact
- **Easy Rollback**: Feature flags enable quick reversion if needed

The solution maintains backward compatibility while providing a robust foundation for future audio/video enhancements.
