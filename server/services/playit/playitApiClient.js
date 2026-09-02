/**
 * BreezeBytes — Playit Official V1 API Client
 * Strict implementation of upstream Playit API (v1.0.10 / commit-aligned schema)
 * 
 * Rules:
 * - HTTPS only
 * - Authorization: Agent-Key <secret>
 * - Bounded retry policy with jitter for transient 5xx/network errors
 * - Respect 429 Retry-After
 * - Fail fast on 4xx/auth errors
 * - Strict schema validation
 * - Safe logging: NEVER logs secrets, auth headers, or raw credentials
 */

export const PLAYIT_ERROR_CODES = {
  AUTH_FAILED: 'PLAYIT_AUTH_FAILED',
  AGENT_OUTDATED: 'PLAYIT_AGENT_OUTDATED',
  AGENT_OVER_LIMIT: 'PLAYIT_AGENT_OVER_LIMIT',
  PREMIUM_REQUIRED: 'PLAYIT_PREMIUM_REQUIRED',
  INVALID_TUNNEL_CONFIG: 'PLAYIT_INVALID_TUNNEL_CONFIG',
  PORT_ASSIGNED: 'PLAYIT_PORT_ASSIGNED',
  ALLOCATION_PENDING: 'PLAYIT_ALLOCATION_PENDING',
  ALLOCATION_FAILED: 'PLAYIT_ALLOCATION_FAILED',
  NETWORK_ERROR: 'PLAYIT_NETWORK_ERROR',
  RATE_LIMITED: 'PLAYIT_RATE_LIMITED',
  NOT_FOUND: 'PLAYIT_NOT_FOUND',
  UNKNOWN: 'PLAYIT_UNKNOWN_ERROR',
};

export class PlayitApiError extends Error {
  constructor(message, code = PLAYIT_ERROR_CODES.UNKNOWN, status = 500, details = null) {
    super(message);
    this.name = 'PlayitApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class PlayitApiClientV1 {
  /**
   * @param {Object} options
   * @param {string} [options.apiBase] - API base URL (default https://api.playit.gg)
   * @param {string} [options.secretKey] - Agent secret key
   * @param {number} [options.timeoutMs] - Request timeout in ms (default 10000)
   * @param {number} [options.maxRetries] - Max retry attempts for transient errors (default 3)
   * @param {function} [options.fetchFn] - Optional fetch implementation for testing
   */
  constructor(options = {}) {
    this.apiBase = (options.apiBase || process.env.PLAYIT_API_BASE || 'https://api.playit.gg').replace(/\/+$/, '');
    this.secretKey = options.secretKey ? String(options.secretKey).trim() : null;
    this.timeoutMs = Number(options.timeoutMs) || 10000;
    this.maxRetries = Number(options.maxRetries) >= 0 ? Number(options.maxRetries) : 3;
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  setSecretKey(secretKey) {
    this.secretKey = secretKey ? String(secretKey).trim() : null;
  }

  /**
   * Internal HTTP POST executor with retry, timeout, and response validation
   */
  async _post(path, body = {}, requiresAuth = true) {
    if (requiresAuth && !this.secretKey) {
      throw new PlayitApiError('Playit Agent secret key is not configured.', PLAYIT_ERROR_CODES.AUTH_FAILED, 401);
    }

    const url = `${this.apiBase}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (requiresAuth && this.secretKey) {
      headers['Authorization'] = `Agent-Key ${this.secretKey}`;
    }

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this.fetchFn(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timer);

        // 1. Rate Limit handling (429)
        if (response.status === 429) {
          const retryAfterSec = parseInt(response.headers?.get('retry-after') || '2', 10);
          if (attempt <= this.maxRetries) {
            const delayMs = Math.min(Math.max(retryAfterSec * 1000, 1000), 10000);
            await new Promise((res) => setTimeout(res, delayMs));
            continue;
          }
          throw new PlayitApiError('Playit API rate limit exceeded.', PLAYIT_ERROR_CODES.RATE_LIMITED, 429);
        }

        // 2. Authentication failure (401 / 403)
        if (response.status === 401 || response.status === 403) {
          throw new PlayitApiError('Playit Agent authentication failed. Secret key may be invalid or expired.', PLAYIT_ERROR_CODES.AUTH_FAILED, response.status);
        }

        // 3. Transient server error (502, 503, 504)
        if ([502, 503, 504].includes(response.status) && attempt <= this.maxRetries) {
          const jitter = Math.random() * 300;
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1) + jitter, 6000);
          await new Promise((res) => setTimeout(res, delayMs));
          continue;
        }

        let json;
        try {
          json = await response.json();
        } catch {
          throw new PlayitApiError(`Invalid JSON response from Playit API (HTTP ${response.status}).`, PLAYIT_ERROR_CODES.NETWORK_ERROR, response.status);
        }

        // 4. Handle Playit API result structure: { status: "success"|"fail"|"error", data: ... }
        if (json && typeof json === 'object') {
          if (json.status === 'success') {
            return json.data;
          }

          if (json.status === 'fail' || json.status === 'error') {
            const mapped = this._mapApiError(json.data, response.status);
            throw mapped;
          }
        }

        if (!response.ok) {
          throw new PlayitApiError(`Playit API error (HTTP ${response.status}).`, PLAYIT_ERROR_CODES.UNKNOWN, response.status);
        }

        return json;
      } catch (err) {
        clearTimeout(timer);

        if (err instanceof PlayitApiError) {
          throw err;
        }

        const isTimeout = err.name === 'AbortError' || err.code === 'ETIMEDOUT';
        const isNetwork = err.code === 'ECONNRESET' || err.code === 'ENOTFOUND' || err.name === 'TypeError';

        if ((isTimeout || isNetwork) && attempt <= this.maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 200, 5000);
          await new Promise((res) => setTimeout(res, delayMs));
          continue;
        }

        throw new PlayitApiError(
          isTimeout ? 'Playit API request timed out.' : `Playit network connection failed: ${err.message}`,
          PLAYIT_ERROR_CODES.NETWORK_ERROR,
          504
        );
      }
    }

    throw new PlayitApiError('Max retries exceeded for Playit API request.', PLAYIT_ERROR_CODES.NETWORK_ERROR, 504);
  }

  /**
   * Map Playit-specific error response into structured PlayitApiError
   */
  _mapApiError(errData, httpStatus = 400) {
    const raw = typeof errData === 'string' ? errData : (errData?.error || errData?.type || JSON.stringify(errData));

    switch (raw) {
      case 'RequiresVerifiedAccount':
        return new PlayitApiError('Playit requires a verified account before creating public tunnels.', PLAYIT_ERROR_CODES.AUTH_FAILED, 403, raw);
      case 'AgentVersionTooOld':
        return new PlayitApiError('Playit Agent is outdated and rejected by the API. Upgrade required.', PLAYIT_ERROR_CODES.AGENT_OUTDATED, 400, raw);
      case 'AgentOverLimit':
        return new PlayitApiError('Playit Agent has reached its maximum tunnel limit.', PLAYIT_ERROR_CODES.AGENT_OVER_LIMIT, 400, raw);
      case 'RequiresPlayitPremium':
      case 'RegionRequiresPlayitPremium':
      case 'PublicPortRequiresPlayitPremium':
        return new PlayitApiError('This tunnel configuration requires Playit Premium.', PLAYIT_ERROR_CODES.PREMIUM_REQUIRED, 403, raw);
      case 'PortAllocCurrentlyAssigned':
        return new PlayitApiError('Public port allocation is currently assigned.', PLAYIT_ERROR_CODES.PORT_ASSIGNED, 409, raw);
      case 'InvalidTunnelConfig':
        return new PlayitApiError('Invalid tunnel configuration parameters.', PLAYIT_ERROR_CODES.INVALID_TUNNEL_CONFIG, 400, raw);
      case 'AgentNotFound':
      case 'TunnelNotFound':
        return new PlayitApiError(`Playit resource not found (${raw}).`, PLAYIT_ERROR_CODES.NOT_FOUND, 404, raw);
      default:
        return new PlayitApiError(`Playit API error: ${raw}`, PLAYIT_ERROR_CODES.UNKNOWN, httpStatus, raw);
    }
  }

  // ==========================================
  // Official Playit V1 Methods
  // ==========================================

  /**
   * POST /v1/agents/rundata
   * Authoritative source of agent identity and active agent tunnels.
   * @returns {Promise<{ agent_id: string, tunnels: Array, pending: Array }>}
   */
  async getAgentRunData() {
    return await this._post('/v1/agents/rundata', {}, true);
  }

  /**
   * POST /v1/tunnels/list
   * Returns list of account tunnels with public allocations and connect addresses.
   * @returns {Promise<{ tunnels: Array }>}
   */
  async listTunnels() {
    return await this._post('/v1/tunnels/list', {}, true);
  }

  /**
   * POST /v1/tunnels/create
   * Uses exact upstream ReqTunnelsCreateV1 schema:
   * ports: { type: "tunnel-type", details: "minecraft-java" | "minecraft-bedrock" }
   * origin: { type: "agent", data: { agent_id: Uuid, config: { fields: [ { name, value } ] } } }
   * @param {Object} params
   * @param {string} params.name - Tunnel name identifier
   * @param {'minecraft-java'|'minecraft-bedrock'} params.tunnelType
   * @param {string} params.agentId - Authoritative Playit agent UUID
   * @param {string} params.localIp - Bind address (usually '127.0.0.1')
   * @param {number} params.localPort - Minecraft local server port
   * @param {boolean} [params.enabled=true]
   * @returns {Promise<{ id: string }>} - Returns ObjectId with tunnel UUID
   */
  async createTunnel({ name, tunnelType = 'minecraft-java', agentId, localIp = '127.0.0.1', localPort, enabled = true }) {
    if (!agentId) throw new PlayitApiError('Agent ID is required to create a tunnel origin.', PLAYIT_ERROR_CODES.INVALID_TUNNEL_CONFIG, 400);
    if (!localPort || isNaN(Number(localPort))) throw new PlayitApiError('Valid localPort is required for tunnel creation.', PLAYIT_ERROR_CODES.INVALID_TUNNEL_CONFIG, 400);

    const payload = {
      name: name ? String(name).slice(0, 64) : null,
      ports: {
        type: 'tunnel-type',
        details: tunnelType === 'minecraft-bedrock' ? 'minecraft-bedrock' : 'minecraft-java',
      },
      origin: {
        type: 'agent',
        data: {
          agent_id: agentId,
          config: {
            fields: [
              { name: 'local_ip', value: String(localIp) },
              { name: 'local_port', value: String(localPort) },
            ],
          },
        },
      },
      enabled: Boolean(enabled),
      alloc: null,
    };

    const res = await this._post('/v1/tunnels/create', payload, true);
    if (!res || !res.id) {
      throw new PlayitApiError('Playit /v1/tunnels/create succeeded but returned no tunnel ID.', PLAYIT_ERROR_CODES.UNKNOWN, 500);
    }
    return res;
  }

  /**
   * POST /v1/tunnels/config
   * Updates tunnel local bind configuration.
   * @param {Object} params
   * @param {string} params.tunnelId - Playit tunnel UUID
   * @param {string} [params.localIp='127.0.0.1']
   * @param {number} params.localPort - New local server port
   */
  async configureTunnel({ tunnelId, localIp = '127.0.0.1', localPort }) {
    if (!tunnelId) throw new PlayitApiError('tunnelId is required to configure tunnel.', PLAYIT_ERROR_CODES.INVALID_TUNNEL_CONFIG, 400);
    if (!localPort || isNaN(Number(localPort))) throw new PlayitApiError('localPort is required to configure tunnel.', PLAYIT_ERROR_CODES.INVALID_TUNNEL_CONFIG, 400);

    const payload = {
      tunnel_id: tunnelId,
      new_agent_id: null,
      new_config: {
        fields: [
          { name: 'local_ip', value: String(localIp) },
          { name: 'local_port', value: String(localPort) },
        ],
      },
    };

    return await this._post('/v1/tunnels/config', payload, true);
  }

  /**
   * POST /tunnels/enable
   * Toggles tunnel enabled state.
   * @param {string} tunnelId
   * @param {boolean} enabled
   */
  async enableTunnel(tunnelId, enabled = true) {
    if (!tunnelId) throw new PlayitApiError('tunnelId is required.', PLAYIT_ERROR_CODES.INVALID_TUNNEL_CONFIG, 400);
    return await this._post('/tunnels/enable', {
      tunnel_id: tunnelId,
      enabled: Boolean(enabled),
    }, true);
  }

  /**
   * POST /tunnels/delete
   * Deletes a tunnel from Playit.
   * @param {string} tunnelId
   */
  async deleteTunnel(tunnelId) {
    if (!tunnelId) return;
    try {
      return await this._post('/tunnels/delete', { tunnel_id: tunnelId }, true);
    } catch (err) {
      if (err.code === PLAYIT_ERROR_CODES.NOT_FOUND) {
        return { success: true };
      }
      throw err;
    }
  }

  // ==========================================
  // Official Claim Workflow Methods
  // ==========================================

  /**
   * POST /claim/setup
   * Registers a claim code with Playit to allow user/admin authorization.
   * @param {string} code - Claim code (e.g. 6-12 chars)
   * @param {'self-managed'|'assignable'} [agentType='self-managed']
   * @param {string} [version='1.0.10']
   */
  async claimSetup(code, agentType = 'self-managed', version = '1.0.10') {
    if (!code) throw new PlayitApiError('Claim code is required.', PLAYIT_ERROR_CODES.INVALID_TUNNEL_CONFIG, 400);
    return await this._post('/claim/setup', {
      code: String(code).trim(),
      agent_type: agentType,
      version: String(version),
    }, false);
  }

  /**
   * POST /claim/exchange
   * Exchanges an authorized claim code for an official AgentSecretKey.
   * @param {string} code - Authorized claim code
   * @returns {Promise<{ secret_key: string }>}
   */
  async claimExchange(code) {
    if (!code) throw new PlayitApiError('Claim code is required.', PLAYIT_ERROR_CODES.INVALID_TUNNEL_CONFIG, 400);
    const res = await this._post('/claim/exchange', {
      code: String(code).trim(),
    }, false);

    if (!res || !res.secret_key) {
      throw new PlayitApiError('Playit claim exchange did not return a secret key.', PLAYIT_ERROR_CODES.AUTH_FAILED, 400);
    }
    return res;
  }

  // ==========================================
  // Public Address Parser Helper
  // ==========================================

  /**
   * Authoritatively extracts public address and port from Playit AccountTunnelV1 record
   * @param {Object} tunnel - AccountTunnelV1 object from listTunnels()
   * @returns {{ publicAddress: string, publicIp: string|null, publicPort: number|null, domain: string|null }}
   */
  static extractConnectionAddress(tunnel) {
    if (!tunnel) return { publicAddress: null, publicIp: null, publicPort: null, domain: null };

    // 1. Check connect_addresses array
    const connectAddrs = tunnel.connect_addresses || [];
    let domain = null;
    let publicAddress = null;
    let publicPort = null;
    let publicIp = null;

    let domainAddress = null;
    let autoAddress = null;
    let ipv4Address = null;

    for (const ca of connectAddrs) {
      if (ca.type === 'domain' && ca.value) {
        domain = ca.value.domain || domain;
        domainAddress = ca.value.address || domainAddress;
      } else if (ca.type === 'auto' && ca.value) {
        autoAddress = ca.value.address || autoAddress;
      } else if (ca.type === 'addr4' && ca.value) {
        ipv4Address = ca.value.address || ipv4Address;
        if (ca.value.address && ca.value.address.includes(':')) {
          publicIp = ca.value.address.split(':')[0];
        }
      }
    }

    publicAddress = domainAddress || autoAddress || ipv4Address;

    // 2. Check public_allocations for port
    if (tunnel.public_allocations && tunnel.public_allocations.length > 0) {
      const alloc = tunnel.public_allocations[0];
      if (alloc.port) {
        publicPort = alloc.port.from || alloc.port;
      }
      if (alloc.ip4 && !publicIp) {
        publicIp = alloc.ip4;
      }
    }

    // 3. Fallback to display_address if present
    if (!publicAddress && tunnel.display_address) {
      publicAddress = tunnel.display_address;
    }

    // Extract port from publicAddress if not explicitly found
    if (!publicPort && publicAddress && publicAddress.includes(':')) {
      const parts = publicAddress.split(':');
      const parsedPort = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(parsedPort)) {
        publicPort = parsedPort;
      }
    }

    return {
      publicAddress,
      publicIp,
      publicPort,
      domain,
    };
  }
}

export default PlayitApiClientV1;
