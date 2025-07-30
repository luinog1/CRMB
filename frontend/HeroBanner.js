// Hero Banner Component
class HeroBanner {
    constructor(app) {
        this.app = app;
        this.currentMedia = null;
        this.autoRotateInterval = null;
        this.rotationDelay = 10000; // 10 seconds
    }

    async loadFeaturedContent() {
        try {
            // Get trending content for hero banner
            const trendingMovies = await this.app.fetchFromTMDB('/trending/movie/day', { page: 1 });
            const trendingSeries = await this.app.fetchFromTMDB('/trending/tv/day', { page: 1 });
            
            // Combine and filter high-quality content
            const allTrending = [
                ...trendingMovies.results.map(item => ({ ...item, media_type: 'movie' })),
                ...trendingSeries.results.map(item => ({ ...item, media_type: 'tv' }))
            ];

            // Filter for high-quality content (good ratings and backdrop images)
            const featuredContent = allTrending.filter(item => 
                item.vote_average >= 7.0 && 
                item.backdrop_path && 
                item.overview &&
                item.overview.length > 50
            );

            if (featuredContent.length > 0) {
                // Sort by popularity and take top items
                featuredContent.sort((a, b) => b.popularity - a.popularity);
                this.featuredItems = featuredContent.slice(0, 5);
                
                // Load first item
                await this.loadHeroContent(this.featuredItems[0]);
                
                // Start auto-rotation
                this.startAutoRotation();
            } else {
                this.loadFallbackHero();
            }
        } catch (error) {
            console.error('Error loading featured content:', error);
            this.loadFallbackHero();
        }
    }

    async loadHeroContent(media) {
        if (!media) return;

        this.currentMedia = media;
        const container = document.getElementById('hero-banner');
        if (!container) return;

        const title = media.media_type === 'movie' ? media.title : media.name;
        const releaseDate = media.media_type === 'movie' ? media.release_date : media.first_air_date;
        const backdropUrl = this.app.getBackdropUrl(media.backdrop_path);

        // Get additional details
        let additionalInfo = '';
        try {
            const endpoint = media.media_type === 'movie' ? `/movie/${media.id}` : `/tv/${media.id}`;
            const details = await this.app.fetchFromTMDB(endpoint);
            
            if (media.media_type === 'movie' && details.runtime) {
                additionalInfo = this.app.formatRuntime(details.runtime);
            } else if (media.media_type === 'tv' && details.number_of_seasons) {
                additionalInfo = `${details.number_of_seasons} Season${details.number_of_seasons > 1 ? 's' : ''}`;
            }
        } catch (error) {
            console.warn('Could not load additional details for hero content');
        }

        container.innerHTML = `
            <img src="${backdropUrl}" alt="${title}" class="hero-backdrop" loading="eager">
            <div class="hero-gradient"></div>
            <div class="hero-content">
                <div class="hero-info">
                    <h1 class="hero-title">${title}</h1>
                    <div class="hero-meta">
                        <span class="hero-type">${media.media_type === 'movie' ? 'Movie' : 'TV Series'}</span>
                        <span class="hero-year">${this.app.formatDate(releaseDate)}</span>
                        ${additionalInfo ? `<span class="hero-runtime">${additionalInfo}</span>` : ''}
                        <span class="hero-rating">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            ${this.app.formatRating(media.vote_average)}
                        </span>
                    </div>
                    <p class="hero-overview">${this.truncateText(media.overview, 180)}</p>
                </div>
                <div class="hero-actions">
                    <button class="hero-btn hero-btn-primary" onclick="app.showStreamOptions('${media.media_type}', ${media.id})">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        <span>Watch Now</span>
                    </button>
                    <button class="hero-btn hero-btn-secondary" onclick="app.openMediaDetails('${media.media_type}', ${media.id})">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 16v-4"/>
                            <path d="M12 8h.01"/>
                        </svg>
                        <span>More Info</span>
                    </button>
                    <button class="hero-btn hero-btn-tertiary" onclick="app.addToWatchlist('${media.media_type}', ${media.id})">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>
                        </svg>
                        <span>Watchlist</span>
                    </button>
                </div>
                ${this.featuredItems && this.featuredItems.length > 1 ? this.createHeroIndicators() : ''}
            </div>
        `;

        // Add fade-in animation
        container.classList.add('fade-in');
        
        // Preload next image for smooth transitions
        this.preloadNextImage();
    }

    createHeroIndicators() {
        const currentIndex = this.featuredItems.findIndex(item => item.id === this.currentMedia.id);
        
        return `
            <div class="hero-indicators">
                ${this.featuredItems.map((item, index) => `
                    <button class="hero-indicator ${index === currentIndex ? 'active' : ''}" 
                            onclick="heroBanner.loadHeroContent(heroBanner.featuredItems[${index}]); heroBanner.resetAutoRotation();">
                    </button>
                `).join('')}
            </div>
        `;
    }

    preloadNextImage() {
        if (!this.featuredItems || this.featuredItems.length <= 1) return;
        
        const currentIndex = this.featuredItems.findIndex(item => item.id === this.currentMedia.id);
        const nextIndex = (currentIndex + 1) % this.featuredItems.length;
        const nextItem = this.featuredItems[nextIndex];
        
        if (nextItem && nextItem.backdrop_path) {
            const img = new Image();
            img.src = this.app.getBackdropUrl(nextItem.backdrop_path);
        }
    }

    startAutoRotation() {
        if (!this.featuredItems || this.featuredItems.length <= 1) return;
        
        this.stopAutoRotation();
        
        this.autoRotateInterval = setInterval(() => {
            const currentIndex = this.featuredItems.findIndex(item => item.id === this.currentMedia.id);
            const nextIndex = (currentIndex + 1) % this.featuredItems.length;
            this.loadHeroContent(this.featuredItems[nextIndex]);
        }, this.rotationDelay);
    }

    stopAutoRotation() {
        if (this.autoRotateInterval) {
            clearInterval(this.autoRotateInterval);
            this.autoRotateInterval = null;
        }
    }

    resetAutoRotation() {
        this.stopAutoRotation();
        this.startAutoRotation();
    }

    loadFallbackHero() {
        const container = document.getElementById('hero-banner');
        if (!container) return;

        container.innerHTML = `
            <div class="hero-content fallback">
                <h1 class="hero-title">Welcome to CRUMBLE</h1>
                <p class="hero-overview">Your ultimate destination for streaming movies and TV series. Discover trending content, manage your watchlist, and enjoy seamless playback with multiple streaming sources.</p>
                <div class="hero-actions">
                    <button class="btn-primary" onclick="app.switchTab('search')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        Start Exploring
                    </button>
                    <button class="btn-secondary" onclick="app.switchTab('settings')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                        </svg>
                        Settings
                    </button>
                </div>
            </div>
        `;

        // Add CSS for fallback hero
        this.addFallbackCSS();
    }

    addFallbackCSS() {
        if (document.getElementById('hero-fallback-styles')) return;

        const style = document.createElement('style');
        style.id = 'hero-fallback-styles';
        style.textContent = `
            .hero-content.fallback {
                background: linear-gradient(135deg, var(--secondary-bg) 0%, var(--tertiary-bg) 100%);
                text-align: center;
                padding: 80px 40px;
                border-radius: var(--border-radius);
                margin: 40px;
            }

            .hero-indicators {
                display: flex;
                justify-content: center;
                gap: 12px;
                margin-top: 32px;
            }

            .hero-indicator {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.3);
                background: transparent;
                cursor: pointer;
                transition: var(--transition);
            }

            .hero-indicator.active {
                background: var(--accent-green);
                border-color: var(--accent-green);
            }

            .hero-indicator:hover {
                border-color: var(--accent-green);
                transform: scale(1.2);
            }
        `;

        document.head.appendChild(style);
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    // Method to manually set hero content
    async setHeroContent(mediaType, mediaId) {
        try {
            const endpoint = mediaType === 'movie' ? `/movie/${mediaId}` : `/tv/${mediaId}`;
            const media = await this.app.fetchFromTMDB(endpoint);
            
            if (media) {
                media.media_type = mediaType;
                await this.loadHeroContent(media);
                this.stopAutoRotation(); // Stop auto-rotation when manually set
            }
        } catch (error) {
            console.error('Error setting hero content:', error);
        }
    }

    // Method to add custom hero content
    addCustomHero(title, overview, backdropUrl, actions = []) {
        const container = document.getElementById('hero-banner');
        if (!container) return;

        const actionsHTML = actions.map(action => `
            <button class="${action.class || 'btn-primary'}" onclick="${action.onclick || ''}">
                ${action.icon || ''}
                ${action.text}
            </button>
        `).join('');

        container.innerHTML = `
            <img src="${backdropUrl}" alt="${title}" class="hero-backdrop" loading="eager">
            <div class="hero-content">
                <h1 class="hero-title">${title}</h1>
                <p class="hero-overview">${overview}</p>
                <div class="hero-actions">
                    ${actionsHTML}
                </div>
            </div>
        `;

        this.stopAutoRotation();
    }

    // Method to refresh hero content
    async refresh() {
        await this.loadFeaturedContent();
    }

    // Cleanup method
    destroy() {
        this.stopAutoRotation();
        this.currentMedia = null;
        this.featuredItems = null;
    }
}

// Make HeroBanner available globally
window.HeroBanner = HeroBanner;