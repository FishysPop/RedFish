const test = require('node:test');
const assert = require('node:assert/strict');
const handleExcessiveLavaErrors = require('../src/utils/handleExcessiveLavaErrors');

test('handleExcessiveLavaErrors functions and error detection', async (t) => {
    const {
        isRateLimitError,
        calculateProbeBackoff,
        recordFailedProbe,
        demoteNode,
        promoteNode,
        isProberRunning,
        startDemotedNodeProber,
        stopDemotedNodeProber,
        syncDemotedNodesFromCluster0
    } = handleExcessiveLavaErrors;

    await t.test('isRateLimitError identifies rate limit signatures and ignores copyright blocks', () => {
        assert.equal(isRateLimitError(null), false);
        assert.equal(isRateLimitError(new Error('This video is blocked due to the claimed content')), false);
        assert.equal(isRateLimitError(new Error('This video is private')), false);
        assert.equal(isRateLimitError(new Error('429 Too Many Requests')), true);
        assert.equal(isRateLimitError(new Error('Sign in to confirm you’re not a bot')), true);
        assert.equal(isRateLimitError(new Error('all clients failed to load the item')), true);
    });

    await t.test('calculateProbeBackoff computes exponential backoff up to 6 hours', () => {
        assert.equal(calculateProbeBackoff(0), 60000);
        assert.equal(calculateProbeBackoff(1), 120000);
        assert.equal(calculateProbeBackoff(2), 240000);
        assert.equal(calculateProbeBackoff(3), 480000);
        assert.equal(calculateProbeBackoff(9), 21600000);
        assert.equal(calculateProbeBackoff(20), 21600000);
    });

    await t.test('recordFailedProbe updates node backoff metadata', () => {
        const mockNode = { id: 'TestNode' };
        const backoff1 = recordFailedProbe(mockNode);
        assert.equal(mockNode.failedProbeAttempts, 1);
        assert.equal(backoff1, 120000);
        assert.equal(mockNode.currentProbeBackoffMs, 120000);
        assert.ok(mockNode.nextProbeAt > Date.now());
    });

    await t.test('demoteNode and promoteNode manage node demoted state without errors', async () => {
        const mockNode = {
            id: 'Node_1',
            isDemoted: false,
            connected: true,
            sessionId: 'sess_1',
            info: { sourceManagers: ['youtube'] }
        };
        const mockManager = {
            nodeManager: {
                nodes: new Map([['Node_1', mockNode]])
            },
            players: new Map()
        };

        const demoted = await demoteNode(mockManager, 'Node_1', 'Rate limited', true);
        assert.equal(demoted, true);
        assert.equal(mockNode.isDemoted, true);
        assert.equal(mockNode.demoteReason, 'Rate limited');
        assert.equal(mockNode.currentProbeBackoffMs, 60000);

        const promoted = await promoteNode(mockManager, 'Node_1', true);
        assert.equal(promoted, true);
        assert.equal(mockNode.isDemoted, false);
        assert.equal(mockNode.demoteReason, null);
    });

    await t.test('prober controls work and syncDemotedNodesFromCluster0 handles missing cluster gracefully', async () => {
        const mockClient = { cluster: { id: 1 } };
        startDemotedNodeProber(mockClient);
        assert.equal(isProberRunning(), false);

        await syncDemotedNodesFromCluster0(mockClient);
        stopDemotedNodeProber();
    });
});
