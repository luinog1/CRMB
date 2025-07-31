// MDBList Integration Module
class MDBListIntegration {
    constructor(app) {
        this.app = app;
        this.apiKey = localStorage.getItem('mdblist_api_key') || '';
        this.lastUsername = localStorage.getItem('mdblist_username') || '';
        this.lastSlug = localStorage.getItem('mdblist_slug') || '';
        this.baseUrl = 'https://mdblist.com/api';
        this.tmdbImageBase = 'https://image.tmdb.org/t/p/w500';
    }

    init() {
        console.log('MDBListIntegration: Initializing...');
        this.addSettingsSection();
        
        // Set up event listeners after DOM elements are created
        setTimeout(() => {
            this.setupEventListeners();
            this.loadSavedSettings();
            this.displayCatalogSources();
            
            // Display saved catalogs on home screen
            this.displaySavedCatalogsOnHome();
            
            // Auto-load last list if available
            if (this.apiKey && this.lastUsername && this.lastSlug) {
                console.log('MDBListIntegration: Auto-loading saved list');
                this.loadList(this.lastUsername, this.lastSlug);
            }
        }, 100);
        
        console.log('MDBListIntegration: Initialization complete');
    }

    addSettingsSection() {
        console.log('MDBListIntegration: Adding settings section...');
        const settingsContainer = document.querySelector('#settings-tab .settings-sections');
        if (!settingsContainer) {
            console.warn('MDBListIntegration: Settings sections container not found');
            return;
        }
        console.log('MDBListIntegration: Settings container found:', settingsContainer);

        const mdblistSection = document.createElement('section');
        mdblistSection.className = 'settings-section';
        mdblistSection.innerHTML = `
            <h2>MDBList Integration</h2>
            <p class="section-description">Connect your MDBList account to import custom movie and TV show lists.</p>
            
            <div class="mdblist-settings">
                <div class="setting-group">
                    <label for="mdblist-api-key">MDBList API Key</label>
                    <div class="input-group">
                        <input type="password" id="mdblist-api-key" placeholder="Enter your MDBList API key" class="settings-input">
                        <button id="save-mdblist-key" class="save-btn">Save</button>
                    </div>
                    <small class="setting-help">Get your API key from <a href="https://mdblist.com/preferences/" target="_blank">MDBList Preferences</a></small>
                </div>
                
                <div class="setting-group" id="mdblist-loader" style="display: none;">
                    <label>Search & Load Lists</label>
                    
                    <div class="search-type-selector">
                        <div class="radio-group">
                            <label class="radio-label">
                                <input type="radio" name="search-type" value="user-list" checked>
                                <span class="radio-custom"></span>
                                Load Specific List (Username + Slug)
                            </label>
                            <label class="radio-label">
                                <input type="radio" name="search-type" value="search-lists">
                                <span class="radio-custom"></span>
                                Search Lists by Name
                            </label>
                        </div>
                    </div>
                    
                    <div class="mdblist-form">
                        <div id="user-list-form" class="search-form active">
                            <div class="form-row">
                                <input type="text" id="mdblist-username" placeholder="Username" class="settings-input">
                                <input type="text" id="mdblist-slug" placeholder="List slug (e.g., best-horror)" class="settings-input">
                            </div>
                            <button id="load-mdblist" class="load-btn">Load List</button>
                        </div>
                        
                        <div id="search-lists-form" class="search-form">
                            <div class="form-row">
                                <input type="text" id="search-query" placeholder="Search for lists (e.g., 'best movies 2024')" class="settings-input">
                                <select id="search-sort" class="settings-select">
                                    <option value="score">Best Match</option>
                                    <option value="updated">Recently Updated</option>
                                    <option value="created">Newest</option>
                                    <option value="items">Most Items</option>
                                </select>
                            </div>
                            <button id="search-mdblist" class="load-btn">Search Lists</button>
                        </div>
                        
                        <div id="search-results" class="search-results" style="display: none;"></div>
                    </div>
                </div>
                
                <div id="mdblist-status" class="status-message"></div>
            </div>
            
            <div class="setting-group">
                <h3>Catalog Sources</h3>
                <p class="section-description">Manage your saved MDBList catalogs that appear on the home screen.</p>
                <div id="catalog-sources-list" class="catalog-sources-container"></div>
                <button id="test-catalog-display" class="save-btn" style="margin-top: 10px;">Test Catalog Display</button>
                <button id="create-test-catalog" class="save-btn" style="margin-top: 10px; margin-left: 10px;">Create Test Catalog</button>
            </div>
        `;

        // Insert before the External Players section
        const externalPlayersSection = settingsContainer.querySelector('section:last-child');
        if (externalPlayersSection && externalPlayersSection.parentNode === settingsContainer) {
            settingsContainer.insertBefore(mdblistSection, externalPlayersSection);
        } else {
            // Fallback: append to the end if insertion fails
            settingsContainer.appendChild(mdblistSection);
        }
        
        this.addMDBListCSS();
        
        // Set up direct event listeners for the buttons
        setTimeout(() => {
            const saveBtn = document.getElementById('save-mdblist-key');
            const loadBtn = document.getElementById('load-mdblist');
            
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    console.log('MDBListIntegration: Direct save button click');
                    this.saveApiKey();
                });
            }
            
            if (loadBtn) {
                loadBtn.addEventListener('click', () => {
                    console.log('MDBListIntegration: Direct load button click');
                    this.handleLoadList();
                });
            }
        }, 50);
    }

    addMDBListCSS() {
        const style = document.createElement('style');
        style.textContent = `
            .mdblist-settings {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .setting-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .setting-group label {
                font-weight: 500;
                color: var(--text-primary);
                font-size: 14px;
            }
            
            .input-group {
                display: flex;
                gap: 12px;
                align-items: center;
            }
            
            .settings-input {
                flex: 1;
                padding: 12px 16px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: var(--text-primary);
                font-size: 14px;
                transition: all 0.3s ease;
            }
            
            .settings-input:focus {
                outline: none;
                border-color: var(--accent-green);
                background: rgba(255, 255, 255, 0.08);
            }
            
            .save-btn, .load-btn {
                padding: 12px 20px;
                background: var(--accent-green);
                border: none;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                white-space: nowrap;
            }
            
            .save-btn:hover, .load-btn:hover {
                background: var(--accent-green-dim);
                transform: translateY(-1px);
            }
            
            .setting-help {
                color: var(--text-muted);
                font-size: 12px;
                line-height: 1.4;
            }
            
            .setting-help a {
                color: var(--accent-green);
                text-decoration: none;
            }
            
            .setting-help a:hover {
                text-decoration: underline;
            }
            
            .mdblist-form {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .search-type-selector {
                margin-bottom: 20px;
            }
            
            .radio-group {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .radio-label {
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                font-size: 14px;
                color: var(--text-secondary);
                transition: color 0.3s ease;
            }
            
            .radio-label:hover {
                color: var(--text-primary);
            }
            
            .radio-label input[type="radio"] {
                display: none;
            }
            
            .radio-custom {
                width: 18px;
                height: 18px;
                border: 2px solid var(--border-color);
                border-radius: 50%;
                position: relative;
                transition: all 0.3s ease;
            }
            
            .radio-label input[type="radio"]:checked + .radio-custom {
                border-color: var(--accent-green);
                background: var(--accent-green);
            }
            
            .radio-label input[type="radio"]:checked + .radio-custom::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 6px;
                height: 6px;
                background: white;
                border-radius: 50%;
            }
            
            .search-form {
                display: none;
                flex-direction: column;
                gap: 12px;
            }
            
            .search-form.active {
                display: flex;
            }
            
            .settings-select {
                padding: 12px 16px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: var(--text-primary);
                font-size: 14px;
                transition: all 0.3s ease;
                min-width: 150px;
            }
            
            .settings-select:focus {
                outline: none;
                border-color: var(--accent-green);
                background: rgba(255, 255, 255, 0.08);
            }
            
            .settings-select option {
                background: var(--secondary-bg);
                color: var(--text-primary);
            }
            
            .search-results {
                margin-top: 20px;
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.02);
            }
            
            .search-result-item {
                padding: 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 16px;
                transition: background 0.3s ease;
            }
            
            .search-result-item:hover {
                background: rgba(255, 255, 255, 0.05);
            }
            
            .search-result-item:last-child {
                border-bottom: none;
            }
            
            .result-content {
                flex: 1;
                cursor: pointer;
            }
            
            .result-actions {
                display: flex;
                flex-direction: column;
                gap: 8px;
                min-width: 120px;
            }
            
            .load-list-btn, .add-catalog-btn {
                padding: 8px 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                background: rgba(255, 255, 255, 0.05);
                color: var(--text-primary);
                font-size: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                white-space: nowrap;
            }
            
            .load-list-btn:hover {
                background: var(--accent-green);
                border-color: var(--accent-green);
                color: white;
            }
            
            .add-catalog-btn:hover {
                background: var(--accent-blue, #3b82f6);
                border-color: var(--accent-blue, #3b82f6);
                color: white;
            }
            
            .catalog-sources-container {
                margin-top: 16px;
            }
            
            .catalog-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                margin-bottom: 8px;
                transition: background 0.3s ease;
            }
            
            .catalog-item:hover {
                background: rgba(255, 255, 255, 0.05);
            }
            
            .catalog-info {
                flex: 1;
            }
            
            .catalog-name {
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 4px;
            }
            
            .catalog-meta {
                font-size: 12px;
                color: var(--text-muted);
                display: flex;
                gap: 12px;
            }
            
            .catalog-actions {
                display: flex;
                gap: 8px;
            }
            
            .catalog-btn {
                padding: 6px 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                background: rgba(255, 255, 255, 0.05);
                color: var(--text-primary);
                font-size: 11px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .catalog-btn.export:hover {
                background: var(--accent-green);
                border-color: var(--accent-green);
                color: white;
            }
            
            .catalog-btn.delete:hover {
                background: #ef4444;
                border-color: #ef4444;
                color: white;
            }
            
            .no-catalogs {
                text-align: center;
                padding: 24px;
                color: var(--text-muted);
                font-style: italic;
            }
            
            .result-title {
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 4px;
            }
            
            .result-meta {
                font-size: 12px;
                color: var(--text-muted);
                display: flex;
                gap: 12px;
            }
            
            .result-description {
                font-size: 13px;
                color: var(--text-secondary);
                margin-top: 8px;
                line-height: 1.4;
            }
            
            .form-row {
                display: flex;
                gap: 12px;
            }
            
            .status-message {
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                display: none;
            }
            
            .status-message.success {
                background: rgba(16, 185, 129, 0.1);
                border: 1px solid rgba(16, 185, 129, 0.3);
                color: var(--accent-green);
                display: block;
            }
            
            .status-message.error {
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #ef4444;
                display: block;
            }
            
            .status-message.loading {
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.3);
                color: #3b82f6;
                display: block;
            }
            
            @media (max-width: 768px) {
                .form-row {
                    flex-direction: column;
                }
                
                .input-group {
                    flex-direction: column;
                    align-items: stretch;
                }
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        console.log('MDBListIntegration: Setting up event listeners...');
        
        // Click events
        document.addEventListener('click', (e) => {
            console.log('MDBListIntegration: Click detected on:', e.target.id);
            if (e.target.id === 'save-mdblist-key') {
                console.log('MDBListIntegration: Save API key button clicked');
                this.saveApiKey();
            }
            if (e.target.id === 'load-mdblist') {
                console.log('MDBListIntegration: Load list button clicked');
                this.handleLoadList();
            }
            if (e.target.id === 'search-mdblist') {
                console.log('MDBListIntegration: Search lists button clicked');
                this.handleSearchLists();
            }
            // Handle load list button clicks
            if (e.target.classList.contains('load-list-btn')) {
                console.log('MDBListIntegration: Load list button clicked');
                const username = e.target.dataset.username;
                const slug = e.target.dataset.slug;
                console.log('MDBListIntegration: Loading list with username:', username, 'slug:', slug);
                this.loadListFromSearchResult(username, slug);
            }
            // Handle add catalog button clicks
            if (e.target.classList.contains('add-catalog-btn')) {
                const username = e.target.dataset.username;
                const slug = e.target.dataset.slug;
                const name = e.target.dataset.name;
                const description = e.target.dataset.description;
                this.addAsCatalog(username, slug, name, description);
            }
            // Handle search result content clicks (for backward compatibility)
            if (e.target.closest('.result-content')) {
                const resultItem = e.target.closest('.search-result-item');
                const username = resultItem.dataset.username;
                const slug = resultItem.dataset.slug;
                this.loadListFromSearchResult(username, slug);
            }
            // Handle catalog management buttons
            if (e.target.classList.contains('catalog-btn')) {
                const catalogId = e.target.dataset.catalogId;
                if (e.target.classList.contains('export')) {
                    this.exportCatalogAsJSON(catalogId);
                } else if (e.target.classList.contains('delete')) {
                    if (confirm('Are you sure you want to delete this catalog?')) {
                        this.deleteCatalog(catalogId);
                        this.showStatus('Catalog deleted successfully', 'success');
                    }
                }
            }
            // Handle test buttons
            if (e.target.id === 'test-catalog-display') {
                console.log('MDBListIntegration: Manual test catalog display triggered');
                this.displaySavedCatalogsOnHome();
            }
            if (e.target.id === 'create-test-catalog') {
                console.log('MDBListIntegration: Creating test catalog');
                this.createTestCatalog();
            }
        });

        // Radio button changes
        document.addEventListener('change', (e) => {
            if (e.target.name === 'search-type') {
                this.handleSearchTypeChange(e.target.value);
            }
        });

        // Enter key support
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (e.target.id === 'mdblist-api-key') {
                    this.saveApiKey();
                } else if (e.target.id === 'mdblist-username' || e.target.id === 'mdblist-slug') {
                    this.handleLoadList();
                } else if (e.target.id === 'search-query') {
                    this.handleSearchLists();
                }
            }
        });
    }

    loadSavedSettings() {
        const apiKeyInput = document.getElementById('mdblist-api-key');
        const usernameInput = document.getElementById('mdblist-username');
        const slugInput = document.getElementById('mdblist-slug');
        
        if (apiKeyInput) apiKeyInput.value = this.apiKey;
        if (usernameInput) usernameInput.value = this.lastUsername;
        if (slugInput) slugInput.value = this.lastSlug;
        
        // Show loader if API key exists
        if (this.apiKey) {
            const loader = document.getElementById('mdblist-loader');
            if (loader) loader.style.display = 'block';
        }
    }

    saveApiKey() {
        const apiKeyInput = document.getElementById('mdblist-api-key');
        const apiKey = apiKeyInput?.value.trim();
        
        if (!apiKey) {
            this.showStatus('Please enter an API key', 'error');
            return;
        }
        
        this.apiKey = apiKey;
        localStorage.setItem('mdblist_api_key', apiKey);
        
        // Show loader section
        const loader = document.getElementById('mdblist-loader');
        if (loader) loader.style.display = 'block';
        
        this.showStatus('API key saved successfully!', 'success');
    }

    handleSearchTypeChange(searchType) {
        const userListForm = document.getElementById('user-list-form');
        const searchListsForm = document.getElementById('search-lists-form');
        const searchResults = document.getElementById('search-results');
        
        if (searchType === 'user-list') {
            userListForm.classList.add('active');
            searchListsForm.classList.remove('active');
            searchResults.style.display = 'none';
        } else if (searchType === 'search-lists') {
            userListForm.classList.remove('active');
            searchListsForm.classList.add('active');
        }
    }

    async handleSearchLists() {
        console.log('MDBListIntegration: handleSearchLists called');
        const queryInput = document.getElementById('search-query');
        const sortSelect = document.getElementById('search-sort');
        
        console.log('MDBListIntegration: Query input:', queryInput);
        console.log('MDBListIntegration: Sort select:', sortSelect);
        
        if (!queryInput || !sortSelect) {
            console.error('MDBListIntegration: Search input elements not found');
            this.showStatus('Error: Search input elements not found', 'error');
            return;
        }
        
        const query = queryInput.value.trim();
        const sort = sortSelect.value;
        
        console.log('MDBListIntegration: Query value:', query);
        console.log('MDBListIntegration: Sort value:', sort);
        console.log('MDBListIntegration: API key exists:', !!this.apiKey);
        
        if (!query) {
            this.showStatus('Please enter a search query', 'error');
            return;
        }
        
        if (!this.apiKey) {
            this.showStatus('Please save your API key first', 'error');
            return;
        }
        
        await this.searchLists(query, sort);
    }

    async loadListFromSearchResult(username, slug) {
        console.log('MDBListIntegration: loadListFromSearchResult called with:', { username, slug });
        
        if (!username || !slug) {
            console.error('MDBListIntegration: Invalid list data - username:', username, 'slug:', slug);
            this.showStatus('Error: Invalid list data', 'error');
            return;
        }
        
        console.log('MDBListIntegration: Hiding search results and loading list');
        
        // Hide search results
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.style.display = 'none';
            console.log('MDBListIntegration: Search results hidden');
        }
        
        console.log('MDBListIntegration: Calling loadList with:', username, slug);
        await this.loadList(username, slug);
    }

    async addAsCatalog(username, slug, name, description) {
        console.log('MDBListIntegration: Adding as catalog:', { username, slug, name, description });
        
        try {
            // First, fetch the list data to get the items
            const listData = await this.fetchListData(username, slug);
            
            if (!listData || !listData.items) {
                throw new Error('Failed to fetch list data');
            }
            
            // Create catalog object in Stremio format
            const catalog = {
                id: `mdblist_${username}_${slug}`,
                name: name,
                description: description,
                type: 'movie', // Default to movie, could be enhanced to detect type
                extra: [{ name: 'genre' }],
                items: await this.convertToStremioFormat(listData.items),
                source: {
                    type: 'mdblist',
                    username: username,
                    slug: slug,
                    originalName: name,
                    originalDescription: description,
                    itemCount: listData.items.length,
                    createdAt: new Date().toISOString()
                }
            };
            
            // Save catalog to localStorage
            this.saveCatalog(catalog);
            
            this.showStatus(`Successfully added "${name}" as catalog`, 'success');
            
            // Refresh catalog sources display if visible
            this.refreshCatalogSources();
            
            // Display the new catalog on home screen immediately
            this.displaySavedCatalogsOnHome();
            
        } catch (error) {
            console.error('MDBListIntegration: Error adding catalog:', error);
            this.showStatus(`Error adding catalog: ${error.message}`, 'error');
        }
    }

    async fetchListData(username, slug) {
        const url = `https://mdblist.com/api/lists/${username}/${slug}?apikey=${this.apiKey}`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    async convertToStremioFormat(items) {
        const stremioItems = [];
        
        for (const item of items) {
            try {
                // Fetch TMDB data for each item
                const tmdbData = await this.fetchTMDBData(item.id, item.mediatype);
                
                if (tmdbData) {
                    const stremioItem = {
                        id: `tmdb:${item.id}`,
                        type: item.mediatype === 'show' ? 'series' : 'movie',
                        name: tmdbData.title || tmdbData.name,
                        poster: tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : null,
                        background: tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : null,
                        description: tmdbData.overview,
                        releaseInfo: tmdbData.release_date || tmdbData.first_air_date,
                        imdbRating: tmdbData.vote_average,
                        genre: tmdbData.genres ? tmdbData.genres.map(g => g.name) : [],
                        cast: tmdbData.credits ? tmdbData.credits.cast.slice(0, 5).map(c => c.name) : [],
                        director: tmdbData.credits ? tmdbData.credits.crew.find(c => c.job === 'Director')?.name : null,
                        runtime: tmdbData.runtime,
                        year: tmdbData.release_date ? new Date(tmdbData.release_date).getFullYear() : 
                              tmdbData.first_air_date ? new Date(tmdbData.first_air_date).getFullYear() : null
                    };
                    
                    stremioItems.push(stremioItem);
                }
            } catch (error) {
                console.warn(`Failed to fetch TMDB data for item ${item.id}:`, error);
                // Add basic item without TMDB data
                stremioItems.push({
                    id: `tmdb:${item.id}`,
                    type: item.mediatype === 'show' ? 'series' : 'movie',
                    name: item.title || 'Unknown Title',
                    poster: null
                });
            }
        }
        
        return stremioItems;
    }

    saveCatalog(catalog) {
        const savedCatalogs = this.getSavedCatalogs();
        
        // Check if catalog already exists and update it
        const existingIndex = savedCatalogs.findIndex(c => c.id === catalog.id);
        if (existingIndex >= 0) {
            savedCatalogs[existingIndex] = catalog;
        } else {
            savedCatalogs.push(catalog);
        }
        
        localStorage.setItem('mdblist_catalogs', JSON.stringify(savedCatalogs));
    }

    getSavedCatalogs() {
        try {
            const saved = localStorage.getItem('mdblist_catalogs');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading saved catalogs:', error);
            return [];
        }
    }

    deleteCatalog(catalogId) {
        const savedCatalogs = this.getSavedCatalogs();
        const filteredCatalogs = savedCatalogs.filter(c => c.id !== catalogId);
        localStorage.setItem('mdblist_catalogs', JSON.stringify(filteredCatalogs));
        this.refreshCatalogSources();
    }

    refreshCatalogSources() {
        // This will be called to refresh the catalog sources display
        const catalogSourcesContainer = document.getElementById('catalog-sources-list');
        if (catalogSourcesContainer) {
            this.displayCatalogSources();
        }
        
        // Also refresh catalogs on home screen
        this.displaySavedCatalogsOnHome();
    }
    
    displaySavedCatalogsOnHome() {
        console.log('MDBListIntegration: Displaying saved catalogs on home screen');
        
        const homeTab = document.getElementById('home-tab');
        console.log('MDBListIntegration: Home tab found:', !!homeTab);
        
        const contentSections = homeTab?.querySelector('.content-sections');
        console.log('MDBListIntegration: Content sections found:', !!contentSections);
        console.log('MDBListIntegration: Content sections element:', contentSections);
        
        if (!contentSections) {
            console.error('MDBListIntegration: Could not find content sections in home tab');
            // Try alternative selectors
            const alternativeContainer = document.querySelector('.content-sections');
            console.log('MDBListIntegration: Alternative content sections:', alternativeContainer);
            return;
        }
        
        // Remove existing MDBList catalog sections
        const existingSections = contentSections.querySelectorAll('.mdblist-catalog-section');
        console.log('MDBListIntegration: Removing', existingSections.length, 'existing catalog sections');
        existingSections.forEach(section => section.remove());
        
        const savedCatalogs = this.getSavedCatalogs();
        console.log('MDBListIntegration: Found', savedCatalogs.length, 'saved catalogs');
        console.log('MDBListIntegration: Saved catalogs data:', savedCatalogs);
        
        // Check localStorage directly
        const rawData = localStorage.getItem('mdblist_catalogs');
        console.log('MDBListIntegration: Raw localStorage data:', rawData);
        
        if (savedCatalogs.length === 0) {
            console.log('MDBListIntegration: No saved catalogs to display');
            return;
        }
        
        // Display each catalog as a carousel section
        savedCatalogs.forEach((catalog, index) => {
            console.log(`MDBListIntegration: Processing catalog ${index}:`, catalog.name);
            this.createCatalogSection(catalog, contentSections, index);
        });
    }
    
    async createCatalogSection(catalog, contentSections, index) {
        console.log('MDBListIntegration: Creating catalog section for:', catalog.name);
        console.log('MDBListIntegration: Catalog data:', catalog);
        console.log('MDBListIntegration: Content sections element:', contentSections);
        
        if (!catalog || !contentSections) {
            console.error('MDBListIntegration: Invalid catalog or contentSections');
            return;
        }
        
        // Create new section
        const section = document.createElement('section');
        section.className = 'carousel-section mdblist-catalog-section';
        section.id = `mdblist-catalog-${catalog.id}`;
        
        // Create container for CatalogCarousel
        const container = document.createElement('div');
        container.id = `mdblist-catalog-grid-${catalog.id}`;
        section.appendChild(container);
        
        console.log('MDBListIntegration: Created section element:', section);
        
        // Insert sections in order, but after any existing MDBList single list section
        const existingMDBSection = contentSections.querySelector('#mdblist-section');
        console.log('MDBListIntegration: Found existing MDB section:', !!existingMDBSection);
        
        try {
            if (existingMDBSection) {
                // Insert after the single list section
                existingMDBSection.insertAdjacentElement('afterend', section);
                console.log('MDBListIntegration: Inserted section after existing MDB section');
            } else {
                // Insert at the top if no single list section exists
                contentSections.insertBefore(section, contentSections.firstChild);
                console.log('MDBListIntegration: Inserted section at the top');
            }
        } catch (error) {
            console.error('MDBListIntegration: Error inserting section:', error);
            return;
        }
        
        // Verify section was added to DOM
        const addedSection = document.getElementById(`mdblist-catalog-${catalog.id}`);
        console.log('MDBListIntegration: Section added to DOM:', !!addedSection);
        
        // Use CatalogCarousel to render items
        if (catalog.items && catalog.items.length > 0) {
            console.log(`MDBListIntegration: Rendering carousel with ${catalog.items.length} items`);
            const catalogCarousel = new CatalogCarousel(this.app);
            catalogCarousel.render(container, catalog.items, 'movie', `📋 ${catalog.name}`);
        } else {
            console.error('MDBListIntegration: No items to display in catalog');
            console.log('Catalog items:', catalog.items);
        }
    }

    displayCatalogSources() {
        const catalogSourcesContainer = document.getElementById('catalog-sources-list');
        if (!catalogSourcesContainer) return;
        
        const savedCatalogs = this.getSavedCatalogs();
        
        if (savedCatalogs.length === 0) {
            catalogSourcesContainer.innerHTML = '<div class="no-catalogs">No catalogs saved yet. Search and add lists as catalogs to see them here.</div>';
            return;
        }
        
        const catalogsHTML = savedCatalogs.map(catalog => {
            const createdDate = new Date(catalog.source.createdAt).toLocaleDateString();
            const itemCount = catalog.source.itemCount || catalog.items.length;
            
            return `
                <div class="catalog-item" data-catalog-id="${catalog.id}">
                    <div class="catalog-info">
                        <div class="catalog-name">${catalog.name}</div>
                        <div class="catalog-meta">
                            <span>by ${catalog.source.username}</span>
                            <span>•</span>
                            <span>${itemCount} items</span>
                            <span>•</span>
                            <span>Added ${createdDate}</span>
                        </div>
                    </div>
                    <div class="catalog-actions">
                        <button class="catalog-btn export" data-catalog-id="${catalog.id}">Export JSON</button>
                        <button class="catalog-btn delete" data-catalog-id="${catalog.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
        
        catalogSourcesContainer.innerHTML = catalogsHTML;
    }

    exportCatalogAsJSON(catalogId) {
        const savedCatalogs = this.getSavedCatalogs();
        const catalog = savedCatalogs.find(c => c.id === catalogId);
        
        if (!catalog) {
            this.showStatus('Catalog not found', 'error');
            return;
        }
        
        // Create Stremio-compatible manifest
        const stremioManifest = {
            id: catalog.id,
            version: '1.0.0',
            name: catalog.name,
            description: catalog.description,
            logo: 'https://mdblist.com/favicon.ico',
            background: 'https://mdblist.com/assets/images/bg.jpg',
            types: [catalog.type],
            catalogs: [{
                type: catalog.type,
                id: catalog.id,
                name: catalog.name,
                extra: catalog.extra
            }],
            resources: ['catalog'],
            behaviorHints: {
                configurable: false,
                configurationRequired: false
            },
            // Include the actual catalog data for local use
            catalogData: catalog.items
        };
        
        // Download as JSON file
        const blob = new Blob([JSON.stringify(stremioManifest, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${catalog.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_catalog.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showStatus(`Exported "${catalog.name}" as JSON`, 'success');
    }

    async handleLoadList() {
        console.log('MDBListIntegration: handleLoadList called');
        const usernameInput = document.getElementById('mdblist-username');
        const slugInput = document.getElementById('mdblist-slug');
        
        console.log('MDBListIntegration: Input elements found:', { usernameInput, slugInput });
        
        const username = usernameInput?.value.trim();
        const slug = slugInput?.value.trim();
        
        console.log('MDBListIntegration: Input values:', { username, slug, apiKey: this.apiKey });
        
        if (!username || !slug) {
            this.showStatus('Please enter both username and list slug', 'error');
            return;
        }
        
        if (!this.apiKey) {
            this.showStatus('Please save your API key first', 'error');
            return;
        }
        
        await this.loadList(username, slug);
    }

    async searchLists(query, sort = 'score') {
        this.showStatus('Searching lists...', 'loading');
        
        try {
            const url = `https://mdblist.com/api/lists/search?s=${encodeURIComponent(query)}&sort=${sort}&apikey=${this.apiKey}`;
            console.log('MDBListIntegration: Searching with URL:', url);
            
            // Use CORS proxy
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const searchResults = await response.json();
            
            console.log('MDBListIntegration: Search results received:', searchResults);
            console.log('MDBListIntegration: Search results type:', typeof searchResults);
            console.log('MDBListIntegration: Search results is array:', Array.isArray(searchResults));
            
            if (searchResults.error) {
                throw new Error(searchResults.error);
            }
            
            // Handle different response formats
            let resultsArray = searchResults;
            if (searchResults.results) {
                resultsArray = searchResults.results;
                console.log('MDBListIntegration: Using results property:', resultsArray);
            } else if (searchResults.data) {
                resultsArray = searchResults.data;
                console.log('MDBListIntegration: Using data property:', resultsArray);
            }
            
            console.log('MDBListIntegration: Final results array:', resultsArray);
            console.log('MDBListIntegration: Results array length:', resultsArray?.length);
            
            this.displaySearchResults(resultsArray);
            this.showStatus(`Found ${resultsArray?.length || 0} lists`, 'success');
            
        } catch (error) {
            console.error('MDBListIntegration: Error searching lists:', error);
            this.showStatus(`Error searching lists: ${error.message}`, 'error');
        }
    }

    displaySearchResults(results) {
        console.log('MDBListIntegration: displaySearchResults called with:', results);
        
        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
            const searchResultsContainer = document.getElementById('search-results');
            console.log('MDBListIntegration: Search results container:', searchResultsContainer);
            console.log('MDBListIntegration: Container exists:', !!searchResultsContainer);
            console.log('MDBListIntegration: Container parent:', searchResultsContainer?.parentElement);
            
            if (!searchResultsContainer) {
                console.error('MDBListIntegration: Search results container not found');
                // Try to find it by class name as fallback
                const containerByClass = document.querySelector('.search-results');
                console.log('MDBListIntegration: Container by class:', containerByClass);
                return;
            }
            
            this.renderSearchResults(searchResultsContainer, results);
        }, 100);
    }
    
    renderSearchResults(searchResultsContainer, results) {
        console.log('MDBListIntegration: renderSearchResults called');
        
        // Make the container visible
        searchResultsContainer.style.display = 'block';
        console.log('MDBListIntegration: Container made visible');
        
        if (!results || !Array.isArray(results) || results.length === 0) {
            console.log('MDBListIntegration: No results to display or invalid results format');
            console.log('MDBListIntegration: Results value:', results);
            
            // Add a test result for debugging
            const testHTML = `
                <div class="search-result-item">
                    <div class="result-content">
                        <div class="result-title">Test Debug List</div>
                        <div class="result-description">This is a test list to verify the display functionality.</div>
                        <div class="result-meta">Creator: debug • Items: 100</div>
                    </div>
                    <div class="result-actions">
                        <button class="load-list-btn" data-username="debug" data-slug="test-list">Load List</button>
                        <button class="add-catalog-btn" data-username="debug" data-slug="test-list" data-name="Test Debug List" data-description="Test list">Add as Catalog</button>
                    </div>
                </div>
                <div class="search-result-item">
                    <div class="result-content">
                        <div class="result-title">No lists found</div>
                        <div class="result-description">Try adjusting your search query or sort criteria.</div>
                    </div>
                </div>
                <div class="search-result-item" data-username="test" data-slug="test-list">
                    <div class="result-content">
                        <div class="result-title">Test List (Debug)</div>
                        <div class="result-meta">
                            <span>by test</span>
                            <span>•</span>
                            <span>5 items</span>
                            <span>•</span>
                            <span>Updated Today</span>
                        </div>
                        <div class="result-description">This is a test list for debugging purposes.</div>
                    </div>
                    <div class="result-actions">
                        <button class="load-list-btn" data-username="test" data-slug="test-list">Load List</button>
                        <button class="add-catalog-btn" data-username="test" data-slug="test-list" data-name="Test List" data-description="Test description">Add as Catalog</button>
                    </div>
                </div>
            `;
            
            searchResultsContainer.innerHTML = testHTML;
            searchResultsContainer.style.display = 'block';
            return;
        }
        
        console.log('MDBListIntegration: Processing', results.length, 'results');
        
        const resultsHTML = results.map((list, index) => {
            console.log(`MDBListIntegration: Processing result ${index}:`, list);
            
            // Handle different possible property names
            const username = list.user || list.username || list.owner || 'unknown';
            const slug = list.slug || list.id || 'unknown';
            const name = list.name || list.title || 'Untitled List';
            const itemCount = list.items || list.item_count || list.count || 0;
            const description = list.description || list.desc || 'No description available';
            const updatedDate = list.updated ? new Date(list.updated).toLocaleDateString() : 'Unknown';
            
            console.log(`MDBListIntegration: Extracted data - username: ${username}, slug: ${slug}, name: ${name}`);
            
            const html = `
                <div class="search-result-item" data-username="${username}" data-slug="${slug}">
                    <div class="result-content">
                        <div class="result-title">${name}</div>
                        <div class="result-meta">
                            <span>by ${username}</span>
                            <span>•</span>
                            <span>${itemCount} items</span>
                            <span>•</span>
                            <span>Updated ${updatedDate}</span>
                        </div>
                        <div class="result-description">${description}</div>
                    </div>
                    <div class="result-actions">
                        <button class="load-list-btn" data-username="${username}" data-slug="${slug}">Load List</button>
                        <button class="add-catalog-btn" data-username="${username}" data-slug="${slug}" data-name="${name}" data-description="${description}">Add as Catalog</button>
                    </div>
                </div>
            `;
            console.log(`MDBListIntegration: Generated HTML for result ${index}:`, html);
            return html;
        }).join('');
        
        console.log('MDBListIntegration: Final results HTML:', resultsHTML);
        searchResultsContainer.innerHTML = resultsHTML;
        searchResultsContainer.style.display = 'block';
        console.log('MDBListIntegration: Search results container display set to block');
    }

    async loadList(username, slug) {
        this.showStatus('Loading list...', 'loading');
        
        try {
            // Use CORS proxy to bypass CORS restrictions
            const targetUrl = `${this.baseUrl}/lists/${username}/${slug}?apikey=${this.apiKey}`;
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch list: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data || !data.items || !Array.isArray(data.items)) {
                throw new Error('Invalid list data received');
            }
            
            // Save successful parameters
            this.lastUsername = username;
            this.lastSlug = slug;
            localStorage.setItem('mdblist_username', username);
            localStorage.setItem('mdblist_slug', slug);
            
            // Convert and display the list
            await this.displayListInHomepage(data);
            
            this.showStatus(`Successfully loaded "${data.name || slug}" with ${data.items.length} items`, 'success');
            
        } catch (error) {
            console.error('MDBList error:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        }
    }

    async displayListInHomepage(listData) {
        const homeTab = document.getElementById('home-tab');
        const contentSections = homeTab?.querySelector('.content-sections');
        
        if (!contentSections) {
            console.error('Could not find content sections in home tab');
            return;
        }
        
        // Remove existing MDBList section if it exists
        const existingSection = contentSections.querySelector('#mdblist-section');
        if (existingSection) {
            existingSection.remove();
        }
        
        // Create new section
        const section = document.createElement('section');
        section.className = 'carousel-section';
        section.id = 'mdblist-section';
        
        const listName = listData.name || `${this.lastUsername}/${this.lastSlug}`;
        section.innerHTML = `
            <h2 class="carousel-title">📋 ${listName}</h2>
            <div class="carousel-grid" id="mdblist-grid"></div>
        `;
        
        // Insert at the top of content sections
        contentSections.insertBefore(section, contentSections.firstChild);
        
        // Populate with items
        const grid = section.querySelector('#mdblist-grid');
        await this.populateGrid(grid, listData.items);
    }

    async populateGrid(grid, items) {
        grid.innerHTML = '';
        
        // Limit to first 20 items for performance
        const limitedItems = items.slice(0, 20);
        
        for (const item of limitedItems) {
            const card = await this.createMediaCard(item);
            if (card) {
                grid.appendChild(card);
            }
        }
    }

    async createMediaCard(item) {
        const { tmdbid, imdbid, title, year, mediatype } = item;
        
        if (!tmdbid && !imdbid) {
            console.warn('Item missing both TMDB and IMDB IDs:', item);
            return null;
        }
        
        // Determine media type
        const type = mediatype === 'show' ? 'tv' : 'movie';
        
        // Get poster path
        let posterPath = '';
        if (tmdbid) {
            try {
                const tmdbData = await this.fetchTMDBData(tmdbid, type);
                posterPath = tmdbData?.poster_path || '';
            } catch (error) {
                console.warn('Failed to fetch TMDB data for', tmdbid, error);
            }
        }
        
        const posterUrl = posterPath ? `${this.tmdbImageBase}${posterPath}` : 'placeholder-poster.svg';
        
        // Create card element
        const card = document.createElement('div');
        card.className = 'poster-card';
        card.dataset.id = tmdbid || imdbid;
        card.dataset.type = type;
        
        card.innerHTML = `
            <div class="poster-image">
                <img src="${posterUrl}" alt="${title}" loading="lazy" onerror="this.src='placeholder-poster.svg'">
                <div class="poster-overlay">
                    <div class="poster-actions">
                        <button class="poster-button play-btn" title="Play">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </button>
                        <button class="poster-button info-btn" title="More Info">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            <div class="poster-info">
                <h3 class="poster-title">${title}</h3>
                <div class="poster-metadata">
                    <span class="year">${year || 'N/A'}</span>
                    <span class="type">${type.toUpperCase()}</span>
                </div>
            </div>
        `;
        
        // Add event listeners
        this.attachCardEventListeners(card);
        
        return card;
    }

    async fetchTMDBData(tmdbId, type) {
        const apiKey = '4f5f43495afcc67e9553f6c684a82f84'; // Using the same key as SearchTab
        const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }
        
        return await response.json();
    }

    attachCardEventListeners(card) {
        const playBtn = card.querySelector('.play-btn');
        const infoBtn = card.querySelector('.info-btn');
        
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handlePlay(card.dataset.id, card.dataset.type);
            });
        }
        
        if (infoBtn) {
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleInfo(card.dataset.id, card.dataset.type);
            });
        }
    }

    handlePlay(id, type) {
        console.log(`Playing ${type} with ID: ${id}`);
        // Integrate with existing player functionality
        if (window.streamScraper) {
            window.streamScraper.searchStreams(id, type);
        }
    }

    handleInfo(id, type) {
        console.log(`Showing info for ${type} with ID: ${id}`);
        // Integrate with existing modal functionality
        if (window.mediaDetailsModal) {
            window.mediaDetailsModal.show(id, type);
        }
    }

    createTestCatalog() {
        console.log('MDBListIntegration: Creating test catalog');
        
        const testCatalog = {
            id: 'mdblist_test_catalog_' + Date.now(),
            name: 'Test Catalog',
            description: 'A test catalog for debugging',
            type: 'movie',
            extra: [{ name: 'genre' }],
            items: [
                {
                    id: 278,
                    title: 'The Shawshank Redemption',
                    poster_path: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
                    overview: 'Two imprisoned men bond over a number of years.',
                    release_date: '1994-09-23',
                    vote_average: 9.3,
                    media_type: 'movie'
                },
                {
                    id: 238,
                    title: 'The Godfather',
                    poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
                    overview: 'The aging patriarch of an organized crime dynasty.',
                    release_date: '1972-03-14',
                    vote_average: 9.2,
                    media_type: 'movie'
                },
                {
                    id: 240,
                    title: 'The Godfather: Part II',
                    poster_path: '/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg',
                    overview: 'The early life and career of Vito Corleone.',
                    release_date: '1974-12-20',
                    vote_average: 9.0,
                    media_type: 'movie'
                }
            ],
            source: {
                type: 'mdblist',
                username: 'test',
                slug: 'test-catalog',
                originalName: 'Test Catalog',
                originalDescription: 'A test catalog for debugging',
                itemCount: 3,
                createdAt: new Date().toISOString()
            }
        };
        
        this.saveCatalog(testCatalog);
        this.showStatus('Test catalog created successfully', 'success');
        this.refreshCatalogSources();
        this.displaySavedCatalogsOnHome();
    }

    createTestCatalog() {
        console.log('MDBListIntegration: Creating test catalog');
        
        const testCatalog = {
            id: 'mdblist_test_catalog_' + Date.now(),
            name: 'Test Catalog',
            description: 'A test catalog for debugging',
            type: 'movie',
            extra: [{ name: 'genre' }],
            items: [
                {
                    id: 'tt0111161',
                    type: 'movie',
                    name: 'The Shawshank Redemption',
                    poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
                    description: 'Two imprisoned men bond over a number of years.',
                    year: 1994,
                    imdb_rating: 9.3
                },
                {
                    id: 'tt0068646',
                    type: 'movie',
                    name: 'The Godfather',
                    poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
                    description: 'The aging patriarch of an organized crime dynasty.',
                    year: 1972,
                    imdb_rating: 9.2
                },
                {
                    id: 'tt0071562',
                    type: 'movie',
                    name: 'The Godfather: Part II',
                    poster: 'https://image.tmdb.org/t/p/w500/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg',
                    description: 'The early life and career of Vito Corleone.',
                    year: 1974,
                    imdb_rating: 9.0
                }
            ],
            source: {
                type: 'mdblist',
                username: 'test',
                slug: 'test-catalog',
                originalName: 'Test Catalog',
                originalDescription: 'A test catalog for debugging',
                itemCount: 3,
                createdAt: new Date().toISOString()
            }
        };
        
        this.saveCatalog(testCatalog);
        this.showStatus('Test catalog created successfully', 'success');
        this.refreshCatalogSources();
        this.displaySavedCatalogsOnHome();
    }
    
    showStatus(message, type) {
        const statusEl = document.getElementById('mdblist-status');
        if (!statusEl) return;
        
        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 3000);
        }
    }
}

// Export for use in other modules
window.MDBListIntegration = MDBListIntegration;