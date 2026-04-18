import { request } from 'https';
import { FibPayoutError } from './error.js';

const TERMINAL_STATES = new Set(['AUTHORIZED', 'FAILED']);

export class FibPayoutPayouts {
  constructor({ auth, baseUrl }) {
    this._auth = auth;
    this._baseUrl = baseUrl;
  }



  /**
   * Create a new payout transaction.
   * @param {object} options
   * @param {number}  options.amount             - Amount to pay out (positive number)
   * @param {string}  [options.currency]         - Currency code (default: "IQD")
   * @param {string}  options.targetAccountIban  - Recipient IBAN
   * @param {string}  [options.description]      - Description of the transaction
   * @returns {Promise<{ payoutId: string }>}
   */
  async create({ amount, currency = 'IQD', targetAccountIban, description } = {}) {
    if (!amount || amount <= 0) {
      throw new Error('[FibPayout] amount must be a positive number.');
    }
    if (!targetAccountIban || typeof targetAccountIban !== 'string') {
      throw new Error('[FibPayout] targetAccountIban is required.');
    }

    const payload = {
      amount: { amount, currency },
      targetAccountIban,
      ...(description && { description }),
    };

    return this._request('POST', '/protected/v1/payouts', payload);
  }

  /**
   * Authorize a previously created payout.
   * Must be called after create() before funds are transferred.
   * @param {string} payoutId
   * @returns {Promise<null>}
   */
  async authorize(payoutId) {
    this._requireId(payoutId, 'payoutId');
    return this._request('POST', `/protected/v1/payouts/${payoutId}/authorize`);
  }

  /**
   * Get full details of a payout transaction.
   * @param {string} payoutId
   * @returns {Promise<PayoutDetails>}
   */
  async getDetails(payoutId) {
    this._requireId(payoutId, 'payoutId');
    return this._request('GET', `/protected/v1/payouts/${payoutId}`);
  }

  /**
   * Convenience helper: poll getDetails() until the payout reaches a terminal
   * state (AUTHORIZED | FAILED) or the timeout is exceeded.
   * @param {string} payoutId
   * @param {object} [options]
   * @param {number} [options.intervalMs=3000]   - Polling interval in ms
   * @param {number} [options.timeoutMs=300000]  - Max wait time in ms (default: 5 min)
   * @returns {Promise<PayoutDetails>}
   */
  async waitForStatus(payoutId, { intervalMs = 3000, timeoutMs = 300_000 } = {}) {
    this._requireId(payoutId, 'payoutId');

    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const details = await this.getDetails(payoutId);
      if (TERMINAL_STATES.has(details.status)) return details;
      await this._sleep(intervalMs);
    }

    throw new Error(
      `[FibPayout] Timed out waiting for payout ${payoutId} to reach a terminal status.`,
    );
  }

  // ─── Internals ──────────────────────────────────────────────────────────────

  async _request(method, path, body) {
    const token = await this._auth.getAccessToken();
    const url = new URL(path, this._baseUrl);
    const bodyStr = body ? JSON.stringify(body) : null;

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(bodyStr && {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      }),
    };

    return new Promise((resolve, reject) => {
      const req = request(
        { hostname: url.hostname, path: url.pathname + url.search, method, headers },
        (res) => {
          let raw = '';
          res.on('data', (chunk) => (raw += chunk));
          res.on('end', () => {
            // 204 No Content / empty body responses
            if (!raw || res.statusCode === 204) return resolve(null);
            try {
              const parsed = JSON.parse(raw);
              if (res.statusCode >= 400) {
                return reject(
                  new FibPayoutError(
                    parsed.message || parsed.error || `Request failed with status ${res.statusCode}`,
                    res.statusCode,
                    parsed,
                  ),
                );
              }
              resolve(parsed);
            } catch {
              reject(new Error(`[FibPayout] Failed to parse response: ${raw}`));
            }
          });
        },
      );
      req.on('error', reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  _requireId(value, name) {
    if (!value || typeof value !== 'string') {
      throw new Error(`[FibPayout] ${name} must be a non-empty string.`);
    }
  }

  _sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

/**
 * @typedef {object} PayoutDetails
 * @property {string} payoutId
 * @property {'CREATED'|'AUTHORIZED'|'FAILED'} status
 * @property {string} targetAccountIban
 * @property {string} description
 * @property {{ amount: number, currency: string }} amount
 * @property {number|null} authorizedAt  - Unix timestamp, null if not yet authorized
 * @property {number|null} failedAt      - Unix timestamp, null if not failed
 */