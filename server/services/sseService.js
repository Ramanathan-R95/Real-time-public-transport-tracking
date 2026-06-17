function initSSEService() {
  // SSE registered directly in index.js
}

function broadcast(channelId, event, data) {
  if (global.sseBroadcast) {
    global.sseBroadcast(channelId, event, data);
  }
}

module.exports = { initSSEService, broadcast };