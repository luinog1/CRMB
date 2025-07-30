// Home Tab Controller
class HomeTab {
    constructor(app) {
        this.app = app;
        this.catalogCarousel = new CatalogCarousel(app);
        this.heroBanner = new HeroBanner(app);
    }

    async loadContent() {
        try {
            this.app.showLoading();
            
            // Load hero banner first
            await this.heroBanner.loadFeaturedContent();
            
            // Load catalogs based on settings
            const promises = [];
            
            if (this.app.catalogSettings.trending && this.app.catalogSettings.movies) {
                promises.push(this.loadTrendingMovies());
            }
            
            if (this.app.catalogSettings.popular && this.app.catalogSettings.movies) {
                promises.push(this.loadPopularMovies());
            }
            
            if (this.app.catalogSettings.trending && this.app.catalogSettings.series) {
                promises.push(this.loadTrendingSeries());
            }
            
            if (this.app.catalogSettings.popular && this.app.catalogSettings.series) {
                promises.push(this.loadPopularSeries());
            }

            await Promise.all(promises);
            
        } catch (error) {
            console.error('Error loading home content:', error);
            this.app.showNotification('Error loading content', 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    async loadTrendingMovies() {
        try {
            // Load multiple pages to get more content
            const [page1, page2] = await Promise.all([
                this.app.fetchFromTMDB('/trending/movie/day', { page: 1 }),
                this.app.fetchFromTMDB('/trending/movie/day', { page: 2 })
            ]);
            
            const allResults = [...page1.results, ...page2.results];
            const container = document.getElementById('trending-movies-grid');
            
            if (container) {
                this.catalogCarousel.render(container, allResults, 'movie', 'Trending Movies');
                this.showSection('trending-movies');
            }
        } catch (error) {
            console.error('Error loading trending movies:', error);
            this.hideSection('trending-movies');
        }
    }

    async loadPopularMovies() {
        try {
            // Load multiple pages to get more content
            const [page1, page2] = await Promise.all([
                this.app.fetchFromTMDB('/movie/popular', { page: 1 }),
                this.app.fetchFromTMDB('/movie/popular', { page: 2 })
            ]);
            
            const allResults = [...page1.results, ...page2.results];
            const container = document.getElementById('popular-movies-grid');
            
            if (container) {
                this.catalogCarousel.render(container, allResults, 'movie', 'Popular Movies');
                this.showSection('popular-movies');
            }
        } catch (error) {
            console.error('Error loading popular movies:', error);
            this.hideSection('popular-movies');
        }
    }

    async loadTrendingSeries() {
        try {
            // Load multiple pages to get more content
            const [page1, page2] = await Promise.all([
                this.app.fetchFromTMDB('/trending/tv/day', { page: 1 }),
                this.app.fetchFromTMDB('/trending/tv/day', { page: 2 })
            ]);
            
            const allResults = [...page1.results, ...page2.results];
            const container = document.getElementById('trending-series-grid');
            
            if (container) {
                this.catalogCarousel.render(container, allResults, 'tv', 'Trending Series');
                this.showSection('trending-series');
            }
        } catch (error) {
            console.error('Error loading trending series:', error);
            this.hideSection('trending-series');
        }
    }

    async loadPopularSeries() {
        try {
            // Load multiple pages to get more content
            const [page1, page2] = await Promise.all([
                this.app.fetchFromTMDB('/tv/popular', { page: 1 }),
                this.app.fetchFromTMDB('/tv/popular', { page: 2 })
            ]);
            
            const allResults = [...page1.results, ...page2.results];
            const container = document.getElementById('popular-series-grid');
            
            if (container) {
                this.catalogCarousel.render(container, allResults, 'tv', 'Popular Series');
                this.showSection('popular-series');
            }
        } catch (error) {
            console.error('Error loading popular series:', error);
            this.hideSection('popular-series');
        }
    }

    showSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
            section.classList.add('fade-in');
        }
    }

    hideSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    }

    async loadGenreContent(genreId, mediaType) {
        try {
            const endpoint = mediaType === 'movie' ? '/discover/movie' : '/discover/tv';
            const data = await this.app.fetchFromTMDB(endpoint, {
                with_genres: genreId,
                sort_by: 'popularity.desc'
            });
            
            return data.results;
        } catch (error) {
            console.error(`Error loading ${mediaType} genre content:`, error);
            return [];
        }
    }

    async loadTopRatedContent(mediaType) {
        try {
            const endpoint = mediaType === 'movie' ? '/movie/top_rated' : '/tv/top_rated';
            const data = await this.app.fetchFromTMDB(endpoint);
            
            return data.results;
        } catch (error) {
            console.error(`Error loading top rated ${mediaType}:`, error);
            return [];
        }
    }

    async loadNowPlayingMovies() {
        try {
            const data = await this.app.fetchFromTMDB('/movie/now_playing');
            return data.results;
        } catch (error) {
            console.error('Error loading now playing movies:', error);
            return [];
        }
    }

    async loadUpcomingMovies() {
        try {
            const data = await this.app.fetchFromTMDB('/movie/upcoming');
            return data.results;
        } catch (error) {
            console.error('Error loading upcoming movies:', error);
            return [];
        }
    }

    async loadAiringTodaySeries() {
        try {
            const data = await this.app.fetchFromTMDB('/tv/airing_today');
            return data.results;
        } catch (error) {
            console.error('Error loading airing today series:', error);
            return [];
        }
    }

    async loadOnTheAirSeries() {
        try {
            const data = await this.app.fetchFromTMDB('/tv/on_the_air');
            return data.results;
        } catch (error) {
            console.error('Error loading on the air series:', error);
            return [];
        }
    }

    // Method to add custom catalog sections
    addCustomSection(sectionId, title, content, mediaType) {
        const contentSections = document.querySelector('.content-sections');
        if (!contentSections) return;

        // Check if section already exists
        let section = document.getElementById(sectionId);
        if (!section) {
            section = document.createElement('section');
            section.className = 'catalog-section';
            section.id = sectionId;
            
            const titleElement = document.createElement('h2');
            titleElement.className = 'section-title';
            titleElement.textContent = title;
            
            const gridElement = document.createElement('div');
            gridElement.className = 'catalog-grid';
            gridElement.id = `${sectionId}-grid`;
            
            section.appendChild(titleElement);
            section.appendChild(gridElement);
            contentSections.appendChild(section);
        }

        const container = document.getElementById(`${sectionId}-grid`);
        if (container && content.length > 0) {
            this.catalogGrid.render(container, content, mediaType);
            this.showSection(sectionId);
        }
    }

    // Method to remove custom sections
    removeSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.remove();
        }
    }

    // Method to refresh specific section
    async refreshSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;

        const grid = section.querySelector('.catalog-grid');
        if (grid) {
            grid.innerHTML = '<div class="loading-placeholder">Loading...</div>';
        }

        // Reload based on section type
        switch (sectionId) {
            case 'trending-movies':
                await this.loadTrendingMovies();
                break;
            case 'popular-movies':
                await this.loadPopularMovies();
                break;
            case 'trending-series':
                await this.loadTrendingSeries();
                break;
            case 'popular-series':
                await this.loadPopularSeries();
                break;
        }
    }

    // Method to get section visibility based on settings
    shouldShowSection(sectionId) {
        const sectionMap = {
            'trending-movies': this.app.catalogSettings.trending && this.app.catalogSettings.movies,
            'popular-movies': this.app.catalogSettings.popular && this.app.catalogSettings.movies,
            'trending-series': this.app.catalogSettings.trending && this.app.catalogSettings.series,
            'popular-series': this.app.catalogSettings.popular && this.app.catalogSettings.series
        };

        return sectionMap[sectionId] || false;
    }

    // Method to update sections based on settings
    updateSectionsVisibility() {
        const sections = ['trending-movies', 'popular-movies', 'trending-series', 'popular-series'];
        
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                if (this.shouldShowSection(sectionId)) {
                    this.showSection(sectionId);
                } else {
                    this.hideSection(sectionId);
                }
            }
        });
    }
}

// Make HomeTab available globally
window.HomeTab = HomeTab;