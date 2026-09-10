const { LavalinkNode, Player } = require("lavalink-client");

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
      "soundcloud",
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
      this.resetReconnectionAttempts();

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

      let fetchedInfo = null;
      try {
        fetchedInfo = await this.fetchInfo();
      } catch (err) {
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

      this.info.isNodelink = !!this.info.isNodelink;
      this.NodeManager.emit("connect", this);
    } catch (openError) {
      console.error(`[Lavalink Node ${this.id}] Connection open error:`, openError.message);
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
          (n) => n.connected && n.options.id !== this.node.options.id
        );
        node = availableNodes[0]?.id;
      }

      if (!node || !this.LavalinkManager.nodeManager.nodes.get(node)) {
        return null;
      }

      if (this.node.options.id === node) return this;

      const updateNode = this.LavalinkManager.nodeManager.nodes.get(node);
      if (!updateNode || !updateNode.connected) return null;

      return await this.changeNode(updateNode);
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
  getDefaultNodeInfo
};
