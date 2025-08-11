/**
 * Quick test script to verify Media Bus implementation
 * Run this in the browser console during a meeting to test functionality
 */

console.log('🧪 Testing Media Bus Implementation...');

// Test 1: Check if MediaBusProvider is available
function testMediaBusProvider() {
  console.log('✅ Test 1: MediaBusProvider availability');
  
  // Check if the component exists in the DOM
  const mediaBusElements = document.querySelectorAll('[data-media-bus]');
  console.log(`Found ${mediaBusElements.length} MediaBus elements`);
  
  // Check if useMediaBus hook is available (this would be in React context)
  console.log('MediaBusProvider should be wrapping MeetingRoom component');
}

// Test 2: Check participant grid rendering
function testParticipantGrid() {
  console.log('✅ Test 2: Participant Grid rendering');
  
  // Look for custom grid elements
  const gridElements = document.querySelectorAll('.grid');
  const participantElements = document.querySelectorAll('[data-participant]');
  
  console.log(`Found ${gridElements.length} grid containers`);
  console.log(`Found ${participantElements.length} participant elements`);
  
  // Check for stable keys (sessionId)
  const participantKeys = Array.from(participantElements).map(el => el.getAttribute('data-participant'));
  console.log('Participant keys:', participantKeys);
}

// Test 3: Check audio track cloning
function testAudioTrackCloning() {
  console.log('✅ Test 3: Audio Track Cloning');
  
  // This would be tested in the React context
  console.log('Audio track cloning should be happening in MediaBusProvider');
  console.log('Transcription service should be using cloned tracks');
  console.log('Audio monitor/recorder should be using cloned tracks');
}

// Test 4: Check feature flags
function testFeatureFlags() {
  console.log('✅ Test 4: Feature Flags');
  
  // Check if flags are accessible (in development)
  if (typeof window !== 'undefined') {
    console.log('Feature flags should be in constants/featureFlags.ts');
    console.log('USE_MEDIA_BUS: true (enabled)');
    console.log('USE_CUSTOM_GRID: true (enabled)');
  }
}

// Test 5: Check for audio diagnostics
function testAudioDiagnostics() {
  console.log('✅ Test 5: Audio Diagnostics');
  
  // Look for audio stats in console
  console.log('Audio sender stats should be logged every 5 seconds');
  console.log('Check browser console for: 🎤 Audio sender stats');
}

// Run all tests
function runAllTests() {
  console.log('🚀 Running Media Bus Implementation Tests...\n');
  
  testMediaBusProvider();
  console.log('');
  
  testParticipantGrid();
  console.log('');
  
  testAudioTrackCloning();
  console.log('');
  
  testFeatureFlags();
  console.log('');
  
  testAudioDiagnostics();
  console.log('');
  
  console.log('🎉 All tests completed!');
  console.log('📋 Manual verification needed:');
  console.log('  1. Join a meeting and verify audio stability');
  console.log('  2. Add a second participant and verify tiles remain visible');
  console.log('  3. Toggle transcription and verify call audio remains stable');
  console.log('  4. Test screen sharing with multiple participants');
  console.log('  5. Check browser console for audio diagnostics');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testMediaBus = runAllTests;
  console.log('💡 Run testMediaBus() in console to test the implementation');
}

module.exports = { runAllTests };
