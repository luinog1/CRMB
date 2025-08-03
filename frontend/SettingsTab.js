// Settings Tab Controller
class SettingsTab {
    constructor(app) {
        this.app = app;
        this.settings = this.loadSettings();
    }

    loadSettings() {
        return {
            // TMDB settings are now handled by TMDBIntegration.js
            catalogSettings: JSON.parse(localStorage.getItem('catalog_settings') || JSON.stringify({
                movies: true,
                series: true,
                trending: true,
                popular: true
            })),
            playerSettings: JSON.parse(localStorage.getItem('player_settings') || JSON.stringify({
                infuse: true,
                vlc: true,
                outplayer: true
            })),
            addons: JSON.parse(localStorage.getItem('stremio_addons') || '[]'),
            theme: localStorage.getItem('theme') || 'dark',
            language: localStorage.getItem('language') || 'en',
            autoplay: localStorage.getItem('autoplay') === 'true',
            notifications: localStorage.getItem('notifications') !== 'false'
        };
    }

    init() {
        this.setupEventListeners();
        this.populateSettings();
    }

    setupEventListeners() {
        // TMDB settings are now handled by TMDBIntegration.js
        
        // Catalog Management Event Listeners
        this.setupCatalogManagementListeners();
    }
    
    setupCatalogManagementListeners() {
        // Refresh all catalogs
        const refreshBtn = document.getElementById('refresh-all-catalogs');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshAllCatalogs();
            });
        }
        
        // Export catalogs
        const exportBtn = document.getElementById('export-catalogs');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportCatalogs();
            });
        }
        
        // Import catalogs
        const importInput = document.getElementById('import-catalogs');
        if (importInput) {
            importInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.importCatalogs(e.target.files[0]);
                }
            });
        }
        
        // Filter listeners
        const sourceFilter = document.getElementById('catalog-source-filter');
        const typeFilter = document.getElementById('catalog-type-filter');
        
        if (sourceFilter) {
            sourceFilter.addEventListener('change', () => {
                this.filterCatalogs();
            });
        }
        
        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                this.filterCatalogs();
            });
        }
        
        // Auto-refresh settings
        const autoRefreshToggle = document.getElementById('auto-refresh-catalogs');
        const refreshInterval = document.getElementById('refresh-interval');
        
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                this.updateAutoRefreshSetting(e.target.checked);
            });
        }
        
        if (refreshInterval) {
            refreshInterval.addEventListener('change', (e) => {
                this.updateRefreshInterval(parseInt(e.target.value));
            });
        }

        // Catalog toggles
        Object.keys(this.settings.catalogSettings).forEach(key => {
            const toggle = document.getElementById(`toggle-${key}`);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    this.updateCatalogSetting(key, e.target.checked);
                });
            }
        });

        // Player toggles
        Object.keys(this.settings.playerSettings).forEach(key => {
            const toggle = document.getElementById(`enable-${key}`);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    this.updatePlayerSetting(key, e.target.checked);
                });
            }
        });

        // Add-on management
        const addAddonBtn = document.getElementById('add-addon-btn');
        const addonUrlInput = document.getElementById('addon-url');
        
        if (addAddonBtn && addonUrlInput) {
            addAddonBtn.addEventListener('click', () => {
                this.addAddon(addonUrlInput.value.trim());
                addonUrlInput.value = '';
            });

            addonUrlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addAddon(addonUrlInput.value.trim());
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
                this.resetAllSettings();
            });
        }

        // Advanced settings
        this.setupAdvancedSettings();
    }

    setupAdvancedSettings() {
        // Add advanced settings section if not exists
        this.addAdvancedSettingsSection();
    }

    addAdvancedSettingsSection() {
        const settingsSections = document.querySelector('.settings-sections');
        if (!settingsSections || document.getElementById('advanced-settings')) return;

        const advancedSection = document.createElement('section');
        advancedSection.className = 'settings-section';
        advancedSection.id = 'advanced-settings';
        
        advancedSection.innerHTML = `
            <h2>Advanced Settings</h2>
            
            <div class="setting-item">
                <label for="theme-select">Theme</label>
                <select id="theme-select" class="setting-select">
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="auto">Auto</option>
                </select>
                <p class="setting-description">Choose your preferred theme</p>
            </div>

            <div class="setting-item">
                <label for="language-select">Language</label>
                <select id="language-select" class="setting-select">
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="it">Italiano</option>
                    <option value="pt">Português</option>
                </select>
                <p class="setting-description">Select your preferred language</p>
            </div>

            <div class="toggle-item">
                <label class="toggle-label">
                    <input type="checkbox" id="enable-autoplay">
                    <span class="toggle-slider"></span>
                    <span class="toggle-text">Enable Autoplay</span>
                </label>
                <p class="setting-description">Automatically play next episode or recommended content</p>
            </div>

            <div class="toggle-item">
                <label class="toggle-label">
                    <input type="checkbox" id="enable-notifications">
                    <span class="toggle-slider"></span>
                    <span class="toggle-text">Enable Notifications</span>
                </label>
                <p class="setting-description">Show notifications for updates and new content</p>
            </div>

            <div class="setting-item">
                <label for="cache-size">Cache Size Limit (MB)</label>
                <input type="number" id="cache-size" min="100" max="5000" step="100" value="1000" class="setting-input">
                <p class="setting-description">Maximum cache size for images and metadata</p>
            </div>

            <div class="setting-item">
                <label for="concurrent-streams">Max Concurrent Streams</label>
                <input type="number" id="concurrent-streams" min="1" max="10" value="3" class="setting-input">
                <p class="setting-description">Maximum number of simultaneous stream checks</p>
            </div>
        `;

        settingsSections.appendChild(advancedSection);

        // Add event listeners for advanced settings
        this.setupAdvancedEventListeners();
        this.addAdvancedSettingsCSS();
    }

    setupAdvancedEventListeners() {
        const themeSelect = document.getElementById('theme-select');
        const languageSelect = document.getElementById('language-select');
        const autoplayToggle = document.getElementById('enable-autoplay');
        const notificationsToggle = document.getElementById('enable-notifications');
        const cacheSizeInput = document.getElementById('cache-size');
        const concurrentStreamsInput = document.getElementById('concurrent-streams');

        if (themeSelect) {
            themeSelect.value = this.settings.theme;
            themeSelect.addEventListener('change', (e) => {
                this.updateTheme(e.target.value);
            });
        }

        if (languageSelect) {
            languageSelect.value = this.settings.language;
            languageSelect.addEventListener('change', (e) => {
                this.updateLanguage(e.target.value);
            });
        }

        if (autoplayToggle) {
            autoplayToggle.checked = this.settings.autoplay;
            autoplayToggle.addEventListener('change', (e) => {
                this.updateAutoplay(e.target.checked);
            });
        }

        if (notificationsToggle) {
            notificationsToggle.checked = this.settings.notifications;
            notificationsToggle.addEventListener('change', (e) => {
                this.updateNotifications(e.target.checked);
            });
        }

        if (cacheSizeInput) {
            cacheSizeInput.addEventListener('change', (e) => {
                this.updateCacheSize(parseInt(e.target.value));
            });
        }

        if (concurrentStreamsInput) {
            concurrentStreamsInput.addEventListener('change', (e) => {
                this.updateConcurrentStreams(parseInt(e.target.value));
            });
        }
    }

    addAdvancedSettingsCSS() {
        if (document.getElementById('advanced-settings-styles')) return;

        const style = document.createElement('style');
        style.id = 'advanced-settings-styles';
        style.textContent = `
            .setting-select,
            .setting-input {
                width: 100%;
                padding: 12px 16px;
                background: var(--tertiary-bg);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius-small);
                color: var(--text-primary);
                font-size: 16px;
                transition: var(--transition);
            }

            .setting-select:focus,
            .setting-input:focus {
                outline: none;
                border-color: var(--accent-green);
                box-shadow: 0 0 0 3px rgba(0, 255, 65, 0.1);
            }

            .setting-select option {
                background: var(--secondary-bg);
                color: var(--text-primary);
            }

            .toggle-item .setting-description {
                margin-top: 8px;
                margin-left: 0;
                padding-left: 60px;
                clear: both;
            }
        `;

        document.head.appendChild(style);
    }

    populateSettings() {
        // TMDB settings are now handled by TMDBIntegration.js

        // Catalog toggles
        Object.entries(this.settings.catalogSettings).forEach(([key, value]) => {
            const toggle = document.getElementById(`toggle-${key}`);
            if (toggle) {
                toggle.checked = value;
            }
        });

        // Player toggles
        Object.entries(this.settings.playerSettings).forEach(([key, value]) => {
            const toggle = document.getElementById(`enable-${key}`);
            if (toggle) {
                toggle.checked = value;
            }
        });

        // Render add-ons
        this.renderAddonList();
        this.renderCatalogManagement();
    }
    
    renderCatalogManagement() {
        if (!this.app.catalogManager) return;
        
        this.updateCatalogStats();
        this.renderCatalogList();
    }
    
    updateCatalogStats() {
        if (!this.app.catalogManager) return;
        
        const allCatalogs = this.app.catalogManager.getAllCatalogs();
        const enabledCatalogs = this.app.catalogManager.getEnabledCatalogs();
        const totalItems = allCatalogs.reduce((sum, catalog) => {
            return sum + (catalog.items ? catalog.items.length : 0);
        }, 0);
        
        const totalCatalogsEl = document.getElementById('total-catalogs');
        const enabledCatalogsEl = document.getElementById('enabled-catalogs');
        const totalItemsEl = document.getElementById('total-items');
        
        if (totalCatalogsEl) totalCatalogsEl.textContent = allCatalogs.length;
        if (enabledCatalogsEl) enabledCatalogsEl.textContent = enabledCatalogs.length;
        if (totalItemsEl) totalItemsEl.textContent = totalItems.toLocaleString();
    }
    
    renderCatalogList() {
        const catalogList = document.getElementById('catalog-list');
        if (!catalogList || !this.app.catalogManager) return;
        
        const allCatalogs = this.app.catalogManager.getAllCatalogs();
        
        if (allCatalogs.length === 0) {
            catalogList.innerHTML = `
                <div class="empty-catalog-state">
                    <div class="empty-icon">📚</div>
                    <h3>No Catalogs Available</h3>
                    <p>Add some MDBList catalogs or Stremio add-ons to get started.</p>
                </div>
            `;
            return;
        }
        
        catalogList.innerHTML = allCatalogs.map(catalog => {
            const itemCount = catalog.items ? catalog.items.length : 0;
            const mediaType = catalog.metadata?.mediaType || 'mixed';
            const isEnabled = catalog.enabled !== false;
            
            return `
                <div class="catalog-item ${isEnabled ? '' : 'disabled'}" data-catalog-id="${catalog.id}">
                    <div class="catalog-info">
                        <div class="catalog-name">${catalog.name}</div>
                        <div class="catalog-meta">
                            <span class="catalog-source">${catalog.source}</span>
                            <span>${itemCount} items</span>
                            <span>${mediaType}</span>
                            <span>Updated: ${catalog.lastUpdated ? new Date(catalog.lastUpdated).toLocaleDateString() : 'Never'}</span>
                        </div>
                    </div>
                    <div class="catalog-actions">
                        <div class="catalog-toggle ${isEnabled ? 'enabled' : ''}" 
                             onclick="settingsTab.toggleCatalog('${catalog.id}')"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    filterCatalogs() {
        const sourceFilter = document.getElementById('catalog-source-filter')?.value || 'all';
        const typeFilter = document.getElementById('catalog-type-filter')?.value || 'all';
        
        const catalogItems = document.querySelectorAll('.catalog-item');
        
        catalogItems.forEach(item => {
            const catalogId = item.dataset.catalogId;
            const catalog = this.app.catalogManager.getCatalogById(catalogId);
            
            if (!catalog) {
                item.style.display = 'none';
                return;
            }
            
            const sourceMatch = sourceFilter === 'all' || catalog.source === sourceFilter;
            const typeMatch = typeFilter === 'all' || catalog.metadata?.mediaType === typeFilter;
            
            item.style.display = (sourceMatch && typeMatch) ? 'flex' : 'none';
        });
    }
    
    async toggleCatalog(catalogId) {
        if (!this.app.catalogManager) return;
        
        await this.app.catalogManager.toggleCatalog(catalogId);
        this.renderCatalogManagement();
        
        // Refresh home tab if it exists
        if (this.app.homeTab && this.app.homeTab.loadAddonCatalogs) {
            await this.app.homeTab.loadAddonCatalogs();
        }
    }
    
    async refreshAllCatalogs() {
        if (!this.app.catalogManager) return;
        
        const refreshBtn = document.getElementById('refresh-all-catalogs');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.textContent = '🔄 Refreshing...';
        }
        
        try {
            await this.app.catalogManager.refreshAllCatalogs();
            this.renderCatalogManagement();
            
            // Refresh home tab
            if (this.app.homeTab && this.app.homeTab.loadAddonCatalogs) {
                await this.app.homeTab.loadAddonCatalogs();
            }
            
            this.showNotification('All catalogs refreshed successfully!', 'success');
         } catch (error) {
             console.error('Error refreshing catalogs:', error);
             this.showNotification('Error refreshing catalogs', 'error');
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '🔄 Refresh All Catalogs';
            }
        }
    }
    
    exportCatalogs() {
        if (!this.app.catalogManager) return;
        
        try {
            const catalogData = this.app.catalogManager.exportCatalogs();
            const blob = new Blob([JSON.stringify(catalogData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `crmb-catalogs-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Catalogs exported successfully!', 'success');
         } catch (error) {
             console.error('Error exporting catalogs:', error);
             this.showNotification('Error exporting catalogs', 'error');
        }
    }
    
    async importCatalogs(file) {
        if (!this.app.catalogManager) return;
        
        try {
            const text = await file.text();
            const catalogData = JSON.parse(text);
            
            await this.app.catalogManager.importCatalogs(catalogData);
            this.renderCatalogManagement();
            
            // Refresh home tab
            if (this.app.homeTab && this.app.homeTab.loadAddonCatalogs) {
                await this.app.homeTab.loadAddonCatalogs();
            }
            
            this.showNotification('Catalogs imported successfully!', 'success');
         } catch (error) {
             console.error('Error importing catalogs:', error);
             this.showNotification('Error importing catalogs. Please check the file format.', 'error');
        }
    }
    
    updateAutoRefreshSetting(enabled) {
        localStorage.setItem('catalog_auto_refresh', enabled.toString());
        if (this.app.catalogManager) {
            this.app.catalogManager.setAutoRefresh(enabled);
        }
    }
    
    updateRefreshInterval(minutes) {
        localStorage.setItem('catalog_refresh_interval', minutes.toString());
        if (this.app.catalogManager) {
            this.app.catalogManager.setRefreshInterval(minutes);
        }
    }

    renderAddonList() {
        const addonList = document.getElementById('addon-list');
        if (!addonList) return;

        if (this.settings.addons.length === 0) {
            addonList.innerHTML = `
                <div class="empty-addon-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M12 2v20m8-10H4"/>
                    </svg>
                    <p>No add-ons installed</p>
                    <p class="empty-subtitle">Add Stremio-compatible add-ons to expand content sources</p>
                </div>
            `;
            this.addEmptyAddonStateCSS();
            return;
        }

        addonList.innerHTML = this.settings.addons.map(addon => `
            <div class="addon-item" data-addon-id="${addon.id}">
                <div class="addon-info">
                    <h4>${addon.name}</h4>
                    <p class="addon-description">${addon.description || 'No description available'}</p>
                    <p class="addon-url">${addon.url}</p>
                    <div class="addon-meta">
                        <span class="addon-version">v${addon.manifest?.version || '1.0.0'}</span>
                        <span class="addon-types">${this.formatAddonTypes(addon.manifest?.resources)}</span>
                    </div>
                </div>
                <div class="addon-actions">
                    <button class="addon-toggle ${addon.enabled !== false ? 'enabled' : 'disabled'}" 
                            onclick="settingsTab.toggleAddon('${addon.id}')">
                        ${addon.enabled !== false ? 'Enabled' : 'Disabled'}
                    </button>
                    <button class="addon-remove" onclick="settingsTab.removeAddon('${addon.id}')">
                        Remove
                    </button>
                </div>
            </div>
        `).join('');

        this.addAddonItemCSS();
    }

    addEmptyAddonStateCSS() {
        if (document.getElementById('empty-addon-state-styles')) return;

        const style = document.createElement('style');
        style.id = 'empty-addon-state-styles';
        style.textContent = `
            .empty-addon-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                text-align: center;
                color: var(--text-muted);
                border: 2px dashed var(--border-color);
                border-radius: var(--border-radius);
            }

            .empty-addon-state svg {
                width: 48px;
                height: 48px;
                margin-bottom: 16px;
                opacity: 0.5;
            }

            .empty-addon-state p {
                margin-bottom: 8px;
                color: var(--text-secondary);
            }

            .empty-subtitle {
                font-size: 14px !important;
                color: var(--text-muted) !important;
            }
        `;

        document.head.appendChild(style);
    }

    addAddonItemCSS() {
        if (document.getElementById('addon-item-styles')) return;

        const style = document.createElement('style');
        style.id = 'addon-item-styles';
        style.textContent = `
            .addon-item {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 20px;
                background: var(--tertiary-bg);
                border-radius: var(--border-radius);
                border: 1px solid var(--border-color);
                transition: var(--transition);
            }

            .addon-item:hover {
                border-color: var(--accent-green);
            }

            .addon-info {
                flex: 1;
                margin-right: 20px;
            }

            .addon-info h4 {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 8px;
                color: var(--text-primary);
            }

            .addon-description {
                font-size: 14px;
                color: var(--text-secondary);
                margin-bottom: 8px;
                line-height: 1.4;
            }

            .addon-url {
                font-size: 12px;
                color: var(--text-muted);
                font-family: monospace;
                margin-bottom: 12px;
                word-break: break-all;
            }

            .addon-meta {
                display: flex;
                gap: 16px;
                font-size: 12px;
            }

            .addon-version {
                color: var(--accent-green);
                font-weight: 600;
            }

            .addon-types {
                color: var(--text-muted);
            }

            .addon-actions {
                display: flex;
                flex-direction: column;
                gap: 8px;
                min-width: 100px;
            }

            .addon-toggle {
                padding: 8px 16px;
                border: none;
                border-radius: var(--border-radius-small);
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: var(--transition);
            }

            .addon-toggle.enabled {
                background: var(--accent-green);
                color: var(--primary-bg);
            }

            .addon-toggle.disabled {
                background: var(--border-color);
                color: var(--text-secondary);
            }

            .addon-toggle:hover {
                transform: translateY(-1px);
            }

            .addon-remove {
                padding: 8px 16px;
                background: transparent;
                border: 1px solid #ff4444;
                border-radius: var(--border-radius-small);
                color: #ff4444;
                font-size: 14px;
                cursor: pointer;
                transition: var(--transition);
            }

            .addon-remove:hover {
                background: #ff4444;
                color: white;
            }
        `;

        document.head.appendChild(style);
    }

    formatAddonTypes(resources) {
        if (!resources || !Array.isArray(resources)) return 'Unknown';
        
        const types = resources.map(resource => resource.name).join(', ');
        return types || 'Unknown';
    }

    // TMDB methods removed - now handled by TMDBIntegration.js

    updateCatalogSetting(key, value) {
        this.settings.catalogSettings[key] = value;
        localStorage.setItem('catalog_settings', JSON.stringify(this.settings.catalogSettings));
        this.app.catalogSettings = this.settings.catalogSettings;
        this.app.showNotification(`${key} catalog ${value ? 'enabled' : 'disabled'}`);
        
        // Refresh home content if currently viewing
        if (this.app.currentTab === 'home') {
            this.app.refreshHomeContent();
        }
    }

    updatePlayerSetting(key, value) {
        this.settings.playerSettings[key] = value;
        localStorage.setItem('player_settings', JSON.stringify(this.settings.playerSettings));
        this.app.playerSettings = this.settings.playerSettings;
        this.app.showNotification(`${key.toUpperCase()} player ${value ? 'enabled' : 'disabled'}`);
    }

    updateTheme(theme) {
        this.settings.theme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme(theme);
        this.app.showNotification(`Theme changed to ${theme}`);
    }

    updateLanguage(language) {
        this.settings.language = language;
        localStorage.setItem('language', language);
        this.app.showNotification('Language updated (restart required for full effect)');
    }

    updateAutoplay(enabled) {
        this.settings.autoplay = enabled;
        localStorage.setItem('autoplay', enabled.toString());
        this.app.showNotification(`Autoplay ${enabled ? 'enabled' : 'disabled'}`);
    }

    updateNotifications(enabled) {
        this.settings.notifications = enabled;
        localStorage.setItem('notifications', enabled.toString());
        this.app.showNotification(`Notifications ${enabled ? 'enabled' : 'disabled'}`);
    }

    updateCacheSize(size) {
        localStorage.setItem('cache_size_limit', size.toString());
        this.app.showNotification(`Cache size limit set to ${size}MB`);
    }

    updateConcurrentStreams(count) {
        localStorage.setItem('max_concurrent_streams', count.toString());
        this.app.showNotification(`Max concurrent streams set to ${count}`);
    }

    applyTheme(theme) {
        const root = document.documentElement;
        
        if (theme === 'light') {
            root.style.setProperty('--primary-bg', '#ffffff');
            root.style.setProperty('--secondary-bg', '#f5f5f5');
            root.style.setProperty('--tertiary-bg', '#e0e0e0');
            root.style.setProperty('--text-primary', '#000000');
            root.style.setProperty('--text-secondary', '#333333');
            root.style.setProperty('--text-muted', '#666666');
            root.style.setProperty('--border-color', '#cccccc');
            root.style.setProperty('--hover-bg', '#eeeeee');
        } else if (theme === 'auto') {
            // Detect system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.applyTheme(prefersDark ? 'dark' : 'light');
            return;
        } else {
            // Reset to dark theme (default)
            root.style.removeProperty('--primary-bg');
            root.style.removeProperty('--secondary-bg');
            root.style.removeProperty('--tertiary-bg');
            root.style.removeProperty('--text-primary');
            root.style.removeProperty('--text-secondary');
            root.style.removeProperty('--text-muted');
            root.style.removeProperty('--border-color');
            root.style.removeProperty('--hover-bg');
        }
    }

    async addAddon(url) {
        if (!url) {
            this.app.showNotification('Please enter an add-on URL', 'warning');
            return;
        }

        try {
            this.app.showLoading();
            
            // Validate and normalize URL
            if (!url.includes('/manifest.json')) {
                url = url.endsWith('/') ? url + 'manifest.json' : url + '/manifest.json';
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch add-on manifest');
            }

            const manifest = await response.json();
            
            // Validate manifest
            if (!manifest.id || !manifest.name) {
                throw new Error('Invalid add-on manifest');
            }

            // Check if already exists
            if (this.settings.addons.find(addon => addon.id === manifest.id)) {
                this.app.showNotification('Add-on already installed', 'warning');
                return;
            }

            // Add to list
            const addon = {
                id: manifest.id,
                name: manifest.name,
                description: manifest.description,
                url: url.replace('/manifest.json', ''),
                manifest: manifest,
                enabled: true,
                addedAt: Date.now()
            };

            this.settings.addons.push(addon);
            localStorage.setItem('stremio_addons', JSON.stringify(this.settings.addons));
            this.app.addons = this.settings.addons;
            
            this.renderAddonList();
            this.app.showNotification(`Add-on "${manifest.name}" installed successfully`);
        } catch (error) {
            console.error('Error adding add-on:', error);
            this.app.showNotification('Failed to install add-on. Please check the URL.', 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    removeAddon(addonId) {
        if (confirm('Are you sure you want to remove this add-on?')) {
            this.settings.addons = this.settings.addons.filter(addon => addon.id !== addonId);
            localStorage.setItem('stremio_addons', JSON.stringify(this.settings.addons));
            this.app.addons = this.settings.addons;
            
            this.renderAddonList();
            this.app.showNotification('Add-on removed successfully');
        }
    }

    toggleAddon(addonId) {
        const addon = this.settings.addons.find(a => a.id === addonId);
        if (addon) {
            addon.enabled = !addon.enabled;
            localStorage.setItem('stremio_addons', JSON.stringify(this.settings.addons));
            this.app.addons = this.settings.addons;
            
            this.renderAddonList();
            this.app.showNotification(`Add-on ${addon.enabled ? 'enabled' : 'disabled'}`);
        }
    }

    clearCache() {
        if (confirm('Are you sure you want to clear the cache? This will remove all cached images and metadata.')) {
            // Clear localStorage cache items
            const cacheKeys = Object.keys(localStorage).filter(key => 
                key.startsWith('tmdb_cache_') || 
                key.startsWith('addon_cache_') ||
                key.startsWith('image_cache_')
            );
            
            cacheKeys.forEach(key => localStorage.removeItem(key));
            
            this.app.showNotification('Cache cleared successfully');
        }
    }

    resetAllSettings() {
        if (confirm('Are you sure you want to reset all settings? This action cannot be undone and will reload the application.')) {
            localStorage.clear();
            location.reload();
        }
    }

    exportSettings() {
        const settingsData = {
            settings: this.settings,
            exportedAt: Date.now(),
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(settingsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `crumble-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.app.showNotification('Settings exported successfully');
    }

    async importSettings(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (data.settings) {
                // Import settings
                Object.entries(data.settings).forEach(([key, value]) => {
                    if (key === 'tmdbApiKey') {
                        localStorage.setItem('tmdb_api_key', value);
                    } else if (key === 'catalogSettings') {
                        localStorage.setItem('catalog_settings', JSON.stringify(value));
                    } else if (key === 'playerSettings') {
                        localStorage.setItem('player_settings', JSON.stringify(value));
                    } else if (key === 'addons') {
                        localStorage.setItem('stremio_addons', JSON.stringify(value));
                    } else {
                        localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
                    }
                });

                this.settings = this.loadSettings();
                this.populateSettings();
                
                this.app.showNotification('Settings imported successfully');
            } else {
                throw new Error('Invalid settings file format');
            }
        } catch (error) {
            console.error('Import error:', error);
            this.app.showNotification('Failed to import settings', 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        // Create a simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Make SettingsTab available globally
window.SettingsTab = SettingsTab;

// Global reference for onclick handlers
let settingsTab = null;