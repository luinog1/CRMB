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
            const enhancedItem = {
                id: item.id || item.imdbid || item.tmdbid || `temp_${Math.random().toString(36).substr(2, 9)}`,
                type: item.mediatype || item.type || 'movie',
                name: item.title,
                poster: item.poster_url || item.poster,
                background: item.backdrop_url || item.backdrop,
                description: item.description || item.plot || item.overview,
                year: item.year || item.release_date?.split('-')[0],
                imdbRating: item.imdbrating || item.imdb_rating,
                genres: item.genre ? (Array.isArray(item.genre) ? item.genre : item.genre.split(',').map(g => g.trim())) : [],
                director: item.director,
                cast: item.actors ? (Array.isArray(item.actors) ? item.actors : item.actors.split(',').map(a => a.trim())) : [],
                runtime: item.runtime,
                released: item.released || item.release_date,
                // Additional metadata
                imdbid: item.imdbid,
                tmdbid: item.tmdbid,
                tvdbid: item.tvdbid,
                traktid: item.traktid,
                vote_average: item.vote_average,
                vote_count: item.vote_count
            };

            // Try to enhance with TMDB data if available
            if (this.app.tmdbIntegration && (item.tmdbid || item.imdbid)) {
                try {
                    let tmdbData;
                    if (item.tmdbid) {
                        tmdbData = enhancedItem.type === 'show' ? 
                            await this.app.tmdbIntegration.getTVDetails(item.tmdbid) :
                            await this.app.tmdbIntegration.getMovieDetails(item.tmdbid);
                    } else if (item.imdbid) {
                        // Convert IMDb ID to TMDB ID first
                        const tmdbId = await this.app.convertImdbToTmdbId(item.imdbid, enhancedItem.type);
                        if (tmdbId) {
                            tmdbData = enhancedItem.type === 'show' ? 
                                await this.app.tmdbIntegration.getTVDetails(tmdbId) :
                                await this.app.tmdbIntegration.getMovieDetails(tmdbId);
                        }
                    }

                    if (tmdbData) {
                        // Enhance with TMDB data
                        enhancedItem.poster = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : enhancedItem.poster;
                        enhancedItem.background = tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : enhancedItem.background;
                        enhancedItem.description = tmdbData.overview || enhancedItem.description;
                        enhancedItem.year = tmdbData.release_date?.split('-')[0] || tmdbData.first_air_date?.split('-')[0] || enhancedItem.year;
                        enhancedItem.genres = tmdbData.genres?.map(g => g.name) || enhancedItem.genres;
                        enhancedItem.runtime = tmdbData.runtime || tmdbData.episode_run_time?.[0] || enhancedItem.runtime;
                        enhancedItem.vote_average = tmdbData.vote_average || enhancedItem.vote_average;
                        enhancedItem.vote_count = tmdbData.vote_count || enhancedItem.vote_count;
                        enhancedItem.release_date = tmdbData.release_date || tmdbData.first_air_date;
                        
                        // Additional TMDB metadata
                        enhancedItem.tagline = tmdbData.tagline;
                        enhancedItem.status = tmdbData.status;
                        enhancedItem.production_companies = tmdbData.production_companies?.map(c => c.name);
                        enhancedItem.keywords = tmdbData.keywords?.keywords?.map(k => k.name) || tmdbData.keywords?.results?.map(k => k.name);
                        enhancedItem.recommendations = tmdbData.recommendations?.results;
                        enhancedItem.similar = tmdbData.similar?.results;
                        enhancedItem.watch_providers = tmdbData['watch/providers']?.results;
                        enhancedItem.content_rating = tmdbData.content_ratings?.results?.find(r => r.iso_3166_1 === 'US')?.rating;
                        enhancedItem.external_ids = tmdbData.external_ids;
                    }
                } catch (error) {
                    console.warn(`Failed to enhance item ${item.title} with TMDB data:`, error);
                }
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
}

// Make it globally available
window.MDBListIntegration = MDBListIntegration;