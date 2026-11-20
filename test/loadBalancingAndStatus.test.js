const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  isNodeAvailable,
  getAvailableNodes,
  isSourceSupportedByNode,
  getNodeLoadScore,
  getLeastUsedNode,
  findBestNodeForSource
} = require('../src/utils/nodeFallbackHelper');
const { formatNodeStatusField } = require('../src/commands/misc/status');

function createMockNode({
  id,
  connected = true,
  sessionId = 'session_123',
  isDemoted = false,
  demoteReason = null,
  isDisconnecting = false,
  players = 0,
  playingPlayers = 0,
  systemLoad = 0.1,
  memoryUsed = 50 * 1024 * 1024,
  sourceManagers = ['youtube', 'youtubemusic', 'soundcloud'],
  plugins = []
}) {
  return {
    id,
    connected,
    sessionId,
    isDemoted,
    demoteReason,
    isDisconnecting,
    info: {
      sourceManagers,
      plugins
    },
    stats: {
      players,
      playingPlayers,
      uptime: 100000,
      memory: { used: memoryUsed, allocated: 100 * 1024 * 1024 },
      cpu: { systemLoad, lavalinkLoad: systemLoad }
    }
  };
}

describe('Node Load Balancing & Fallback Helper', () => {
  test('isNodeAvailable returns false for demoted or disconnected nodes', () => {
    const healthyNode = createMockNode({ id: 'node_healthy' });
    const demotedNode = createMockNode({ id: 'node_demoted', isDemoted: true, demoteReason: 'Rate limit detected' });
    const disconnectedNode = createMockNode({ id: 'node_dc', connected: false });
    const noSessionNode = createMockNode({ id: 'node_no_session', sessionId: null });

    assert.equal(isNodeAvailable(healthyNode), true);
    assert.equal(isNodeAvailable(demotedNode), false);
    assert.equal(isNodeAvailable(disconnectedNode), false);
    assert.equal(isNodeAvailable(noSessionNode), false);
  });

  test('getNodeLoadScore calculates higher penalty for nodes with more players and CPU load', () => {
    const nodeHeavy = createMockNode({ id: 'node_heavy', players: 38, systemLoad: 0.43 });
    const nodeLight = createMockNode({ id: 'node_light', players: 2, systemLoad: 0.17 });
    const nodeIdle = createMockNode({ id: 'node_idle', players: 0, systemLoad: 0.10 });

    const manager = { players: new Map() };

    const scoreHeavy = getNodeLoadScore(nodeHeavy, manager);
    const scoreLight = getNodeLoadScore(nodeLight, manager);
    const scoreIdle = getNodeLoadScore(nodeIdle, manager);

    assert.ok(scoreHeavy > scoreLight, 'Heavy node score must be greater than light node');
    assert.ok(scoreLight > scoreIdle, 'Light node score must be greater than idle node');
  });

  test('getNodeLoadScore incorporates local cluster active players', () => {
    const nodeA = createMockNode({ id: 'node_a', players: 0, systemLoad: 0.1 });
    const nodeB = createMockNode({ id: 'node_b', players: 0, systemLoad: 0.1 });

    const manager = {
      players: new Map([
        ['guild_1', { node: { id: 'node_a' } }],
        ['guild_2', { node: { id: 'node_a' } }]
      ])
    };

    const scoreA = getNodeLoadScore(nodeA, manager);
    const scoreB = getNodeLoadScore(nodeB, manager);

    assert.ok(scoreA > scoreB, 'Node A with 2 local players should have higher load score than Node B with 0');
  });

  test('getLeastUsedNode chooses the node with lowest load score', () => {
    const node1 = createMockNode({ id: 'RedFish_1', players: 38, systemLoad: 0.43 });
    const node2 = createMockNode({ id: 'RedFish_2', players: 2, systemLoad: 0.17 });
    const node4 = createMockNode({ id: 'RedFish_4', players: 0, systemLoad: 0.29 });
    const node6 = createMockNode({ id: 'RedFish_6', players: 0, systemLoad: 0.58 });

    const manager = {
      nodeManager: {
        nodes: new Map([
          ['RedFish_1', node1],
          ['RedFish_2', node2],
          ['RedFish_4', node4],
          ['RedFish_6', node6]
        ])
      },
      players: new Map()
    };

    const chosen = getLeastUsedNode(manager);
    assert.equal(chosen.id, 'RedFish_4', 'RedFish_4 has 0 players and lower CPU than RedFish_6, should be chosen');
  });

  test('findBestNodeForSource does not hardcode first node and balances load', () => {
    const node1 = createMockNode({ id: 'RedFish_1', players: 38 });
    const node2 = createMockNode({ id: 'RedFish_2', players: 2 });
    const node3 = createMockNode({ id: 'RedFish_3', isDemoted: true, demoteReason: 'Rate limit' });
    const node4 = createMockNode({ id: 'RedFish_4', players: 0, systemLoad: 0.20 });

    const manager = {
      nodeManager: {
        nodes: new Map([
          ['RedFish_1', node1],
          ['RedFish_2', node2],
          ['RedFish_3', node3],
          ['RedFish_4', node4]
        ])
      },
      players: new Map()
    };

    const selected = findBestNodeForSource(manager, 'youtube_music');
    assert.equal(selected.id, 'RedFish_4', 'Should balance to RedFish_4, not default to RedFish_1');
  });

  test('findBestNodeForSource respects valid preferredNodeId if available', () => {
    const node1 = createMockNode({ id: 'RedFish_1', players: 38 });
    const node2 = createMockNode({ id: 'RedFish_2', players: 0 });

    const manager = {
      nodeManager: {
        nodes: new Map([
          ['RedFish_1', node1],
          ['RedFish_2', node2]
        ])
      },
      players: new Map()
    };

    const selected = findBestNodeForSource(manager, 'youtube_music', 'RedFish_1');
    assert.equal(selected.id, 'RedFish_1', 'Should honor preferredNodeId when valid and available');
  });

  test('findBestNodeForSource falls back to least used node if preferredNodeId is demoted or down', () => {
    const node1 = createMockNode({ id: 'RedFish_1', isDemoted: true });
    const node2 = createMockNode({ id: 'RedFish_2', players: 1 });
    const node4 = createMockNode({ id: 'RedFish_4', players: 0 });

    const manager = {
      nodeManager: {
        nodes: new Map([
          ['RedFish_1', node1],
          ['RedFish_2', node2],
          ['RedFish_4', node4]
        ])
      },
      players: new Map()
    };

    const selected = findBestNodeForSource(manager, 'youtube_music', 'RedFish_1');
    assert.equal(selected.id, 'RedFish_4', 'Should fallback to least used node if preferred node is demoted');
  });

  test('multiple player allocations balance across equal nodes via local player awareness', () => {
    const nodeA = createMockNode({ id: 'Node_A', players: 0, systemLoad: 0.1 });
    const nodeB = createMockNode({ id: 'Node_B', players: 0, systemLoad: 0.1 });

    const manager = {
      nodeManager: {
        nodes: new Map([
          ['Node_A', nodeA],
          ['Node_B', nodeB]
        ])
      },
      players: new Map()
    };

    const first = getLeastUsedNode(manager);
    manager.players.set('guild_1', { node: first });

    const second = getLeastUsedNode(manager);
    manager.players.set('guild_2', { node: second });

    assert.notEqual(first.id, second.id, 'Successive player creations must alternate between equal nodes');
  });
});

describe('Status Command Node Formatting', () => {
  const dummyPrettyMs = (ms) => `${Math.floor(ms / 1000)}s`;

  test('formatNodeStatusField shows Temp Disabled: No for active healthy node', () => {
    const node = createMockNode({ id: 'RedFish_1', players: 10, playingPlayers: 4 });
    const field = formatNodeStatusField(node, dummyPrettyMs);

    assert.equal(field.name, 'Node: RedFish_1');
    assert.ok(field.value.includes('Temp Disabled: No'));
    assert.ok(field.value.includes('Players: 10'));
    assert.ok(field.value.includes('Playing: 4'));
  });

  test('formatNodeStatusField shows Temp Disabled: Yes with reason when node is demoted', () => {
    const node = createMockNode({
      id: 'RedFish_3',
      isDemoted: true,
      demoteReason: 'Rate limit detected',
      players: 0,
      playingPlayers: 0
    });
    const field = formatNodeStatusField(node, dummyPrettyMs);

    assert.equal(field.name, 'Node: RedFish_3 (Temp Disabled)');
    assert.ok(field.value.includes('Temp Disabled: Yes (Rate limit detected)'));
  });

  test('formatNodeStatusField handles cluster demoted override map', () => {
    const node = createMockNode({
      id: 'RedFish_3',
      isDemoted: false,
      players: 0,
      playingPlayers: 0
    });
    const field = formatNodeStatusField(node, dummyPrettyMs, {
      isDemoted: true,
      demoteReason: 'Cluster sync: 429 Too Many Requests'
    });

    assert.equal(field.name, 'Node: RedFish_3 (Temp Disabled)');
    assert.ok(field.value.includes('Temp Disabled: Yes (Cluster sync: 429 Too Many Requests)'));
  });

  test('formatNodeStatusField shows Disconnected when node is not connected', () => {
    const node = createMockNode({
      id: 'RedFish_5',
      connected: false
    });
    const field = formatNodeStatusField(node, dummyPrettyMs);

    assert.equal(field.name, 'Node: RedFish_5 (Disconnected)');
  });

  test('formatNodeStatusField handles incomplete or missing stats gracefully', () => {
    const bareNode = {
      id: 'RedFish_Incomplete',
      connected: true,
      stats: null
    };
    const field = formatNodeStatusField(bareNode, dummyPrettyMs);

    assert.equal(field.name, 'Node: RedFish_Incomplete');
    assert.ok(field.value.includes('Players: 0'));
    assert.ok(field.value.includes('Uptime: N/A'));
    assert.ok(field.value.includes('Memory: N/A'));
    assert.ok(field.value.includes('CPU: N/A'));
    assert.ok(field.value.includes('Temp Disabled: No'));
  });
});
