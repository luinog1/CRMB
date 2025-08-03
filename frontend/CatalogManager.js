// Comprehensive Catalog Management System
class CatalogManager {
    constructor(app) {
        this.app = app;
        this.catalogs = new Map();
        this.catalogSettings = JSON.parse(localStorage.getItem('catalog_management_settings') || JSON.stringify({
            showMDBList: true,
            showTMDB: true,
            showStremioAddons: true,
            autoRefresh: true,
            refreshInterval: 30 // minutes
        }));
        this.init();
    }

    init() {
        this.loadAllCatalogs();
        this.setupAutoRefresh();
    }

    async loadAllCatalogs() {
        try {
            // Load MDBList catalogs
            if (this.catalogSettings.showMDBList) {
                await this.loadMDBListCatalogs();
            }

            // Load TMDB catalogs
            if (this.catalogSettings.showTMDB) {
                await this.loadTMDBCatalogs();
            }

            // Load Stremio addon catalogs
            if (this.catalogSettings.showStremioAddons) {
                await this.loadStremioAddonCatalogs();
            }

            this.notifyUpdate();
        } catch (error) {
            console.error('Error loading catalogs:', error);
        }
    }

    async loadMDBListCatalogs() {
        const mdblistCatalogs = JSON.parse(localStorage.getItem('mdblist_saved_catalogs') || '[]');
        
        for (const catalog of mdblistCatalogs) {
            const items = catalog.items || catalog.catalogs?.[0]?.metas || [];
            
            if (items.length > 0) {
                console.log('Loading MDBList catalog:', catalog.name, 'with', items.length, 'items');
            }
            
            // Items from MDBListIntegration are already enhanced, so use them directly
            // but ensure poster URLs are properly formatted
            const enhancedItems = items.map(item => {
                const enhancedItem = { ...item };
                
                // Ensure poster URL is properly set
                if (!enhancedItem.poster && enhancedItem.poster_path) {
                    enhancedItem.poster = `https://image.tmdb.org/t/p/w500${enhancedItem.poster_path}`;
                }
                
                return enhancedItem;
            });
            
            this.catalogs.set(catalog.id, {
                id: catalog.id,
                name: catalog.name,
                description: catalog.description,
                type: 'mdblist',
                source: 'MDBList',
                items: enhancedItems,
                metadata: {
                    itemCount: enhancedItems.length,
                    mediaType: catalog.types?.[0] || 'mixed',
                    createdAt: Date.now(),
                    lastUpdated: Date.now()
                },
                enabled: true,
                logo: catalog.logo || 'https://mdblist.com/favicon.ico',
                manifest: catalog
            });
        }
    }



    async convertImdbToTmdbId(imdbId, type) {
        if (!this.app.tmdbIntegration) return null;
        
        try {
            const endpoint = `/find/${imdbId}?external_source=imdb_id`;
            const data = await this.app.tmdbIntegration.makeApiCall(endpoint);
            
            if (type === 'show' && data.tv_results && data.tv_results.length > 0) {
                return data.tv_results[0].id;
            } else if (type === 'movie' && data.movie_results && data.movie_results.length > 0) {
                return data.movie_results[0].id;
            }
            
            return null;
        } catch (error) {
            console.warn(`Failed to convert IMDb ID ${imdbId} to TMDB ID:`, error);
            return null;
        }
    }

    async loadTMDBCatalogs() {
        // Create virtual TMDB catalogs for trending/popular content
        const tmdbCatalogs = [
            {
                id: 'tmdb_trending_movies',
                name: 'Trending Movies',
                description: 'Currently trending movies from TMDB',
                type: 'tmdb',
                source: 'TMDB',
                endpoint: '/trending/movie/day',
                mediaType: 'movie'
            },
            {
                id: 'tmdb_popular_movies',
                name: 'Popular Movies',
                description: 'Popular movies from TMDB',
                type: 'tmdb',
                source: 'TMDB',
                endpoint: '/movie/popular',
                mediaType: 'movie'
            },
            {
                id: 'tmdb_trending_tv',
                name: 'Trending TV Shows',
                description: 'Currently trending TV shows from TMDB',
                type: 'tmdb',
                source: 'TMDB',
                endpoint: '/trending/tv/day',
                mediaType: 'tv'
            },
            {
                id: 'tmdb_popular_tv',
                name: 'Popular TV Shows',
                description: 'Popular TV shows from TMDB',
                type: 'tmdb',
                source: 'TMDB',
                endpoint: '/tv/popular',
                mediaType: 'tv'
            }
        ];

        for (const catalog of tmdbCatalogs) {
            this.catalogs.set(catalog.id, {
                ...catalog,
                items: [], // Will be loaded dynamically
                metadata: {
                    itemCount: 0,
                    mediaType: catalog.mediaType,
                    createdAt: Date.now(),
                    lastUpdated: Date.now()
                },
                enabled: this.app.catalogSettings[catalog.mediaType === 'movie' ? 'movies' : 'series'],
                logo: 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg'
            });
        }
    }

    async loadStremioAddonCatalogs() {
        const stremioAddons = this.app.addons.filter(addon => 
            addon.manifest && addon.manifest.catalogs
        );

        for (const addon of stremioAddons) {
            for (const catalogDef of addon.manifest.catalogs) {
                const catalogId = `stremio_${addon.id}_${catalogDef.id}`;
                
                this.catalogs.set(catalogId, {
                    id: catalogId,
                    name: `${addon.name} - ${catalogDef.name}`,
                    description: `${catalogDef.type} catalog from ${addon.name}`,
                    type: 'stremio',
                    source: addon.name,
                    items: [], // Will be loaded from addon
                    metadata: {
                        itemCount: 0,
                        mediaType: catalogDef.type,
                        createdAt: Date.now(),
                        lastUpdated: Date.now(),
                        addonId: addon.id,
                        catalogId: catalogDef.id
                    },
                    enabled: true,
                    logo: addon.manifest.logo || addon.logo
                });
            }
        }
    }

    getCatalogsByType(type) {
        return Array.from(this.catalogs.values()).filter(catalog => 
            catalog.type === type && catalog.enabled
        );
    }

    getCatalogsByMediaType(mediaType) {
        return Array.from(this.catalogs.values()).filter(catalog => 
            catalog.metadata.mediaType === mediaType && catalog.enabled
        );
    }

    getAllCatalogs() {
        return Array.from(this.catalogs.values());
    }

    getEnabledCatalogs() {
        return Array.from(this.catalogs.values()).filter(catalog => catalog.enabled);
    }

    toggleCatalog(catalogId, enabled) {
        const catalog = this.catalogs.get(catalogId);
        if (catalog) {
            catalog.enabled = enabled;
            this.saveCatalogSettings();
            this.notifyUpdate();
        }
    }

    removeCatalog(catalogId) {
        const catalog = this.catalogs.get(catalogId);
        if (!catalog) return false;

        // Handle different catalog types
        if (catalog.type === 'mdblist') {
            // Remove from MDBList integration
            if (this.app.mdblistIntegration) {
                this.app.mdblistIntegration.removeCatalog(catalogId);
            }
        } else if (catalog.type === 'stremio') {
            // Remove from Stremio addons
            const addonId = catalog.metadata.addonId;
            if (addonId) {
                this.app.removeStremioAddon(addonId);
            }
        }

        this.catalogs.delete(catalogId);
        this.notifyUpdate();
        return true;
    }

    async refreshCatalog(catalogId) {
        const catalog = this.catalogs.get(catalogId);
        if (!catalog) return;

        try {
            if (catalog.type === 'tmdb' && catalog.endpoint) {
                // Refresh TMDB catalog
                const response = await this.app.fetchFromTMDB(catalog.endpoint, { page: 1 });
                catalog.items = response.results || [];
                catalog.metadata.itemCount = catalog.items.length;
                catalog.metadata.lastUpdated = Date.now();
            } else if (catalog.type === 'mdblist') {
                // Refresh MDBList catalog
                if (this.app.mdblistIntegration) {
                    // Trigger refresh in MDBList integration
                    const listId = catalog.id.replace('mdblist_', '');
                    const refreshedData = await this.app.mdblistIntegration.fetchListDetails(listId);
                    if (refreshedData && refreshedData.items) {
                        catalog.items = refreshedData.items;
                        catalog.metadata.itemCount = refreshedData.items.length;
                        catalog.metadata.lastUpdated = Date.now();
                    }
                }
            }

            this.notifyUpdate();
        } catch (error) {
            console.error(`Error refreshing catalog ${catalogId}:`, error);
        }
    }

    async refreshAllCatalogs() {
        const catalogs = this.getEnabledCatalogs();
        const refreshPromises = catalogs.map(catalog => this.refreshCatalog(catalog.id));
        
        try {
            await Promise.all(refreshPromises);
            this.app.showNotification('All catalogs refreshed successfully');
        } catch (error) {
            console.error('Error refreshing catalogs:', error);
            this.app.showNotification('Some catalogs failed to refresh', 'warning');
        }
    }

    setupAutoRefresh() {
        if (this.catalogSettings.autoRefresh && this.catalogSettings.refreshInterval > 0) {
            setInterval(() => {
                this.refreshAllCatalogs();
            }, this.catalogSettings.refreshInterval * 60 * 1000);
        }
    }

    updateSettings(newSettings) {
        this.catalogSettings = { ...this.catalogSettings, ...newSettings };
        this.saveCatalogSettings();
        this.loadAllCatalogs(); // Reload with new settings
    }

    saveCatalogSettings() {
        localStorage.setItem('catalog_management_settings', JSON.stringify(this.catalogSettings));
    }

    addMDBListCatalog(catalog) {
        this.catalogs.set(catalog.id, {
            id: catalog.id,
            name: catalog.name,
            description: catalog.description,
            type: 'mdblist',
            source: 'MDBList',
            items: catalog.catalogs?.[0]?.metas || [],
            metadata: {
                itemCount: catalog.catalogs?.[0]?.metas?.length || 0,
                mediaType: catalog.types?.[0] || 'mixed',
                createdAt: Date.now(),
                lastUpdated: Date.now()
            },
            enabled: true,
            logo: catalog.logo || 'https://mdblist.com/favicon.ico',
            manifest: catalog
        });
        this.notifyUpdate();
    }

    removeMDBListCatalog(catalogId) {
        this.catalogs.delete(catalogId);
        this.notifyUpdate();
    }

    clearMDBListCatalogs() {
        const mdblistCatalogIds = Array.from(this.catalogs.keys()).filter(id => 
            this.catalogs.get(id).type === 'mdblist'
        );
        mdblistCatalogIds.forEach(id => this.catalogs.delete(id));
        this.notifyUpdate();
    }

    notifyUpdate() {
        // Notify other components that catalogs have been updated
        if (this.app.homeTab && this.app.homeTab.loadAddonCatalogs) {
            this.app.homeTab.loadAddonCatalogs();
        }
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('catalogsUpdated', {
            detail: { catalogs: this.getAllCatalogs() }
        }));
    }

    // Get catalog statistics
    getStats() {
        const catalogs = this.getAllCatalogs();
        const enabled = catalogs.filter(c => c.enabled);
        
        return {
            total: catalogs.length,
            enabled: enabled.length,
            disabled: catalogs.length - enabled.length,
            byType: {
                mdblist: catalogs.filter(c => c.type === 'mdblist').length,
                tmdb: catalogs.filter(c => c.type === 'tmdb').length,
                stremio: catalogs.filter(c => c.type === 'stremio').length
            },
            totalItems: enabled.reduce((sum, catalog) => sum + catalog.metadata.itemCount, 0)
        };
    }

    // Export catalog data
    exportCatalogs() {
        const exportData = {
            catalogs: this.getAllCatalogs(),
            settings: this.catalogSettings,
            exportedAt: new Date().toISOString(),
            version: '1.0.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crumble-catalogs-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Import catalog data
    async importCatalogs(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            if (importData.catalogs && Array.isArray(importData.catalogs)) {
                // Import catalogs
                for (const catalog of importData.catalogs) {
                    if (catalog.type === 'mdblist') {
                        this.catalogs.set(catalog.id, catalog);
                    }
                }
                
                // Import settings if available
                if (importData.settings) {
                    this.updateSettings(importData.settings);
                }
                
                this.notifyUpdate();
                this.app.showNotification('Catalogs imported successfully');
            } else {
                throw new Error('Invalid catalog file format');
            }
        } catch (error) {
            console.error('Error importing catalogs:', error);
            this.app.showNotification('Failed to import catalogs', 'error');
        }
    }
}

window.CatalogManager = CatalogManager;