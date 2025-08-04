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
            <section id="hero" class="relative h-[60vh] w-full overflow-hidden rounded-xl shadow-lg mb-6 bg-black">
                <img 
                    id="hero-bg" 
                    src="${backdropUrl}" 
                    alt="${title}" 
                    class="absolute inset-0 w-full h-full object-cover z-0 opacity-70" 
                />
                <div class="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent z-10"></div>
                
                <div class="relative z-20 px-10 py-16 flex flex-col justify-center max-w-4xl">
                    <h1 id="hero-title" class="text-white text-4xl md:text-5xl font-bold mb-3 font-['Lobster']">${title}</h1>
                    <p id="hero-overview" class="text-zinc-300 text-lg mb-5">${this.truncateText(media.overview, 200)}</p>
                    <div class="flex gap-4">
                        <button 
                            onclick="app.showStreamOptions('${media.media_type}', ${media.id})" 
                            class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full transition-colors duration-200 flex items-center gap-2">
                            <span>▶</span> Play
                        </button>
                        <button 
                            onclick="app.showMediaDetails('${media.media_type}', ${media.id})" 
                            class="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full transition-colors duration-200 flex items-center gap-2">
                            <span>🎬</span> Find Streams
                        </button>
                    </div>
                </div>
            </section>
        `;

        // Add hero indicators if we have multiple featured items
        if (this.featuredItems && this.featuredItems.length > 1) {
            this.createHeroIndicators();
        }
    }

    createHeroIndicators() {
        const container = document.getElementById('hero-banner');
        if (!container) return;

        const indicatorsHtml = `
            <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-30">
                ${this.featuredItems.map((_, index) => `
                    <button 
                        class="w-3 h-3 rounded-full transition-all duration-200 ${
                            index === 0 ? 'bg-white' : 'bg-white/50'
                        }" 
                        onclick="heroBanner.loadHeroContent(heroBanner.featuredItems[${index}]); heroBanner.resetAutoRotation();"
                    ></button>
                `).join('')}
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', indicatorsHtml);
    }

    preloadNextImage() {
        if (this.featuredItems && this.featuredItems.length > 1) {
            const currentIndex = this.featuredItems.findIndex(item => item.id === this.currentMedia?.id);
            const nextIndex = (currentIndex + 1) % this.featuredItems.length;
            const nextItem = this.featuredItems[nextIndex];
            
            if (nextItem?.backdrop_path) {
                const img = new Image();
                img.src = this.app.getBackdropUrl(nextItem.backdrop_path);
            }
        }
    }

    startAutoRotation() {
        if (this.featuredItems && this.featuredItems.length > 1) {
            this.autoRotateInterval = setInterval(() => {
                const currentIndex = this.featuredItems.findIndex(item => item.id === this.currentMedia?.id);
                const nextIndex = (currentIndex + 1) % this.featuredItems.length;
                this.loadHeroContent(this.featuredItems[nextIndex]);
            }, this.rotationDelay);
        }
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
            <section id="hero" class="relative h-[60vh] w-full overflow-hidden rounded-xl shadow-lg mb-6 bg-black">
                <img 
                    id="hero-bg" 
                    src="https://image.tmdb.org/t/p/original/s3TBrRGB1iav7gFOCNx3H31MoES.jpg" 
                    alt="CRUMBLE" 
                    class="absolute inset-0 w-full h-full object-cover z-0 opacity-70" 
                />
                <div class="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent z-10"></div>
                
                <div class="relative z-20 px-10 py-16 flex flex-col justify-center max-w-4xl">
                    <h1 id="hero-title" class="text-white text-4xl md:text-5xl font-bold mb-3 font-['Lobster']">CRUMBLE</h1>
                    <p id="hero-overview" class="text-zinc-300 text-lg mb-5">Your ultimate destination for streaming movies and TV series. Discover trending content, explore vast catalogs, and enjoy seamless streaming experience.</p>
                    <div class="flex gap-4">
                        <button 
                            onclick="app.switchTab('search')" 
                            class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full transition-colors duration-200 flex items-center gap-2">
                            <span>🔍</span> Explore Content
                        </button>
                        <button 
                            onclick="app.switchTab('settings')" 
                            class="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full transition-colors duration-200 flex items-center gap-2">
                            <span>⚙️</span> Settings
                        </button>
                    </div>
                </div>
            </section>
        `;
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    async setHeroContent(mediaType, mediaId) {
        try {
            const endpoint = mediaType === 'movie' ? `/movie/${mediaId}` : `/tv/${mediaId}`;
            const media = await this.app.fetchFromTMDB(endpoint);
            media.media_type = mediaType;
            await this.loadHeroContent(media);
        } catch (error) {
            console.error('Error setting hero content:', error);
            this.loadFallbackHero();
        }
    }

    addCustomHero(title, overview, backdropUrl, actions = []) {
        const container = document.getElementById('hero-banner');
        if (!container) return;

        const actionsHtml = actions.map(action => `
            <button 
                onclick="${action.onclick}" 
                class="${
                    action.primary 
                        ? 'bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full transition-colors duration-200 flex items-center gap-2' 
                        : 'bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full transition-colors duration-200 flex items-center gap-2'
                }"
            >
                ${action.icon || ''}
                <span>${action.text}</span>
            </button>
        `).join('');

        container.innerHTML = `
            <section id="hero" class="relative h-[60vh] w-full overflow-hidden rounded-xl shadow-lg mb-6 bg-black">
                <img 
                    id="hero-bg" 
                    src="${backdropUrl}" 
                    alt="${title}" 
                    class="absolute inset-0 w-full h-full object-cover z-0 opacity-70" 
                />
                <div class="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent z-10"></div>
                
                <div class="relative z-20 px-10 py-16 flex flex-col justify-center max-w-4xl">
                    <h1 id="hero-title" class="text-white text-4xl md:text-5xl font-bold mb-3 font-['Lobster']">${title}</h1>
                    <p id="hero-overview" class="text-zinc-300 text-lg mb-5">${overview}</p>
                    <div class="flex gap-4">
                        ${actionsHtml}
                    </div>
                </div>
            </section>
        `;
    }

    async refresh() {
        await this.loadFeaturedContent();
    }

    destroy() {
        this.stopAutoRotation();
        this.currentMedia = null;
        this.featuredItems = null;
    }
}

// Make HeroBanner available globally
window.HeroBanner = HeroBanner;