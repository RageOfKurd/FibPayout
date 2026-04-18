/**
 * examples/bulk-payouts.js
 * -------------------------
 * Demonstrates sending multiple payouts in parallel and waiting for all to settle.
 *
 * Run:
 *   FIB_CLIENT_ID=xxx FIB_CLIENT_SECRET=yyy node examples/bulk-payouts.js
 */

import { FibPayout, FibPayoutError } from '../index.js';

const fib = new FibPayout({
  clientId: process.env.FIB_CLIENT_ID,
  clientSecret: process.env.FIB_CLIENT_SECRET,
  environment: 'stage',
});

const RECIPIENTS = [
  { iban: 'IQ23FIQB004073628710001', amount: 50000, description: 'Payroll - Ahmed Ali' },
  { iban: 'IQ23FIQB004073628710002', amount: 75000, description: 'Payroll - Sara Hassan' },
  { iban: 'IQ23FIQB004073628710003', amount: 60000, description: 'Payroll - Omar Khalil' },
];

async function sendPayout({ iban, amount, description }) {
  try {
    // Step 1 — Create
    const payout = await fib.createPayout({
      amount,
      currency: 'IQD',
      targetAccountIban: iban,
      description,
    });

    console.log(`  Created  [${payout.payoutId}] → ${description}`);

    // Step 2 — Authorize
    await fib.authorizePayout(payout.payoutId);
    console.log(`  Authorized [${payout.payoutId}]`);

    // Step 3 — Wait for settlement
    const final = await fib.waitForStatus(payout.payoutId, {
      intervalMs: 4000,
      timeoutMs: 120_000,
    });

    return { payoutId: payout.payoutId, description, status: final.status };
  } catch (err) {
    if (err instanceof FibPayoutError) {
      console.error(`  ❌ API error for "${description}": [${err.statusCode}] ${err.message}`);
    } else {
      console.error(`  ❌ Error for "${description}": ${err.message}`);
    }
    return { description, status: 'ERROR', error: err.message };
  }
}

async function main() {
  console.log(`Sending ${RECIPIENTS.length} payouts in parallel...\n`);

  const results = await Promise.all(RECIPIENTS.map(sendPayout));

  console.log('\n── Summary ──────────────────────────────────');
  for (const r of results) {
    const icon = r.status === 'AUTHORIZED' ? '✅' : '❌';
    console.log(`${icon} ${r.description}: ${r.status}`);
  }
}

main().catch(console.error);