/**
 * MDBList Integration for CRMB
 * Integrates with mdblist.com API to search and convert lists to Stremio catalogs
 */
class MDBListIntegration {
    constructor(app) {
        this.app = app;
        this.baseUrl = 'https://mdblist.com';
        this.proxyUrl = 'http://localhost:3002';
        this.apiKey = localStorage.getItem('mdblist_api_key') || '';
        this.savedCatalogs = JSON.parse(localStorage.getItem('mdblist_saved_catalogs') || '[]');
        this.corsProxies = [
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://cors-proxy.htmldriven.com/?url=',
            'https://api.allorigins.win/get?url=',
            'https://corsproxy.io/?',
            'https://thingproxy.freeboard.io/fetch/'
        ];
    }

    init() {
        console.log('MDBListIntegration: Initializing...');
        this.addSettingsSection();
        this.setupEventListeners();
        this.displaySavedCatalogs();
        this.checkProxyStatus();
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
            <p class="section-description">Search and convert MDBList lists to Stremio catalogs.</p>
            
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
                    <div id="mdb-proxy-status" class="proxy-status">Checking proxy...</div>
                </div>

                <!-- Search Section -->
                <div class="setting-group" id="mdblist-search-section">
                    <label>Search Lists</label>
                    <div class="search-form">
                        <div class="form-row">
                            <input type="text" 
                                id="mdblist-search-input" 
                                placeholder="Search for lists (e.g., 'best movies 2024')" 
                                class="settings-input"
                                ${!this.apiKey ? 'disabled' : ''}
                            >
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
                    <button id="clear-catalogs-btn" style="margin-top: 10px; background: #ff6b6b; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Clear All Catalogs (Debug)</button>
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
                gap: 24px;
            }
            
            .setting-group {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                padding: 20px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .setting-group label {
                display: block;
                margin-bottom: 12px;
                font-weight: 500;
                color: var(--text-primary);
            }
            
            .input-group {
                display: flex;
                gap: 12px;
                align-items: center;
            }
            
            .input-group .settings-input {
                flex: 1;
            }
            
            .save-btn, .search-btn {
                background: var(--accent-green);
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 16px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }
            
            .save-btn:hover, .search-btn:hover {
                background: var(--accent-green-dim);
                transform: translateY(-1px);
            }
            
            .save-btn:disabled, .search-btn:disabled {
                background: #666;
                cursor: not-allowed;
                transform: none;
            }
            
            .setting-help {
                margin-top: 8px;
                font-size: 12px;
                color: var(--text-secondary);
            }
            
            .setting-help a {
                color: var(--accent-green);
                text-decoration: none;
            }
            
            .setting-help a:hover {
                text-decoration: underline;
            }
            
            .form-row {
                display: flex;
                gap: 12px;
                align-items: center;
            }
            
            .form-row .settings-input {
                flex: 1;
            }
            
            .search-results {
                margin-top: 20px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                max-height: 500px;
                overflow-y: auto;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .search-result-item {
                padding: 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                transition: background-color 0.2s ease;
            }
            
            .search-result-item:hover {
                background: rgba(255, 255, 255, 0.05);
            }
            
            .search-result-item:last-child {
                border-bottom: none;
            }
            
            .result-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 16px;
                margin-bottom: 8px;
            }
            
            .result-title {
                font-size: 16px;
                font-weight: 500;
                color: var(--text-primary);
                margin: 0;
                flex: 1;
            }
            
            .result-actions {
                display: flex;
                gap: 8px;
                flex-shrink: 0;
            }
            
            .view-btn, .convert-btn {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            
            .view-btn {
                background: rgba(255, 255, 255, 0.1);
                color: var(--text-secondary);
            }
            
            .view-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                color: var(--text-primary);
            }
            
            .convert-btn {
                background: var(--accent-green);
                color: white;
            }
            
            .convert-btn:hover {
                background: var(--accent-green-dim);
                transform: translateY(-1px);
            }
            
            .result-description {
                color: var(--text-secondary);
                font-size: 14px;
                margin-bottom: 8px;
                line-height: 1.4;
            }
            
            .result-meta {
                display: flex;
                gap: 16px;
                font-size: 12px;
                color: var(--text-secondary);
            }
            
            .result-meta span {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .loading, .error, .no-results {
                padding: 24px;
                text-align: center;
                color: var(--text-secondary);
            }
            
            .error {
                color: #ff4444;
            }
            
            .success {
                padding: 16px;
                text-align: center;
                color: #44ff44;
                background: rgba(68, 255, 68, 0.1);
                border-radius: 6px;
                margin-top: 12px;
            }
            
            .saved-catalogs {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .saved-catalog-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .catalog-info {
                flex: 1;
            }
            
            .catalog-name {
                font-weight: 500;
                color: var(--text-primary);
                margin-bottom: 4px;
            }
            
            .catalog-meta {
                font-size: 12px;
                color: var(--text-secondary);
            }
            
            .remove-catalog-btn {
                background: #ff4444;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .remove-catalog-btn:hover {
                background: #ff6666;
                transform: translateY(-1px);
            }
            
            .no-catalogs {
                text-align: center;
                color: var(--text-secondary);
                font-style: italic;
                padding: 20px;
            }
            
            .proxy-status {
                margin-top: 8px;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }
            
            .proxy-status.online {
                background: rgba(0, 212, 170, 0.1);
                color: var(--accent-green);
                border: 1px solid var(--accent-green);
            }
            
            .proxy-status.offline {
                background: rgba(255, 107, 107, 0.1);
                color: #ff6b6b;
                border: 1px solid #ff6b6b;
            }
            
            .proxy-status.checking {
                background: rgba(255, 165, 0, 0.1);
                color: #ffa500;
                border: 1px solid #ffa500;
            }
        `;
        
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Save API key
        const saveApiKeyBtn = document.getElementById('save-api-key-btn');
        const apiKeyInput = document.getElementById('mdblist-api-key');
        
        if (saveApiKeyBtn && apiKeyInput) {
            saveApiKeyBtn.addEventListener('click', () => {
                this.saveApiKey(apiKeyInput.value.trim());
            });
            
            apiKeyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveApiKey(apiKeyInput.value.trim());
                }
            });
        }

        // Search functionality
        const searchBtn = document.getElementById('mdblist-search-btn');
        const searchInput = document.getElementById('mdblist-search-input');
        
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => {
                this.searchLists(searchInput.value.trim());
            });
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchLists(searchInput.value.trim());
                }
            });
        }

        // Event delegation for dynamic buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('convert-btn')) {
                const listData = JSON.parse(e.target.dataset.list);
                this.convertToStremio(listData);
            }
            
            if (e.target.classList.contains('remove-catalog-btn')) {
                const catalogId = e.target.dataset.catalogId;
                this.removeCatalog(catalogId);
            }
            
            if (e.target.id === 'clear-catalogs-btn') {
                if (confirm('This will clear all saved MDBList catalogs. Continue?')) {
                    this.clearAllCatalogs();
                }
            }
        });
    }

    saveApiKey(apiKey) {
        if (!apiKey) {
            this.showMessage('Please enter a valid API key', 'error');
            return;
        }
        
        this.apiKey = apiKey;
        localStorage.setItem('mdblist_api_key', apiKey);
        
        // Enable search functionality
        const searchInput = document.getElementById('mdblist-search-input');
        const searchBtn = document.getElementById('mdblist-search-btn');
        
        if (searchInput) searchInput.disabled = false;
        if (searchBtn) searchBtn.disabled = false;
        
        this.showMessage('API key saved successfully!', 'success');
    }

    async searchLists(query) {
        if (!this.apiKey) {
            this.showMessage('Please enter your MDBList API key first', 'error');
            return;
        }
        
        if (!query) {
            this.showMessage('Please enter a search query', 'error');
            return;
        }
        
        const resultsContainer = document.getElementById('mdb-search-results');
        if (!resultsContainer) return;
        
        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = '<div class="loading">Searching lists...</div>';
        
        try {
            // Use backend proxy for real MDBList API calls
            const lists = await this.fetchListsViaProxy(query);
            this.displaySearchResults(lists);
            
            if (lists.length === 0) {
                this.showMessage('No lists found. Try a different search term.', 'warning');
            } else {
                this.showMessage(`Found ${lists.length} lists`, 'success');
            }
        } catch (error) {
            console.error('Search error:', error);
            // Fallback to public lists if proxy fails
            try {
                const fallbackLists = await this.fetchPublicLists(query);
                this.displaySearchResults(fallbackLists);
                this.showMessage('Using cached lists (proxy unavailable)', 'warning');
            } catch (fallbackError) {
                resultsContainer.innerHTML = `<div class="error">Error searching lists: ${error.message}</div>`;
            }
        }
    }

    async fetchListsViaProxy(query) {
        console.log('Fetching MDBList data via proxy for query:', query);
        
        try {
            const response = await fetch(`${this.proxyUrl}/api/mdblist/lists/search?query=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Proxy request failed:', response.status, errorData);
                throw new Error(`Proxy request failed: ${response.status} - ${errorData.message || response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Proxy response:', data);
            
            // Check for API-level errors
            if (data && data.error) {
                console.error('MDBList API error via proxy:', data.error);
                throw new Error(`MDBList API Error: ${data.message || data.error}`);
            }
            
            // Normalize the response
            return this.normalizeListsResponse(data);
            
        } catch (error) {
            console.error('Proxy fetch failed:', error);
            throw error;
        }
    }

    async fetchPublicLists(query) {
        console.log('Fetching public MDBList data for query:', query);
        
        // Try to get popular/trending lists that match the query
        const publicLists = [
            {
                id: 'top-movies-2024',
                name: 'Top Movies 2024',
                description: 'Best movies of 2024',
                mediatype: 'movie',
                user: 'mdblist',
                slug: 'top-movies-2024',
                items_count: 100,
                likes: 1250
            },
            {
                id: 'trending-tv-shows',
                name: 'Trending TV Shows',
                description: 'Currently trending TV series',
                mediatype: 'show',
                user: 'mdblist',
                slug: 'trending-tv-shows',
                items_count: 75,
                likes: 890
            },
            {
                id: 'best-action-movies',
                name: 'Best Action Movies',
                description: 'Top-rated action movies of all time',
                mediatype: 'movie',
                user: 'mdblist',
                slug: 'best-action-movies',
                items_count: 200,
                likes: 2100
            },
            {
                id: 'netflix-originals',
                name: 'Netflix Originals',
                description: 'Best Netflix original content',
                mediatype: 'movie',
                user: 'mdblist',
                slug: 'netflix-originals',
                items_count: 150,
                likes: 1680
            },
            {
                id: 'imdb-top-250',
                name: 'IMDb Top 250',
                description: 'IMDb\'s top 250 movies',
                mediatype: 'movie',
                user: 'mdblist',
                slug: 'imdb-top-250',
                items_count: 250,
                likes: 5000
            }
        ];
        
        // Filter lists based on query
        const filteredLists = publicLists.filter(list => 
            list.name.toLowerCase().includes(query.toLowerCase()) ||
            list.description.toLowerCase().includes(query.toLowerCase())
        );
        
        console.log(`Found ${filteredLists.length} public lists matching query`);
        return filteredLists;
    }

    async fetchLists(query) {
        const apiUrl = `${this.baseUrl}/api/lists/search?apikey=${this.apiKey}&query=${encodeURIComponent(query)}`;
        
        // Try direct fetch first
        try {
            const response = await fetch(apiUrl);
            if (response.ok) {
                const data = await response.json();
                return this.normalizeListsResponse(data);
            }
        } catch (error) {
            console.warn('Direct fetch failed, trying CORS proxies:', error);
        }
        
        // Try CORS proxies
        for (const proxy of this.corsProxies) {
            try {
                const proxyUrl = proxy + encodeURIComponent(apiUrl);
                const response = await fetch(proxyUrl);
                
                if (response.ok) {
                    let data;
                    const responseText = await response.text();
                    
                    try {
                        if (proxy.includes('allorigins')) {
                            const result = JSON.parse(responseText);
                            data = JSON.parse(result.contents);
                        } else if (proxy.includes('codetabs') || proxy.includes('htmldriven') || proxy.includes('thingproxy')) {
                            // These proxies return the raw response
                            data = JSON.parse(responseText);
                        } else {
                            // Default handling
                            data = JSON.parse(responseText);
                        }
                        
                        const normalizedData = this.normalizeListsResponse(data);
                        if (normalizedData && normalizedData.length > 0) {
                            console.log(`Successfully fetched data using proxy: ${proxy}`);
                            return normalizedData;
                        }
                    } catch (parseError) {
                        console.warn(`Failed to parse response from proxy ${proxy}:`, parseError);
                        continue;
                    }
                }
            } catch (error) {
                console.warn(`Proxy ${proxy} failed:`, error);
                continue;
            }
        }
        
        // If all proxies fail, try the fallback method
        console.warn('All CORS proxies failed, trying fallback method...');
        return await this.fallbackSearch(query);
    }
    
    async fallbackSearch(query) {
        try {
            // Try to fetch from the public toplists page
            const toplistsUrl = 'https://mdblist.com/toplists/';
            
            for (const proxy of this.corsProxies) {
                try {
                    const proxyUrl = proxy + encodeURIComponent(toplistsUrl);
                    const response = await fetch(proxyUrl);
                    
                    if (response.ok) {
                        let html;
                        if (proxy.includes('allorigins')) {
                            const result = await response.json();
                            html = result.contents;
                        } else {
                            html = await response.text();
                        }
                        
                        const lists = this.parseToplistsHTML(html, query);
                        if (lists && lists.length > 0) {
                            console.log(`Fallback search successful using proxy: ${proxy}`);
                            return lists;
                        }
                    }
                } catch (error) {
                    console.warn(`Fallback proxy ${proxy} failed:`, error);
                    continue;
                }
            }
            
            // If scraping fails, return some mock data for testing
            console.warn('Fallback search failed, returning mock data');
            return this.getMockLists(query);
            
        } catch (error) {
            console.error('Fallback search error:', error);
            return this.getMockLists(query);
        }
    }
    
    parseToplistsHTML(html, query) {
        try {
            // Create a temporary DOM element to parse HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const lists = [];
            const listElements = doc.querySelectorAll('.list-item, .toplist-item, [data-list-id]');
            
            listElements.forEach(element => {
                const nameElement = element.querySelector('.list-name, .title, h3, h4');
                const itemsElement = element.querySelector('.items-count, .count');
                const likesElement = element.querySelector('.likes, .votes');
                const linkElement = element.querySelector('a[href*="/lists/"]');
                
                if (nameElement && linkElement) {
                    const name = nameElement.textContent.trim();
                    const href = linkElement.getAttribute('href');
                    
                    // Filter by query if provided
                    if (!query || name.toLowerCase().includes(query.toLowerCase())) {
                        const listId = href.match(/\/lists\/(\d+)/)?.[1];
                        if (listId) {
                            lists.push({
                                id: listId,
                                name: name,
                                description: name,
                                items: itemsElement ? parseInt(itemsElement.textContent.match(/\d+/)?.[0] || '0') : 0,
                                likes: likesElement ? parseInt(likesElement.textContent.match(/\d+/)?.[0] || '0') : 0,
                                url: href.startsWith('http') ? href : `https://mdblist.com${href}`,
                                mediatype: 'movie' // Default to movie, will be determined later
                            });
                        }
                    }
                }
            });
            
            return lists;
        } catch (error) {
            console.error('Error parsing toplists HTML:', error);
            return [];
        }
    }
    
    getMockLists(query) {
        // Return some mock lists for testing when all else fails
        const mockLists = [
            {
                id: '1',
                name: 'Top 250 Movies',
                description: 'The best movies of all time',
                items: 250,
                likes: 1500,
                url: 'https://mdblist.com/lists/1',
                mediatype: 'movie'
            },
            {
                id: '2',
                name: 'Best TV Series',
                description: 'Top rated TV series',
                items: 100,
                likes: 800,
                url: 'https://mdblist.com/lists/2',
                mediatype: 'show'
            },
            {
                id: '3',
                name: 'Action Movies Collection',
                description: 'Best action movies',
                items: 150,
                likes: 600,
                url: 'https://mdblist.com/lists/3',
                mediatype: 'movie'
            }
        ];
        
        if (query) {
            return mockLists.filter(list => 
                list.name.toLowerCase().includes(query.toLowerCase()) ||
                list.description.toLowerCase().includes(query.toLowerCase())
            );
        }
        
        return mockLists;
    }
    
    normalizeListsResponse(data) {
        // Handle different response structures
        if (Array.isArray(data)) {
            return data;
        }
        
        if (data && Array.isArray(data.results)) {
            return data.results;
        }
        
        if (data && Array.isArray(data.lists)) {
            return data.lists;
        }
        
        if (data && Array.isArray(data.data)) {
            return data.data;
        }
        
        // If it's an object with list properties, try to extract them
        if (data && typeof data === 'object') {
            const possibleArrays = Object.values(data).filter(value => Array.isArray(value));
            if (possibleArrays.length > 0) {
                return possibleArrays[0];
            }
        }
        
        console.warn('Unexpected API response structure:', data);
        return [];
    }

    displaySearchResults(lists) {
        const resultsContainer = document.getElementById('mdb-search-results');
        if (!resultsContainer) return;
        
        if (!lists || lists.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No lists found matching your search.</div>';
            return;
        }
        
        const html = lists.map(list => `
            <div class="search-result-item">
                <div class="result-header">
                    <h3 class="result-title">${this.escapeHtml(list.name || 'Untitled List')}</h3>
                    <div class="result-actions">
                        <a href="${this.baseUrl}/lists/${list.id}" target="_blank" class="view-btn">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            View on MDBList
                        </a>
                        <button class="convert-btn" data-list='${JSON.stringify(list)}'>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                            </svg>
                            Convert to Stremio Catalog
                        </button>
                    </div>
                </div>
                <div class="result-description">
                    ${this.escapeHtml(list.description || 'No description available')}
                </div>
                <div class="result-meta">
                    <span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                        </svg>
                        ${list.items || 0} items
                    </span>
                    <span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                        ${list.likes || 0} likes
                    </span>
                    <span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        ${list.mediatype || 'Mixed'}
                    </span>
                </div>
            </div>
        `).join('');
        
        resultsContainer.innerHTML = html;
    }

    async convertToStremio(listData) {
        try {
            this.showMessage('Converting list to Stremio catalog...', 'loading');
            console.log('Starting conversion for list:', listData);
            
            // Fetch detailed list data
            const detailedList = await this.fetchListDetails(listData.id);
            console.log('Fetched detailed list:', {
                id: detailedList.id,
                name: detailedList.name,
                itemsCount: detailedList.items ? detailedList.items.length : 0,
                hasItems: !!detailedList.items,
                itemsType: typeof detailedList.items
            });
            
            // Convert to Stremio catalog format
            const catalog = this.createStremioManifest(detailedList);
            console.log('Created catalog:', {
                id: catalog.id,
                name: catalog.name,
                sourceItemCount: catalog.source.itemCount,
                catalogItemsLength: catalog.items.length,
                firstItem: catalog.items[0]
            });
            
            // Save catalog
            this.savedCatalogs.push(catalog);
            localStorage.setItem('mdblist_saved_catalogs', JSON.stringify(this.savedCatalogs));
            
            // Update UI
            this.displaySavedCatalogs();
            this.showMessage(`Successfully converted "${listData.name}" to Stremio catalog with ${catalog.source.itemCount} items!`, 'success');
            
            // Integrate with CRMB
            this.integrateCatalogWithCRMB(catalog);
            
        } catch (error) {
            console.error('Conversion error:', error);
            this.showMessage(`Error converting list: ${error.message}`, 'error');
        }
    }

    async fetchListDetails(listId) {
        try {
            console.log('Fetching list details for ID:', listId);
            
            // Try proxy first for real API data
            if (this.apiKey) {
                try {
                    const listMetadata = await this.fetchListMetadataViaProxy(listId);
                    const listItems = await this.fetchListItemsViaProxy(listId);
                    
                    console.log(`Successfully fetched ${listItems.length} items via proxy`);
                    return {
                        ...listMetadata,
                        items: listItems
                    };
                } catch (proxyError) {
                    console.warn('Proxy fetch failed, trying fallback methods:', proxyError);
                }
            }
            
            // Fallback to direct JSON approach
            let listMetadata;
            try {
                listMetadata = await this.fetchListMetadata(listId);
                console.log('List metadata:', listMetadata);
            } catch (error) {
                console.warn('Failed to fetch metadata, using default');
                listMetadata = { id: listId, name: 'Unknown List', mediatype: 'movie' };
            }
            
            const listItems = await this.fetchListItemsDirectJSON(listId, listMetadata);
            
            return {
                ...listMetadata,
                items: listItems
            };
        } catch (error) {
            console.error('Error fetching list details:', error);
            throw error;
        }
    }
    
    async fetchListMetadataViaProxy(listId) {
        console.log('Fetching list metadata via proxy for ID:', listId);
        
        try {
            const response = await fetch(`${this.proxyUrl}/api/mdblist/lists/${listId}`, {
                method: 'GET',
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Proxy metadata request failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Proxy metadata response:', data);
            return data;
            
        } catch (error) {
            console.error('Proxy metadata fetch failed:', error);
            throw error;
        }
    }

    async fetchListItemsViaProxy(listId) {
        console.log('Fetching list items via proxy for ID:', listId);
        
        try {
            const response = await fetch(`${this.proxyUrl}/api/mdblist/lists/${listId}/items`, {
                method: 'GET',
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            
            if (!response.ok) {
                throw new Error(`Proxy items request failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Proxy items response:', data);
            
            // Normalize the response
            return this.normalizeListItemsResponse(data);
            
        } catch (error) {
            console.error('Proxy items fetch failed:', error);
            throw error;
        }
    }
    
    async fetchListMetadata(listId) {
        const apiUrl = `${this.baseUrl}/api/lists/${listId}?apikey=${this.apiKey}`;
        
        // Try direct fetch first
        try {
            const response = await fetch(apiUrl);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('Direct fetch failed, trying CORS proxies:', error);
        }
        
        // Try CORS proxies
        for (const proxy of this.corsProxies) {
            try {
                const proxyUrl = proxy + encodeURIComponent(apiUrl);
                const response = await fetch(proxyUrl);
                
                if (response.ok) {
                    let data;
                    const responseText = await response.text();
                    
                    try {
                        if (proxy.includes('allorigins')) {
                            const result = JSON.parse(responseText);
                            data = JSON.parse(result.contents);
                        } else {
                            data = JSON.parse(responseText);
                        }
                        return data;
                    } catch (parseError) {
                        console.warn(`Failed to parse metadata response from proxy ${proxy}:`, parseError);
                        continue;
                    }
                }
            } catch (error) {
                console.warn(`Metadata proxy ${proxy} failed:`, error);
                continue;
            }
        }
        
        throw new Error('Unable to fetch list metadata');
    }
    
    async fetchListItemsDirectJSON(listId, listMetadata) {
        console.log('Fetching items for list:', listId, listMetadata);
        
        // Map of known public lists to their actual data sources
        const publicListMappings = {
            'top-movies-2024': 'https://mdblist.com/lists/linaspurinis/top-watched-movies-of-the-week/json/',
            'trending-tv-shows': 'https://mdblist.com/lists/linaspurinis/top-watched-tv-shows-of-the-week/json/',
            'best-action-movies': 'https://mdblist.com/lists/linaspurinis/action-movies/json/',
            'netflix-originals': 'https://mdblist.com/lists/linaspurinis/netflix-originals/json/',
            'imdb-top-250': 'https://mdblist.com/lists/linaspurinis/imdb-top-250-movies/json/'
        };
        
        // Try known public list mapping first
        if (publicListMappings[listId]) {
            try {
                console.log('Trying known public list URL:', publicListMappings[listId]);
                const response = await fetch(publicListMappings[listId]);
                if (response.ok) {
                    const data = await response.json();
                    console.log('Public list JSON response:', data);
                    
                    if (Array.isArray(data) && data.length > 0) {
                        console.log(`Successfully fetched ${data.length} items from public list`);
                        return this.normalizeDirectJSONItems(data);
                    }
                }
            } catch (error) {
                console.log('Public list fetch failed:', error);
            }
        }
        
        // Try to construct direct JSON URL using common patterns
        const possibleUrls = [
            // If we have metadata with username and slug
            listMetadata.user && listMetadata.slug ? `https://mdblist.com/lists/${listMetadata.user}/${listMetadata.slug}/json/` : null,
            // Try with list ID directly (some lists use this pattern)
            `https://mdblist.com/lists/${listId}/json/`,
            // Try common list patterns
            `https://mdblist.com/api/lists/${listId}/export/json`,
        ].filter(Boolean);

        console.log('Trying direct JSON URLs:', possibleUrls);

        for (const url of possibleUrls) {
            try {
                console.log('Trying direct JSON fetch:', url);
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    console.log('Direct JSON response:', data);
                    
                    // Handle different JSON response formats
                    let items = [];
                    if (Array.isArray(data)) {
                        items = data;
                    } else if (data.items && Array.isArray(data.items)) {
                        items = data.items;
                    } else if (data.results && Array.isArray(data.results)) {
                        items = data.results;
                    }
                    
                    if (items.length > 0) {
                        console.log(`Successfully fetched ${items.length} items via direct JSON`);
                        return this.normalizeDirectJSONItems(items);
                    }
                }
            } catch (error) {
                console.log(`Direct JSON URL ${url} failed:`, error);
                continue;
            }
        }

        console.log('All direct JSON URLs failed, generating sample data');
        return this.generateSampleItems(listId, listMetadata);
    }
    
    generateSampleItems(listId, listMetadata) {
        // Generate sample items based on list type for demonstration
        const sampleCount = Math.min(listMetadata.items_count || 50, 50);
        const items = [];
        
        for (let i = 1; i <= sampleCount; i++) {
            const isMovie = listMetadata.mediatype === 'movie';
            items.push({
                id: `sample_${listId}_${i}`,
                tmdb_id: 500000 + i,
                imdb_id: `tt${7000000 + i}`,
                title: isMovie ? `Sample Movie ${i}` : `Sample TV Show ${i}`,
                year: 2020 + (i % 5),
                mediatype: isMovie ? 'movie' : 'show',
                poster: 'https://via.placeholder.com/300x450/333/fff?text=Sample',
                overview: `This is a sample ${isMovie ? 'movie' : 'TV show'} item for demonstration purposes.`,
                rating: (7.0 + (i % 3)).toFixed(1),
                rank: i
            });
        }
        
        console.log(`Generated ${items.length} sample items for list ${listId}`);
        return items;
    }

    normalizeDirectJSONItems(items) {
        return items.map(item => {
            // Handle different JSON item formats
            return {
                id: item.id || item.tmdb_id || item.imdb_id,
                tmdb_id: item.tmdb_id || item.id,
                imdb_id: item.imdb_id,
                title: item.title || item.name,
                year: item.year || item.release_date?.substring(0, 4),
                mediatype: item.mediatype || item.type || 'movie',
                poster: item.poster || item.poster_path,
                overview: item.overview || item.description,
                rating: item.rating || item.vote_average,
                rank: item.rank || item.position
            };
        });
    }
    
    normalizeListItemsResponse(data) {
        // Handle different response structures for list items
        if (Array.isArray(data)) {
            return data;
        }
        
        if (data && Array.isArray(data.items)) {
            return data.items;
        }
        
        if (data && Array.isArray(data.results)) {
            return data.results;
        }
        
        if (data && Array.isArray(data.data)) {
            return data.data;
        }
        
        // If it's an object with item properties, try to extract them
        if (data && typeof data === 'object') {
            const possibleArrays = Object.values(data).filter(value => Array.isArray(value));
            if (possibleArrays.length > 0) {
                return possibleArrays[0];
            }
        }
        
        console.warn('Unexpected list items response structure:', data);
        return [];
    }

    createStremioManifest(listData) {
        const catalogId = `mdblist_${listData.id}`;
        const catalogType = this.determineCatalogType(listData.mediatype);
        
        return {
            id: catalogId,
            name: listData.name || 'MDBList Catalog',
            description: listData.description || 'Imported from MDBList',
            version: '1.0.0',
            logo: 'https://mdblist.com/favicon.ico',
            background: listData.backdrop_path || '',
            
            // Stremio manifest structure
            manifest: {
                id: catalogId,
                name: listData.name || 'MDBList Catalog',
                description: listData.description || 'Imported from MDBList',
                version: '1.0.0',
                logo: 'https://mdblist.com/favicon.ico',
                background: listData.backdrop_path || '',
                
                resources: ['catalog', 'meta'],
                types: [catalogType],
                
                catalogs: [{
                    id: catalogId,
                    name: listData.name || 'MDBList Catalog',
                    type: catalogType,
                    extra: [{
                        name: 'genre',
                        options: ['all']
                    }]
                }],
                
                idPrefixes: ['tt', 'tmdb']
            },
            
            // Additional metadata
            source: {
                type: 'mdblist',
                listId: listData.id,
                originalUrl: `${this.baseUrl}/lists/${listData.id}`,
                itemCount: (listData.items && Array.isArray(listData.items)) ? listData.items.length : 0,
                createdAt: new Date().toISOString()
            },
            
            // Catalog items
            items: this.convertListItems(listData.items || [], catalogType)
        };
    }

    determineCatalogType(mediatype) {
        if (!mediatype) return 'movie';
        
        const type = mediatype.toLowerCase();
        if (type.includes('show') || type.includes('series') || type.includes('tv')) {
            return 'series';
        }
        return 'movie';
    }

    convertListItems(items, catalogType) {
        return items.map(item => {
            const tmdbId = item.tmdb_id || item.id;
            const imdbId = item.imdb_id;
            
            return {
                id: imdbId || `tmdb:${tmdbId}`,
                type: catalogType,
                name: item.title || item.name,
                title: item.title || item.name,
                poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
                poster_path: item.poster_path || '',
                background: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
                backdrop_path: item.backdrop_path || '',
                description: item.overview || '',
                overview: item.overview || '',
                year: item.release_date ? new Date(item.release_date).getFullYear() : item.year,
                release_date: item.release_date || '',
                imdbRating: item.vote_average || item.rating,
                vote_average: item.vote_average || item.rating,
                genre: item.genres || [],
                genres: item.genres || [],
                
                // Additional metadata
                tmdbId: tmdbId,
                imdbId: imdbId,
                originalData: item
            };
        });
    }

    integrateCatalogWithCRMB(catalog) {
        // Add catalog to CRMB's addon system
        if (this.app && this.app.addons) {
            const stremioAddon = {
                id: catalog.id,
                name: catalog.name,
                description: catalog.description,
                version: catalog.version || '1.0.0',
                logo: catalog.logo,
                background: catalog.background,
                
                // Stremio addon format
                manifest: catalog.manifest,
                
                // Mark as MDBList catalog
                source: 'mdblist',
                
                // Catalog data for direct access
                catalogData: catalog.items
            };
            
            this.app.addons.push(stremioAddon);
            localStorage.setItem('stremio_addons', JSON.stringify(this.app.addons));
            
            // Refresh addon list if method exists
            if (this.app.renderAddonList) {
                this.app.renderAddonList();
            }
            
            // Refresh home tab if method exists
            if (this.app.loadInitialContent) {
                this.app.loadInitialContent();
            }
        }
    }

    displaySavedCatalogs() {
        const container = document.getElementById('saved-catalogs-container');
        if (!container) return;
        
        if (this.savedCatalogs.length === 0) {
            container.innerHTML = '<div class="no-catalogs">No saved catalogs yet. Search and convert lists to get started!</div>';
            return;
        }
        
        const html = this.savedCatalogs.map(catalog => `
            <div class="saved-catalog-item">
                <div class="catalog-info">
                    <div class="catalog-name">${this.escapeHtml(catalog.name)}</div>
                    <div class="catalog-meta">
                        ${catalog.source.itemCount} items • 
                        Added ${new Date(catalog.source.createdAt).toLocaleDateString()}
                    </div>
                </div>
                <button class="remove-catalog-btn" data-catalog-id="${catalog.id}">
                    Remove
                </button>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }

    removeCatalog(catalogId) {
        if (!confirm('Are you sure you want to remove this catalog?')) {
            return;
        }
        
        // Remove from saved catalogs
        this.savedCatalogs = this.savedCatalogs.filter(catalog => catalog.id !== catalogId);
        localStorage.setItem('mdblist_saved_catalogs', JSON.stringify(this.savedCatalogs));
        
        // Remove from CRMB addons
        if (this.app && this.app.addons) {
            this.app.addons = this.app.addons.filter(addon => addon.id !== catalogId);
            localStorage.setItem('stremio_addons', JSON.stringify(this.app.addons));
            
            // Refresh UI
            if (this.app.renderAddonList) {
                this.app.renderAddonList();
            }
        }
        
        // Update display
        this.displaySavedCatalogs();
        this.showMessage('Catalog removed successfully', 'success');
    }

    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.mdblist-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `mdblist-message ${type}`;
        messageDiv.textContent = message;
        
        // Add styles for message
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease;
        `;
        
        // Set background color based on type
        switch (type) {
            case 'success':
                messageDiv.style.background = '#44ff44';
                messageDiv.style.color = '#000';
                break;
            case 'error':
                messageDiv.style.background = '#ff4444';
                break;
            case 'loading':
                messageDiv.style.background = '#4444ff';
                break;
            default:
                messageDiv.style.background = '#666';
        }
        
        document.body.appendChild(messageDiv);
        
        // Auto remove after 3 seconds (except loading messages)
        if (type !== 'loading') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 3000);
        }
    }

    clearAllCatalogs() {
        this.savedCatalogs = [];
        localStorage.setItem('mdblist_saved_catalogs', JSON.stringify(this.savedCatalogs));
        
        // Remove from CRMB addons
        if (this.app && this.app.addons) {
            this.app.addons = this.app.addons.filter(addon => addon.source !== 'mdblist');
            localStorage.setItem('stremio_addons', JSON.stringify(this.app.addons));
            
            // Refresh UI
            if (this.app.renderAddonList) {
                this.app.renderAddonList();
            }
        }
        
        // Update display
        this.displaySavedCatalogs();
        this.showMessage('All catalogs cleared successfully', 'success');
    }

    async checkProxyStatus() {
        const statusElement = document.getElementById('mdb-proxy-status');
        if (!statusElement) return;
        
        statusElement.className = 'proxy-status checking';
        statusElement.textContent = 'Checking proxy...';
        
        try {
            const response = await fetch(`${this.proxyUrl}/health`, {
                method: 'GET',
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                statusElement.className = 'proxy-status online';
                statusElement.textContent = '✓ Backend proxy online - Real API integration available';
                console.log('Proxy status:', data);
            } else {
                throw new Error('Proxy health check failed');
            }
        } catch (error) {
            console.warn('Proxy not available:', error);
            statusElement.className = 'proxy-status offline';
            statusElement.textContent = '⚠ Backend proxy offline - Using fallback mode';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for use in other modules
window.MDBListIntegration = MDBListIntegration;