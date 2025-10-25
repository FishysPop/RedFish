const ALL_API_TARGETS = [
    {
        name: 'new-squid',
        baseUrl: 'https://kraken.squid.wtf',
        weight: 20,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'squid-api',
        baseUrl: 'https://triton.squid.wtf',
        weight: 20,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'squid-api-2',
        baseUrl: 'https://zeus.squid.wtf',
        weight: 19,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'squid-api-3',
        baseUrl: 'https://aether.squid.wtf',
        weight: 19,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'phoenix',
        baseUrl: 'https://phoenix.squid.wtf',
        weight: 20,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'shiva',
        baseUrl: 'https://shiva.squid.wtf',
        weight: 20,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'chaos',
        baseUrl: 'https://chaos.squid.wtf',
        weight: 20,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'vercel-fastapi',
        baseUrl: 'https://tidal-api-2.binimum.org',
        weight: 1,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'monochrome-jakarta',
        baseUrl: 'https://jakarta.monochrome.tf',
        weight: 15,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'monochrome-california',
        baseUrl: 'https://california.monochrome.tf',
        weight: 15,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'monochrome-london',
        baseUrl: 'https://london.monochrome.tf',
        weight: 15,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'hund',
        baseUrl: 'https://hund.qqdl.site',
        weight: 15,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'katze',
        baseUrl: 'https://katze.qqdl.site',
        weight: 15,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'maus',
        baseUrl: 'https://maus.qqdl.site',
        weight: 15,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'vogel',
        baseUrl: 'https://vogel.qqdl.site',
        weight: 15,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'wolf',
        baseUrl: 'https://wolf.qqdl.site',
        weight: 15,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'monochrome',
        baseUrl: 'https://hifi.prigoana.com',
        weight: 15,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'monochrome-singapore',
        baseUrl: 'https://singapore.monochrome.tf',
        weight: 15,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'monochrome-ohio',
        baseUrl: 'https://ohio.monochrome.tf',
        weight: 15,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'monochrome-oregon',
        baseUrl: 'https://oregon.monochrome.tf',
        weight: 15,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'monochrome-virginia',
        baseUrl: 'https://virginia.monochrome.tf',
        weight: 15,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'monochrome-frankfurt',
        baseUrl: 'https://frankfurt.monochrome.tf',
        weight: 15,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'monochrome-tokyo',
        baseUrl: 'https://tokyo.monochrome.tf',
        weight: 15,
        requiresProxy: false,
        category: 'auto-only'
    },
];

const US_API_TARGETS = [
    {
        name: 'hund',
        baseUrl: 'https://hund.qqdl.site',
        weight: 20,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'katze',
        baseUrl: 'https://katze.qqdl.site',
        weight: 20,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'maus',
        baseUrl: 'https://maus.qqdl.site',
        weight: 20,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'vogel',
        baseUrl: 'https://vogel.qqdl.site',
        weight: 20,
        requiresProxy: false,
        category: 'auto-only'
    },
    {
        name: 'wolf',
        baseUrl: 'https://wolf.qqdl.site',
        weight: 20,
        requiresProxy: false,
        category: 'auto-only'
    }
];

const TARGET_COLLECTIONS = {
    auto: [...ALL_API_TARGETS],
    eu: [],
    us: [...US_API_TARGETS]
};

const TARGETS = TARGET_COLLECTIONS.auto;

const API_CONFIG = {
    targets: TARGETS,
    baseUrl: TARGETS[0]?.baseUrl ?? 'https://tidal.401658.xyz',
    useProxy: true,
    proxyUrl: '/api/proxy'
};


let weightedTargets = null;

function buildWeightedTargets(targets) {
    const validTargets = targets.filter((target) => {
        if (!target?.baseUrl || typeof target.baseUrl !== 'string') {
            return false;
        }
        if (target.weight <= 0) {
            return false;
        }
        try {
            new URL(target.baseUrl);
            return true;
        } catch (error) {
            console.error(`Invalid API target URL for ${target.name}:`, error);
            return false;
        }
    });

    if (validTargets.length === 0) {
        throw new Error('No valid API targets configured');
    }

    let cumulative = 0;
    const collected = [];
    for (const target of validTargets) {
        cumulative += target.weight;
        collected.push({ ...target, cumulativeWeight: cumulative });
    }
    return collected;
}

function ensureWeightedTargets() {
    if (!weightedTargets) {
        weightedTargets = buildWeightedTargets(API_CONFIG.targets);
    }
    return weightedTargets;
}

function selectApiTarget() {
    const targets = ensureWeightedTargets();
    return selectFromWeightedTargets(targets);
}

function getPrimaryTarget() {
    return ensureWeightedTargets()[0];
}

function selectFromWeightedTargets(weighted) {
    if (weighted.length === 0) {
        throw new Error('No weighted targets available for selection');
    }

    const totalWeight = weighted[weighted.length - 1]?.cumulativeWeight ?? 0;
    if (totalWeight <= 0) {
        return weighted[0];
    }

    const random = Math.random() * totalWeight;
    for (const target of weighted) {
        if (random < target.cumulativeWeight) {
            return target;
        }
    }

    return weighted[0];
}

function getTargetsForRegion(region = 'auto') {
    const targets = TARGET_COLLECTIONS[region];
    return Array.isArray(targets) ? targets : [];
}

function selectApiTargetForRegion(region) {
    if (region === 'auto') {
        return selectApiTarget();
    }

    const targets = getTargetsForRegion(region);
    if (targets.length === 0) {
        return selectApiTarget();
    }

    const weighted = buildWeightedTargets(targets);
    return selectFromWeightedTargets(weighted);
}

function hasRegionTargets(region) {
    if (region === 'auto') {
        return TARGET_COLLECTIONS.auto.length > 0;
    }

    return getTargetsForRegion(region).length > 0;
}

function parseTargetBase(target) {
    try {
        return new URL(target.baseUrl);
    } catch (error) {
        console.error(`Invalid API target base URL for ${target.name}:`, error);
        return null;
    }
}

function getBaseApiUrl(target) {
    const chosen = target ?? getPrimaryTarget();
    return parseTargetBase(chosen);
}

function stripTrailingSlash(path) {
    if (path === '/') return path;
    return path.replace(/\/+$/, '') || '/';
}

function combinePaths(basePath, relativePath) {
    const trimmedBase = stripTrailingSlash(basePath || '/');
    const normalizedRelative = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    if (trimmedBase === '/' || trimmedBase === '') {
        return normalizedRelative;
    }
    if (normalizedRelative === '/') {
        return `${trimmedBase}/`;
    }
    return `${trimmedBase}${normalizedRelative}`;
}

function getRelativePath(url, targetBase) {
    const basePath = stripTrailingSlash(targetBase.pathname || '/');
    const currentPath = url.pathname || '/';
    if (basePath === '/' || basePath === '') {
        return currentPath.startsWith('/') ? currentPath : `/${currentPath}`;
    }
    if (!currentPath.startsWith(basePath)) {
        return currentPath;
    }
    const relative = currentPath.slice(basePath.length);
    if (!relative) {
        return '/';
    }
    return relative.startsWith('/') ? relative : `/${relative}`;
}

function matchesTarget(url, target) {
    const base = parseTargetBase(target);
    if (!base) {
        return false;
    }

    if (url.origin !== base.origin) {
        return false;
    }

    const basePath = stripTrailingSlash(base.pathname || '/');
    if (basePath === '/' || basePath === '') {
        return true;
    }

    const targetPath = stripTrailingSlash(url.pathname || '/');
    return targetPath === basePath || targetPath.startsWith(`${basePath}/`);
}

function findTargetForUrl(url) {
    for (const target of API_CONFIG.targets) {
        if (matchesTarget(url, target)) {
            return target;
        }
    }
    return null;
}

function isProxyTarget(url) {
    const target = findTargetForUrl(url);
    return target?.requiresProxy === true;
}

function shouldPreferPrimaryTarget(url) {
    const path = url.pathname.toLowerCase();

    // Prefer the proxied primary target for endpoints that routinely require the legacy domain
    if (path.includes('/album/') || path.includes('/artist/') || path.includes('/playlist/')) {
        return true;
    }

    if (path.includes('/search/')) {
        const params = url.searchParams;
        if (params.has('a') || params.has('al') || params.has('p')) {
            return true;
        }
    }

    return false;
}

function resolveUrl(url) {
    try {
        return new URL(url);
    } catch {
        const baseApiUrl = getBaseApiUrl();
        if (!baseApiUrl) {
            return null;
        }

        try {
            return new URL(url, baseApiUrl);
        } catch {
            return null;
        }
    }
}

/**
 * Create a proxied URL if needed
 */
function getProxiedUrl(url) {
    if (!API_CONFIG.useProxy || !API_CONFIG.proxyUrl) {
        return url;
    }

    const targetUrl = resolveUrl(url);
    if (!targetUrl) {
        return url;
    }

    if (!isProxyTarget(targetUrl)) {
        return url;
    }

    return `${API_CONFIG.proxyUrl}?url=${encodeURIComponent(targetUrl.toString())}`;
}

function isLikelyProxyErrorEntry(entry) {
    if (!entry || typeof entry !== 'object') {
        return false;
    }

    const record = entry;
    const status = typeof record.status === 'number' ? record.status : undefined;
    const subStatus = typeof record.subStatus === 'number' ? record.subStatus : undefined;
    const userMessage = typeof record.userMessage === 'string' ? record.userMessage : undefined;
    const detail = typeof record.detail === 'string' ? record.detail : undefined;

    if (typeof status === 'number' && status >= 400) {
        return true;
    }

    if (typeof subStatus === 'number' && subStatus >= 400) {
        return true;
    }

    const tokenPattern = /(token|invalid|unauthorized)/i;
    if (userMessage && tokenPattern.test(userMessage)) {
        return true;
    }

    if (detail && tokenPattern.test(detail)) {
        return true;
    }

    return false;
}

function isLikelyProxyErrorPayload(payload) {
    if (Array.isArray(payload)) {
        return payload.some((entry) => isLikelyProxyErrorEntry(entry));
    }

    if (payload && typeof payload === 'object') {
        return isLikelyProxyErrorEntry(payload);
    }

    return false;
}

async function isUnexpectedProxyResponse(response) {
    if (!response.ok) {
        return false;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.toLowerCase().includes('application/json')) {
        return false;
    }

    try {
        const payload = await response.clone().json();
        return isLikelyProxyErrorPayload(payload);
    } catch {
        return false;
    }
}

/**
 * Fetch with CORS handling
 */
async function fetchWithCORS(url, options) {
    const resolvedUrl = resolveUrl(url);
    if (!resolvedUrl) {
        throw new Error(`Unable to resolve URL: ${url}`);
    }

    const originTarget = findTargetForUrl(resolvedUrl);
    if (!originTarget) {
        return fetch(getProxiedUrl(resolvedUrl.toString()), {
            ...options
        });
    }

    const weightedTargets = ensureWeightedTargets();
    const attemptOrder = [];
    if (shouldPreferPrimaryTarget(resolvedUrl)) {
        const primary = getPrimaryTarget();
        if (!attemptOrder.some((candidate) => candidate.name === primary.name)) {
            attemptOrder.push(primary);
        }
    }

    const selected = selectApiTarget();
    if (!attemptOrder.some((candidate) => candidate.name === selected.name)) {
        attemptOrder.push(selected);
    }

    for (const target of weightedTargets) {
        if (!attemptOrder.some((candidate) => candidate.name === target.name)) {
            attemptOrder.push(target);
        }
    }

    let uniqueTargets = attemptOrder.filter(
        (target, index, array) => array.findIndex((entry) => entry.name === target.name) === index
    );

    if (uniqueTargets.length === 0) {
        uniqueTargets = [getPrimaryTarget()];
    }

    const originBase = parseTargetBase(originTarget);
    if (!originBase) {
        throw new Error('Invalid origin target configuration.');
    }

    const totalAttempts = Math.max(3, uniqueTargets.length);
    let lastError = null;
    let lastResponse = null;
    let lastUnexpectedResponse = null;

    for (let attempt = 0; attempt < totalAttempts; attempt += 1) {
        const target = uniqueTargets[attempt % uniqueTargets.length];
        const targetBase = parseTargetBase(target);
        if (!targetBase) {
            continue;
        }

        const relativePath = getRelativePath(resolvedUrl, originBase);
        const rewrittenPath = combinePaths(targetBase.pathname || '/', relativePath);
        const rewrittenUrl = new URL(
            rewrittenPath + resolvedUrl.search + resolvedUrl.hash,
            targetBase.origin
        );
        const finalUrl = getProxiedUrl(rewrittenUrl.toString());

        try {
            const response = await fetch(finalUrl, {
                ...options
            });
            if (response.ok) {
                const unexpected = await isUnexpectedProxyResponse(response);
                if (!unexpected) {
                    return response;
                }
                lastUnexpectedResponse = response;
                continue;
            }

            lastResponse = response;
        } catch (error) {
            lastError = error;
            if (error instanceof TypeError && error.message.includes('CORS')) {
                continue;
            }
        }
    }

    if (lastUnexpectedResponse) {
        return lastUnexpectedResponse;
    }

    if (lastResponse) {
        return lastResponse;
    }

    if (lastError) {
        if (
            lastError instanceof TypeError &&
            typeof lastError.message === 'string' &&
            lastError.message.includes('CORS')
        ) {
            throw new Error(
                'CORS error detected. Please configure a proxy in src/lib/config.ts or enable CORS on your backend.'
            );
        }
        throw lastError;
    }

    throw new Error('All API targets failed without response.');
}

module.exports = {
    API_CONFIG,
    selectApiTarget,
    getPrimaryTarget,
    selectApiTargetForRegion,
    hasRegionTargets,
    getTargetsForRegion,
    fetchWithCORS
};