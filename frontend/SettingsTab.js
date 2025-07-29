// Settings Tab Controller
class SettingsTab {
    constructor(app) {
        this.app = app;
        this.settings = this.loadSettings();
    }

    loadSettings() {
        return {
            tmdbApiKey: localStorage.getItem('user_tmdb_api_key') || '',
            useDefaultTmdb: localStorage.getItem('use_default_tmdb') !== 'false',
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
        // TMDB API Key Save Button
        const saveTmdbBtn = document.getElementById('save-tmdb-key');
        const tmdbInput = document.getElementById('tmdb-api-key');
        if (saveTmdbBtn && tmdbInput) {
            saveTmdbBtn.addEventListener('click', () => {
                this.saveTMDBApiKey(tmdbInput.value);
            });
        }
        
        // Default TMDB Toggle
        const defaultTmdbToggle = document.getElementById('toggle-default-tmdb');
        if (defaultTmdbToggle) {
            defaultTmdbToggle.addEventListener('change', (e) => {
                this.updateDefaultTmdbSetting(e.target.checked);
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
                    Enable Autoplay
                </label>
                <p class="setting-description">Automatically play next episode or recommended content</p>
            </div>

            <div class="toggle-item">
                <label class="toggle-label">
                    <input type="checkbox" id="enable-notifications">
                    <span class="toggle-slider"></span>
                    Enable Notifications
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
                margin-left: 60px;
            }
        `;

        document.head.appendChild(style);
    }

    populateSettings() {
        // TMDB API Key
        const tmdbInput = document.getElementById('tmdb-api-key');
        if (tmdbInput) {
            tmdbInput.value = this.settings.tmdbApiKey !== '90acb3adf6e0af93b6c0055ed8a721aa' ? this.settings.tmdbApiKey : '';
        }
        
        // Default TMDB Toggle
        const defaultTmdbToggle = document.getElementById('toggle-default-tmdb');
        if (defaultTmdbToggle) {
            defaultTmdbToggle.checked = this.settings.useDefaultTmdb;
        }

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

    saveTMDBApiKey(apiKey) {
        this.settings.tmdbApiKey = apiKey;
        localStorage.setItem('user_tmdb_api_key', apiKey);
        
        // Update app's effective API key
        this.updateEffectiveTmdbKey();
        
        this.app.showNotification('TMDB API key saved successfully', 'success');
    }
    
    updateDefaultTmdbSetting(useDefault) {
        this.settings.useDefaultTmdb = useDefault;
        localStorage.setItem('use_default_tmdb', useDefault.toString());
        
        // Update app's effective API key
        this.updateEffectiveTmdbKey();
        
        const message = useDefault ? 'Default TMDB API enabled' : 'Default TMDB API disabled';
        this.app.showNotification(message, 'success');
    }
    
    updateEffectiveTmdbKey() {
        const defaultKey = '90acb3adf6e0af93b6c0055ed8a721aa';
        let effectiveKey;
        
        if (this.settings.useDefaultTmdb) {
            // Use user key if available, otherwise default
            effectiveKey = this.settings.tmdbApiKey || defaultKey;
        } else {
            // Use only user key
            effectiveKey = this.settings.tmdbApiKey;
        }
        
        // Update app's API key
        this.app.tmdbApiKey = effectiveKey;
        localStorage.setItem('tmdb_api_key', effectiveKey);
    }

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
}

// Make SettingsTab available globally
window.SettingsTab = SettingsTab;