/**
 * MDBList Integration for CRMB using mdblist-lib
 * Integrates with mdblist.com API to search and convert lists to Stremio catalogs
 */
class MDBListIntegration {
    constructor(app) {
        this.app = app;
        this.apiKey = localStorage.getItem('mdblist_api_key') || '';
        this.savedCatalogs = JSON.parse(localStorage.getItem('mdblist_saved_catalogs') || '[]');
        this.mdbClient = null;
        this.initializeClient();
        
        // Initialize cache management
        this.initializeCacheManagement();
    }

    initializeCacheManagement() {
        // Clear expired cache entries on startup
        this.clearExpiredCache();
        
        // Set up periodic cache cleanup (every hour)
        setInterval(() => {
            this.clearExpiredCache();
        }, 60 * 60 * 1000);
        
        console.log('MDBListIntegration: Cache management initialized');
    }

    async initializeClient() {
        if (this.apiKey && typeof MDBList !== 'undefined') {
            try {
                // Use the browser-compatible MDBList client
                this.mdbClient = new MDBList(this.apiKey);
                console.log('MDBListIntegration: Client initialized successfully');
            } catch (error) {
                console.warn('MDBListIntegration: Failed to initialize client:', error);
                // Fallback to manual implementation if library fails
                this.mdbClient = null;
            }
        }
    }

    init() {
        console.log('MDBListIntegration: Initializing...');
        this.addSettingsSection();
        this.setupEventListeners();
        this.displaySavedCatalogs();
    }

    addSettingsSection() {
        console.log('MDBListIntegration: Adding settings section...');
        const settingsContainer = document.querySelector('#settings-tab .settings-sections');
        if (!settingsContainer) {
            console.warn('MDBListIntegration: Settings sections container not found');
            return;
        }

        const mdblistSection = document.createElement('section');
        mdblistSection.className = 'settings-section';
        mdblistSection.innerHTML = `
            <h2>MDBList Integration</h2>
            <p class="section-description">Search and convert MDBList content to Stremio catalogs using enhanced metadata fetching.</p>
            
            <div class="mdblist-settings">
                <!-- API Key Section -->
                <div class="setting-group">
                    <label for="mdblist-api-key">MDBList API Key</label>
                    <div class="input-group">
                        <input type="password" 
                            id="mdblist-api-key" 
                            placeholder="Enter your MDBList API key" 
                            class="settings-input"
                            value="${this.apiKey}"
                        >
                        <button id="save-api-key-btn" class="save-btn">Save</button>
                    </div>
                    <p class="setting-help">Get your API key from <a href="https://mdblist.com/preferences/" target="_blank">MDBList Preferences</a></p>
                    <div id="mdb-status" class="status-indicator">Ready</div>
                </div>

                <!-- Search Section -->
                <div class="setting-group" id="mdblist-search-section">
                    <label>Search Lists</label>
                    <div class="search-form">
                        <div class="form-row">
                            <input type="text" 
                                id="mdblist-search-input" 
                                placeholder="Search for public lists (e.g., 'Best Movies 2024', 'Top Horror')" 
                                class="settings-input"
                                ${!this.apiKey ? 'disabled' : ''}
                            >
                            <select id="mdblist-search-type" class="settings-select" ${!this.apiKey ? 'disabled' : ''}>
                                <option value="search">Search Lists</option>
                                <option value="top">Top Lists</option>
                            </select>
                            <button id="mdblist-search-btn" class="search-btn" ${!this.apiKey ? 'disabled' : ''}>Search</button>
                        </div>
                    </div>
                    
                    <div id="mdb-search-results" class="search-results" style="display: none;"></div>
                </div>

                <!-- Saved Catalogs Section -->
                <div class="setting-group">
                    <label>Saved Catalogs</label>
                    <div id="saved-catalogs-container" class="saved-catalogs">
                        <!-- Saved catalogs will be displayed here -->
                    </div>
                    <button id="clear-catalogs-btn" class="clear-btn">Clear All Catalogs</button>
                </div>
            </div>
        `;

        settingsContainer.appendChild(mdblistSection);
        this.addStyles();
    }

    addStyles() {
        if (document.getElementById('mdblist-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'mdblist-styles';
        style.textContent = `
            .mdblist-settings {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .setting-group {
                background: rgba(255, 255, 255, 0.05);
                padding: 20px;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .input-group {
                display: flex;
                gap: 10px;
                margin-top: 8px;
            }

            .form-row {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .settings-input, .settings-select {
                flex: 1;
                padding: 10px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                background: rgba(0, 0, 0, 0.3);
                color: white;
            }

            .save-btn, .search-btn, .clear-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s;
            }

            .save-btn {
                background: #4CAF50;
                color: white;
            }

            .search-btn {
                background: #2196F3;
                color: white;
            }

            .clear-btn {
                background: #f44336;
                color: white;
                margin-top: 10px;
            }

            .save-btn:hover { background: #45a049; }
            .search-btn:hover { background: #1976D2; }
            .clear-btn:hover { background: #d32f2f; }

            .status-indicator {
                margin-top: 8px;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 0.9em;
                background: #4CAF50;
                color: white;
                display: inline-block;
            }

            .search-results {
                margin-top: 15px;
                max-height: 400px;
                overflow-y: auto;
            }

            .search-result-item {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .result-info h4 {
                margin: 0 0 5px 0;
                color: white;
            }

            .result-meta {
                color: #ccc;
                font-size: 0.9em;
            }

            .add-catalog-btn {
                background: #FF6B35;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9em;
            }

            .add-catalog-btn:hover {
                background: #e55a2b;
            }

            .saved-catalogs {
                display: grid;
                gap: 10px;
                margin-top: 10px;
            }

            .saved-catalog-item {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .catalog-info h4 {
                margin: 0 0 5px 0;
                color: white;
            }

            .catalog-meta {
                color: #ccc;
                font-size: 0.9em;
            }

            .remove-catalog-btn {
                background: #f44336;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8em;
            }

            .remove-catalog-btn:hover {
                background: #d32f2f;
            }
        `;

        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Save API Key
        document.getElementById('save-api-key-btn')?.addEventListener('click', () => {
            const apiKey = document.getElementById('mdblist-api-key').value.trim();
            this.saveApiKey(apiKey);
        });

        // Search
        document.getElementById('mdblist-search-btn')?.addEventListener('click', () => {
            const query = document.getElementById('mdblist-search-input').value.trim();
            const type = document.getElementById('mdblist-search-type').value;
            if (type === 'top') {
                this.searchTopLists();
            } else if (query) {
                this.searchLists(query);
            }
        });

        // Enter key for search
        document.getElementById('mdblist-search-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                const type = document.getElementById('mdblist-search-type').value;
                if (type === 'top') {
                    this.searchTopLists();
                } else if (query) {
                    this.searchLists(query);
                }
            }
        });

        // Clear catalogs
        document.getElementById('clear-catalogs-btn')?.addEventListener('click', () => {
            this.clearAllCatalogs();
        });
    }

    async saveApiKey(apiKey) {
        this.apiKey = apiKey;
        localStorage.setItem('mdblist_api_key', apiKey);
        
        // Re-initialize client with new API key
        await this.initializeClient();
        
        // Update UI
        const searchInput = document.getElementById('mdblist-search-input');
        const searchBtn = document.getElementById('mdblist-search-btn');
        const searchType = document.getElementById('mdblist-search-type');
        
        if (apiKey) {
            searchInput?.removeAttribute('disabled');
            searchBtn?.removeAttribute('disabled');
            searchType?.removeAttribute('disabled');
            this.showMessage('API key saved successfully!', 'success');
        } else {
            searchInput?.setAttribute('disabled', 'true');
            searchBtn?.setAttribute('disabled', 'true');
            searchType?.setAttribute('disabled', 'true');
            this.showMessage('API key cleared', 'info');
        }
    }

    async searchLists(query) {
        if (!this.apiKey) {
            this.showMessage('Please set your MDBList API key first', 'error');
            return;
        }

        this.showMessage('Searching lists...', 'info');
        
        try {
            let results;
            
            if (this.mdbClient && this.mdbClient.searchLists) {
                // Use the mdblist-lib library
                results = await this.mdbClient.searchLists(query, 20);
                console.log('List search results:', results);
            } else {
                // Fallback to manual API call
                results = await this.fallbackSearchLists(query);
            }

            if (results && results.length > 0) {
                this.displayListResults(results);
                this.showMessage(`Found ${results.length} lists`, 'success');
            } else {
                this.showMessage('No lists found', 'warning');
                document.getElementById('mdb-search-results').style.display = 'none';
            }
        } catch (error) {
            console.error('List search error:', error);
            this.showMessage('List search failed. Please check your API key and try again.', 'error');
        }
    }

    async searchTopLists() {
        if (!this.apiKey) {
            this.showMessage('Please set your MDBList API key first', 'error');
            return;
        }

        this.showMessage('Loading top lists...', 'info');
        
        try {
            let results;
            
            if (this.mdbClient && this.mdbClient.getTopLists) {
                // Use the mdblist-lib library
                results = await this.mdbClient.getTopLists(20);
                console.log('Top lists results:', results);
            } else {
                // Fallback to manual API call
                results = await this.fallbackGetTopLists();
            }

            if (results && results.length > 0) {
                this.displayListResults(results);
                this.showMessage(`Found ${results.length} top lists`, 'success');
            } else {
                this.showMessage('No top lists found', 'warning');
                document.getElementById('mdb-search-results').style.display = 'none';
            }
        } catch (error) {
            console.error('Top lists error:', error);
            this.showMessage('Failed to load top lists. Please check your API key and try again.', 'error');
        }
    }

    async fallbackSearchLists(query) {
        const url = `https://mdblist.com/api/lists/search/?apikey=${this.apiKey}&s=${encodeURIComponent(query)}&limit=20`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    async fallbackGetTopLists() {
        const url = `https://mdblist.com/api/lists/top/?apikey=${this.apiKey}&limit=20`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    displayListResults(results) {
        const container = document.getElementById('mdb-search-results');
        if (!container) return;

        container.innerHTML = '';
        container.style.display = 'block';

        results.forEach(list => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'search-result-item';
            resultDiv.innerHTML = `
                <div class="result-info">
                    <h4>${this.escapeHtml(list.name || list.title || 'Unnamed List')}</h4>
                    <div class="result-meta">
                        ${list.description ? this.escapeHtml(list.description.substring(0, 100)) + (list.description.length > 100 ? '...' : '') : 'No description'}<br>
                        Items: ${list.items || list.item_count || 'Unknown'} • 
                        ${list.likes ? `Likes: ${list.likes} • ` : ''}
                        ${list.user_name ? `By: ${this.escapeHtml(list.user_name)}` : ''}
                        ${list.id ? ` • ID: ${list.id}` : ''}
                    </div>
                </div>
                <button class="add-catalog-btn" onclick="window.mdbListIntegration.addListToCatalog('${list.id}', '${this.escapeHtml(list.name || list.title || 'Unnamed List')}')">
                    Add List to Catalog
                </button>
            `;
            container.appendChild(resultDiv);
        });
    }

    async addListToCatalog(listId, listName) {
        this.showMessage('Adding list to catalog...', 'info');
        
        try {
            // Get list details and items
            let listDetails, listItems;
            
            if (this.mdbClient && this.mdbClient.getListById && this.mdbClient.getListItems) {
                // Use the library
                listDetails = await this.mdbClient.getListById(listId);
                listItems = await this.mdbClient.getListItems(listId, 100, 0);
            } else {
                // Fallback to manual API calls
                listDetails = await this.fallbackGetListDetails(listId);
                listItems = await this.fallbackGetListItems(listId);
            }

            if (!listItems || !listItems.length) {
                throw new Error('Could not fetch list items or list is empty');
            }

            // Create a Stremio manifest for this list
            const catalog = await this.createStremioManifestFromList(listDetails, listItems, listName);
            
            this.saveCatalog(catalog);
            this.integrateCatalogWithCRMB(catalog);
            this.displaySavedCatalogs();
            
            this.showMessage(`List "${listName}" with ${listItems.length} items added to catalogs successfully!`, 'success');
        } catch (error) {
            console.error('Error adding list to catalog:', error);
            this.showMessage('Failed to add list to catalog. Please try again.', 'error');
        }
    }

    async fallbackGetListDetails(listId) {
        const url = `https://mdblist.com/api/lists/${listId}/?apikey=${this.apiKey}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    async fallbackGetListItems(listId) {
        const url = `https://mdblist.com/api/lists/${listId}/items/?apikey=${this.apiKey}&limit=100&offset=0&append_to_response=genre,poster`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    async createStremioManifestFromList(listDetails, listItems, listName) {
        const catalogId = `mdblist_list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Process and enhance list items
        const enhancedItems = [];
        
        for (const item of listItems) {
            // Enhanced poster URL construction
            let posterUrl = null;
            let backdropUrl = null;
            
            // Handle different poster formats from MDBList
            if (item.poster_url && item.poster_url.startsWith('http')) {
                posterUrl = item.poster_url;
            } else if (item.poster && item.poster.startsWith('http')) {
                posterUrl = item.poster;
            } else if (item.poster && item.poster.startsWith('/')) {
                posterUrl = `https://image.tmdb.org/t/p/w500${item.poster}`;
            } else if (item.poster && item.poster.length > 0) {
                posterUrl = `https://image.tmdb.org/t/p/w500/${item.poster}`;
            }
            
            // Handle backdrop URLs
            if (item.backdrop_url && item.backdrop_url.startsWith('http')) {
                backdropUrl = item.backdrop_url;
            } else if (item.backdrop && item.backdrop.startsWith('http')) {
                backdropUrl = item.backdrop;
            } else if (item.backdrop && item.backdrop.startsWith('/')) {
                backdropUrl = `https://image.tmdb.org/t/p/original${item.backdrop}`;
            } else if (item.backdrop && item.backdrop.length > 0) {
                backdropUrl = `https://image.tmdb.org/t/p/original/${item.backdrop}`;
            }
            
            const enhancedItem = {
                id: item.id || item.imdbid || item.tmdbid || `temp_${Math.random().toString(36).substr(2, 9)}`,
                type: item.mediatype || item.type || 'movie',
                title: item.title, // Primary title property for display components
                name: item.title,  // Backup name property
                poster: posterUrl,
                poster_path: item.poster_path || item.poster, // TMDB-style poster path
                background: backdropUrl,
                backdrop_path: item.backdrop_path || item.backdrop, // TMDB-style backdrop path
                description: item.description || item.plot || item.overview,
                overview: item.description || item.plot || item.overview, // TMDB-style overview
                year: item.year || item.release_date?.split('-')[0],
                release_date: item.release_date || item.released,
                first_air_date: item.first_air_date || (item.type === 'show' ? item.release_date : null),
                imdbRating: item.imdbrating || item.imdb_rating,
                vote_average: item.vote_average || item.imdbrating || item.imdb_rating,
                vote_count: item.vote_count,
                genres: item.genre ? (Array.isArray(item.genre) ? item.genre : item.genre.split(',').map(g => g.trim())) : [],
                director: item.director,
                cast: item.actors ? (Array.isArray(item.actors) ? item.actors : item.actors.split(',').map(a => a.trim())) : [],
                runtime: item.runtime,
                released: item.released || item.release_date,
                // Additional metadata
                imdbid: item.imdbid,
                tmdbid: item.tmdbid,
                tvdbid: item.tvdbid,
                traktid: item.traktid
            };
            
            // Enhanced TMDB data fetching with improved poster handling and caching
            if (this.app.tmdbIntegration && this.app.tmdbApiKey && (item.tmdbid || item.imdbid)) {
                try {
                    let tmdbData;
                    let movieId = item.tmdbid;
                    
                    // Convert IMDb ID to TMDB ID if needed
                    if (!movieId && item.imdbid) {
                        movieId = await this.convertImdbToTmdbId(item.imdbid, enhancedItem.type);
                    }
                    
                    if (movieId) {
                        // Use the new enhanced TMDB fetching system
                        const tmdbData = await this.fetchEnhancedTMDBData(movieId, mediaType);
                        
                        if (tmdbData) {
                            // Use the comprehensive enhancement method
                            enhancedItem = await this.enhanceItemWithTMDB(enhancedItem, tmdbData);
                            console.log(`Enhanced ${enhancedItem.title} with comprehensive TMDB data`);
                        } else {
                            console.warn(`Failed to fetch TMDB data for ${enhancedItem.title}`);
                            
                            // Fallback: handle existing poster/backdrop paths
                            if (item.poster && !item.poster.startsWith('http')) {
                                enhancedItem.poster = `https://image.tmdb.org/t/p/w500${item.poster}`;
                                enhancedItem.poster_path = item.poster;
                            } else if (item.poster && item.poster.startsWith('http')) {
                                enhancedItem.poster = item.poster;
                            }
                            
                            if (item.backdrop && !item.backdrop.startsWith('http')) {
                                enhancedItem.background = `https://image.tmdb.org/t/p/original${item.backdrop}`;
                            } else if (item.backdrop && item.backdrop.startsWith('http')) {
                                enhancedItem.background = item.backdrop;
                            }
                        }
                    } else if (item.imdb_id) {
                        // Try to convert IMDb ID to TMDB ID
                        const tmdbId = await this.convertImdbToTmdbId(item.imdb_id, mediaType);
                        if (tmdbId) {
                            const tmdbData = await this.fetchEnhancedTMDBData(tmdbId, mediaType);
                            if (tmdbData) {
                                enhancedItem = await this.enhanceItemWithTMDB(enhancedItem, tmdbData);
                                console.log(`Enhanced ${enhancedItem.title} via IMDb ID conversion`);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to enhance item ${item.title} with TMDB data:`, error);
                }
            } else if (!this.app.tmdbApiKey) {
                console.warn(`TMDB API key not available - skipping enhancement for ${item.title}`);
            }

            // Ensure poster fallback if no TMDB poster was found
            if (!enhancedItem.poster || enhancedItem.poster === '' || enhancedItem.poster === 'null') {
                enhancedItem.poster = '/placeholder-poster.jpg';
                console.log(`Using placeholder poster for: ${enhancedItem.title}`);
            }
            
            enhancedItems.push(enhancedItem);
        }

        // Determine the primary media type
        const mediaTypes = enhancedItems.map(item => item.type);
        const primaryType = mediaTypes.filter(type => type === 'movie').length >= mediaTypes.filter(type => type === 'show').length ? 'movie' : 'show';

        const manifest = {
            id: catalogId,
            version: '1.0.0',
            name: `MDBList: ${listName}`,
            description: listDetails?.description || `Catalog created from MDBList: ${listName}`,
            logo: 'https://mdblist.com/favicon.ico',
            background: enhancedItems[0]?.background,
            types: [primaryType],
            catalogs: [{
                id: catalogId,
                name: listName,
                type: primaryType,
                extra: [{ name: 'skip' }]
            }],
            resources: ['catalog'],
            idPrefixes: ['mdblist'],
            // Store the items data
            items: enhancedItems,
            itemCount: enhancedItems.length,
            mediaType: primaryType,
            listId: listDetails?.id,
            listName: listName
        };

        return manifest;
    }

    saveCatalog(catalog) {
        // Remove existing catalog with same ID
        this.savedCatalogs = this.savedCatalogs.filter(c => c.id !== catalog.id);
        
        // Add new catalog
        this.savedCatalogs.push(catalog);
        
        // Save to localStorage
        localStorage.setItem('mdblist_saved_catalogs', JSON.stringify(this.savedCatalogs));
        
        // Integrate with CRMB
        this.integrateCatalogWithCRMB(catalog);
    }

    integrateCatalogWithCRMB(catalog) {
        if (this.app.catalogManager) {
            this.app.catalogManager.addMDBListCatalog(catalog);
            console.log('MDBListIntegration: Catalog integrated with CRMB:', catalog.name);
        }
    }

    displaySavedCatalogs() {
        const container = document.getElementById('saved-catalogs-container');
        if (!container) return;

        if (this.savedCatalogs.length === 0) {
            container.innerHTML = '<p style="color: #ccc; font-style: italic;">No saved catalogs yet.</p>';
            return;
        }

        container.innerHTML = '';
        this.savedCatalogs.forEach(catalog => {
            const catalogDiv = document.createElement('div');
            catalogDiv.className = 'saved-catalog-item';
            catalogDiv.innerHTML = `
                <div class="catalog-info">
                    <h4>${this.escapeHtml(catalog.name)}</h4>
                    <div class="catalog-meta">
                        Type: ${catalog.types?.[0] || 'Unknown'} • Items: ${catalog.catalogs?.[0]?.metas?.length || 0}
                    </div>
                </div>
                <button class="remove-catalog-btn" onclick="window.mdbListIntegration.removeCatalog('${catalog.id}')">
                    Remove
                </button>
            `;
            container.appendChild(catalogDiv);
        });
    }

    removeCatalog(catalogId) {
        this.savedCatalogs = this.savedCatalogs.filter(c => c.id !== catalogId);
        localStorage.setItem('mdblist_saved_catalogs', JSON.stringify(this.savedCatalogs));
        
        // Remove from CRMB
        if (this.app.catalogManager) {
            this.app.catalogManager.removeMDBListCatalog(catalogId);
        }
        
        this.displaySavedCatalogs();
        this.showMessage('Catalog removed', 'info');
    }

    clearAllCatalogs() {
        if (confirm('Are you sure you want to remove all MDBList catalogs?')) {
            this.savedCatalogs = [];
            localStorage.setItem('mdblist_saved_catalogs', JSON.stringify(this.savedCatalogs));
            
            // Remove all from CRMB
            if (this.app.catalogManager) {
                this.app.catalogManager.clearMDBListCatalogs();
            }
            
            this.displaySavedCatalogs();
            this.showMessage('All catalogs cleared', 'info');
        }
    }

    showMessage(message, type = 'info') {
        const statusEl = document.getElementById('mdb-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status-indicator ${type}`;
            
            // Reset to default after 3 seconds
            setTimeout(() => {
                statusEl.textContent = 'Ready';
                statusEl.className = 'status-indicator';
            }, 3000);
        }
        
        console.log(`MDBListIntegration [${type}]: ${message}`);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Cache metadata with expiration
     */
    cacheMetadata(key, data, ttlMs) {
        const cacheItem = {
            data: data,
            timestamp: Date.now(),
            ttl: ttlMs
        };
        localStorage.setItem(`mdblist_cache_${key}`, JSON.stringify(cacheItem));
    }

    /**
     * Get cached metadata if not expired
     */
    getCachedMetadata(key) {
        try {
            const cached = localStorage.getItem(`mdblist_cache_${key}`);
            if (!cached) return null;
            
            const cacheItem = JSON.parse(cached);
            const now = Date.now();
            
            if (now - cacheItem.timestamp > cacheItem.ttl) {
                // Cache expired, remove it
                localStorage.removeItem(`mdblist_cache_${key}`);
                return null;
            }
            
            return cacheItem.data;
        } catch (error) {
            console.warn('Error reading from cache:', error);
            return null;
        }
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache() {
        const keys = Object.keys(localStorage);
        const now = Date.now();
        
        keys.forEach(key => {
            if (key.startsWith('mdblist_cache_')) {
                try {
                    const cached = localStorage.getItem(key);
                    if (cached) {
                        const cacheItem = JSON.parse(cached);
                        if (now - cacheItem.timestamp > cacheItem.ttl) {
                            localStorage.removeItem(key);
                        }
                    }
                } catch (error) {
                    // Remove corrupted cache entries
                    localStorage.removeItem(key);
                }
            }
        });
    }

    getCacheStatistics() {
        const keys = Object.keys(localStorage);
        let totalEntries = 0;
        let totalSize = 0;
        let expiredEntries = 0;
        const now = Date.now();
        
        keys.forEach(key => {
            if (key.startsWith('mdblist_cache_')) {
                totalEntries++;
                const value = localStorage.getItem(key);
                totalSize += value.length;
                
                try {
                    const data = JSON.parse(value);
                    if (data.expiry && data.expiry < now) {
                        expiredEntries++;
                    }
                } catch (e) {
                    expiredEntries++;
                }
            }
        });
        
        return {
            totalEntries,
            expiredEntries,
            activeEntries: totalEntries - expiredEntries,
            totalSizeKB: Math.round(totalSize / 1024),
            averageSizeKB: totalEntries > 0 ? Math.round(totalSize / totalEntries / 1024) : 0
        };
    }

    /**
     * Enhanced TMDB metadata fetching with comprehensive data
     */
    async fetchEnhancedTMDBData(tmdbId, mediaType) {
        if (!this.app.tmdbApiKey || !tmdbId) return null;
        
        const cacheKey = `tmdb_${mediaType}_${tmdbId}`;
        
        // Check cache first
        let cachedData = this.getMetadataFromCache(cacheKey);
        if (cachedData) {
            console.log(`Using cached TMDB data for ${mediaType} ${tmdbId}`);
            return cachedData;
        }
        
        try {
            // Fetch comprehensive data with all appendable responses
            const appendToResponse = [
                'credits',
                'keywords', 
                'external_ids',
                'videos',
                'images',
                'recommendations',
                'similar',
                'watch/providers'
            ].join(',');
            
            const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${this.app.tmdbApiKey}&language=en-US&append_to_response=${appendToResponse}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`TMDB API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache for 24 hours
            this.cacheMetadata(cacheKey, data, 24 * 60 * 60 * 1000);
            
            console.log(`Fetched enhanced TMDB data for ${mediaType} ${tmdbId}`);
            return data;
            
        } catch (error) {
            console.warn(`Failed to fetch TMDB data for ${mediaType} ${tmdbId}:`, error);
            return null;
        }
    }

    /**
     * Process and enhance item with comprehensive TMDB metadata
     */
    async enhanceItemWithTMDB(item, tmdbData) {
        if (!tmdbData) return item;
        
        const enhancedItem = { ...item };
        const mediaType = item.type === 'show' ? 'tv' : 'movie';
        
        // Basic metadata
        const title = tmdbData.title || tmdbData.name;
        enhancedItem.title = title || enhancedItem.title;
        enhancedItem.name = title || enhancedItem.name;
        enhancedItem.description = tmdbData.overview || enhancedItem.description;
        enhancedItem.overview = tmdbData.overview || enhancedItem.overview;
        enhancedItem.year = tmdbData.release_date?.split('-')[0] || tmdbData.first_air_date?.split('-')[0] || enhancedItem.year;
        
        // Images with multiple sizes
        if (tmdbData.poster_path) {
            enhancedItem.poster_path = tmdbData.poster_path;
            enhancedItem.poster = `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`;
            enhancedItem.poster_original = `https://image.tmdb.org/t/p/original${tmdbData.poster_path}`;
        }
        
        if (tmdbData.backdrop_path) {
            enhancedItem.backdrop_path = tmdbData.backdrop_path;
            enhancedItem.background = `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}`;
            enhancedItem.backdrop = `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}`;
        }
        
        // Ratings and popularity
        enhancedItem.vote_average = tmdbData.vote_average || enhancedItem.vote_average;
        enhancedItem.vote_count = tmdbData.vote_count || enhancedItem.vote_count;
        enhancedItem.popularity = tmdbData.popularity;
        
        // Genres
        enhancedItem.genres = tmdbData.genres?.map(g => g.name) || enhancedItem.genres;
        enhancedItem.genre_ids = tmdbData.genres?.map(g => g.id) || [];
        
        // Runtime/Duration
        enhancedItem.runtime = tmdbData.runtime || tmdbData.episode_run_time?.[0] || enhancedItem.runtime;
        
        // Release information
        enhancedItem.release_date = tmdbData.release_date || tmdbData.first_air_date || enhancedItem.release_date;
        enhancedItem.status = tmdbData.status;
        
        // Additional metadata
        enhancedItem.tagline = tmdbData.tagline;
        enhancedItem.homepage = tmdbData.homepage;
        enhancedItem.original_language = tmdbData.original_language;
        enhancedItem.original_title = tmdbData.original_title || tmdbData.original_name;
        
        // Production information
        enhancedItem.production_companies = tmdbData.production_companies?.map(c => ({
            id: c.id,
            name: c.name,
            logo_path: c.logo_path,
            origin_country: c.origin_country
        }));
        
        enhancedItem.production_countries = tmdbData.production_countries?.map(c => c.name);
        enhancedItem.spoken_languages = tmdbData.spoken_languages?.map(l => l.english_name);
        
        // Cast and crew (from credits)
        if (tmdbData.credits) {
            enhancedItem.cast = tmdbData.credits.cast?.slice(0, 10).map(person => ({
                id: person.id,
                name: person.name,
                character: person.character,
                profile_path: person.profile_path,
                order: person.order
            }));
            
            enhancedItem.crew = tmdbData.credits.crew?.filter(person => 
                ['Director', 'Producer', 'Executive Producer', 'Writer', 'Screenplay'].includes(person.job)
            ).map(person => ({
                id: person.id,
                name: person.name,
                job: person.job,
                department: person.department,
                profile_path: person.profile_path
            }));
            
            // Extract key personnel
            const directors = tmdbData.credits.crew?.filter(p => p.job === 'Director').map(p => p.name);
            const writers = tmdbData.credits.crew?.filter(p => ['Writer', 'Screenplay'].includes(p.job)).map(p => p.name);
            
            enhancedItem.directors = directors;
            enhancedItem.writers = writers;
        }
        
        // Keywords
        if (tmdbData.keywords) {
            const keywordList = tmdbData.keywords.keywords || tmdbData.keywords.results || [];
            enhancedItem.keywords = keywordList.map(k => k.name);
        }
        
        // External IDs
        if (tmdbData.external_ids) {
            enhancedItem.external_ids = tmdbData.external_ids;
            enhancedItem.imdb_id = tmdbData.external_ids.imdb_id;
        }
        
        // Videos (trailers, teasers)
        if (tmdbData.videos?.results) {
            const trailers = tmdbData.videos.results.filter(v => 
                v.type === 'Trailer' && v.site === 'YouTube'
            ).slice(0, 3);
            
            enhancedItem.trailers = trailers.map(t => ({
                key: t.key,
                name: t.name,
                site: t.site,
                type: t.type,
                url: `https://www.youtube.com/watch?v=${t.key}`
            }));
        }
        
        // Watch providers
        if (tmdbData['watch/providers']?.results?.US) {
            const providers = tmdbData['watch/providers'].results.US;
            enhancedItem.watch_providers = {
                flatrate: providers.flatrate?.map(p => p.provider_name),
                rent: providers.rent?.map(p => p.provider_name),
                buy: providers.buy?.map(p => p.provider_name)
            };
        }
        
        // TV Show specific data
        if (mediaType === 'tv' && tmdbData.number_of_seasons) {
            enhancedItem.number_of_seasons = tmdbData.number_of_seasons;
            enhancedItem.number_of_episodes = tmdbData.number_of_episodes;
            enhancedItem.episode_run_time = tmdbData.episode_run_time;
            enhancedItem.in_production = tmdbData.in_production;
            enhancedItem.last_air_date = tmdbData.last_air_date;
            enhancedItem.next_episode_to_air = tmdbData.next_episode_to_air;
        }
        
        // Movie specific data
        if (mediaType === 'movie') {
            enhancedItem.budget = tmdbData.budget;
            enhancedItem.revenue = tmdbData.revenue;
            enhancedItem.belongs_to_collection = tmdbData.belongs_to_collection;
        }
        
        return enhancedItem;
    }

    /**
     * Convert IMDb ID to TMDB ID
     */
    async convertImdbToTmdbId(imdbId, mediaType) {
        if (!this.app.tmdbApiKey || !imdbId) return null;
        
        const cacheKey = `imdb_to_tmdb_${imdbId}`;
        const cached = this.getMetadataFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${this.app.tmdbApiKey}&external_source=imdb_id`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                let tmdbId = null;
                
                if (mediaType === 'movie' && data.movie_results?.length > 0) {
                    tmdbId = data.movie_results[0].id;
                } else if (mediaType === 'show' && data.tv_results?.length > 0) {
                    tmdbId = data.tv_results[0].id;
                }
                
                if (tmdbId) {
                    // Cache for 7 days
                    this.cacheMetadata(cacheKey, tmdbId, 7 * 24 * 60 * 60 * 1000);
                }
                
                return tmdbId;
            }
        } catch (error) {
            console.warn(`Failed to convert IMDb ID ${imdbId} to TMDB ID:`, error);
        }
        
        return null;
    }

    // Test method to verify TMDB poster fetching
    async testTmdbPosterFetch(movieId = 550, mediaType = 'movie') {
        try {
            console.log(`Testing TMDB poster fetch for ${mediaType} ID: ${movieId}`);
            
            const url = `https://api.themoviedb.org/3/${mediaType}/${movieId}?api_key=${this.app.tmdbApiKey}&language=en-US`;
            
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                const posterUrl = data.poster_path ? 
                    `https://image.tmdb.org/t/p/w500${data.poster_path}` : null;
                const backdropUrl = data.backdrop_path ? 
                    `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null;
                const title = data.title || data.name;
                const overview = data.overview;
                
                console.log('TMDB Test Results:', {
                    title,
                    overview: overview?.substring(0, 100) + '...',
                    posterUrl,
                    backdropUrl,
                    poster_path: data.poster_path,
                    backdrop_path: data.backdrop_path
                });
                
                return {
                    success: true,
                    data: { title, overview, posterUrl, backdropUrl }
                };
            } else {
                console.error(`TMDB API test failed: ${response.status}`);
                return { success: false, error: `API returned ${response.status}` };
            }
        } catch (error) {
            console.error('TMDB test error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Make it globally available
window.MDBListIntegration = MDBListIntegration;