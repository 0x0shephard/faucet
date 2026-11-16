import * as dotenv from 'dotenv';
import * as path from 'path';
import { BotConfig } from './types';

dotenv.config();

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config: BotConfig = {
  sepoliaRpcUrl: getEnvVar('SEPOLIA_RPC_URL'),
  masterWalletPrivateKey: getEnvVar('MASTER_WALLET_PRIVATE_KEY'),
  googleEmail: process.env.GOOGLE_EMAIL || '', // Optional - not used in distribution-only mode
  googlePassword: process.env.GOOGLE_PASSWORD || '', // Optional - not used in distribution-only mode
  faucetWalletAddress: getEnvVar('FAUCET_WALLET_ADDRESS'),
  port: parseInt(getEnvVar('PORT', '3001'), 10),
  claimIntervalHours: parseInt(getEnvVar('CLAIM_INTERVAL_HOURS', '24'), 10),
  distributionAmount: getEnvVar('DISTRIBUTION_AMOUNT', '0.04'), // 0.04 ETH per user
  minMasterBalance: getEnvVar('MIN_MASTER_BALANCE', '0.1'), // Minimum balance to keep
  maxRequestsPerWalletPerDay: parseInt(getEnvVar('MAX_REQUESTS_PER_WALLET_PER_DAY', '1'), 10),
  maxRequestsPerIpPerDay: parseInt(getEnvVar('MAX_REQUESTS_PER_IP_PER_DAY', '3'), 10),
  minWalletBalanceThreshold: getEnvVar('MIN_WALLET_BALANCE_THRESHOLD', '0.05'), // Only send if user has < 0.05 ETH
  headless: getEnvVar('HEADLESS', 'true') === 'true',
};

export const GOOGLE_FAUCET_URL = 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia';
// Storage location. Point DATA_DIR at a persistent volume (e.g. /app/data on Railway)
// so the JSON files survive redeploys. The file format is unchanged.
export const DATA_DIR = process.env.DATA_DIR || './data';
export const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');
export const CLAIMS_FILE = path.join(DATA_DIR, 'claims.json');
export const RATE_LIMIT_FILE = path.join(DATA_DIR, 'rate-limits.json');
export const SCREENSHOTS_DIR = path.join(DATA_DIR, 'screenshots');

// Global cap on ETH sent in any rolling 24h window, across all users.
export const MAX_DAILY_ETH = process.env.MAX_DAILY_ETH || '1';

// Number of reverse-proxy hops in front of the app (Railway = 1). Used for req.ip.
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 1);
export const TRUST_PROXY_HOPS = Number.isInteger(trustProxyHops) && trustProxyHops >= 0 ? trustProxyHops : 1;

// Admin token for GET /requests. If unset, the endpoint is disabled (404).
export const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
