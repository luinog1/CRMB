// CRUMBLE - Main Application Controller
class CrumbleApp {
    constructor() {
        this.currentTab = localStorage.getItem('current_tab') || 'home';
        this.initializeTmdbApiKey();
        this.baseImageUrl = 'https://image.tmdb.org/t/p/w500';
        this.baseBackdropUrl = 'https://image.tmdb.org/t/p/w1280';
        this.addons = JSON.parse(localStorage.getItem('stremio_addons') || '[]');
        this.catalogSettings = JSON.parse(localStorage.getItem('catalog_settings') || JSON.stringify({
            movies: true,
            series: true,
            trending: true,
            popular: true
        }));
        this.playerSettings = JSON.parse(localStorage.getItem('player_settings') || JSON.stringify({
            infuse: true,
            vlc: true,
            outplayer: true
        }));
        
        // Initialize enhanced stream scraper V3
        this.streamScraper = new StreamScraperV3(this);
        
        // Initialize addon diagnostics
        this.addonDiagnostics = new AddonDiagnostics(this);
        
        // Initialize MDBList integration
        this.mdblistIntegration = new MDBListIntegration(this);
        
        // Initialize TMDB integration
        this.tmdbIntegration = new TMDBIntegration(this);
        
        // Initialize catalog manager
        this.catalogManager = new CatalogManager(this);
        
        this.init();
    }

    initializeTmdbApiKey() {
        const defaultKey = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5MGFjYjNhZGY2ZTBhZjkzYjZjMDA1NWVkOGE3MjFhYSIsIm5iZiI6MTc0Njk5MDM2Ny41MzcsInN1YiI6IjY4MjBmNTFmNmU1YmI0ZTEzMDRiNDBmYyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.NSqZb64HIv1UqR4Z_cr5IEJnPysO-3nyJdN1TuktuVw';
        const userKey = localStorage.getItem('user_tmdb_api_key') || '';
        const useDefault = localStorage.getItem('use_default_tmdb') !== 'false';
        
        if (useDefault) {
            this.tmdbApiKey = userKey || defaultKey;
        } else {
            this.tmdbApiKey = userKey;
        }
        
        // Ensure the effective key is stored
        localStorage.setItem('tmdb_api_key', this.tmdbApiKey);
    }

    async init() {
        this.setupEventListeners();
        this.setupModals();
        this.loadSettings();
        
        // Wait for initial content to load before initializing MDBList integration
        await this.loadInitialContent();
        setTimeout(() => {
            this.mdblistIntegration.init();
        }, 500);
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        });

        // Settings form handlers
        this.setupSettingsHandlers();
    }

    setupSettingsHandlers() {
        // TMDB API Key
        const tmdbInput = document.getElementById('tmdb-api-key');
        if (tmdbInput) {
            tmdbInput.value = this.tmdbApiKey !== '90acb3adf6e0af93b6c0055ed8a721aa' ? this.tmdbApiKey : '';
            tmdbInput.addEventListener('change', (e) => {
                const newKey = e.target.value.trim();
                this.tmdbApiKey = newKey || '90acb3adf6e0af93b6c0055ed8a721aa';
                localStorage.setItem('tmdb_api_key', this.tmdbApiKey);
                this.showNotification('API key updated successfully');
            });
        }

        // Catalog toggles
        Object.keys(this.catalogSettings).forEach(key => {
            const toggle = document.getElementById(`toggle-${key}`);
            if (toggle) {
                toggle.checked = this.catalogSettings[key];
                toggle.addEventListener('change', (e) => {
                    this.catalogSettings[key] = e.target.checked;
                    localStorage.setItem('catalog_settings', JSON.stringify(this.catalogSettings));
                    this.refreshHomeContent();
                });
            }
        });

        // Player toggles
        Object.keys(this.playerSettings).forEach(key => {
            const toggle = document.getElementById(`enable-${key}`);
            if (toggle) {
                toggle.checked = this.playerSettings[key];
                toggle.addEventListener('change', (e) => {
                    this.playerSettings[key] = e.target.checked;
                    localStorage.setItem('player_settings', JSON.stringify(this.playerSettings));
                });
            }
        });

        // Add-on management
        const addAddonBtn = document.getElementById('add-addon-btn');
        const addonUrlInput = document.getElementById('addon-url');
        
        if (addAddonBtn && addonUrlInput) {
            addAddonBtn.addEventListener('click', () => {
                const url = addonUrlInput.value.trim();
                if (url) {
                    this.addStremioAddon(url);
                    addonUrlInput.value = '';
                }
            });
        }

        // Cache controls
        const clearCacheBtn = document.getElementById('clear-cache-btn');
        const resetSettingsBtn = document.getElementById('reset-settings-btn');

        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                this.clearCache();
            });
        }

        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => {
                this.resetSettings();
            });
        }
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;
        localStorage.setItem('current_tab', tabName);

        // Load tab-specific content
        switch (tabName) {
            case 'home':
                if (window.homeTab) window.homeTab.loadContent();
                break;
            case 'search':
                if (window.searchTab) window.searchTab.init();
                break;
            case 'library':
                if (window.libraryTab) window.libraryTab.loadContent();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    async loadInitialContent() {
        this.showLoading();
        
        try {
            // Initialize tab controllers
            if (window.HomeTab) {
                window.homeTab = new HomeTab(this);
            }
            if (window.SearchTab) {
                window.searchTab = new SearchTab(this);
            }
            if (window.LibraryTab) {
                window.libraryTab = new LibraryTab(this);
            }
            if (window.SettingsTab) {
                window.settingsTab = new SettingsTab(this);
            }
            if (window.HeroBanner) {
                window.heroBanner = new HeroBanner(this);
            }

            // Restore saved tab or load home by default
            this.switchTab(this.currentTab);
        } catch (error) {
            console.error('Error loading initial content:', error);
            this.showNotification('Error loading content. Please check your connection.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    setupModals() {
        // Stream modal setup
        if (window.StreamListModal) {
            window.streamModal = new StreamListModal(this);
        }
        
        // Media details modal setup
        if (window.MediaDetailsModal) {
            window.mediaDetailsModal = new MediaDetailsModal(this);
        }
    }

    loadSettings() {
        this.renderAddonList();
    }

    renderAddonList() {
        const addonList = document.getElementById('addon-list');
        if (!addonList) return;

        if (this.addons.length === 0) {
            addonList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No add-ons installed</p>';
            return;
        }

        addonList.innerHTML = this.addons.map(addon => `
            <div class="addon-item">
                <div class="addon-info">
                    <h4>${addon.name}</h4>
                    <p>${addon.description || addon.url}</p>
                </div>
                <button class="addon-remove" onclick="app.removeStremioAddon('${addon.id}')">
                    Remove
                </button>
            </div>
        `).join('');
    }

    async addStremioAddon(url) {
        try {
            this.showLoading();
            
            // Validate URL format
            if (!url.includes('/manifest.json')) {
                url = url.endsWith('/') ? url + 'manifest.json' : url + '/manifest.json';
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch add-on manifest');
            }

            const manifest = await response.json();
            
            // Validate manifest structure
            if (!manifest.id || !manifest.name) {
                throw new Error('Invalid add-on manifest');
            }

            // Check if already exists
            if (this.addons.find(addon => addon.id === manifest.id)) {
                this.showNotification('Add-on already installed', 'warning');
                return;
            }

            // Add to list
            const addon = {
                id: manifest.id,
                name: manifest.name,
                description: manifest.description,
                url: url.replace('/manifest.json', ''),
                manifest: manifest
            };

            this.addons.push(addon);
            localStorage.setItem('stremio_addons', JSON.stringify(this.addons));
            
            this.renderAddonList();
            this.showNotification(`Add-on "${manifest.name}" installed successfully`);
        } catch (error) {
            console.error('Error adding add-on:', error);
            this.showNotification('Failed to install add-on. Please check the URL.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    removeStremioAddon(addonId) {
        this.addons = this.addons.filter(addon => addon.id !== addonId);
        localStorage.setItem('stremio_addons', JSON.stringify(this.addons));
        this.renderAddonList();
        this.showNotification('Add-on removed successfully');
    }

    async fetchFromTMDB(endpoint, params = {}) {
        // Try to use TMDB proxy first if available and user has their own API key
        const userApiKey = localStorage.getItem('user_tmdb_api_key');
        if (this.tmdbIntegration && this.tmdbIntegration.isProxyAvailable && userApiKey) {
            try {
                // Build query string for proxy
                const queryParams = new URLSearchParams();
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        queryParams.append(key, value);
                    }
                });
                
                const queryString = queryParams.toString();
                const proxyEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
                
                const response = await fetch(`${this.tmdbIntegration.proxyUrl}/api/tmdb${proxyEndpoint}`, {
                    headers: {
                        'x-tmdb-api-key': userApiKey,
                        'accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    return await response.json();
                }
                
                console.warn('TMDB proxy failed, falling back to direct API');
            } catch (error) {
                console.warn('TMDB proxy error, falling back to direct API:', error);
            }
        }
        
        // Fallback to direct API call
        const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        });

        const headers = {
            'accept': 'application/json'
        };
        
        // Check if the API key is a Bearer token (JWT) or regular API key
        if (this.tmdbApiKey.includes('.')) {
            headers['Authorization'] = `Bearer ${this.tmdbApiKey}`;
        } else {
            url.searchParams.append('api_key', this.tmdbApiKey);
        }

        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        return response.json();
    }
    
    async convertImdbToTmdbId(imdbId, mediaType) {
        try {
            // Use TMDB's find endpoint to convert IMDb ID to TMDB ID
            const findResult = await this.fetchFromTMDB(`/find/${imdbId}`, {
                external_source: 'imdb_id'
            });
            
            // Extract TMDB ID based on media type
            if (mediaType === 'movie' && findResult.movie_results && findResult.movie_results.length > 0) {
                return findResult.movie_results[0].id;
            } else if (mediaType === 'tv' && findResult.tv_results && findResult.tv_results.length > 0) {
                return findResult.tv_results[0].id;
            }
            
            throw new Error(`No TMDB ID found for IMDb ID: ${imdbId}`);
        } catch (error) {
            console.error('Error converting IMDb ID to TMDB ID:', error);
            throw error;
        }
    }

    async queryStremioAddons(type, id, season = null, episode = null, title = null) {
        // Use the enhanced stream scraper
        return await this.streamScraper.queryWithImdbFallback(type, id, season, episode, title);
    }

    getImageUrl(path, size = 'w500') {
        if (!path) return '/placeholder-poster.jpg';
        return `https://image.tmdb.org/t/p/${size}${path}`;
    }

    getBackdropUrl(path) {
        if (!path) return '/placeholder-backdrop.jpg';
        return `https://image.tmdb.org/t/p/w1280${path}`;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.getFullYear();
    }

    formatRuntime(minutes) {
        if (!minutes) return 'Unknown';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    formatRating(rating) {
        return rating ? rating.toFixed(1) : 'N/A';
    }

    refreshHomeContent() {
        if (window.homeTab && this.currentTab === 'home') {
            window.homeTab.loadContent();
        }
    }

    clearCache() {
        // Clear localStorage cache items
        const cacheKeys = Object.keys(localStorage).filter(key => 
            key.startsWith('tmdb_cache_') || key.startsWith('addon_cache_')
        );
        
        cacheKeys.forEach(key => localStorage.removeItem(key));
        
        // Clear stream scraper cache
        if (this.streamScraper) {
            this.streamScraper.clearCache();
        }
        
        this.showNotification('Cache cleared successfully');
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings? This action cannot be undone.')) {
            localStorage.clear();
            location.reload();
        }
    }

    showLoading() {
        document.getElementById('loading-overlay').classList.add('active');
    }

    hideLoading() {
        document.getElementById('loading-overlay').classList.remove('active');
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa00' : 'var(--accent-green)'};
            color: ${type === 'warning' ? 'var(--primary-bg)' : 'white'};
            padding: 16px 24px;
            border-radius: var(--border-radius);
            z-index: 10000;
            font-weight: 500;
            box-shadow: var(--shadow);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    async openMediaDetails(mediaType, id) {
        if (window.mediaDetailsModal) {
            const media = { id, media_type: mediaType };
            window.mediaDetailsModal.show(media, mediaType);
        } else {
            console.error('MediaDetailsModal not available');
            this.showNotification('Media details not available', 'error');
        }
    }

    renderMediaModal(media, mediaType) {
        const modal = document.getElementById('media-modal');
        const detailsContainer = document.getElementById('media-details');

        const title = mediaType === 'movie' ? media.title : media.name;
        const releaseDate = mediaType === 'movie' ? media.release_date : media.first_air_date;
        const runtime = mediaType === 'movie' ? media.runtime : (media.episode_run_time && media.episode_run_time[0]);

        detailsContainer.innerHTML = `
            <img src="${this.getImageUrl(media.poster_path)}" alt="${title}" class="media-poster-large">
            <div class="media-info-detailed">
                <h1>${title}</h1>
                <p class="media-overview-detailed">${media.overview || 'No overview available.'}</p>
                
                <div class="media-meta-detailed">
                    <div class="meta-item">
                        <span class="meta-label">Release Date</span>
                        <span class="meta-value">${this.formatDate(releaseDate)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Rating</span>
                        <span class="meta-value">⭐ ${this.formatRating(media.vote_average)}</span>
                    </div>
                    ${runtime ? `
                        <div class="meta-item">
                            <span class="meta-label">Runtime</span>
                            <span class="meta-value">${this.formatRuntime(runtime)}</span>
                        </div>
                    ` : ''}
                    <div class="meta-item">
                        <span class="meta-label">Status</span>
                        <span class="meta-value">${media.status || 'Unknown'}</span>
                    </div>
                    ${mediaType === 'tv' && media.number_of_seasons ? `
                        <div class="meta-item">
                            <span class="meta-label">Seasons</span>
                            <span class="meta-value">${media.number_of_seasons}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Episodes</span>
                            <span class="meta-value">${media.number_of_episodes}</span>
                        </div>
                    ` : ''}
                </div>

                ${media.genres && media.genres.length > 0 ? `
                    <div class="genre-tags">
                        ${media.genres.map(genre => `<span class="genre-tag">${genre.name}</span>`).join('')}
                    </div>
                ` : ''}

                <div class="hero-actions">
                    <button class="btn-primary" onclick="app.showStreamOptions('${mediaType}', ${media.id})">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="5,3 19,12 5,21"/>
                        </svg>
                        Watch Now
                    </button>
                    <button class="btn-secondary" onclick="app.addToWatchlist('${mediaType}', ${media.id})">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>
                        </svg>
                        Add to Watchlist
                    </button>
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    async showStreamOptions(mediaType, id) {
        try {
            this.showLoading();
            
            // Query Stremio add-ons for streams
            const streams = await this.queryStremioAddons(mediaType, id);
            
            if (!this.streamModal) {
                this.streamModal = new StreamListModal(this);
            }
            
            const title = `Streams for ${mediaType === 'movie' ? 'Movie' : 'TV Show'}`;
            this.streamModal.show(streams, title, (streamUrl) => {
                this.playStream(mediaType, id, streamUrl);
            });
        } catch (error) {
            console.error('Error loading streams:', error);
            this.showNotification('Error loading stream options', 'error');
        } finally {
            this.hideLoading();
        }
    }

    addToWatchlist(mediaType, id) {
        let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
        
        const item = { mediaType, id, addedAt: Date.now() };
        
        if (!watchlist.find(w => w.mediaType === mediaType && w.id === id)) {
            watchlist.push(item);
            localStorage.setItem('watchlist', JSON.stringify(watchlist));
            this.showNotification('Added to watchlist');
            
            // Update library if currently viewing
            if (this.currentTab === 'library' && window.libraryTab) {
                window.libraryTab.loadContent();
            }
        } else {
            this.showNotification('Already in watchlist', 'warning');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CrumbleApp();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.app) {
        window.app.hideLoading();
        window.app.showNotification('An unexpected error occurred', 'error');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.app) {
        window.app.hideLoading();
        window.app.showNotification('An unexpected error occurred', 'error');
    }
});