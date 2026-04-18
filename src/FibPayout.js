import { FibPayoutAuth } from './auth.js';
import { FibPayoutPayouts } from './payouts.js';

const ENVIRONMENTS = {
  stage: 'https://fib-stage.fib.iq',
  production: 'https://fib.prod.fib.iq',
};

export class FibPayout {
  /**
   * Create a new FibPayout SDK instance.
   * @param {object} config
   * @param {string} config.clientId                          - Your FIB client_id
   * @param {string} config.clientSecret                      - Your FIB client_secret
   * @param {'stage'|'production'} [config.environment='stage'] - Target environment
   */
  constructor({ clientId, clientSecret, environment = 'stage' } = {}) {
    if (!clientId || !clientSecret) {
      throw new Error('[FibPayout] clientId and clientSecret are required.');
    }
    if (!ENVIRONMENTS[environment]) {
      throw new Error(
        `[FibPayout] Unknown environment "${environment}". Use "stage" or "production".`,
      );
    }

    const baseUrl = ENVIRONMENTS[environment];
    const auth = new FibPayoutAuth({ clientId, clientSecret, baseUrl });
    const payouts = new FibPayoutPayouts({ auth, baseUrl });

    
    this.createPayout    = payouts.create.bind(payouts);
    this.authorizePayout = payouts.authorize.bind(payouts);
    this.getDetails      = payouts.getDetails.bind(payouts);
    this.waitForStatus   = payouts.waitForStatus.bind(payouts);
  }
}