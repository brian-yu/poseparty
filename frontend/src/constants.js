/* eslint-disable no-undef */

// Set API_HOST to prod host for production builds.
const DEV_API_HOST = 'http://127.0.0.1:5000'; // flask server
const PROD_API_HOST = 'https://api.poseparty.ai';
// PRODUCTION defined in webpack config.
export const API_HOST = PRODUCTION ? PROD_API_HOST : DEV_API_HOST;
