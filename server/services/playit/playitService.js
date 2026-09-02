/**
 * BreezeBytes — Production Playit Service Control Plane
 * Coordinates node agents, official Playit V1 API client, and database persistence
 * 
 * Rules:
 * - Node-scoped: agent, tunnels, and mutating queues are bound to node_id
 * - Serialized mutating queue per node to prevent API races
 * - Per-server operation lock to prevent duplicate tunnel provisioning
 * - Idempotency: reuses valid existing tunnels rather than duplicating
 * - Resilient: Playit failure NEVER deletes or breaks Minecraft server lifecycle
 * - Safe data contract: secrets and credentials never leave this service
 */

import { v4 as uuidv4 } from 'uuid';
import { playit_tunnels, playit_nodes, servers, allocations, nodes, settings } from '../../db/database.js';
import { decryptPlayitSecret, encryptPlayitSecret } from '../../utils/cryptoUtils.js';
import { PlayitApiClientV1, PLAYIT_ERROR_CODES, PlayitApiError } from './playitApiClient.js';
import { agentManager, AGENT_STATUS } from './agentManager.js';

export const TUNNEL_STATUS = {
  DISABLED: 'disabled',
  PENDING: 'pending',
  ENSURING_AGENT: 'ensuring_agent',
  CREATING: 'creating',
  WAITING_ALLOCATION: 'waiting_allocation',
  CONFIGURING: 'configuring',
  ACTIVE: 'active',
  FAILED: 'failed',
  DELETING: 'deleting',
  ORPHANED: 'orphaned',
};

class NodeQueue {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.queue = Promise.resolve();
  }

  add(fn) {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => {});
    return next;
  }
}

class PlayitService {
  constructor() {
    this.nodeQueues = new Map(); // nodeId -> NodeQueue
    this.serverLocks = new Set(); // serverId set for active operations
    this.apiClients = new Map(); // nodeId -> PlayitApiClientV1
    this.reconcileInterval = null;
    this.isInitialized = false;
  }

  _getNodeQueue(nodeId = 1) {
    const id = Number(nodeId) || 1;
    if (!this.nodeQueues.has(id)) {
      this.nodeQueues.set(id, new NodeQueue(id));
    }
    return this.nodeQueues.get(id);
  }

  /**
   * Get or create a PlayitApiClientV1 configured for a specific node
   * @param {number} nodeId
   * @returns {PlayitApiClientV1}
   */
  getApiClientForNode(nodeId = 1) {
    const id = Number(nodeId) || 1;
    let nodeConfig = playit_nodes.findOne({ node_id: id });
    if (!nodeConfig) {
      // Auto-initialize node config if missing
      nodeConfig = playit_nodes.insert({
        node_id: id,
        enabled: true,
        auto_provision: true,
        agent_id: null,
        agent_version: '1.0.10',
        secret_configured: false,
        encrypted_secret: null,
        playit_status: 'unconfigured',
        install_path: null,
        service_name: 'playit-agent.service',
        last_health_check: null,
        last_reconciled_at: null,
        last_error: null,
        last_error_code: null,
      });
    }

    const secretKey = nodeConfig.encrypted_secret
      ? decryptPlayitSecret(nodeConfig.encrypted_secret)
      : (process.env.PLAYIT_AGENT_SECRET || '');

    if (!this.apiClients.has(id)) {
      const client = new PlayitApiClientV1({
        secretKey: secretKey || null,
      });
      this.apiClients.set(id, client);
    } else {
      const client = this.apiClients.get(id);
      client.setSecretKey(secretKey || null);
    }

    return this.apiClients.get(id);
  }

  /**
   * Non-blocking startup initialization
   */
  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[PLAYIT] Initializing Playit Control Plane...');

    // Run non-blocking background initialization after startup
    setTimeout(async () => {
      try {
        const allNodes = nodes.find();
        for (const n of allNodes) {
          await this.reconcileNode(n.id).catch((e) => {
            console.warn(`[PLAYIT] Initial reconciliation warning for node #${n.id}:`, e.message);
          });
        }
      } catch (err) {
        console.warn('[PLAYIT] Background initialization warning:', err.message);
      }
    }, 3000);

    // Periodic reconciliation every 10 minutes
    this.reconcileInterval = setInterval(() => {
      const allNodes = nodes.find();
      for (const n of allNodes) {
        this.reconcileNode(n.id).catch(() => {});
      }
    }, 600000);
  }

  shutdown() {
    if (this.reconcileInterval) {
      clearInterval(this.reconcileInterval);
      this.reconcileInterval = null;
    }
  }

  /**
   * Ensure node agent is installed, running, and obtain authoritative agent_id
   * @param {number} nodeId
   * @returns {Promise<{ agentId: string, status: string }>}
   */
  async ensureAgent(nodeId = 1) {
    const id = Number(nodeId) || 1;
    const nodeConfig = playit_nodes.findOne({ node_id: id });
    const secretKey = nodeConfig?.encrypted_secret
      ? decryptPlayitSecret(nodeConfig.encrypted_secret)
      : (process.env.PLAYIT_AGENT_SECRET || '');

    if (!secretKey) {
      playit_nodes.update(nodeConfig?.id || id, {
        playit_status: 'unconfigured',
        last_error: 'Playit Agent secret key is not configured for this node.',
        last_error_code: PLAYIT_ERROR_CODES.AUTH_FAILED,
      });
      throw new PlayitApiError('Playit Agent secret key is not configured for this node.', PLAYIT_ERROR_CODES.AUTH_FAILED, 401);
    }

    // 1. Ensure local agent process / systemd service
    const agentResult = await agentManager.ensureAgent(id, secretKey);

    // 2. Query authoritative agent run-data via API client
    const client = this.getApiClientForNode(id);
    let runData;
    try {
      runData = await client.getAgentRunData();
    } catch (err) {
      playit_nodes.update(nodeConfig?.id || id, {
        playit_status: err.code === PLAYIT_ERROR_CODES.AUTH_FAILED ? 'invalid_credentials' : 'degraded',
        last_error: err.message,
        last_error_code: err.code,
        last_health_check: new Date().toISOString(),
      });
      throw err;
    }

    if (!runData || !runData.agent_id) {
      throw new PlayitApiError('Failed to obtain authoritative Agent ID from Playit API.', PLAYIT_ERROR_CODES.UNKNOWN, 500);
    }

    // Update node record with authoritative data
    playit_nodes.update(nodeConfig.id, {
      agent_id: runData.agent_id,
      playit_status: 'healthy',
      secret_configured: true,
      last_health_check: new Date().toISOString(),
      last_error: null,
      last_error_code: null,
    });

    return {
      agentId: runData.agent_id,
      status: 'healthy',
      runData,
    };
  }

  /**
   * Determine primary local port for a server
   */
  getServerLocalPort(serverId) {
    const id = Number(serverId);
    const alloc = allocations.findOne({ server_id: id, is_primary: 1 }) || allocations.findOne({ server_id: id });
    return alloc ? alloc.port : 25565;
  }

  /**
   * Asynchronous server tunnel provisioning
   * Completely decoupled from JAR download / process startup
   * @param {number} serverId
   * @param {Object} [options]
   */
  async provisionServerTunnels(serverId, options = {}) {
    const id = Number(serverId);

    // Per-server operation lock
    if (this.serverLocks.has(id)) {
      console.log(`[PLAYIT] Provisioning already in progress for server #${id}. Skipping concurrent run.`);
      return;
    }

    this.serverLocks.add(id);
    try {
      // Execute through node's serialized task queue
      const server = servers.findById(id);
      if (!server) return;

      const nodeId = server.node_id || 1;
      const nodeQueue = this._getNodeQueue(nodeId);

      return await nodeQueue.add(async () => {
        await this._provisionServerTunnelsInternal(id, options);
      });
    } finally {
      this.serverLocks.delete(id);
    }
  }

  async _provisionServerTunnelsInternal(serverId, options = {}) {
    const id = Number(serverId);
    const server = servers.findById(id);
    if (!server) {
      console.log(`[PLAYIT] Server #${id} no longer exists. Aborting provisioning.`);
      return;
    }

    const nodeId = server.node_id || 1;
    const nodeConfig = playit_nodes.findOne({ node_id: nodeId });
    const globalSetting = settings.findOne({ key: 'playit' })?.value || {};

    // Check if Playit is enabled
    if (globalSetting.enabled === false || nodeConfig?.enabled === false) {
      console.log(`[PLAYIT] Playit integration disabled for node #${nodeId}. Skipping provisioning.`);
      return;
    }

    const localPort = this.getServerLocalPort(id);
    const software = (server.software || 'paper').toLowerCase();

    // Determine protocol and tunnels needed
    const isBedrock = software === 'bedrock' || software === 'pocketmine' || software === 'nukkit';
    const isGeyser = software.includes('geyser') || options.enableGeyser === true;

    const targets = [];
    if (isBedrock) {
      targets.push({ type: 'minecraft-bedrock', protocol: 'udp', port: localPort, isPrimary: true });
    } else {
      targets.push({ type: 'minecraft-java', protocol: 'tcp', port: localPort, isPrimary: true });
      if (isGeyser) {
        // Geyser Bedrock ingress port defaults to 19132 or secondary port
        const bedrockPort = options.bedrockPort || 19132;
        targets.push({ type: 'minecraft-bedrock', protocol: 'udp', port: bedrockPort, isPrimary: false });
      }
    }

    for (const target of targets) {
      await this._provisionSingleTunnel(server, nodeId, target, options);
    }
  }

  async _provisionSingleTunnel(server, nodeId, target, options = {}) {
    const serverId = server.id;
    const opId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 1. Idempotency Check: check if a valid tunnel already exists for this server and type
    let existingTunnel = playit_tunnels.findOne({
      server_id: serverId,
      tunnel_type: target.type,
    });

    if (existingTunnel && existingTunnel.status === TUNNEL_STATUS.ACTIVE && existingTunnel.local_port === target.port) {
      console.log(`[PLAYIT] Reusing existing active tunnel #${existingTunnel.id} (${existingTunnel.public_address}) for server #${serverId}`);
      return existingTunnel;
    }

    // 2. Insert or update initial pending record
    if (!existingTunnel) {
      existingTunnel = playit_tunnels.insert({
        server_id: serverId,
        node_id: nodeId,
        playit_tunnel_id: null,
        agent_id: null,
        tunnel_type: target.type,
        protocol: target.protocol,
        local_ip: '127.0.0.1',
        local_port: target.port,
        public_address: null,
        public_ip: null,
        public_port: null,
        domain: null,
        status: TUNNEL_STATUS.ENSURING_AGENT,
        enabled: true,
        is_primary: target.isPrimary ? 1 : 0,
        provisioning_operation_id: opId,
        last_error_code: null,
        last_error: null,
        last_reconciled_at: null,
      });
    } else {
      playit_tunnels.update(existingTunnel.id, {
        local_port: target.port,
        status: TUNNEL_STATUS.ENSURING_AGENT,
        provisioning_operation_id: opId,
        last_error_code: null,
        last_error: null,
      });
    }

    const tunnelRecordId = existingTunnel.id;

    try {
      // 3. Ensure agent is running
      const { agentId } = await this.ensureAgent(nodeId);

      // Verify server wasn't deleted while ensuring agent
      if (!servers.findById(serverId)) {
        console.log(`[PLAYIT] Server #${serverId} deleted during agent startup. Cleaning up.`);
        playit_tunnels.delete(tunnelRecordId);
        return;
      }

      playit_tunnels.update(tunnelRecordId, {
        agent_id: agentId,
        status: TUNNEL_STATUS.CREATING,
      });

      const client = this.getApiClientForNode(nodeId);

      // 4. Create tunnel via Playit V1 API if no provider tunnel ID exists yet
      let providerTunnelId = existingTunnel.playit_tunnel_id;
      if (!providerTunnelId) {
        const tunnelName = `bb-${server.identifier || serverId}-${target.type === 'minecraft-bedrock' ? 'be' : 'mc'}`;
        const created = await client.createTunnel({
          name: tunnelName,
          tunnelType: target.type,
          agentId: agentId,
          localIp: '127.0.0.1',
          localPort: target.port,
          enabled: true,
        });

        providerTunnelId = created.id;
        playit_tunnels.update(tunnelRecordId, {
          playit_tunnel_id: providerTunnelId,
          status: TUNNEL_STATUS.WAITING_ALLOCATION,
        });
      } else {
        // If tunnel already exists at Playit, ensure its port is updated
        await client.configureTunnel({
          tunnelId: providerTunnelId,
          localIp: '127.0.0.1',
          localPort: target.port,
        }).catch(() => {});
      }

      // 5. Allocation Polling loop (with exponential backoff capped at 5s, max 120s)
      playit_tunnels.update(tunnelRecordId, { status: TUNNEL_STATUS.WAITING_ALLOCATION });

      const startTime = Date.now();
      const maxTimeoutMs = 120000;
      let delayMs = 1000;
      let allocatedTunnel = null;

      while (Date.now() - startTime < maxTimeoutMs) {
        // Verify server was not deleted during poll loop
        if (!servers.findById(serverId)) {
          console.log(`[PLAYIT] Server #${serverId} deleted during allocation polling. Cleaning up.`);
          if (providerTunnelId) {
            await client.deleteTunnel(providerTunnelId).catch(() => {});
          }
          playit_tunnels.delete(tunnelRecordId);
          return;
        }

        const listRes = await client.listTunnels();
        const found = (listRes?.tunnels || []).find((t) => t.id === providerTunnelId);

        if (found) {
          const connInfo = PlayitApiClientV1.extractConnectionAddress(found);
          if (connInfo.publicAddress) {
            allocatedTunnel = { ...found, connInfo };
            break;
          }
        }

        await new Promise((res) => setTimeout(res, delayMs));
        delayMs = Math.min(delayMs * 1.5, 5000);
      }

      if (!allocatedTunnel) {
        throw new PlayitApiError(
          'Tunnel allocation timed out after 120 seconds.',
          PLAYIT_ERROR_CODES.ALLOCATION_FAILED,
          504
        );
      }

      // 6. Persist successful active tunnel
      const { publicAddress, publicIp, publicPort, domain } = allocatedTunnel.connInfo;
      const updated = playit_tunnels.update(tunnelRecordId, {
        status: TUNNEL_STATUS.ACTIVE,
        public_address: publicAddress,
        public_ip: publicIp,
        public_port: publicPort,
        domain: domain,
        last_reconciled_at: new Date().toISOString(),
        last_error_code: null,
        last_error: null,
      });

      console.log(`[PLAYIT] Successfully allocated tunnel for server #${serverId} -> ${publicAddress}`);
      return updated;
    } catch (err) {
      console.error(`[PLAYIT] Tunnel provisioning failed for server #${serverId}:`, err.message);

      // Record failure without breaking the server
      playit_tunnels.update(tunnelRecordId, {
        status: TUNNEL_STATUS.FAILED,
        last_error: err.message,
        last_error_code: err.code || PLAYIT_ERROR_CODES.UNKNOWN,
      });

      return null;
    }
  }

  /**
   * Update local port for existing server tunnel
   * @param {number} serverId
   * @param {number} newPort
   */
  async updateTunnelPort(serverId, newPort) {
    const id = Number(serverId);
    const tunnel = playit_tunnels.findOne({ server_id: id, is_primary: 1 }) || playit_tunnels.findOne({ server_id: id });
    if (!tunnel || !tunnel.playit_tunnel_id) return false;

    const nodeId = tunnel.node_id || 1;
    const nodeQueue = this._getNodeQueue(nodeId);

    return await nodeQueue.add(async () => {
      try {
        const client = this.getApiClientForNode(nodeId);
        await client.configureTunnel({
          tunnelId: tunnel.playit_tunnel_id,
          localIp: '127.0.0.1',
          localPort: Number(newPort),
        });

        playit_tunnels.update(tunnel.id, {
          local_port: Number(newPort),
          last_reconciled_at: new Date().toISOString(),
        });
        console.log(`[PLAYIT] Updated local port for server #${id} tunnel to ${newPort}`);
        return true;
      } catch (err) {
        console.error(`[PLAYIT] Failed to update tunnel port for server #${id}:`, err.message);
        playit_tunnels.update(tunnel.id, {
          last_error: err.message,
          last_error_code: err.code || PLAYIT_ERROR_CODES.UNKNOWN,
        });
        return false;
      }
    });
  }

  /**
   * Toggle tunnel enabled / disabled
   */
  async toggleTunnel(serverId, enabled = true) {
    const id = Number(serverId);
    const tunnel = playit_tunnels.findOne({ server_id: id, is_primary: 1 }) || playit_tunnels.findOne({ server_id: id });
    if (!tunnel || !tunnel.playit_tunnel_id) return false;

    const nodeId = tunnel.node_id || 1;
    const nodeQueue = this._getNodeQueue(nodeId);

    return await nodeQueue.add(async () => {
      try {
        const client = this.getApiClientForNode(nodeId);
        await client.enableTunnel(tunnel.playit_tunnel_id, enabled);

        playit_tunnels.update(tunnel.id, {
          enabled: Boolean(enabled),
          status: enabled ? TUNNEL_STATUS.ACTIVE : TUNNEL_STATUS.DISABLED,
          last_reconciled_at: new Date().toISOString(),
        });
        return true;
      } catch (err) {
        console.error(`[PLAYIT] Failed to toggle tunnel for server #${id}:`, err.message);
        throw err;
      }
    });
  }

  /**
   * Delete all Playit tunnels associated with a server
   * Resilient: Playit outage will NOT block server deletion
   * @param {number} serverId
   */
  async deleteTunnelsForServer(serverId) {
    const id = Number(serverId);
    const serverTunnels = playit_tunnels.find({ server_id: id });
    if (!serverTunnels || serverTunnels.length === 0) return true;

    for (const t of serverTunnels) {
      if (t.playit_tunnel_id) {
        try {
          const client = this.getApiClientForNode(t.node_id || 1);
          await client.deleteTunnel(t.playit_tunnel_id);
        } catch (err) {
          console.warn(`[PLAYIT] Non-fatal warning: Could not delete remote tunnel ${t.playit_tunnel_id} from Playit:`, err.message);
        }
      }
      playit_tunnels.delete(t.id);
    }

    return true;
  }

  /**
   * Reconcile node tunnels against authoritative Playit API state
   * @param {number} nodeId
   */
  async reconcileNode(nodeId = 1) {
    const id = Number(nodeId) || 1;
    const nodeQueue = this._getNodeQueue(id);

    return await nodeQueue.add(async () => {
      const nodeConfig = playit_nodes.findOne({ node_id: id });
      if (!nodeConfig?.secret_configured && !process.env.PLAYIT_AGENT_SECRET) {
        return { status: 'unconfigured' };
      }

      try {
        const client = this.getApiClientForNode(id);
        const listRes = await client.listTunnels();
        const remoteTunnels = listRes?.tunnels || [];
        const localTunnels = playit_tunnels.find({ node_id: id });

        const remoteMap = new Map(remoteTunnels.map((t) => [t.id, t]));

        // 1. Update existing local tunnels
        for (const local of localTunnels) {
          if (!local.playit_tunnel_id) continue;

          if (remoteMap.has(local.playit_tunnel_id)) {
            const remote = remoteMap.get(local.playit_tunnel_id);
            const conn = PlayitApiClientV1.extractConnectionAddress(remote);
            playit_tunnels.update(local.id, {
              public_address: conn.publicAddress || local.public_address,
              domain: conn.domain || local.domain,
              public_ip: conn.publicIp || local.public_ip,
              public_port: conn.publicPort || local.public_port,
              status: conn.publicAddress ? (local.enabled ? TUNNEL_STATUS.ACTIVE : TUNNEL_STATUS.DISABLED) : TUNNEL_STATUS.WAITING_ALLOCATION,
              last_reconciled_at: new Date().toISOString(),
              last_error: null,
              last_error_code: null,
            });
            remoteMap.delete(local.playit_tunnel_id);
          } else {
            // Tunnel no longer exists on provider
            playit_tunnels.update(local.id, {
              status: TUNNEL_STATUS.FAILED,
              last_error: 'Tunnel was deleted or does not exist on Playit.',
              last_error_code: PLAYIT_ERROR_CODES.NOT_FOUND,
              last_reconciled_at: new Date().toISOString(),
            });
          }
        }

        // 2. Track remaining remote tunnels as orphaned
        for (const [remoteId, remote] of remoteMap.entries()) {
          const conn = PlayitApiClientV1.extractConnectionAddress(remote);
          const existingOrphan = playit_tunnels.findOne({ playit_tunnel_id: remoteId });
          if (!existingOrphan) {
            playit_tunnels.insert({
              server_id: null,
              node_id: id,
              playit_tunnel_id: remoteId,
              agent_id: remote.origin?.details?.agent_id || null,
              tunnel_type: remote.tunnel_type || 'unknown',
              protocol: remote.port_type || 'tcp',
              local_ip: '127.0.0.1',
              local_port: 0,
              public_address: conn.publicAddress,
              public_ip: conn.publicIp,
              public_port: conn.publicPort,
              domain: conn.domain,
              status: TUNNEL_STATUS.ORPHANED,
              enabled: Boolean(remote.user_enabled),
              is_primary: 0,
              provisioning_operation_id: null,
              last_error_code: null,
              last_error: 'Orphaned tunnel discovered during reconciliation.',
              last_reconciled_at: new Date().toISOString(),
            });
          }
        }

        playit_nodes.update(nodeConfig.id, {
          last_reconciled_at: new Date().toISOString(),
          playit_status: 'healthy',
        });

        return { success: true, localCount: localTunnels.length, remoteCount: remoteTunnels.length };
      } catch (err) {
        console.warn(`[PLAYIT] Reconciliation failed for node #${id}:`, err.message);
        if (nodeConfig) {
          playit_nodes.update(nodeConfig.id, {
            last_error: err.message,
            last_error_code: err.code || PLAYIT_ERROR_CODES.UNKNOWN,
          });
        }
        return { success: false, error: err.message };
      }
    });
  }

  /**
   * Safe data serializer for frontend consumption
   * Strips all internal secrets, encryption tokens, or auth headers
   */
  getSafeTunnelData(tunnel) {
    if (!tunnel) return null;
    return {
      id: tunnel.id,
      serverId: tunnel.server_id,
      status: tunnel.status,
      tunnelType: tunnel.tunnel_type,
      protocol: tunnel.protocol,
      publicAddress: tunnel.public_address,
      publicIp: tunnel.public_ip,
      publicPort: tunnel.public_port,
      domain: tunnel.domain,
      localPort: tunnel.local_port,
      enabled: Boolean(tunnel.enabled),
      isPrimary: Boolean(tunnel.is_primary),
      lastErrorCode: tunnel.last_error_code,
      lastError: tunnel.last_error,
      updatedAt: tunnel.updated_at,
    };
  }
}

export const playitService = new PlayitService();
export default playitService;
