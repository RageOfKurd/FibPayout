import { FibPayout } from '../index.js';

const fib = new FibPayout({
  clientId: process.env.FIB_CLIENT_ID || 'YOUR_CLIENT_ID',
  clientSecret: process.env.FIB_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
  environment: 'stage',
});

async function main() {
  // 1. Create a payout
  console.log('Creating payout...');
  const payout = await fib.createPayout({
    amount: 10000,
    currency: 'IQD',
    targetAccountIban: 'IQ23FIQB004073628710001',
    description: 'Salary payment - April 2025',
  });

  console.log('\n✅ Payout created:');
  console.log('  Payout ID:', payout.payoutId);

  // 2. Authorize the payout (required before funds are transferred)
  console.log('\nAuthorizing payout...');
  await fib.authorizePayout(payout.payoutId);
  console.log('✅ Payout authorized.');

  // 3. Poll until AUTHORIZED or FAILED
  console.log('\n⏳ Waiting for payout to settle...');
  const final = await fib.waitForStatus(payout.payoutId, {
    intervalMs: 4000,
    timeoutMs: 120_000,
  });

  console.log('\n🎉 Final status:', final.status);
  console.log('  IBAN         :', final.targetAccountIban);
  console.log('  Amount       :', final.amount.amount, final.amount.currency);
  console.log('  Authorized at:', final.authorizedAt);
}

main().catch(console.error);