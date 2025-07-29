// Library Tab Controller
class LibraryTab {
    constructor(app) {
        this.app = app;
        this.catalogGrid = new CatalogGrid(app);
        this.watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
        this.watchProgress = JSON.parse(localStorage.getItem('watch_progress') || '{}');
        this.watchHistory = JSON.parse(localStorage.getItem('watch_history') || '[]');
    }

    async loadContent() {
        try {
            this.app.showLoading();
            
            // Update stats
            this.updateLibraryStats();
            
            // Load different sections
            await Promise.all([
                this.loadContinueWatching(),
                this.loadWatchlist(),
                this.loadRecentlyAdded()
            ]);
            
        } catch (error) {
            console.error('Error loading library content:', error);
            this.app.showNotification('Error loading library', 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    updateLibraryStats() {
        const watchlistCount = this.watchlist.length;
        const watchingCount = Object.keys(this.watchProgress).length;
        const completedCount = this.watchHistory.filter(item => item.completed).length;

        const watchlistCountEl = document.getElementById('watchlist-count');
        const watchingCountEl = document.getElementById('watching-count');
        const completedCountEl = document.getElementById('completed-count');

        if (watchlistCountEl) watchlistCountEl.textContent = watchlistCount;
        if (watchingCountEl) watchingCountEl.textContent = watchingCount;
        if (completedCountEl) completedCountEl.textContent = completedCount;
    }

    async loadContinueWatching() {
        const container = document.getElementById('continue-watching');
        if (!container) return;

        const progressItems = Object.entries(this.watchProgress)
            .filter(([key, progress]) => progress.percentage < 90) // Not completed
            .sort((a, b) => b[1].lastWatched - a[1].lastWatched) // Most recent first
            .slice(0, 10); // Limit to 10 items

        if (progressItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <polygon points="5,3 19,12 5,21"/>
                    </svg>
                    <p>No items in progress</p>
                    <p class="empty-subtitle">Start watching something to see it here</p>
                </div>
            `;
            this.addEmptyStateCSS();
            return;
        }

        // Fetch metadata for progress items
        const mediaPromises = progressItems.map(async ([key, progress]) => {
            const [mediaType, mediaId] = key.split('_');
            try {
                const endpoint = mediaType === 'movie' ? `/movie/${mediaId}` : `/tv/${mediaId}`;
                const media = await this.app.fetchFromTMDB(endpoint);
                return {
                    ...media,
                    media_type: mediaType,
                    progress: progress
                };
            } catch (error) {
                console.warn(`Failed to load metadata for ${key}:`, error);
                return null;
            }
        });

        const mediaItems = (await Promise.all(mediaPromises)).filter(Boolean);
        this.renderContinueWatching(container, mediaItems);
    }

    renderContinueWatching(container, items) {
        container.innerHTML = '';
        
        items.forEach(item => {
            const card = this.createProgressCard(item);
            container.appendChild(card);
        });
    }

    createProgressCard(item) {
        const card = document.createElement('div');
        card.className = 'progress-card';
        
        const title = item.media_type === 'movie' ? item.title : item.name;
        const posterUrl = this.app.getImageUrl(item.poster_path);
        const progress = item.progress;

        card.innerHTML = `
            <div class="progress-poster-container">
                <img src="${posterUrl}" alt="${title}" class="media-poster" loading="lazy">
                <div class="progress-overlay">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress.percentage}%"></div>
                    </div>
                    <span class="progress-text">${Math.round(progress.percentage)}%</span>
                </div>
                <button class="continue-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="5,3 19,12 5,21"/>
                    </svg>
                </button>
            </div>
            <div class="progress-info">
                <h4 class="progress-title">${title}</h4>
                <p class="progress-meta">
                    ${progress.currentTime ? this.formatTime(progress.currentTime) : 'In Progress'}
                    ${progress.episode ? ` • S${progress.season}E${progress.episode}` : ''}
                </p>
                <p class="progress-last-watched">
                    ${this.formatLastWatched(progress.lastWatched)}
                </p>
            </div>
        `;

        // Add click handlers
        card.addEventListener('click', () => {
            this.app.openMediaDetails(item.media_type, item.id);
        });

        const continueBtn = card.querySelector('.continue-btn');
        continueBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.continueWatching(item.media_type, item.id, progress);
        });

        return card;
    }

    async loadWatchlist() {
        const container = document.getElementById('watchlist');
        if (!container) return;

        if (this.watchlist.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>
                    </svg>
                    <p>Your watchlist is empty</p>
                    <p class="empty-subtitle">Add movies and series to keep track of what you want to watch</p>
                </div>
            `;
            return;
        }

        // Sort by most recently added
        const sortedWatchlist = [...this.watchlist].sort((a, b) => b.addedAt - a.addedAt);

        // Fetch metadata for watchlist items
        const mediaPromises = sortedWatchlist.slice(0, 20).map(async (item) => {
            try {
                const endpoint = item.mediaType === 'movie' ? `/movie/${item.id}` : `/tv/${item.id}`;
                const media = await this.app.fetchFromTMDB(endpoint);
                return {
                    ...media,
                    media_type: item.mediaType,
                    addedAt: item.addedAt
                };
            } catch (error) {
                console.warn(`Failed to load watchlist item ${item.id}:`, error);
                return null;
            }
        });

        const mediaItems = (await Promise.all(mediaPromises)).filter(Boolean);
        this.catalogGrid.render(container, mediaItems, null); // Mixed media types
    }

    async loadRecentlyAdded() {
        const container = document.getElementById('recently-added');
        if (!container) return;

        // Get recently added items from watchlist and history
        const recentItems = [
            ...this.watchlist.map(item => ({ ...item, type: 'watchlist' })),
            ...this.watchHistory.map(item => ({ ...item, type: 'history' }))
        ]
        .sort((a, b) => (b.addedAt || b.watchedAt) - (a.addedAt || a.watchedAt))
        .slice(0, 10);

        if (recentItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M12 2v20m8-10H4"/>
                    </svg>
                    <p>No recent activity</p>
                    <p class="empty-subtitle">Your recently added items will appear here</p>
                </div>
            `;
            return;
        }

        // Fetch metadata
        const mediaPromises = recentItems.map(async (item) => {
            try {
                const endpoint = item.mediaType === 'movie' ? `/movie/${item.id}` : `/tv/${item.id}`;
                const media = await this.app.fetchFromTMDB(endpoint);
                return {
                    ...media,
                    media_type: item.mediaType,
                    recentType: item.type,
                    timestamp: item.addedAt || item.watchedAt
                };
            } catch (error) {
                console.warn(`Failed to load recent item ${item.id}:`, error);
                return null;
            }
        });

        const mediaItems = (await Promise.all(mediaPromises)).filter(Boolean);
        this.catalogGrid.render(container, mediaItems, null);
    }

    addEmptyStateCSS() {
        if (document.getElementById('empty-state-styles')) return;

        const style = document.createElement('style');
        style.id = 'empty-state-styles';
        style.textContent = `
            .empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 60px 20px;
                text-align: center;
                color: var(--text-muted);
                grid-column: 1 / -1;
            }

            .empty-state svg {
                width: 48px;
                height: 48px;
                margin-bottom: 16px;
                opacity: 0.5;
            }

            .empty-state p {
                font-size: 18px;
                margin-bottom: 8px;
                color: var(--text-secondary);
            }

            .empty-subtitle {
                font-size: 14px !important;
                color: var(--text-muted) !important;
            }

            .progress-card {
                background: var(--secondary-bg);
                border-radius: var(--border-radius);
                overflow: hidden;
                cursor: pointer;
                transition: var(--transition);
                border: 1px solid transparent;
            }

            .progress-card:hover {
                transform: translateY(-4px);
                box-shadow: var(--shadow-hover);
                border-color: var(--accent-green);
            }

            .progress-poster-container {
                position: relative;
                aspect-ratio: 2/3;
            }

            .progress-overlay {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
                padding: 16px;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .progress-bar {
                flex: 1;
                height: 4px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 2px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                background: var(--accent-green);
                transition: width 0.3s ease;
            }

            .progress-text {
                font-size: 12px;
                color: white;
                font-weight: 600;
            }

            .continue-btn {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 48px;
                height: 48px;
                background: rgba(0, 0, 0, 0.8);
                border: 2px solid var(--accent-green);
                border-radius: 50%;
                color: var(--accent-green);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
            }

            .progress-card:hover .continue-btn {
                opacity: 1;
            }

            .continue-btn:hover {
                background: var(--accent-green);
                color: var(--primary-bg);
                transform: translate(-50%, -50%) scale(1.1);
            }

            .continue-btn svg {
                width: 20px;
                height: 20px;
            }

            .progress-info {
                padding: 16px;
            }

            .progress-title {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 8px;
                line-height: 1.3;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .progress-meta {
                font-size: 14px;
                color: var(--text-secondary);
                margin-bottom: 4px;
            }

            .progress-last-watched {
                font-size: 12px;
                color: var(--text-muted);
            }
        `;

        document.head.appendChild(style);
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    formatLastWatched(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor(diff / (1000 * 60));

        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }

    continueWatching(mediaType, mediaId, progress) {
        // This would typically resume playback from the stored position
        this.app.showStreamOptions(mediaType, mediaId);
    }

    addToWatchlist(mediaType, mediaId) {
        const item = {
            mediaType,
            id: mediaId,
            addedAt: Date.now()
        };

        if (!this.watchlist.find(w => w.mediaType === mediaType && w.id === mediaId)) {
            this.watchlist.push(item);
            localStorage.setItem('watchlist', JSON.stringify(this.watchlist));
            this.app.showNotification('Added to watchlist');
            this.loadContent(); // Refresh
        }
    }

    removeFromWatchlist(mediaType, mediaId) {
        this.watchlist = this.watchlist.filter(item => 
            !(item.mediaType === mediaType && item.id === mediaId)
        );
        localStorage.setItem('watchlist', JSON.stringify(this.watchlist));
        this.app.showNotification('Removed from watchlist');
        this.loadContent(); // Refresh
    }

    updateWatchProgress(mediaType, mediaId, progress) {
        const key = `${mediaType}_${mediaId}`;
        this.watchProgress[key] = {
            ...progress,
            lastWatched: Date.now()
        };
        localStorage.setItem('watch_progress', JSON.stringify(this.watchProgress));
    }

    markAsCompleted(mediaType, mediaId) {
        const key = `${mediaType}_${mediaId}`;
        
        // Remove from progress
        delete this.watchProgress[key];
        localStorage.setItem('watch_progress', JSON.stringify(this.watchProgress));

        // Add to history
        const historyItem = {
            mediaType,
            id: mediaId,
            watchedAt: Date.now(),
            completed: true
        };

        this.watchHistory.unshift(historyItem);
        
        // Limit history size
        if (this.watchHistory.length > 100) {
            this.watchHistory = this.watchHistory.slice(0, 100);
        }
        
        localStorage.setItem('watch_history', JSON.stringify(this.watchHistory));
        this.app.showNotification('Marked as completed');
        this.loadContent(); // Refresh
    }

    clearWatchHistory() {
        if (confirm('Are you sure you want to clear your watch history?')) {
            this.watchHistory = [];
            localStorage.removeItem('watch_history');
            this.app.showNotification('Watch history cleared');
            this.loadContent();
        }
    }

    clearWatchProgress() {
        if (confirm('Are you sure you want to clear all watch progress?')) {
            this.watchProgress = {};
            localStorage.removeItem('watch_progress');
            this.app.showNotification('Watch progress cleared');
            this.loadContent();
        }
    }

    exportLibraryData() {
        const data = {
            watchlist: this.watchlist,
            watchProgress: this.watchProgress,
            watchHistory: this.watchHistory,
            exportedAt: Date.now()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `crumble-library-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.app.showNotification('Library data exported');
    }

    async importLibraryData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (data.watchlist) this.watchlist = data.watchlist;
            if (data.watchProgress) this.watchProgress = data.watchProgress;
            if (data.watchHistory) this.watchHistory = data.watchHistory;

            localStorage.setItem('watchlist', JSON.stringify(this.watchlist));
            localStorage.setItem('watch_progress', JSON.stringify(this.watchProgress));
            localStorage.setItem('watch_history', JSON.stringify(this.watchHistory));

            this.app.showNotification('Library data imported successfully');
            this.loadContent();
        } catch (error) {
            console.error('Import error:', error);
            this.app.showNotification('Failed to import library data', 'error');
        }
    }
}

// Make LibraryTab available globally
window.LibraryTab = LibraryTab;