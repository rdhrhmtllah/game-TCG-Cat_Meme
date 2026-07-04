import authLogin from '../api-server/auth/login.js';
import authRegister from '../api-server/auth/register.js';
import adminLogin from '../api-server/admin/login.js';
import adminCards from '../api-server/admin/cards.js';
import adminUploadImage from '../api-server/admin/upload-image.js';
import adminAiAssist from '../api-server/admin/ai-assist.js';
import me from '../api-server/me.js';
import masterCards from '../api-server/master-cards.js';
import gacha from '../api-server/gacha.js';
import cardFusion from '../api-server/card-fusion.js';
import showcase from '../api-server/showcase.js';
import spinWheel from '../api-server/spin-wheel.js';
import coinFlip from '../api-server/coin-flip.js';
import dailyLogin from '../api-server/daily-login.js';
import claimIdle from '../api-server/claim-idle.js';
import missions from '../api-server/missions.js';
import achievements from '../api-server/achievements.js';
import cronTrends from '../api-server/cron-trends.js';
import inventoryIndex from '../api-server/inventory/index.js';
import inventorySell from '../api-server/inventory/sell.js';
import marketList from '../api-server/market/list.js';
import marketListings from '../api-server/market/listings.js';
import marketBuy from '../api-server/market/buy.js';
import marketCancel from '../api-server/market/cancel.js';

const routes = {
  '/api/auth/login': authLogin,
  '/api/auth/register': authRegister,
  '/api/admin/login': adminLogin,
  '/api/admin/cards': adminCards,
  '/api/admin/upload-image': adminUploadImage,
  '/api/admin/ai-assist': adminAiAssist,
  '/api/me': me,
  '/api/master-cards': masterCards,
  '/api/gacha': gacha,
  '/api/card-fusion': cardFusion,
  '/api/showcase': showcase,
  '/api/spin-wheel': spinWheel,
  '/api/coin-flip': coinFlip,
  '/api/daily-login': dailyLogin,
  '/api/claim-idle': claimIdle,
  '/api/missions': missions,
  '/api/achievements': achievements,
  '/api/cron-trends': cronTrends,
  '/api/inventory': inventoryIndex,
  '/api/inventory/sell': inventorySell,
  '/api/market/list': marketList,
  '/api/market/listings': marketListings,
  '/api/market/buy': marketBuy,
  '/api/market/cancel': marketCancel,
};

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Extract path without query parameters
  const url = new URL(req.url, 'http://localhost');
  let pathname = url.pathname;

  // Remove trailing slash if present (except for root /)
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // Handle inventory base endpoint mapping
  if (pathname === '/api/inventory/index') {
    pathname = '/api/inventory';
  }

  const routeHandler = routes[pathname];

  if (!routeHandler) {
    res.status(404).json({ message: `Endpoint tidak ditemukan: ${pathname}`, code: 'NOT_FOUND' });
    return;
  }

  try {
    await routeHandler(req, res);
  } catch (err) {
    console.error(`Error in handler ${pathname}:`, err);
    res.status(500).json({ message: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}
