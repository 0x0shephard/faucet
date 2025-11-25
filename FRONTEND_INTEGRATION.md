# Frontend Integration Guide

Complete guide for integrating the ByteStrike Faucet Bot with your frontend application.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Endpoints](#api-endpoints)
3. [React Integration](#react-integration)
4. [Vanilla JavaScript Integration](#vanilla-javascript-integration)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [UI/UX Best Practices](#uiux-best-practices)
8. [Complete Examples](#complete-examples)

---

## Quick Start

### Base URL
```
https://bytestrike-faucet-bot-production-1fc7.up.railway.app
```

### Basic Request Example
```javascript
const response = await fetch('https://bytestrike-faucet-bot-production-1fc7.up.railway.app/request', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    walletAddress: '0xYourWalletAddress'
  })
});

const data = await response.json();
console.log(data);
```

---

## API Endpoints

### 1. Request ETH Distribution

**Endpoint:** `POST /request`

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "ETH distributed successfully",
  "txHash": "0xabc123...",
  "amount": "0.04",
  "explorer": "https://sepolia.etherscan.io/tx/0xabc123..."
}
```

**Error Responses:**

**400 - Invalid Address:**
```json
{
  "success": false,
  "error": "Invalid Ethereum address"
}
```

**429 - Rate Limited (Wallet):**
```json
{
  "success": false,
  "error": "Wallet rate limit exceeded. Please try again in X hours."
}
```

**429 - Rate Limited (IP):**
```json
{
  "success": false,
  "error": "IP rate limit exceeded. Please try again in X hours."
}
```

**400 - User Has Sufficient Balance:**
```json
{
  "success": false,
  "error": "Wallet already has sufficient balance (0.08 ETH). Threshold: 0.05 ETH"
}
```

**503 - Insufficient Master Balance:**
```json
{
  "success": false,
  "error": "Faucet temporarily unavailable (low balance)"
}
```

---

### 2. Check Faucet Status

**Endpoint:** `GET /status`

**Response:**
```json
{
  "masterWallet": "0xCc624fFA5df1F3F4b30aa8abd30186a86254F406",
  "balance": "0.155804641271848523",
  "gasPrice": "0.000000001000010",
  "distributionAmount": "0.04",
  "minMasterBalance": "0.1",
  "userBalanceThreshold": "0.05",
  "maxDistributions": 1
}
```

---

### 3. Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "masterWallet": "0xCc624fFA5df1F3F4b30aa8abd30186a86254F406",
  "balance": "155804641271848523"
}
```

---

### 4. View All Requests (Optional)

**Endpoint:** `GET /requests`

**Response:**
```json
[
  {
    "walletAddress": "0x742d35...",
    "ipAddress": "192.168.1.1",
    "timestamp": 1704067200000,
    "status": "completed",
    "txHash": "0xabc123...",
    "amount": "0.04"
  }
]
```

---

### 5. View Wallet Request History (Optional)

**Endpoint:** `GET /requests/:address`

**Response:**
```json
{
  "walletAddress": "0x742d35...",
  "ipAddress": "192.168.1.1",
  "timestamp": 1704067200000,
  "status": "completed",
  "txHash": "0xabc123...",
  "amount": "0.04"
}
```

---

## React Integration

### Complete React Component with Ethers.js

```jsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const FAUCET_API_URL = 'https://bytestrike-faucet-bot-production-1fc7.up.railway.app';

function FaucetComponent() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [txHash, setTxHash] = useState('');
  const [faucetStatus, setFaucetStatus] = useState(null);

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      setMessage('Please install MetaMask!');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWallet(address);
      setMessage(`Connected: ${address}`);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  // Fetch faucet status
  const fetchFaucetStatus = async () => {
    try {
      const response = await fetch(`${FAUCET_API_URL}/status`);
      const data = await response.json();
      setFaucetStatus(data);
    } catch (error) {
      console.error('Failed to fetch faucet status:', error);
    }
  };

  // Request ETH from faucet
  const requestETH = async () => {
    if (!wallet) {
      setMessage('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setMessage('');
    setTxHash('');

    try {
      const response = await fetch(`${FAUCET_API_URL}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: wallet
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ Success! Sent ${data.amount} ETH to your wallet`);
        setTxHash(data.txHash);
        fetchFaucetStatus(); // Refresh status
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load faucet status on mount
  useEffect(() => {
    fetchFaucetStatus();
    const interval = setInterval(fetchFaucetStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="faucet-container">
      <h1>ByteStrike Sepolia Faucet</h1>

      {/* Faucet Status */}
      {faucetStatus && (
        <div className="faucet-status">
          <h3>Faucet Status</h3>
          <p>Available: {faucetStatus.maxDistributions} distributions</p>
          <p>Amount per request: {faucetStatus.distributionAmount} ETH</p>
          <p>Balance threshold: {faucetStatus.userBalanceThreshold} ETH</p>
        </div>
      )}

      {/* Connect Wallet Button */}
      {!wallet ? (
        <button onClick={connectWallet} className="connect-btn">
          Connect Wallet
        </button>
      ) : (
        <div className="wallet-info">
          <p>Connected: {wallet.slice(0, 6)}...{wallet.slice(-4)}</p>

          {/* Request ETH Button */}
          <button
            onClick={requestETH}
            disabled={loading}
            className="request-btn"
          >
            {loading ? 'Processing...' : 'Request 0.04 ETH'}
          </button>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Transaction Link */}
      {txHash && (
        <div className="tx-link">
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Transaction on Etherscan →
          </a>
        </div>
      )}

      {/* Rate Limiting Info */}
      <div className="info">
        <h4>Rate Limits:</h4>
        <ul>
          <li>1 request per wallet per 24 hours</li>
          <li>3 requests per IP per 24 hours</li>
          <li>Only wallets with &lt; 0.05 ETH qualify</li>
        </ul>
      </div>
    </div>
  );
}

export default FaucetComponent;
```

### CSS Styling (Optional)

```css
.faucet-container {
  max-width: 500px;
  margin: 50px auto;
  padding: 30px;
  border-radius: 12px;
  background: #f5f5f5;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.faucet-container h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.faucet-status {
  background: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.faucet-status h3 {
  margin-top: 0;
  color: #666;
  font-size: 14px;
}

.faucet-status p {
  margin: 8px 0;
  color: #333;
}

.connect-btn, .request-btn {
  width: 100%;
  padding: 15px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.connect-btn {
  background: #4CAF50;
  color: white;
}

.connect-btn:hover {
  background: #45a049;
}

.request-btn {
  background: #2196F3;
  color: white;
  margin-top: 15px;
}

.request-btn:hover:not(:disabled) {
  background: #0b7dda;
}

.request-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.wallet-info {
  text-align: center;
}

.wallet-info p {
  font-family: monospace;
  color: #666;
  margin-bottom: 10px;
}

.message {
  margin-top: 20px;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}

.message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.tx-link {
  margin-top: 15px;
  text-align: center;
}

.tx-link a {
  color: #2196F3;
  text-decoration: none;
  font-weight: 500;
}

.tx-link a:hover {
  text-decoration: underline;
}

.info {
  margin-top: 30px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  font-size: 14px;
}

.info h4 {
  margin-top: 0;
  color: #666;
}

.info ul {
  margin: 10px 0;
  padding-left: 20px;
  color: #555;
}
```

---

## Vanilla JavaScript Integration

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ByteStrike Faucet</title>
  <script src="https://cdn.jsdelivr.net/npm/ethers@6.7.0/dist/ethers.umd.min.js"></script>
  <style>
    /* Add CSS from above */
  </style>
</head>
<body>
  <div class="faucet-container">
    <h1>ByteStrike Sepolia Faucet</h1>

    <div id="faucetStatus" class="faucet-status" style="display: none;">
      <h3>Faucet Status</h3>
      <p>Available: <span id="maxDistributions">-</span> distributions</p>
      <p>Amount per request: <span id="distributionAmount">-</span> ETH</p>
    </div>

    <button id="connectBtn" class="connect-btn">Connect Wallet</button>

    <div id="walletInfo" class="wallet-info" style="display: none;">
      <p>Connected: <span id="walletAddress"></span></p>
      <button id="requestBtn" class="request-btn">Request 0.04 ETH</button>
    </div>

    <div id="message" class="message" style="display: none;"></div>

    <div id="txLink" class="tx-link" style="display: none;">
      <a id="explorerLink" href="#" target="_blank" rel="noopener noreferrer">
        View Transaction on Etherscan →
      </a>
    </div>

    <div class="info">
      <h4>Rate Limits:</h4>
      <ul>
        <li>1 request per wallet per 24 hours</li>
        <li>3 requests per IP per 24 hours</li>
        <li>Only wallets with < 0.05 ETH qualify</li>
      </ul>
    </div>
  </div>

  <script src="faucet.js"></script>
</body>
</html>
```

### JavaScript (faucet.js)

```javascript
const FAUCET_API_URL = 'https://bytestrike-faucet-bot-production-1fc7.up.railway.app';

let currentWallet = null;

// DOM Elements
const connectBtn = document.getElementById('connectBtn');
const requestBtn = document.getElementById('requestBtn');
const walletInfo = document.getElementById('walletInfo');
const walletAddress = document.getElementById('walletAddress');
const messageDiv = document.getElementById('message');
const txLink = document.getElementById('txLink');
const explorerLink = document.getElementById('explorerLink');
const faucetStatusDiv = document.getElementById('faucetStatus');

// Connect Wallet
connectBtn.addEventListener('click', async () => {
  if (!window.ethereum) {
    showMessage('Please install MetaMask!', 'error');
    return;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    currentWallet = address;
    walletAddress.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;

    connectBtn.style.display = 'none';
    walletInfo.style.display = 'block';

    showMessage(`Connected: ${address}`, 'success');
  } catch (error) {
    showMessage(`Error: ${error.message}`, 'error');
  }
});

// Request ETH
requestBtn.addEventListener('click', async () => {
  if (!currentWallet) {
    showMessage('Please connect your wallet first', 'error');
    return;
  }

  requestBtn.disabled = true;
  requestBtn.textContent = 'Processing...';
  hideMessage();
  txLink.style.display = 'none';

  try {
    const response = await fetch(`${FAUCET_API_URL}/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: currentWallet
      })
    });

    const data = await response.json();

    if (data.success) {
      showMessage(`✅ Success! Sent ${data.amount} ETH to your wallet`, 'success');

      // Show transaction link
      explorerLink.href = `https://sepolia.etherscan.io/tx/${data.txHash}`;
      txLink.style.display = 'block';

      // Refresh faucet status
      fetchFaucetStatus();
    } else {
      showMessage(`❌ ${data.error}`, 'error');
    }
  } catch (error) {
    showMessage(`❌ Error: ${error.message}`, 'error');
  } finally {
    requestBtn.disabled = false;
    requestBtn.textContent = 'Request 0.04 ETH';
  }
});

// Fetch Faucet Status
async function fetchFaucetStatus() {
  try {
    const response = await fetch(`${FAUCET_API_URL}/status`);
    const data = await response.json();

    document.getElementById('maxDistributions').textContent = data.maxDistributions;
    document.getElementById('distributionAmount').textContent = data.distributionAmount;

    faucetStatusDiv.style.display = 'block';
  } catch (error) {
    console.error('Failed to fetch faucet status:', error);
  }
}

// Show Message
function showMessage(text, type) {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
}

// Hide Message
function hideMessage() {
  messageDiv.style.display = 'none';
}

// Load faucet status on page load
fetchFaucetStatus();
setInterval(fetchFaucetStatus, 30000); // Refresh every 30 seconds
```

---

## Error Handling

### Complete Error Handler

```javascript
async function requestETHWithErrorHandling(walletAddress) {
  try {
    const response = await fetch(`${FAUCET_API_URL}/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress })
    });

    const data = await response.json();

    // Handle different response codes
    switch (response.status) {
      case 200:
        // Success
        return {
          success: true,
          message: `Successfully sent ${data.amount} ETH!`,
          txHash: data.txHash,
          explorer: data.explorer
        };

      case 400:
        // Bad request (invalid address, already has balance, etc.)
        return {
          success: false,
          message: data.error,
          code: 'INVALID_REQUEST'
        };

      case 429:
        // Rate limited
        return {
          success: false,
          message: data.error,
          code: 'RATE_LIMITED'
        };

      case 503:
        // Service unavailable (low balance)
        return {
          success: false,
          message: 'Faucet is temporarily unavailable. Please try again later.',
          code: 'SERVICE_UNAVAILABLE'
        };

      default:
        return {
          success: false,
          message: 'An unexpected error occurred. Please try again.',
          code: 'UNKNOWN_ERROR'
        };
    }
  } catch (error) {
    // Network error
    return {
      success: false,
      message: 'Network error. Please check your connection.',
      code: 'NETWORK_ERROR',
      error: error.message
    };
  }
}

// Usage
const result = await requestETHWithErrorHandling(userWallet);
if (result.success) {
  console.log('Transaction hash:', result.txHash);
} else {
  console.error('Error code:', result.code, 'Message:', result.message);
}
```

---

## Rate Limiting

### Check if User Can Request

```javascript
async function canUserRequest(walletAddress) {
  try {
    const response = await fetch(
      `${FAUCET_API_URL}/requests/${walletAddress}`
    );

    if (response.status === 404) {
      // No previous requests
      return { canRequest: true, reason: null };
    }

    const data = await response.json();
    const lastRequestTime = data.timestamp;
    const hoursSinceRequest = (Date.now() - lastRequestTime) / (1000 * 60 * 60);

    if (hoursSinceRequest < 24) {
      const hoursRemaining = Math.ceil(24 - hoursSinceRequest);
      return {
        canRequest: false,
        reason: `Please wait ${hoursRemaining} more hour(s) before requesting again.`
      };
    }

    return { canRequest: true, reason: null };
  } catch (error) {
    // If we can't check, allow the request (backend will validate)
    return { canRequest: true, reason: null };
  }
}

// Usage
const { canRequest, reason } = await canUserRequest(userWallet);
if (!canRequest) {
  alert(reason);
}
```

---

## UI/UX Best Practices

### 1. Loading States

```javascript
// Show loading spinner during request
function showLoading() {
  const button = document.getElementById('requestBtn');
  button.disabled = true;
  button.innerHTML = `
    <span class="spinner"></span> Processing...
  `;
}

function hideLoading() {
  const button = document.getElementById('requestBtn');
  button.disabled = false;
  button.innerHTML = 'Request 0.04 ETH';
}
```

### 2. Success Feedback

```javascript
function showSuccess(txHash, amount) {
  // Show confetti or celebration animation
  const message = `
    <div class="success-animation">
      🎉 Success! ${amount} ETH sent to your wallet!
      <a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank">
        View Transaction
      </a>
    </div>
  `;
  // Display the message
}
```

### 3. Real-time Balance Display

```javascript
async function displayUserBalance(walletAddress) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const balance = await provider.getBalance(walletAddress);
  const ethBalance = ethers.formatEther(balance);

  document.getElementById('balance').textContent =
    `Current Balance: ${parseFloat(ethBalance).toFixed(4)} ETH`;
}
```

### 4. Network Detection

```javascript
async function checkNetwork() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();

  if (network.chainId !== 11155111n) { // Sepolia chainId
    alert('Please switch to Sepolia testnet');

    // Auto-switch network
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chainId in hex
      });
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  }
}
```

---

## Complete Examples

### Next.js API Route Example

```javascript
// pages/api/faucet-request.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { walletAddress } = req.body;

  try {
    const response = await fetch(
      'https://bytestrike-faucet-bot-production-1fc7.up.railway.app/request',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress })
      }
    );

    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
```

### Vue.js Component Example

```vue
<template>
  <div class="faucet">
    <h1>ByteStrike Faucet</h1>

    <button v-if="!wallet" @click="connectWallet">
      Connect Wallet
    </button>

    <div v-else>
      <p>{{ wallet }}</p>
      <button @click="requestETH" :disabled="loading">
        {{ loading ? 'Processing...' : 'Request 0.04 ETH' }}
      </button>
    </div>

    <div v-if="message" :class="messageType">
      {{ message }}
    </div>

    <a v-if="txHash" :href="`https://sepolia.etherscan.io/tx/${txHash}`" target="_blank">
      View Transaction
    </a>
  </div>
</template>

<script>
import { ref } from 'vue';
import { ethers } from 'ethers';

export default {
  setup() {
    const wallet = ref(null);
    const loading = ref(false);
    const message = ref('');
    const messageType = ref('');
    const txHash = ref('');

    const FAUCET_API_URL = 'https://bytestrike-faucet-bot-production-1fc7.up.railway.app';

    const connectWallet = async () => {
      if (!window.ethereum) {
        message.value = 'Please install MetaMask!';
        messageType.value = 'error';
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        wallet.value = await signer.getAddress();
      } catch (error) {
        message.value = error.message;
        messageType.value = 'error';
      }
    };

    const requestETH = async () => {
      loading.value = true;
      message.value = '';
      txHash.value = '';

      try {
        const response = await fetch(`${FAUCET_API_URL}/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: wallet.value
          })
        });

        const data = await response.json();

        if (data.success) {
          message.value = `Success! Sent ${data.amount} ETH`;
          messageType.value = 'success';
          txHash.value = data.txHash;
        } else {
          message.value = data.error;
          messageType.value = 'error';
        }
      } catch (error) {
        message.value = error.message;
        messageType.value = 'error';
      } finally {
        loading.value = false;
      }
    };

    return {
      wallet,
      loading,
      message,
      messageType,
      txHash,
      connectWallet,
      requestETH
    };
  }
};
</script>
```

---

## Testing

### Test the Integration

```javascript
// Test function
async function testFaucetIntegration() {
  const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

  console.log('Testing faucet integration...');

  // 1. Check health
  const health = await fetch(`${FAUCET_API_URL}/health`);
  console.log('Health:', await health.json());

  // 2. Check status
  const status = await fetch(`${FAUCET_API_URL}/status`);
  console.log('Status:', await status.json());

  // 3. Request ETH (will fail if already requested)
  const request = await fetch(`${FAUCET_API_URL}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: testAddress })
  });
  console.log('Request:', await request.json());

  console.log('Integration test complete!');
}

testFaucetIntegration();
```

---

## Support

For issues or questions:
- Check the API `/health` endpoint for service status
- Review rate limiting rules
- Ensure wallet is on Sepolia testnet
- Contact: [Your support contact]

---

## Summary Checklist

✅ Base URL configured
✅ Wallet connection implemented
✅ Request ETH function working
✅ Error handling in place
✅ Success feedback displayed
✅ Transaction links provided
✅ Rate limiting explained to users
✅ Network detection added
✅ Loading states shown
✅ Responsive design implemented

Your faucet is ready to go! 🚀
