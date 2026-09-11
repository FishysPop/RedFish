const { LavalinkNode, Player, NodeManager, LavalinkManager } = require("lavalink-client");
const { isNodeAvailable } = require("./nodeFallbackHelper");

function getDefaultNodeInfo(node) {
  return {
    version: {
      semver: "4.0.0",
      major: 4,
      minor: 0,
      patch: 0,
      preRelease: null,
      build: null
    },
    buildTime: Date.now(),
    git: {
      branch: "main",
      commit: "unknown",
      commitTime: Date.now()
    },
    jvm: "unknown",
    lavaplayer: "unknown",
    sourceManagers: [
      "youtube",
      "youtubemusic",
      "ytmusic",
      "soundcloud",
      "spotify",
      "applemusic",
      "deezer",
      "qobuz",
      "jiosaavn",
      "yandexmusic",
      "flowerytts",
      "twitch",
      "vimeo",
      "http",
      "local"
    ],
    filters: [
      "volume",
      "equalizer",
      "karaoke",
      "timescale",
      "channelMix",
      "echo",
      "vibrato",
      "rotation",
      "distortion",
      "lowPass"
    ],
    plugins: [],
    isNodelink: false
  };
}

function isBackendUnreachableError(err) {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  return (
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("proxy error") ||
    msg.includes("bad gateway") ||
    msg.includes("dial tcp") ||
    msg.includes("i/o timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("ehostunreach")
  );
}

let patchesApplied = false;

function applyLavalinkPatches() {
  if (patchesApplied) return;
  patchesApplied = true;

  const originalRequest = LavalinkNode.prototype.request;
  LavalinkNode.prototype.request = async function (endpoint, modify, parseAsText) {
    if (!this.connected) {
      throw new Error("The node is not connected to the Lavalink Server!, Please call node.connect() first!");
    }

    const { response, options } = await this.rawRequest(endpoint, modify);
    if (["DELETE", "PUT"].includes(options.method)) return;
    if (response.status === 204) return;

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`Node Request failed with ${response.status} ${response.statusText || ""}: ${errorBody.slice(0, 300).trim() || "Empty body"}`);
    }

    if (parseAsText) {
      return await response.text();
    }

    const rawBody = await response.text();
    try {
      return JSON.parse(rawBody);
    } catch {
      throw new Error(`Node Request to ${options.path} returned non-JSON response (${response.status}): ${rawBody.slice(0, 300).trim()}`);
    }
  };

  LavalinkNode.prototype.open = async function () {
    try {
      this.isAlive = true;

      if (this.nodeType === "Lavalink") {
        if (this.options.enablePingOnStatsCheck) this.heartBeat();
        if (this.heartBeatInterval) clearInterval(this.heartBeatInterval);
        if (this.options.heartBeatInterval > 0) {
          this.socket.on("pong", () => {
            this.heartBeatPongTimestamp = performance.now();
            this.isAlive = true;
          });
          this.heartBeatInterval = setInterval(() => {
            if (!this.socket) return console.error("Node-Heartbeat-Interval - Socket not available - maybe reconnecting?");
            if (!this.isAlive) return this.close(500, "Node-Heartbeat-Timeout");
            this.isAlive = false;
            this.heartBeatPingTimestamp = performance.now();
            this.socket?.ping?.();
          }, this.options.heartBeatInterval || 3e4);
        }
      }

      if (this.version === "v4" && !this.sessionId) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error(`Timed out waiting for Lavalink ready payload (backend unresponsive)`));
          }, this.options.readyTimeout || 6000);

          const onMsg = (d) => {
            try {
              const payload = JSON.parse(d.toString());
              if (payload.op === "ready" && payload.sessionId) {
                cleanup();
                resolve();
              }
            } catch {}
          };

          const onClose = (code, reason) => {
            cleanup();
            reject(new Error(`Socket closed before ready payload received (${code}: ${reason || "unknown"})`));
          };

          const cleanup = () => {
            clearTimeout(timeout);
            this.socket?.off("message", onMsg);
            this.socket?.off("close", onClose);
          };

          this.socket?.on("message", onMsg);
          this.socket?.on("close", onClose);
        });
      }

      let fetchedInfo = null;
      try {
        fetchedInfo = await this.fetchInfo();
      } catch (err) {
        if (isBackendUnreachableError(err)) {
          throw new Error(`Lavalink backend is unreachable: ${err.message}`);
        }
        if (process.env.DEBUG === "true") {
          console.warn(`[Lavalink Node ${this.id}] Failed to fetch info: ${err.message}`);
        }
      }

      if (fetchedInfo && typeof fetchedInfo === "object") {
        this.info = fetchedInfo;
      } else {
        const fallback = this.options.fallbackInfo || getDefaultNodeInfo(this);
        console.warn(`[Lavalink Node ${this.id}] Server does not provide /${this.version}/info route. Using fallback node info.`);
        this.info = { ...fallback };
      }

      if (this.info && Array.isArray(this.info.sourceManagers)) {
        const sm = new Set(this.info.sourceManagers);
        if (sm.has("youtubemusic") || sm.has("youtube")) sm.add("ytmusic");
        if (sm.has("youtube")) sm.add("youtubemusic");
        this.info.sourceManagers = Array.from(sm);
      }

      this.resetReconnectionAttempts();
      this.info.isNodelink = !!this.info.isNodelink;
      this.NodeManager.emit("connect", this);
    } catch (openError) {
      console.error(`[Lavalink Node ${this.id}] Connection handshake error:`, openError.message);
      if (this.NodeManager && typeof this.NodeManager.emit === "function") {
        this.NodeManager.emit("error", this, openError);
      }
      try {
        if (typeof this.close === "function") {
          this.close(1000, "Node-Open-Fail");
        }
      } catch {}
    }
  };

  if (NodeManager?.prototype?.leastUsedNodes) {
    const originalLeastUsedNodes = NodeManager.prototype.leastUsedNodes;
    NodeManager.prototype.leastUsedNodes = function (sortType, filterForNodeTypes) {
      const customFilter = typeof sortType === "function" ? sortType : null;
      const actualSort = customFilter ? "players" : sortType;
      let nodes = originalLeastUsedNodes.call(this, actualSort, filterForNodeTypes);
      if (customFilter) {
        nodes = nodes.filter(customFilter);
      }
      const available = nodes.filter(n => isNodeAvailable(n));
      return available.length > 0 ? available : nodes;
    };
  }

  if (LavalinkManager?.prototype?.createPlayer && !LavalinkManager.prototype._isCreatePlayerPatched) {
    const originalCreatePlayer = LavalinkManager.prototype.createPlayer;
    LavalinkManager.prototype.createPlayer = function (options) {
      const oldPlayer = this.getPlayer(options?.guildId);
      if (oldPlayer) {
        if (!isNodeAvailable(oldPlayer.node)) {
          const least = this.nodeManager.leastUsedNodes();
          const targetNode = least[0];
          if (targetNode && isNodeAvailable(targetNode)) {
            oldPlayer.node = targetNode;
            if (oldPlayer.options) oldPlayer.options.node = targetNode.id;
          }
        }
        return oldPlayer;
      }

      if (options?.node) {
        const reqNode = typeof options.node === "string" ? this.nodeManager.nodes.get(options.node) : options.node;
        if (!isNodeAvailable(reqNode)) {
          const least = this.nodeManager.leastUsedNodes();
          const targetNode = least[0];
          if (targetNode) {
            options.node = targetNode.id;
          }
        }
      } else {
        const least = this.nodeManager.leastUsedNodes();
        const targetNode = least[0];
        if (targetNode) {
          options = { ...(options || {}), node: targetNode.id };
        }
      }

      const player = originalCreatePlayer.call(this, options);
      if (player && !isNodeAvailable(player.node)) {
        const least = this.nodeManager.leastUsedNodes();
        const targetNode = least[0];
        if (targetNode) {
          player.node = targetNode;
          if (player.options) player.options.node = targetNode.id;
        }
      }
      return player;
    };
    LavalinkManager.prototype._isCreatePlayerPatched = true;
  }

  if (Player?.prototype?.search && !Player.prototype._isSearchPatched) {
    const originalSearch = Player.prototype.search;
    Player.prototype.search = async function (query, requestUser, throwOnEmpty = false) {
      const specificNode = query?.node;
      const targetSearchNode = (specificNode && isNodeAvailable(specificNode))
        ? specificNode
        : (isNodeAvailable(this.node) ? this.node : null);

      if (targetSearchNode && targetSearchNode !== this.node && !isNodeAvailable(this.node)) {
        this.node = targetSearchNode;
        if (this.options) this.options.node = targetSearchNode.id;
      }

      if (targetSearchNode && typeof targetSearchNode.search === "function") {
        const transformedQuery = this.LavalinkManager.utils.transformQuery(query);
        delete transformedQuery.node;
        try {
          return await targetSearchNode.search(transformedQuery, requestUser, throwOnEmpty);
        } catch (err) {
          if (!err.message?.includes("No Lavalink Node was provided") && !err.message?.includes("not connected")) {
            throw err;
          }
        }
      }

      try {
        return await originalSearch.call(this, query, requestUser, throwOnEmpty);
      } catch (err) {
        const altNodes = Array.from(this.LavalinkManager.nodeManager.nodes.values()).filter(
          n => isNodeAvailable(n) && n.id !== this.node?.id
        );
        if (altNodes.length > 0) {
          const fallbackNode = altNodes[0];
          this.node = fallbackNode;
          if (this.options) this.options.node = fallbackNode.id;
          const transformed = this.LavalinkManager.utils.transformQuery(query);
          delete transformed.node;
          return await fallbackNode.search(transformed, requestUser, throwOnEmpty);
        }
        throw err;
      }
    };
    Player.prototype._isSearchPatched = true;
  }

  if (Player?.prototype?.changeNode && !Player.prototype._isChangeNodePatched) {
    const originalChangeNode = Player.prototype.changeNode;
    Player.prototype.changeNode = async function (newNode, checkSources = false) {
      return await originalChangeNode.call(this, newNode, false);
    };
    Player.prototype._isChangeNodePatched = true;
  }

  Player.prototype.moveNode = async function (node) {
    try {
      const hasVoiceData = Boolean(
        this.voice?.endpoint &&
        this.voice?.sessionId &&
        this.voice?.token
      );

      if (!hasVoiceData) {
        if (process.env.DEBUG === "true") {
          console.debug(`[Lavalink Player] Missing voice data for guild ${this.guildId}, skipping moveNode.`);
        }
        return null;
      }

      if (!node) {
        const availableNodes = Array.from(this.LavalinkManager.nodeManager.leastUsedNodes("playingPlayers")).filter(
          (n) => n.connected && !n.isDemoted && n.options.id !== this.node.options.id
        );
        node = availableNodes[0]?.id;
      }

      if (!node || !this.LavalinkManager.nodeManager.nodes.get(node)) {
        return null;
      }

      if (this.node.options.id === node) return this;

      const updateNode = this.LavalinkManager.nodeManager.nodes.get(node);
      if (!updateNode || !updateNode.connected || updateNode.isDemoted) return null;

      return await this.changeNode(updateNode, false);
    } catch (moveError) {
      if (!moveError.message?.includes("Voice Data is missing")) {
        console.warn(`[Lavalink Player] Failed to move node for guild ${this.guildId}:`, moveError.message);
      }
      return null;
    }
  };
}

module.exports = {
  applyLavalinkPatches,
  getDefaultNodeInfo,
  isBackendUnreachableError
};
