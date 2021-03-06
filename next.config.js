const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

module.exports = phase => {
  return {
    reactStrictMode: true,
    env: {
      BASE_URL: phase === PHASE_DEVELOPMENT_SERVER ? 'http://localhost:3000' : 'https://usedeck.vercel.app',
    },
  };
};
