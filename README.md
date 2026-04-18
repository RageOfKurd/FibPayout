# FibPayout

> Official Node.js SDK for the **First Iraqi Bank (FIB) Online Payout Service**

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
  - [Create Payout](#create-payout)
  - [Authorize Payout](#authorize-payout)
  - [Get Payout Details](#get-payout-details)
  - [Wait for Status](#wait-for-status)
- [Error Handling](#error-handling)
- [Examples](#examples)
- [Publishing](#publishing)

---

## Features

- ✅ Full coverage of the FIB Payout API (create, authorize, details)
- 🔐 Automatic OAuth2 token management with expiry refresh
- ⏳ Built-in polling helper (`waitForStatus`)
- 🌍 Stage & Production environment support
- 📦 Zero runtime dependencies
- 🔷 ESM-native (`"type": "module"`)
- 📝 Full JSDoc type annotations

---

## Installation

```bash
npm install fibpayout
```

> Requires Node.js **v14 or higher**. This package is ESM-only — use `import`, not `require()`.

---

## Quick Start

```js
import { FibPayout } from 'fibpayout';

const fib = new FibPayout({
  clientId: process.env.FIB_CLIENT_ID,
  clientSecret: process.env.FIB_CLIENT_SECRET,
  environment: 'stage', // or 'production'
});

// 1. Create the payout
const payout = await fib.createPayout({
  amount: 10000,
  currency: 'IQD',
  targetAccountIban: 'IQ23FIQB004073628710001',
  description: 'Salary - April 2025',
});

// 2. Authorize it (required to release funds)
await fib.authorizePayout(payout.payoutId);

// 3. Wait until settled
const result = await fib.waitForStatus(payout.payoutId);
console.log('Status:', result.status); // 'AUTHORIZED' | 'FAILED'
```

---

## Configuration

```js
const fib = new FibPayout({
  clientId: 'YOUR_CLIENT_ID',         // required
  clientSecret: 'YOUR_CLIENT_SECRET', // required
  environment: 'stage',               // 'stage' (default) | 'production'
});
```

| Option          | Type     | Required | Default   | Description                                    |
|-----------------|----------|----------|-----------|------------------------------------------------|
| `clientId`      | `string` | ✅        | —         | FIB-issued client ID                           |
| `clientSecret`  | `string` | ✅        | —         | FIB-issued client secret                       |
| `environment`   | `string` | ❌        | `'stage'` | `'stage'` for testing, `'production'` for live |

| Environment       | Base URL                    |
|-------------------|-----------------------------|
| Stage (Test Mode) | https://fib.stage.fib.iq    |
| Production (Live) | https://fib.prod.fib.iq     |

> 💡 Always store credentials in environment variables.

```bash
export FIB_CLIENT_ID=your_client_id
export FIB_CLIENT_SECRET=your_client_secret
```

---

## API Reference

### Create Payout

```js
const payout = await fib.createPayout(options);
```

| Parameter           | Type     | Required | Default | Description                     |
|---------------------|----------|----------|---------|---------------------------------|
| `amount`            | `number` | ✅        | —       | Amount to pay out (positive)    |
| `currency`          | `string` | ❌        | `'IQD'` | Currency (`IQD`, `USD`, `EUR`)  |
| `targetAccountIban` | `string` | ✅        | —       | Recipient IBAN                  |
| `description`       | `string` | ❌        | —       | Transaction description         |

**Response**

```json
{
  "payoutId": "40a03031-691e-4fc3-a689-1e8447b5d591"
}
```

---

### Authorize Payout

Validates and confirms the payout, triggering the fund transfer. Must be called after `createPayout()`.

```js
await fib.authorizePayout(payoutId);
```

Returns `null` on success (HTTP 200, no body).

---

### Get Payout Details

```js
const details = await fib.getDetails(payoutId);
```

**Response**

```json
{
  "payoutId": "40a03031-691e-4fc3-a689-1e8447b5d591",
  "status": "AUTHORIZED",
  "targetAccountIban": "IQ23FIQB004073628710001",
  "description": "Salary - April 2025",
  "amount": { "amount": 10000, "currency": "IQD" },
  "authorizedAt": 1720599438,
  "failedAt": null
}
```

**Status values**

| Status       | Description                                        |
|--------------|----------------------------------------------------|
| `CREATED`    | Payout created, awaiting authorization             |
| `AUTHORIZED` | Authorized and funds are being transferred         |
| `FAILED`     | Payout failed                                      |

---

### Wait for Status

Polls `getDetails()` at regular intervals until a terminal state is reached.

```js
const result = await fib.waitForStatus(payoutId, options);
```

| Parameter    | Type     | Default  | Description                          |
|--------------|----------|----------|--------------------------------------|
| `intervalMs` | `number` | `3000`   | Polling interval in milliseconds     |
| `timeoutMs`  | `number` | `300000` | Max wait time in ms (default: 5 min) |

Terminal states: `AUTHORIZED`, `FAILED`

---

## Error Handling

All SDK methods throw a `FibPayoutError` on API errors.

```js
import { FibPayout, FibPayoutError } from 'fibpayout';

try {
  await fib.createPayout({ amount: 5000, targetAccountIban: 'IQ...' });
} catch (err) {
  if (err instanceof FibPayoutError) {
    console.error('API Error:', err.message);
    console.error('Status Code:', err.statusCode);
    console.error('Body:', err.body);
  } else {
    throw err;
  }
}
```

---

## Examples

| File | Description |
|------|-------------|
| [`examples/basic.js`](examples/basic.js) | Single payout: create → authorize → wait |
| [`examples/bulk-payouts.js`](examples/bulk-payouts.js) | Parallel payroll payouts with summary |

Run an example:

```bash
FIB_CLIENT_ID=xxx FIB_CLIENT_SECRET=yyy node examples/basic.js
```

---

## ESM Compatibility Note

This package is ESM-only. If your project uses CommonJS (`require()`), use a dynamic import:

```js
const { FibPayout } = await import('fibpayout');
```

Or add `"type": "module"` to your `package.json` and switch to `import`.

---

## License

[MIT](LICENSE) © Rageofkurd