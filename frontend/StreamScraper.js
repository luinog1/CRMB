// Enhanced Stream Scraper with Robust Addon Support
class StreamScraper {
    constructor(app) {
        this.app = app;
        this.requestTimeout = 15000; // 15 seconds
        this.maxConcurrentRequests = 3;
        this.retryAttempts = 2;
        this.cache = new Map();
        this.cacheExpiry = 300000; // 5 minutes
        this.activeRequests = new Set();
        
        // CORS proxy options for addon requests
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://thingproxy.freeboard.io/fetch/'
        ];
        this.currentProxyIndex = 0;
    }

    // Enhanced addon querying with proper error handling and CORS support
    async queryStremioAddons(type, id, season = null, episode = null, title = null) {
        const cacheKey = this.generateCacheKey(type, id, season, episode);
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheExpiry) {
                console.log(`Cache hit for ${cacheKey}`);
                return cached.streams;
            }
            this.cache.delete(cacheKey);
        }

        const enabledAddons = this.app.addons.filter(addon => addon.enabled !== false);
        
        if (enabledAddons.length === 0) {
            console.warn('No enabled addons found');
            return [];
        }

        console.log(`Querying ${enabledAddons.length} addons for ${type}:${id}`);
        
        const streams = [];
        const addonPromises = [];

        // Process addons in batches to avoid overwhelming the browser
        for (let i = 0; i < enabledAddons.length; i += this.maxConcurrentRequests) {
            const batch = enabledAddons.slice(i, i + this.maxConcurrentRequests);
            const batchPromises = batch.map(addon => 
                this.queryAddonWithRetry(addon, type, id, season, episode, title)
            );
            
            try {
                const batchResults = await Promise.allSettled(batchPromises);
                batchResults.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value) {
                        streams.push(...result.value);
                    } else if (result.status === 'rejected') {
                        console.warn(`Addon ${batch[index].name} failed:`, result.reason);
                    }
                });
            } catch (error) {
                console.error('Batch processing error:', error);
            }
        }

        // Cache the results
        this.cache.set(cacheKey, {
            streams: streams,
            timestamp: Date.now()
        });

        console.log(`Found ${streams.length} total streams from ${enabledAddons.length} addons`);
        return this.deduplicateAndSortStreams(streams);
    }

    // Query individual addon with retry logic
    async queryAddonWithRetry(addon, type, id, season, episode, title, attempt = 1) {
        try {
            return await this.queryAddon(addon, type, id, season, episode, title);
        } catch (error) {
            if (attempt < this.retryAttempts) {
                console.log(`Retrying addon ${addon.name}, attempt ${attempt + 1}`);
                await this.delay(1000 * attempt); // Progressive delay
                return this.queryAddonWithRetry(addon, type, id, season, episode, title, attempt + 1);
            }
            throw error;
        }
    }

    // Core addon querying logic with multiple fallback strategies
    async queryAddon(addon, type, id, season, episode, title) {
        const requestId = `${addon.id}-${type}-${id}-${Date.now()}`;
        this.activeRequests.add(requestId);

        try {
            // Build the stream URL according to Stremio protocol
            const streamUrl = this.buildStreamUrl(addon, type, id, season, episode);
            console.log(`Querying addon ${addon.name}: ${streamUrl}`);

            // Try multiple request strategies
            const strategies = [
                () => this.directFetch(streamUrl),
                () => this.corsProxyFetch(streamUrl),
                () => this.fallbackFetch(addon, type, id, season, episode)
            ];

            let lastError;
            for (const strategy of strategies) {
                try {
                    const result = await strategy();
                    if (result && result.streams) {
                        return this.processAddonStreams(result.streams, addon, title);
                    }
                } catch (error) {
                    lastError = error;
                    console.warn(`Strategy failed for ${addon.name}:`, error.message);
                }
            }

            throw lastError || new Error('All strategies failed');

        } finally {
            this.activeRequests.delete(requestId);
        }
    }

    // Build proper Stremio stream URL
    buildStreamUrl(addon, type, id, season, episode) {
        let streamUrl = `${addon.url}/stream/${type}/${id}`;
        
        // Handle TV series with season/episode
        if (type === 'tv' && season && episode) {
            streamUrl += `:${season}:${episode}`;
        }
        
        streamUrl += '.json';
        return streamUrl;
    }

    // Direct fetch without proxy
    async directFetch(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'CRUMBLE/1.0'
                },
                signal: controller.signal,
                mode: 'cors'
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    // CORS proxy fetch with rotation
    async corsProxyFetch(url) {
        const proxy = this.corsProxies[this.currentProxyIndex];
        const proxiedUrl = proxy + encodeURIComponent(url);
        
        try {
            const result = await this.directFetch(proxiedUrl);
            return result;
        } catch (error) {
            // Rotate to next proxy
            this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;
            throw error;
        }
    }

    // Fallback fetch using alternative endpoints
    async fallbackFetch(addon, type, id, season, episode) {
        // Try alternative endpoints that some addons support
        const alternativeEndpoints = [
            `/stream/${type}/${id}`,
            `/streams/${type}/${id}`,
            `/api/stream/${type}/${id}`
        ];

        for (const endpoint of alternativeEndpoints) {
            try {
                let url = addon.url + endpoint;
                if (type === 'tv' && season && episode) {
                    url += `:${season}:${episode}`;
                }
                url += '.json';

                const result = await this.directFetch(url);
                if (result && result.streams) {
                    return result;
                }
            } catch (error) {
                continue; // Try next endpoint
            }
        }

        throw new Error('All fallback endpoints failed');
    }

    // Process and enhance streams from addon
    processAddonStreams(streams, addon, title) {
        if (!Array.isArray(streams)) {
            console.warn(`Invalid streams format from ${addon.name}`);
            return [];
        }

        return streams.map(stream => ({
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
            timestamp: Date.now()
        }));
    }

    // Enhanced stream deduplication and sorting
    deduplicateAndSortStreams(streams) {
        // Remove duplicates based on URL and title
        const uniqueStreams = streams.filter((stream, index, self) => 
            index === self.findIndex(s => 
                s.url === stream.url || 
                (s.title === stream.title && s.quality === stream.quality)
            )
        );

        // Sort by quality, reliability, and seeders
        return uniqueStreams.sort((a, b) => {
            // Primary: Quality score
            const qualityDiff = this.getQualityScore(b.quality) - this.getQualityScore(a.quality);
            if (qualityDiff !== 0) return qualityDiff;

            // Secondary: Reliability
            const reliabilityDiff = (b.reliability || 0) - (a.reliability || 0);
            if (reliabilityDiff !== 0) return reliabilityDiff;

            // Tertiary: Seeders
            const seedersA = parseInt(a.seeders) || 0;
            const seedersB = parseInt(b.seeders) || 0;
            return seedersB - seedersA;
        });
    }

    // Enhanced quality extraction
    extractQuality(stream) {
        const text = `${stream.title || ''} ${stream.description || ''}`.toLowerCase();
        
        const qualityPatterns = [
            { pattern: /\b4k\b|\b2160p?\b|\buhd\b/, quality: '4K' },
            { pattern: /\b1440p?\b|\bqhd\b/, quality: '1440p' },
            { pattern: /\b1080p?\b|\bfhd\b|\bfull\s*hd\b/, quality: '1080p' },
            { pattern: /\b720p?\b|\bhd\b/, quality: '720p' },
            { pattern: /\b480p?\b/, quality: '480p' },
            { pattern: /\b360p?\b/, quality: '360p' }
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
        const text = `${stream.title || ''} ${stream.description || ''}`;
        const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
        return sizeMatch ? `${sizeMatch[1]}${sizeMatch[2].toUpperCase()}` : null;
    }

    // Enhanced seeders extraction
    extractSeeders(stream) {
        const text = `${stream.title || ''} ${stream.description || ''}`;
        const seederMatch = text.match(/(\d+)\s*(?:seeders?|👥|S:)/i);
        return seederMatch ? seederMatch[1] : null;
    }

    // Enhanced language extraction
    extractLanguage(stream) {
        const text = `${stream.title || ''} ${stream.description || ''}`.toLowerCase();
        
        const languages = {
            'english': 'EN', 'eng': 'EN',
            'spanish': 'ES', 'español': 'ES', 'esp': 'ES',
            'french': 'FR', 'français': 'FR', 'fra': 'FR',
            'german': 'DE', 'deutsch': 'DE', 'ger': 'DE',
            'italian': 'IT', 'italiano': 'IT', 'ita': 'IT',
            'portuguese': 'PT', 'português': 'PT', 'por': 'PT',
            'russian': 'RU', 'русский': 'RU', 'rus': 'RU',
            'japanese': 'JP', '日本語': 'JP', 'jpn': 'JP',
            'korean': 'KR', '한국어': 'KR', 'kor': 'KR',
            'chinese': 'CN', '中文': 'CN', 'chi': 'CN'
        };

        for (const [lang, code] of Object.entries(languages)) {
            if (text.includes(lang)) {
                return code;
            }
        }

        return null;
    }

    // Extract source information
    extractSource(stream) {
        if (stream.url) {
            if (stream.url.includes('magnet:')) return 'Torrent';
            if (stream.url.includes('.m3u8')) return 'HLS';
            if (stream.url.includes('.mp4')) return 'MP4';
            if (stream.url.includes('.mkv')) return 'MKV';
        }
        return 'Unknown';
    }

    // Calculate stream reliability score
    calculateReliability(stream, addon) {
        let score = 50; // Base score

        // Addon reputation
        if (addon.name.toLowerCase().includes('torrentio')) score += 20;
        if (addon.name.toLowerCase().includes('cinemeta')) score += 15;

        // Stream characteristics
        if (stream.url && stream.url.startsWith('https://')) score += 10;
        if (this.extractSeeders(stream)) score += 15;
        if (this.extractSize(stream)) score += 5;
        if (this.extractQuality(stream) !== 'Unknown') score += 10;

        return Math.min(100, score);
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
            'Unknown': 0
        };
        return scores[quality] || 0;
    }

    // Generate cache key
    generateCacheKey(type, id, season, episode) {
        return `${type}_${id}${season ? `_s${season}` : ''}${episode ? `_e${episode}` : ''}`;
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
        console.log('Stream cache cleared');
    }

    // Get cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            activeRequests: this.activeRequests.size,
            currentProxy: this.corsProxies[this.currentProxyIndex]
        };
    }

    // Health check for addons
    async healthCheckAddons() {
        const results = [];
        
        for (const addon of this.app.addons) {
            try {
                const manifestUrl = addon.url + '/manifest.json';
                const startTime = Date.now();
                
                await this.directFetch(manifestUrl);
                
                results.push({
                    addon: addon.name,
                    status: 'healthy',
                    responseTime: Date.now() - startTime
                });
            } catch (error) {
                results.push({
                    addon: addon.name,
                    status: 'unhealthy',
                    error: error.message
                });
            }
        }
        
        return results;
    }

    // Enhanced IMDB ID resolution for better addon compatibility
    async resolveImdbId(type, tmdbId) {
        try {
            const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
            const data = await this.app.fetchFromTMDB(endpoint, {
                append_to_response: 'external_ids'
            });
            
            return data.external_ids?.imdb_id || null;
        } catch (error) {
            console.warn('Failed to resolve IMDB ID:', error);
            return null;
        }
    }

    // Query with IMDB ID fallback
    async queryWithImdbFallback(type, tmdbId, season, episode, title) {
        // First try with TMDB ID
        let streams = await this.queryStremioAddons(type, tmdbId, season, episode, title);
        
        // If no streams found, try with IMDB ID
        if (streams.length === 0) {
            const imdbId = await this.resolveImdbId(type, tmdbId);
            if (imdbId) {
                console.log(`Fallback to IMDB ID: ${imdbId}`);
                streams = await this.queryStremioAddons(type, imdbId, season, episode, title);
            }
        }
        
        return streams;
    }
}

// Make StreamScraper available globally
window.StreamScraper = StreamScraper;