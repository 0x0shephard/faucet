import * as fs from 'fs';
import { parseEther } from 'viem';
import { FaucetRequest, FaucetClaim, RateLimitEntry } from './types';
import { DATA_DIR, REQUESTS_FILE, CLAIMS_FILE, RATE_LIMIT_FILE, SCREENSHOTS_DIR } from './config';

// Ensure data directory and subdirectories exist
export function initializeStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  // Initialize empty files if they don't exist
  if (!fs.existsSync(REQUESTS_FILE)) {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(CLAIMS_FILE)) {
    fs.writeFileSync(CLAIMS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(RATE_LIMIT_FILE)) {
    fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify([], null, 2));
  }
}

// Request Management
export function loadRequests(): FaucetRequest[] {
  try {
    const data = fs.readFileSync(REQUESTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading requests:', error);
    return [];
  }
}

export function saveRequests(requests: FaucetRequest[]): void {
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2));
}

export function addRequest(request: FaucetRequest): void {
  const requests = loadRequests();
  requests.push(request);
  saveRequests(requests);
}

function lastIndexForWallet(requests: FaucetRequest[], walletAddress: string): number {
  const wallet = walletAddress.toLowerCase();
  for (let i = requests.length - 1; i >= 0; i--) {
    if (requests[i].walletAddress.toLowerCase() === wallet) return i;
  }
  return -1;
}

// Updates the most recent request for the wallet (a wallet can have several over time).
export function updateRequest(walletAddress: string, updates: Partial<FaucetRequest>): void {
  const requests = loadRequests();
  const index = lastIndexForWallet(requests, walletAddress);
  if (index !== -1) {
    requests[index] = { ...requests[index], ...updates };
    saveRequests(requests);
  }
}

// Returns the most recent request for the wallet.
export function getRequestByWallet(walletAddress: string): FaucetRequest | undefined {
  const requests = loadRequests();
  const index = lastIndexForWallet(requests, walletAddress);
  return index === -1 ? undefined : requests[index];
}

/**
 * Total wei sent by the faucet in the last `windowMs` (default 24h), computed from
 * requests.json. Any request with a broadcast tx (txHash + amount) counts, even if the
 * receipt was not confirmed, so the global cap errs on the safe side.
 */
export function getWeiSentSince(windowMs = 24 * 60 * 60 * 1000): bigint {
  const since = Date.now() - windowMs;
  let total = 0n;
  for (const r of loadRequests()) {
    if (r.timestamp > since && r.txHash && r.amount) {
      try {
        total += parseEther(r.amount);
      } catch {
        // ignore malformed amounts
      }
    }
  }
  return total;
}

// Claim History
export function loadClaimHistory(): FaucetClaim[] {
  try {
    const data = fs.readFileSync(CLAIMS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading claim history:', error);
    return [];
  }
}

export function saveClaimHistory(claim: FaucetClaim): void {
  const claims = loadClaimHistory();
  claims.push(claim);
  // Keep only last 100 claims
  if (claims.length > 100) {
    claims.shift();
  }
  fs.writeFileSync(CLAIMS_FILE, JSON.stringify(claims, null, 2));
}

export function getLastSuccessfulClaim(): FaucetClaim | undefined {
  const claims = loadClaimHistory();
  return claims.filter(c => c.success).sort((a, b) => b.timestamp - a.timestamp)[0];
}

// Rate Limiting
export function loadRateLimits(): RateLimitEntry[] {
  try {
    const data = fs.readFileSync(RATE_LIMIT_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading rate limits:', error);
    return [];
  }
}

export function saveRateLimits(limits: RateLimitEntry[]): void {
  fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(limits, null, 2));
}

export function updateRateLimit(entry: RateLimitEntry): void {
  let limits = loadRateLimits();

  // Remove old entries (older than 24 hours)
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  limits = limits.filter(l => l.lastRequestTime > oneDayAgo);

  // Find and update or add new entry
  if (entry.walletAddress) {
    const index = limits.findIndex(l => l.walletAddress?.toLowerCase() === entry.walletAddress?.toLowerCase());
    if (index !== -1) {
      limits[index] = entry;
    } else {
      limits.push(entry);
    }
  } else if (entry.ipAddress) {
    const index = limits.findIndex(l => l.ipAddress === entry.ipAddress);
    if (index !== -1) {
      limits[index] = entry;
    } else {
      limits.push(entry);
    }
  }

  saveRateLimits(limits);
}

export function getRateLimit(walletAddress?: string, ipAddress?: string): RateLimitEntry | undefined {
  const limits = loadRateLimits();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  if (walletAddress) {
    const entry = limits.find(l =>
      l.walletAddress?.toLowerCase() === walletAddress.toLowerCase() &&
      l.lastRequestTime > oneDayAgo
    );
    return entry;
  }

  if (ipAddress) {
    const entry = limits.find(l =>
      l.ipAddress === ipAddress &&
      l.lastRequestTime > oneDayAgo
    );
    return entry;
  }

  return undefined;
}
