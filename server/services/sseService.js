// sseService.js now just delegates to the global registered in index.js
function initSSEService() {
  // SSE is now registered directly in index.js
  // This file kept for import compatibility
}

function broadcast(channelId, event, data) {
  if (global.sseBroadcast) {
    global.sseBroadcast(channelId, event, data);
  } else {
    console.warn('[SSE] broadcast called before sseBroadcast was set');
  }
}

module.exports = { initSSEService, broadcast };