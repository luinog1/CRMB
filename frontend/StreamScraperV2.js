// Enhanced Stream Scraper V2 - Production-Ready Addon Support
class StreamScraperV2 {
    constructor(app) {
        this.app = app;
        this.requestTimeout = 20000; // Increased to 20 seconds
        this.maxConcurrentRequests = 2; // Reduced for stability
        this.retryAttempts = 3; // Increased retry attempts
        this.cache = new Map();
        this.cacheExpiry = 600000; // 10 minutes
        this.activeRequests = new Set();
        this.debugMode = localStorage.getItem('crumble_debug') === 'true';
        
        // Enhanced CORS proxy list with working alternatives
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://cors.eu.org/',
            'https://yacdn.org/proxy/',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        this.currentProxyIndex = 0;
        this.proxyHealth = new Map();
        
        // Initialize proxy health check
        this.initializeProxyHealth();
    }

    // Initialize proxy health monitoring
    async initializeProxyHealth() {
        for (const proxy of this.corsProxies) {
            this.proxyHealth.set(proxy, { working: true, lastChecked: 0, failures: 0 });
        }
    }

    // Enhanced addon querying with comprehensive error handling
    async queryStremioAddons(type, id, season = null, episode = null, title = null) {
        const cacheKey = this.generateCacheKey(type, id, season, episode);
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheExpiry) {
                this.log(`Cache hit for ${cacheKey}`, 'info');
                return cached.streams;
            }
            this.cache.delete(cacheKey);
        }

        const enabledAddons = this.app.addons.filter(addon => addon.enabled !== false);
        
        if (enabledAddons.length === 0) {
            this.log('No enabled addons found', 'warn');
            return [];
        }

        this.log(`Querying ${enabledAddons.length} addons for ${type}:${id}`, 'info');
        
        const streams = [];
        const results = [];

        // Process addons sequentially for better stability
        for (const addon of enabledAddons) {
            try {
                const addonStreams = await this.queryAddonWithRetry(addon, type, id, season, episode, title);
                if (addonStreams && addonStreams.length > 0) {
                    streams.push(...addonStreams);
                    results.push({ addon: addon.name, status: 'success', streams: addonStreams.length });
                } else {
                    results.push({ addon: addon.name, status: 'no_streams', streams: 0 });
                }
            } catch (error) {
                this.log(`Addon ${addon.name} failed: ${error.message}`, 'error');
                results.push({ addon: addon.name, status: 'error', error: error.message });
            }
        }

        // Cache the results
        this.cache.set(cacheKey, {
            streams: streams,
            timestamp: Date.now(),
            results: results
        });

        this.log(`Found ${streams.length} total streams from ${enabledAddons.length} addons`, 'info');
        return this.deduplicateAndSortStreams(streams);
    }

    // Enhanced retry logic with exponential backoff
    async queryAddonWithRetry(addon, type, id, season, episode, title, attempt = 1) {
        try {
            return await this.queryAddon(addon, type, id, season, episode, title);
        } catch (error) {
            if (attempt < this.retryAttempts) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
                this.log(`Retrying addon ${addon.name}, attempt ${attempt + 1} after ${delay}ms`, 'warn');
                await this.delay(delay);
                return this.queryAddonWithRetry(addon, type, id, season, episode, title, attempt + 1);
            }
            throw error;
        }
    }

    // Core addon querying with enhanced strategies
    async queryAddon(addon, type, id, season, episode, title) {
        const requestId = `${addon.id}-${type}-${id}-${Date.now()}`;
        this.activeRequests.add(requestId);

        try {
            // Build multiple possible URLs
            const urls = this.buildStreamUrls(addon, type, id, season, episode);
            this.log(`Querying addon ${addon.name} with ${urls.length} URLs`, 'debug');

            // Try each URL with different strategies
            for (const url of urls) {
                const strategies = [
                    () => this.directFetch(url),
                    () => this.corsProxyFetch(url),
                    () => this.fetchWithUserAgent(url),
                    () => this.fetchWithHeaders(url)
                ];

                for (const strategy of strategies) {
                    try {
                        const result = await strategy();
                        if (result && this.isValidStreamResponse(result)) {
                            return this.processAddonStreams(result.streams, addon, title);
                        }
                    } catch (error) {
                        this.log(`Strategy failed for ${addon.name}: ${error.message}`, 'debug');
                        continue;
                    }
                }
            }

            throw new Error('All strategies and URLs failed');

        } finally {
            this.activeRequests.delete(requestId);
        }
    }

    // Build multiple possible stream URLs
    buildStreamUrls(addon, type, id, season, episode) {
        const urls = [];
        const baseUrl = addon.url.replace(/\/$/, ''); // Remove trailing slash
        
        // Standard Stremio format
        let standardUrl = `${baseUrl}/stream/${type}/${id}`;
        if (type === 'tv' && season && episode) {
            standardUrl += `:${season}:${episode}`;
        }
        urls.push(standardUrl + '.json');
        
        // Alternative formats
        urls.push(`${baseUrl}/streams/${type}/${id}.json`);
        urls.push(`${baseUrl}/api/stream/${type}/${id}.json`);
        
        // With different ID formats
        if (type === 'tv' && season && episode) {
            urls.push(`${baseUrl}/stream/${type}/${id}/${season}/${episode}.json`);
            urls.push(`${baseUrl}/stream/${type}/${id}_${season}_${episode}.json`);
        }
        
        return urls;
    }

    // Validate stream response
    isValidStreamResponse(response) {
        return response && 
               (response.streams || response.results) && 
               Array.isArray(response.streams || response.results) &&
               (response.streams || response.results).length > 0;
    }

    // Enhanced direct fetch with better error handling
    async directFetch(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        try {
            this.log(`Direct fetch: ${url}`, 'debug');
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                signal: controller.signal,
                mode: 'cors',
                credentials: 'omit'
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid content type: expected JSON');
            }

            const data = await response.json();
            this.log(`Direct fetch successful: ${url}`, 'debug');
            return data;
            
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    // Enhanced CORS proxy fetch with health monitoring
    async corsProxyFetch(url) {
        const workingProxies = this.corsProxies.filter(proxy => {
            const health = this.proxyHealth.get(proxy);
            return health && health.working && health.failures < 3;
        });

        if (workingProxies.length === 0) {
            throw new Error('No working CORS proxies available');
        }

        for (const proxy of workingProxies) {
            try {
                const proxiedUrl = proxy + encodeURIComponent(url);
                this.log(`CORS proxy fetch: ${proxy}`, 'debug');
                
                const result = await this.directFetch(proxiedUrl);
                
                // Mark proxy as working
                this.proxyHealth.set(proxy, { 
                    working: true, 
                    lastChecked: Date.now(), 
                    failures: 0 
                });
                
                return result;
                
            } catch (error) {
                // Mark proxy failure
                const health = this.proxyHealth.get(proxy);
                this.proxyHealth.set(proxy, {
                    working: health.failures >= 2 ? false : true,
                    lastChecked: Date.now(),
                    failures: health.failures + 1
                });
                
                this.log(`CORS proxy ${proxy} failed: ${error.message}`, 'debug');
                continue;
            }
        }

        throw new Error('All CORS proxies failed');
    }

    // Fetch with specific user agent
    async fetchWithUserAgent(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Stremio/4.4.142 (com.stremio.desktop)',
                    'Origin': 'https://app.strem.io',
                    'Referer': 'https://app.strem.io/'
                },
                signal: controller.signal,
                mode: 'cors'
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // Fetch with additional headers
    async fetchWithHeaders(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site'
                },
                signal: controller.signal,
                mode: 'cors'
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // Enhanced stream processing
    processAddonStreams(streams, addon, title) {
        if (!Array.isArray(streams)) {
            this.log(`Invalid streams format from ${addon.name}: expected array`, 'warn');
            return [];
        }

        const processedStreams = streams
            .filter(stream => stream && (stream.url || stream.infoHash))
            .map(stream => ({
                ...stream,
                addon: addon.name,
                addonId: addon.id,
                title: stream.title || title || 'Unknown',
                quality: this.extractQuality(stream),
                size: this.extractSize(stream),
                seeders: this.extractSeeders(stream),
                language: this.extractLanguage(stream),
                source: this.extractSource(stream),
                reliability: this.calculateReliability(stream, addon),
                timestamp: Date.now(),
                isValid: this.validateStream(stream)
            }))
            .filter(stream => stream.isValid);

        this.log(`Processed ${processedStreams.length} valid streams from ${addon.name}`, 'debug');
        return processedStreams;
    }

    // Validate individual stream
    validateStream(stream) {
        // Must have either URL or infoHash
        if (!stream.url && !stream.infoHash) {
            return false;
        }

        // URL validation
        if (stream.url) {
            try {
                new URL(stream.url);
            } catch {
                // Check for magnet links
                if (!stream.url.startsWith('magnet:')) {
                    return false;
                }
            }
        }

        return true;
    }

    // Enhanced deduplication and sorting
    deduplicateAndSortStreams(streams) {
        // Remove duplicates based on URL, infoHash, or title+quality combination
        const uniqueStreams = streams.filter((stream, index, self) => {
            return index === self.findIndex(s => {
                // Same URL
                if (stream.url && s.url && stream.url === s.url) return true;
                
                // Same infoHash
                if (stream.infoHash && s.infoHash && stream.infoHash === s.infoHash) return true;
                
                // Same title and quality from same addon
                if (stream.title === s.title && 
                    stream.quality === s.quality && 
                    stream.addon === s.addon) return true;
                
                return false;
            });
        });

        // Sort by multiple criteria
        return uniqueStreams.sort((a, b) => {
            // Primary: Quality score
            const qualityDiff = this.getQualityScore(b.quality) - this.getQualityScore(a.quality);
            if (qualityDiff !== 0) return qualityDiff;

            // Secondary: Reliability
            const reliabilityDiff = (b.reliability || 0) - (a.reliability || 0);
            if (reliabilityDiff !== 0) return reliabilityDiff;

            // Tertiary: Seeders (for torrents)
            const seedersA = parseInt(a.seeders) || 0;
            const seedersB = parseInt(b.seeders) || 0;
            if (seedersB !== seedersA) return seedersB - seedersA;

            // Quaternary: File size (smaller is better for streaming)
            const sizeA = this.extractSizeBytes(a) || Infinity;
            const sizeB = this.extractSizeBytes(b) || Infinity;
            return sizeA - sizeB;
        });
    }

    // Enhanced quality extraction with more patterns
    extractQuality(stream) {
        const text = `${stream.title || ''} ${stream.description || ''} ${stream.name || ''}`.toLowerCase();
        
        const qualityPatterns = [
            { pattern: /\b(4k|2160p|uhd|ultra\s*hd)\b/, quality: '4K' },
            { pattern: /\b(1440p|qhd|quad\s*hd)\b/, quality: '1440p' },
            { pattern: /\b(1080p|fhd|full\s*hd|bluray)\b/, quality: '1080p' },
            { pattern: /\b(720p|hd|hdtv)\b/, quality: '720p' },
            { pattern: /\b(480p|dvd)\b/, quality: '480p' },
            { pattern: /\b(360p|mobile)\b/, quality: '360p' },
            { pattern: /\b(240p|low)\b/, quality: '240p' }
        ];

        for (const { pattern, quality } of qualityPatterns) {
            if (pattern.test(text)) {
                return quality;
            }
        }

        return 'Unknown';
    }

    // Enhanced size extraction
    extractSize(stream) {
        const text = `${stream.title || ''} ${stream.description || ''} ${stream.name || ''}`;
        const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB|KB)/i);
        return sizeMatch ? `${sizeMatch[1]}${sizeMatch[2].toUpperCase()}` : null;
    }

    // Convert size to bytes for comparison
    extractSizeBytes(stream) {
        const sizeStr = this.extractSize(stream);
        if (!sizeStr) return null;
        
        const match = sizeStr.match(/(\d+(?:\.\d+)?)(TB|GB|MB|KB)/i);
        if (!match) return null;
        
        const value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        
        const multipliers = {
            'TB': 1024 * 1024 * 1024 * 1024,
            'GB': 1024 * 1024 * 1024,
            'MB': 1024 * 1024,
            'KB': 1024
        };
        
        return value * (multipliers[unit] || 1);
    }

    // Enhanced seeders extraction
    extractSeeders(stream) {
        const text = `${stream.title || ''} ${stream.description || ''} ${stream.name || ''}`;
        const patterns = [
            /(\d+)\s*(?:seeders?|👥|S:|seeds?)/i,
            /S:\s*(\d+)/i,
            /seeders?:\s*(\d+)/i
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[1];
        }
        
        return null;
    }

    // Enhanced language extraction
    extractLanguage(stream) {
        const text = `${stream.title || ''} ${stream.description || ''} ${stream.name || ''}`.toLowerCase();
        
        const languages = {
            'english': 'EN', 'eng': 'EN', 'en': 'EN',
            'spanish': 'ES', 'español': 'ES', 'esp': 'ES', 'es': 'ES',
            'french': 'FR', 'français': 'FR', 'fra': 'FR', 'fr': 'FR',
            'german': 'DE', 'deutsch': 'DE', 'ger': 'DE', 'de': 'DE',
            'italian': 'IT', 'italiano': 'IT', 'ita': 'IT', 'it': 'IT',
            'portuguese': 'PT', 'português': 'PT', 'por': 'PT', 'pt': 'PT',
            'russian': 'RU', 'русский': 'RU', 'rus': 'RU', 'ru': 'RU',
            'japanese': 'JP', '日本語': 'JP', 'jpn': 'JP', 'ja': 'JP',
            'korean': 'KR', '한국어': 'KR', 'kor': 'KR', 'ko': 'KR',
            'chinese': 'CN', '中文': 'CN', 'chi': 'CN', 'zh': 'CN'
        };

        for (const [lang, code] of Object.entries(languages)) {
            if (text.includes(lang)) {
                return code;
            }
        }

        return null;
    }

    // Enhanced source detection
    extractSource(stream) {
        if (stream.url) {
            if (stream.url.startsWith('magnet:')) return 'Torrent';
            if (stream.url.includes('.m3u8')) return 'HLS';
            if (stream.url.includes('.mp4')) return 'MP4';
            if (stream.url.includes('.mkv')) return 'MKV';
            if (stream.url.includes('.avi')) return 'AVI';
            if (stream.url.includes('.webm')) return 'WebM';
            if (stream.url.includes('youtube.com') || stream.url.includes('youtu.be')) return 'YouTube';
        }
        
        if (stream.infoHash) return 'Torrent';
        
        return 'Unknown';
    }

    // Enhanced reliability calculation
    calculateReliability(stream, addon) {
        let score = 50; // Base score

        // Addon reputation
        const addonName = addon.name.toLowerCase();
        if (addonName.includes('torrentio')) score += 25;
        else if (addonName.includes('cinemeta')) score += 20;
        else if (addonName.includes('opensubtitles')) score += 15;
        else if (addonName.includes('official')) score += 20;

        // Stream characteristics
        if (stream.url && stream.url.startsWith('https://')) score += 10;
        if (this.extractSeeders(stream)) {
            const seeders = parseInt(this.extractSeeders(stream));
            if (seeders > 100) score += 20;
            else if (seeders > 50) score += 15;
            else if (seeders > 10) score += 10;
            else if (seeders > 0) score += 5;
        }
        if (this.extractSize(stream)) score += 5;
        if (this.extractQuality(stream) !== 'Unknown') score += 10;
        if (stream.title && stream.title.length > 10) score += 5;

        return Math.min(100, Math.max(0, score));
    }

    // Get quality score for sorting
    getQualityScore(quality) {
        const scores = {
            '4K': 4000,
            '2160p': 4000,
            '1440p': 1440,
            '1080p': 1080,
            '720p': 720,
            '480p': 480,
            '360p': 360,
            '240p': 240,
            'Unknown': 0
        };
        return scores[quality] || 0;
    }

    // Enhanced IMDB ID resolution
    async resolveImdbId(type, tmdbId) {
        try {
            const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
            const data = await this.app.fetchFromTMDB(endpoint, {
                append_to_response: 'external_ids'
            });
            
            return data.external_ids?.imdb_id || null;
        } catch (error) {
            this.log(`Failed to resolve IMDB ID for ${type}:${tmdbId}: ${error.message}`, 'warn');
            return null;
        }
    }

    // Query with multiple ID fallbacks
    async queryWithImdbFallback(type, tmdbId, season, episode, title) {
        this.log(`Starting query for ${type}:${tmdbId}`, 'info');
        
        // First try with TMDB ID
        let streams = await this.queryStremioAddons(type, tmdbId, season, episode, title);
        
        // If no streams found, try with IMDB ID
        if (streams.length === 0) {
            const imdbId = await this.resolveImdbId(type, tmdbId);
            if (imdbId) {
                this.log(`Fallback to IMDB ID: ${imdbId}`, 'info');
                streams = await this.queryStremioAddons(type, imdbId, season, episode, title);
            }
        }
        
        this.log(`Final result: ${streams.length} streams found`, 'info');
        return streams;
    }

    // Utility functions
    generateCacheKey(type, id, season, episode) {
        return `${type}_${id}${season ? `_s${season}` : ''}${episode ? `_e${episode}` : ''}`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    clearCache() {
        this.cache.clear();
        this.log('Stream cache cleared', 'info');
    }

    // Enhanced logging
    log(message, level = 'info') {
        if (!this.debugMode && level === 'debug') return;
        
        const timestamp = new Date().toISOString();
        const prefix = `[StreamScraper] ${timestamp}`;
        
        switch (level) {
            case 'error':
                console.error(`${prefix} ERROR: ${message}`);
                break;
            case 'warn':
                console.warn(`${prefix} WARN: ${message}`);
                break;
            case 'debug':
                console.debug(`${prefix} DEBUG: ${message}`);
                break;
            default:
                console.log(`${prefix} INFO: ${message}`);
        }
    }

    // Get comprehensive statistics
    getStats() {
        return {
            cache: {
                size: this.cache.size,
                maxAge: this.cacheExpiry
            },
            requests: {
                active: this.activeRequests.size,
                timeout: this.requestTimeout,
                maxConcurrent: this.maxConcurrentRequests,
                retryAttempts: this.retryAttempts
            },
            proxies: {
                total: this.corsProxies.length,
                current: this.corsProxies[this.currentProxyIndex],
                health: Object.fromEntries(this.proxyHealth)
            },
            debug: this.debugMode
        };
    }

    // Enable debug mode
    enableDebug() {
        this.debugMode = true;
        localStorage.setItem('crumble_debug', 'true');
        this.log('Debug mode enabled', 'info');
    }

    // Disable debug mode
    disableDebug() {
        this.debugMode = false;
        localStorage.removeItem('crumble_debug');
        this.log('Debug mode disabled', 'info');
    }
}

// Make StreamScraperV2 available globally
window.StreamScraperV2 = StreamScraperV2;