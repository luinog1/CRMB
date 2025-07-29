// StreamScraper V3 - Production Fix for CORS and Torrentio Issues
class StreamScraperV3 {
    constructor(app) {
        this.app = app;
        this.requestTimeout = 15000;
        this.maxConcurrentRequests = 2;
        this.retryAttempts = 2;
        this.cache = new Map();
        this.cacheExpiry = 300000; // 5 minutes
        this.activeRequests = new Set();
        this.debugMode = localStorage.getItem('crumble_debug') === 'true';
        
        // Working CORS proxies with proper configuration
        this.corsProxies = [
            'https://corsproxy.io/?',
            'https://cors-proxy.htmldriven.com/?url=',
            'https://api.allorigins.win/get?url=',
            'https://proxy.cors.sh/'
        ];
        this.currentProxyIndex = 0;
        this.proxyHealth = new Map();
        
        this.initializeProxyHealth();
    }

    async initializeProxyHealth() {
        for (const proxy of this.corsProxies) {
            this.proxyHealth.set(proxy, { working: true, lastChecked: 0, failures: 0 });
        }
    }

    async queryStremioAddons(type, id, season = null, episode = null, title = null) {
        const cacheKey = this.generateCacheKey(type, id, season, episode);
        
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

        for (const addon of enabledAddons) {
            try {
                const addonStreams = await this.queryAddonWithRetry(addon, type, id, season, episode, title);
                if (addonStreams && addonStreams.length > 0) {
                    streams.push(...addonStreams);
                }
            } catch (error) {
                this.log(`Addon ${addon.name} failed: ${error.message}`, 'error');
            }
        }

        this.cache.set(cacheKey, {
            streams: streams,
            timestamp: Date.now()
        });

        this.log(`Found ${streams.length} total streams from ${enabledAddons.length} addons`, 'info');
        return this.deduplicateAndSortStreams(streams);
    }

    async queryAddonWithRetry(addon, type, id, season, episode, title, attempt = 1) {
        try {
            return await this.queryAddon(addon, type, id, season, episode, title);
        } catch (error) {
            if (attempt < this.retryAttempts) {
                const delay = 1000 * attempt;
                this.log(`Retrying addon ${addon.name}, attempt ${attempt + 1} after ${delay}ms`, 'warn');
                await this.delay(delay);
                return this.queryAddonWithRetry(addon, type, id, season, episode, title, attempt + 1);
            }
            throw error;
        }
    }

    async queryAddon(addon, type, id, season, episode, title) {
        const requestId = `${addon.id}-${type}-${id}-${Date.now()}`;
        this.activeRequests.add(requestId);

        try {
            // Build correct URLs for different addon types
            const urls = this.buildCorrectStreamUrls(addon, type, id, season, episode);
            this.log(`Querying addon ${addon.name} with ${urls.length} URLs`, 'debug');

            for (const url of urls) {
                // Try different strategies in order of reliability
                const strategies = [
                    () => this.simpleFetch(url),
                    () => this.corsProxyFetch(url),
                    () => this.jsonpFetch(url)
                ];

                for (const strategy of strategies) {
                    try {
                        const result = await strategy();
                        if (result && this.isValidStreamResponse(result)) {
                            const streams = result.streams || result.results || [];
                            return this.processAddonStreams(streams, addon, title);
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

    buildCorrectStreamUrls(addon, type, id, season, episode) {
        const urls = [];
        const baseUrl = addon.url.replace(/\/$/, '');
        
        // Detect addon type and build appropriate URLs
        if (this.isTorrentioAddon(addon)) {
            urls.push(...this.buildTorrentioUrls(baseUrl, type, id, season, episode));
        } else if (this.isCinemetaAddon(addon)) {
            urls.push(...this.buildCinemetaUrls(baseUrl, type, id, season, episode));
        } else {
            // Generic Stremio addon URLs
            urls.push(...this.buildGenericStremioUrls(baseUrl, type, id, season, episode));
        }
        
        return urls;
    }

    isTorrentioAddon(addon) {
        return addon.url.includes('torrentio') || addon.name.toLowerCase().includes('torrentio');
    }

    isCinemetaAddon(addon) {
        return addon.url.includes('cinemeta') || addon.name.toLowerCase().includes('cinemeta');
    }

    buildTorrentioUrls(baseUrl, type, id, season, episode) {
        const urls = [];
        
        // Torrentio uses specific URL patterns
        if (type === 'movie') {
            urls.push(`${baseUrl}/stream/movie/${id}.json`);
            urls.push(`${baseUrl}/stream/movie/${id}:1080p.json`);
            urls.push(`${baseUrl}/stream/movie/${id}:720p.json`);
        } else if (type === 'tv' && season && episode) {
            urls.push(`${baseUrl}/stream/series/${id}:${season}:${episode}.json`);
            urls.push(`${baseUrl}/stream/series/${id}:${season}:${episode}:1080p.json`);
            urls.push(`${baseUrl}/stream/tv/${id}:${season}:${episode}.json`);
        }
        
        return urls;
    }

    buildCinemetaUrls(baseUrl, type, id, season, episode) {
        const urls = [];
        
        // Cinemeta is primarily for metadata, but may have some streams
        if (type === 'movie') {
            urls.push(`${baseUrl}/stream/movie/${id}.json`);
        } else if (type === 'tv' && season && episode) {
            urls.push(`${baseUrl}/stream/series/${id}:${season}:${episode}.json`);
        }
        
        return urls;
    }

    buildGenericStremioUrls(baseUrl, type, id, season, episode) {
        const urls = [];
        
        // Standard Stremio addon format
        let standardUrl = `${baseUrl}/stream/${type}/${id}`;
        if (type === 'tv' && season && episode) {
            standardUrl += `:${season}:${episode}`;
        }
        urls.push(standardUrl + '.json');
        
        // Alternative formats
        urls.push(`${baseUrl}/streams/${type}/${id}.json`);
        
        return urls;
    }

    async simpleFetch(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        try {
            this.log(`Simple fetch: ${url}`, 'debug');
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Stremio/4.4.142'
                },
                signal: controller.signal,
                mode: 'cors'
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.log(`Simple fetch successful: ${url}`, 'debug');
            return data;
            
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    async corsProxyFetch(url) {
        const workingProxies = this.corsProxies.filter(proxy => {
            const health = this.proxyHealth.get(proxy);
            return health && health.working && health.failures < 2;
        });

        if (workingProxies.length === 0) {
            throw new Error('No working CORS proxies available');
        }

        for (const proxy of workingProxies) {
            try {
                let proxiedUrl;
                
                if (proxy.includes('allorigins.win')) {
                    proxiedUrl = proxy + encodeURIComponent(url);
                } else {
                    proxiedUrl = proxy + encodeURIComponent(url);
                }
                
                this.log(`CORS proxy fetch: ${proxy}`, 'debug');
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

                const response = await fetch(proxiedUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    signal: controller.signal,
                    mode: 'cors'
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                let data = await response.json();
                
                // Handle allorigins.win response format
                if (proxy.includes('allorigins.win') && data.contents) {
                    data = JSON.parse(data.contents);
                }
                
                // Mark proxy as working
                this.proxyHealth.set(proxy, { 
                    working: true, 
                    lastChecked: Date.now(), 
                    failures: 0 
                });
                
                return data;
                
            } catch (error) {
                // Mark proxy failure
                const health = this.proxyHealth.get(proxy);
                this.proxyHealth.set(proxy, {
                    working: health.failures >= 1 ? false : true,
                    lastChecked: Date.now(),
                    failures: health.failures + 1
                });
                
                this.log(`CORS proxy ${proxy} failed: ${error.message}`, 'debug');
                continue;
            }
        }

        throw new Error('All CORS proxies failed');
    }

    async jsonpFetch(url) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            const script = document.createElement('script');
            
            // Set up callback
            window[callbackName] = function(data) {
                delete window[callbackName];
                document.body.removeChild(script);
                resolve(data);
            };
            
            // Set up error handling
            script.onerror = function() {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('JSONP request failed'));
            };
            
            // Set up timeout
            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    if (script.parentNode) {
                        document.body.removeChild(script);
                    }
                    reject(new Error('JSONP request timeout'));
                }
            }, this.requestTimeout);
            
            // Make request
            script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
            document.body.appendChild(script);
        });
    }

    isValidStreamResponse(response) {
        return response && 
               (response.streams || response.results) && 
               Array.isArray(response.streams || response.results);
    }

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

    validateStream(stream) {
        if (!stream.url && !stream.infoHash) {
            return false;
        }

        if (stream.url) {
            try {
                new URL(stream.url);
            } catch {
                if (!stream.url.startsWith('magnet:')) {
                    return false;
                }
            }
        }

        return true;
    }

    deduplicateAndSortStreams(streams) {
        const uniqueStreams = streams.filter((stream, index, self) => {
            return index === self.findIndex(s => {
                if (stream.url && s.url && stream.url === s.url) return true;
                if (stream.infoHash && s.infoHash && stream.infoHash === s.infoHash) return true;
                if (stream.title === s.title && 
                    stream.quality === s.quality && 
                    stream.addon === s.addon) return true;
                return false;
            });
        });

        return uniqueStreams.sort((a, b) => {
            const qualityDiff = this.getQualityScore(b.quality) - this.getQualityScore(a.quality);
            if (qualityDiff !== 0) return qualityDiff;

            const reliabilityDiff = (b.reliability || 0) - (a.reliability || 0);
            if (reliabilityDiff !== 0) return reliabilityDiff;

            const seedersA = parseInt(a.seeders) || 0;
            const seedersB = parseInt(b.seeders) || 0;
            return seedersB - seedersA;
        });
    }

    extractQuality(stream) {
        const text = `${stream.title || ''} ${stream.description || ''} ${stream.name || ''}`.toLowerCase();
        
        const qualityPatterns = [
            { pattern: /\b(4k|2160p|uhd)\b/, quality: '4K' },
            { pattern: /\b(1440p|qhd)\b/, quality: '1440p' },
            { pattern: /\b(1080p|fhd|full\s*hd)\b/, quality: '1080p' },
            { pattern: /\b(720p|hd)\b/, quality: '720p' },
            { pattern: /\b(480p|dvd)\b/, quality: '480p' },
            { pattern: /\b(360p)\b/, quality: '360p' }
        ];

        for (const { pattern, quality } of qualityPatterns) {
            if (pattern.test(text)) {
                return quality;
            }
        }

        return 'Unknown';
    }

    extractSize(stream) {
        const text = `${stream.title || ''} ${stream.description || ''} ${stream.name || ''}`;
        const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB)/i);
        return sizeMatch ? `${sizeMatch[1]}${sizeMatch[2].toUpperCase()}` : null;
    }

    extractSeeders(stream) {
        const text = `${stream.title || ''} ${stream.description || ''} ${stream.name || ''}`;
        const seederMatch = text.match(/(\d+)\s*(?:seeders?|👥|S:)/i);
        return seederMatch ? seederMatch[1] : null;
    }

    extractLanguage(stream) {
        const text = `${stream.title || ''} ${stream.description || ''} ${stream.name || ''}`.toLowerCase();
        
        const languages = {
            'english': 'EN', 'eng': 'EN',
            'spanish': 'ES', 'español': 'ES',
            'french': 'FR', 'français': 'FR',
            'german': 'DE', 'deutsch': 'DE',
            'italian': 'IT', 'italiano': 'IT'
        };

        for (const [lang, code] of Object.entries(languages)) {
            if (text.includes(lang)) {
                return code;
            }
        }

        return null;
    }

    extractSource(stream) {
        if (stream.url) {
            if (stream.url.startsWith('magnet:')) return 'Torrent';
            if (stream.url.includes('.m3u8')) return 'HLS';
            if (stream.url.includes('.mp4')) return 'MP4';
            if (stream.url.includes('.mkv')) return 'MKV';
        }
        
        if (stream.infoHash) return 'Torrent';
        
        return 'Unknown';
    }

    calculateReliability(stream, addon) {
        let score = 50;

        const addonName = addon.name.toLowerCase();
        if (addonName.includes('torrentio')) score += 25;
        else if (addonName.includes('cinemeta')) score += 20;

        if (stream.url && stream.url.startsWith('https://')) score += 10;
        if (this.extractSeeders(stream)) {
            const seeders = parseInt(this.extractSeeders(stream));
            if (seeders > 50) score += 20;
            else if (seeders > 10) score += 10;
            else if (seeders > 0) score += 5;
        }
        if (this.extractSize(stream)) score += 5;
        if (this.extractQuality(stream) !== 'Unknown') score += 10;

        return Math.min(100, Math.max(0, score));
    }

    getQualityScore(quality) {
        const scores = {
            '4K': 4000,
            '1440p': 1440,
            '1080p': 1080,
            '720p': 720,
            '480p': 480,
            '360p': 360,
            'Unknown': 0
        };
        return scores[quality] || 0;
    }

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

    async queryWithImdbFallback(type, tmdbId, season, episode, title) {
        this.log(`Starting query for ${type}:${tmdbId}`, 'info');
        
        let streams = await this.queryStremioAddons(type, tmdbId, season, episode, title);
        
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

    enableDebug() {
        this.debugMode = true;
        localStorage.setItem('crumble_debug', 'true');
        this.log('Debug mode enabled', 'info');
    }

    disableDebug() {
        this.debugMode = false;
        localStorage.removeItem('crumble_debug');
        this.log('Debug mode disabled', 'info');
    }
}

window.StreamScraperV3 = StreamScraperV3;