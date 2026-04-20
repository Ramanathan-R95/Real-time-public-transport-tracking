

const { getClient } = require('../config/redis');

// const { getClient } = require('./config/redis');
const r = () => getClient(); // lazy getter

async function clean() {
  const r = () => getClient(); // lazy getter


  await r().del('active_buses');

  console.log('✅ active_buses cleared');
}

clean();
