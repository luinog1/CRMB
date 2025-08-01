class TMDBIntegration {
    constructor(app) {
        this.app = app;
        this.apiKey = localStorage.getItem('user_tmdb_api_key') || '';
        this.proxyUrl = 'http://localhost:3003';
        this.fallbackUrl = 'https://api.themoviedb.org/3';
        this.imageBaseUrl = 'https://image.tmdb.org/t/p/';
        this.isProxyAvailable = false;
    }

    init() {
        console.log('TMDBIntegration: Initializing...');
        this.addSettingsSection();
        this.setupEventListeners();
        this.checkProxyStatus();
    }

    addSettingsSection() {
        console.log('TMDBIntegration: Adding settings section...');
        const settingsContainer = document.querySelector('#settings-tab .settings-sections');
        if (!settingsContainer) {
            console.warn('TMDBIntegration: Settings sections container not found');
            return;
        }

        const tmdbSection = document.createElement('section');
        tmdbSection.className = 'settings-section';
        tmdbSection.innerHTML = `
            <h2>TMDB Integration</h2>
            <p class="section-description">Configure TMDB API for enhanced metadata fetching.</p>
            
            <div class="tmdb-settings">
                <!-- API Key Section -->
                <div class="setting-group">
                    <label for="tmdb-api-key">TMDB API Key</label>
                    <div class="toggle-group">
                        <label class="toggle-switch">
                            <input type="checkbox" id="use-default-tmdb" ${localStorage.getItem('use_default_tmdb') !== 'false' ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label">Use default TMDB API key</span>
                    </div>
                    <div class="input-group" id="custom-api-group" style="${localStorage.getItem('use_default_tmdb') !== 'false' ? 'opacity: 0.5; pointer-events: none;' : ''}">
                        <input type="password" 
                            id="tmdb-api-key" 
                            placeholder="Enter your TMDB API key" 
                            class="settings-input"
                            value="${localStorage.getItem('user_tmdb_api_key') || ''}"
                        >
                        <button id="save-tmdb-key-btn" class="save-btn">Save</button>
                    </div>
                    <p class="setting-help">Get your API key from <a href="https://www.themoviedb.org/settings/api" target="_blank">TMDB API Settings</a></p>
                    <div id="tmdb-proxy-status" class="proxy-status">Checking proxy...</div>
                </div>

                <!-- API Test Section -->
                <div class="setting-group" id="tmdb-test-section">
                    <label>Test API Connection</label>
                    <div class="test-form">
                        <div class="form-row">
                            <input type="text" 
                                id="tmdb-test-input" 
                                placeholder="Enter movie/TV show title to test" 
                                class="settings-input"
                                ${!this.apiKey ? 'disabled' : ''}
                            >
                            <button id="tmdb-test-btn" class="search-btn" ${!this.apiKey ? 'disabled' : ''}>Test Search</button>
                        </div>
                    </div>
                    
                    <div id="tmdb-test-results" class="test-results" style="display: none;"></div>
                </div>

                <!-- Account Info Section -->
                <div class="setting-group" id="tmdb-account-section">
                    <label>Account Information</label>
                    <div id="tmdb-account-info" class="account-info">
                        <!-- Account details will be displayed here -->
                    </div>
                    <button id="refresh-account-btn" class="refresh-btn" ${!this.apiKey ? 'disabled' : ''}>Refresh Account Info</button>
                </div>
            </div>
        `;

        settingsContainer.appendChild(tmdbSection);
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .tmdb-settings {
                max-width: 800px;
            }
            
            .toggle-group {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }
            
            .toggle-switch {
                position: relative;
                display: inline-block;
                width: 50px;
                height: 24px;
            }
            
            .toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: .4s;
                border-radius: 24px;
            }
            
            .toggle-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }
            
            input:checked + .toggle-slider {
                background-color: var(--accent-color, #007bff);
            }
            
            input:checked + .toggle-slider:before {
                transform: translateX(26px);
            }
            
            .toggle-label {
                font-size: 14px;
                color: var(--text-color);
            }
            
            .test-results {
                margin-top: 12px;
                padding: 12px;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                background: var(--bg-secondary);
            }
            
            .test-result-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px;
                border-bottom: 1px solid var(--border-color);
            }
            
            .test-result-item:last-child {
                border-bottom: none;
            }
            
            .test-result-poster {
                width: 40px;
                height: 60px;
                object-fit: cover;
                border-radius: 4px;
                background: var(--bg-tertiary);
            }
            
            .test-result-info {
                flex: 1;
            }
            
            .test-result-title {
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 4px;
            }
            
            .test-result-meta {
                font-size: 12px;
                color: var(--text-secondary);
            }
            
            .account-info {
                padding: 12px;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                background: var(--bg-secondary);
                margin-bottom: 12px;
            }
            
            .account-detail {
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                border-bottom: 1px solid var(--border-color);
            }
            
            .account-detail:last-child {
                border-bottom: none;
            }
            
            .account-label {
                font-weight: 500;
                color: var(--text-secondary);
            }
            
            .account-value {
                color: var(--text-primary);
            }
            
            .refresh-btn {
                background: var(--accent-blue);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            
            .refresh-btn:hover:not(:disabled) {
                background: var(--accent-blue-dark);
            }
            
            .refresh-btn:disabled {
                background: var(--bg-tertiary);
                color: var(--text-secondary);
                cursor: not-allowed;
            }
        `;
        
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Save API key
        const saveApiKeyBtn = document.getElementById('save-tmdb-key-btn');
        const apiKeyInput = document.getElementById('tmdb-api-key');
        
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
        
        // Toggle default API key
        const useDefaultToggle = document.getElementById('use-default-tmdb');
        const customApiGroup = document.getElementById('custom-api-group');
        
        if (useDefaultToggle && customApiGroup) {
            useDefaultToggle.addEventListener('change', (e) => {
                const useDefault = e.target.checked;
                localStorage.setItem('use_default_tmdb', useDefault.toString());
                
                if (useDefault) {
                    customApiGroup.style.opacity = '0.5';
                    customApiGroup.style.pointerEvents = 'none';
                } else {
                    customApiGroup.style.opacity = '1';
                    customApiGroup.style.pointerEvents = 'auto';
                }
                
                // Reinitialize API key
                this.app.initializeTmdbApiKey();
                this.showMessage('TMDB API settings updated', 'success');
            });
        }

        // Test API connection
        const testBtn = document.getElementById('tmdb-test-btn');
        const testInput = document.getElementById('tmdb-test-input');
        
        if (testBtn && testInput) {
            testBtn.addEventListener('click', () => {
                this.testApiConnection(testInput.value.trim());
            });
            
            testInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.testApiConnection(testInput.value.trim());
                }
            });
        }

        // Refresh account info
        const refreshBtn = document.getElementById('refresh-account-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshAccountInfo();
            });
        }
    }

    saveApiKey(apiKey) {
        if (!apiKey) {
            this.showMessage('Please enter a valid API key', 'error');
            return;
        }

        // Save user's custom API key
        localStorage.setItem('user_tmdb_api_key', apiKey);
        
        // Update app's API key if not using default
        const useDefault = localStorage.getItem('use_default_tmdb') !== 'false';
        if (!useDefault) {
            this.apiKey = apiKey;
            this.app.tmdbApiKey = apiKey;
            localStorage.setItem('tmdb_api_key', apiKey);
        }
        
        // Enable/disable form elements
        const testInput = document.getElementById('tmdb-test-input');
        const testBtn = document.getElementById('tmdb-test-btn');
        const refreshBtn = document.getElementById('refresh-account-btn');
        
        [testInput, testBtn, refreshBtn].forEach(el => {
            if (el) el.disabled = false;
        });

        this.showMessage('TMDB API key saved successfully!', 'success');
        this.refreshAccountInfo();
    }

    async checkProxyStatus() {
        const statusElement = document.getElementById('tmdb-proxy-status');
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
                this.isProxyAvailable = true;
                statusElement.className = 'proxy-status online';
                statusElement.textContent = '✓ TMDB proxy online - Enhanced API integration available';
                console.log('TMDB Proxy status:', data);
            } else {
                throw new Error('Proxy health check failed');
            }
        } catch (error) {
            console.warn('TMDB Proxy not available:', error);
            this.isProxyAvailable = false;
            statusElement.className = 'proxy-status offline';
            statusElement.textContent = '⚠ TMDB proxy offline - Using direct API calls (CORS limited)';
        }
    }

    async testApiConnection(query) {
        if (!query) {
            this.showMessage('Please enter a search term', 'error');
            return;
        }

        const resultsContainer = document.getElementById('tmdb-test-results');
        if (!resultsContainer) return;

        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = '<div class="loading">Testing API connection...</div>';

        try {
            const results = await this.searchMulti(query, 5);
            
            if (results && results.length > 0) {
                this.displayTestResults(results);
                this.showMessage(`API test successful! Found ${results.length} results.`, 'success');
            } else {
                resultsContainer.innerHTML = '<div class="no-results">No results found. API connection working but no matches for this query.</div>';
            }
        } catch (error) {
            console.error('API test failed:', error);
            resultsContainer.innerHTML = `<div class="error">API test failed: ${error.message}</div>`;
            this.showMessage('API test failed. Please check your API key.', 'error');
        }
    }

    displayTestResults(results) {
        const resultsContainer = document.getElementById('tmdb-test-results');
        if (!resultsContainer) return;

        const resultsHtml = results.map(item => {
            const title = item.title || item.name || 'Unknown Title';
            const year = item.release_date || item.first_air_date ? 
                new Date(item.release_date || item.first_air_date).getFullYear() : 'Unknown';
            const type = item.media_type === 'movie' ? 'Movie' : 
                        item.media_type === 'tv' ? 'TV Show' : 'Unknown';
            const posterUrl = item.poster_path ? 
                `${this.imageBaseUrl}w92${item.poster_path}` : 
                '/frontend/placeholder-poster.svg';

            return `
                <div class="test-result-item">
                    <img src="${posterUrl}" alt="${title}" class="test-result-poster" 
                         onerror="this.src='/frontend/placeholder-poster.svg'">
                    <div class="test-result-info">
                        <div class="test-result-title">${this.escapeHtml(title)}</div>
                        <div class="test-result-meta">${type} • ${year} • ID: ${item.id}</div>
                    </div>
                </div>
            `;
        }).join('');

        resultsContainer.innerHTML = resultsHtml;
    }

    async refreshAccountInfo() {
        if (!this.apiKey) {
            this.showMessage('Please save your API key first', 'error');
            return;
        }

        const accountContainer = document.getElementById('tmdb-account-info');
        if (!accountContainer) return;

        accountContainer.innerHTML = '<div class="loading">Loading account information...</div>';

        try {
            const accountData = await this.getAccountInfo();
            this.displayAccountInfo(accountData);
        } catch (error) {
            console.error('Failed to fetch account info:', error);
            accountContainer.innerHTML = `<div class="error">Failed to load account info: ${error.message}</div>`;
        }
    }

    async getAccountInfo() {
        if (this.isProxyAvailable) {
            const response = await fetch(`${this.proxyUrl}/api/tmdb-account`, {
                headers: {
                    'x-tmdb-api-key': this.apiKey
                }
            });
            
            if (!response.ok) {
                throw new Error(`Proxy request failed: ${response.status}`);
            }
            
            return await response.json();
        } else {
            // Direct API call (may be blocked by CORS)
            const response = await fetch(`${this.fallbackUrl}/account?api_key=${this.apiKey}`);
            
            if (!response.ok) {
                throw new Error(`TMDB API request failed: ${response.status}`);
            }
            
            const account = await response.json();
            return {
                account,
                limits: {
                    requests_per_second: 40,
                    requests_per_day: 1000000,
                    note: 'TMDB API limits are generous for most use cases'
                }
            };
        }
    }

    displayAccountInfo(data) {
        const accountContainer = document.getElementById('tmdb-account-info');
        if (!accountContainer) return;

        const { account, limits } = data;
        
        const accountHtml = `
            <div class="account-detail">
                <span class="account-label">Username:</span>
                <span class="account-value">${account.username || 'N/A'}</span>
            </div>
            <div class="account-detail">
                <span class="account-label">Account ID:</span>
                <span class="account-value">${account.id || 'N/A'}</span>
            </div>
            <div class="account-detail">
                <span class="account-label">Country:</span>
                <span class="account-value">${account.iso_3166_1 || 'N/A'}</span>
            </div>
            <div class="account-detail">
                <span class="account-label">Language:</span>
                <span class="account-value">${account.iso_639_1 || 'N/A'}</span>
            </div>
            <div class="account-detail">
                <span class="account-label">Rate Limit:</span>
                <span class="account-value">${limits.requests_per_second}/sec, ${limits.requests_per_day}/day</span>
            </div>
        `;

        accountContainer.innerHTML = accountHtml;
    }

    // Core API methods
    async searchMulti(query, limit = 20) {
        const endpoint = `/search/multi?query=${encodeURIComponent(query)}&page=1`;
        const data = await this.makeApiCall(endpoint);
        return data.results ? data.results.slice(0, limit) : [];
    }

    async getMovieDetails(movieId) {
        const endpoint = `/movie/${movieId}?append_to_response=credits,videos,images,external_ids,keywords,recommendations,similar,watch/providers`;
        return await this.makeApiCall(endpoint);
    }

    async getTVDetails(tvId) {
        const endpoint = `/tv/${tvId}?append_to_response=credits,videos,images,external_ids,keywords,recommendations,similar,watch/providers,content_ratings`;
        return await this.makeApiCall(endpoint);
    }

    async makeApiCall(endpoint) {
        if (!this.apiKey) {
            throw new Error('TMDB API key not configured');
        }

        if (this.isProxyAvailable) {
            // Use proxy server
            const response = await fetch(`${this.proxyUrl}/api/tmdb${endpoint}`, {
                headers: {
                    'x-tmdb-api-key': this.apiKey
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `API request failed: ${response.status}`);
            }
            
            return await response.json();
        } else {
            // Direct API call (may be blocked by CORS)
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${this.fallbackUrl}${endpoint}${separator}api_key=${this.apiKey}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`TMDB API request failed: ${response.status}`);
            }
            
            return await response.json();
        }
    }

    showMessage(message, type = 'info') {
        // Create or update message element
        let messageEl = document.querySelector('.tmdb-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = 'tmdb-message';
            const settingsSection = document.querySelector('.tmdb-settings');
            if (settingsSection) {
                settingsSection.appendChild(messageEl);
            }
        }

        messageEl.className = `tmdb-message ${type}`;
        messageEl.textContent = message;
        messageEl.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (messageEl) {
                messageEl.style.display = 'none';
            }
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.TMDBIntegration = TMDBIntegration;