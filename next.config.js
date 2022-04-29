const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

module.exports = phase => {
  return {
    reactStrictMode: true,
    webpack: config => {
      // fixes Critical dependency: the request of a dependency is an expression
      // https://github.com/amark/gun/issues/743
      config.module.noParse = /(\/gun|gun\/sea)\.js$/;

      return config;
    },
    env: {
      BASE_URL: phase === PHASE_DEVELOPMENT_SERVER ? 'http://localhost:3000' : 'https://usedeck.vercel.app',
    },
  };
};
