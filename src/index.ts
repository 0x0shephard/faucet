import { startServer } from './server';

/**
 * Main bot entry point
 * Runs distribution API server only (faucet claiming disabled)
 */
async function main() {
  console.log('🤖 ByteStrike Faucet Bot Starting...');
  console.log('====================================');
  console.log('📢 Mode: Distribution Only');
  console.log('   (Automatic faucet claiming disabled)');
  console.log('====================================\n');

  // Start API server
  startServer();

  console.log('✅ Distribution API is ready to accept requests');
  console.log('💡 Manually fund the master wallet with Sepolia ETH to enable distributions\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start the bot
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
