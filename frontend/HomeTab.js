// Home Tab Controller
class HomeTab {
    constructor(app) {
        this.app = app;
        this.catalogCarousel = new CatalogCarousel(app);
        this.catalogGrid = new CatalogGrid(app);
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

            // Load addon catalogs
            promises.push(this.loadAddonCatalogs());

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
            const section = document.getElementById('trending-movies');
            
            if (container && section) {
                // Create header with title and see all button
                const existingHeader = section.querySelector('.section-header');
                if (!existingHeader) {
                    const titleElement = section.querySelector('.carousel-title');
                    if (titleElement) {
                        const headerElement = document.createElement('div');
                        headerElement.className = 'section-header';
                        
                        const seeAllButton = document.createElement('button');
                        seeAllButton.className = 'see-all-btn';
                        seeAllButton.textContent = 'See All';
                        seeAllButton.onclick = () => this.showAllCatalogItems('trending-movies', 'Trending Movies', allResults, 'movie');
                        
                        headerElement.appendChild(titleElement);
                        headerElement.appendChild(seeAllButton);
                        section.insertBefore(headerElement, container);
                    }
                }
                
                // Limit to 30 items for carousel display
                const displayContent = allResults.slice(0, 30);
                this.catalogCarousel.render(container, displayContent, 'movie');
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
            const section = document.getElementById('popular-movies');
            
            if (container && section) {
                // Create header with title and see all button
                const existingHeader = section.querySelector('.section-header');
                if (!existingHeader) {
                    const titleElement = section.querySelector('.carousel-title');
                    if (titleElement) {
                        const headerElement = document.createElement('div');
                        headerElement.className = 'section-header';
                        
                        const seeAllButton = document.createElement('button');
                        seeAllButton.className = 'see-all-btn';
                        seeAllButton.textContent = 'See All';
                        seeAllButton.onclick = () => this.showAllCatalogItems('popular-movies', 'Popular Movies', allResults, 'movie');
                        
                        headerElement.appendChild(titleElement);
                        headerElement.appendChild(seeAllButton);
                        section.insertBefore(headerElement, container);
                    }
                }
                
                // Limit to 30 items for carousel display
                const displayContent = allResults.slice(0, 30);
                this.catalogCarousel.render(container, displayContent, 'movie');
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
            const section = document.getElementById('trending-series');
            
            if (container && section) {
                // Create header with title and see all button
                const existingHeader = section.querySelector('.section-header');
                if (!existingHeader) {
                    const titleElement = section.querySelector('.carousel-title');
                    if (titleElement) {
                        const headerElement = document.createElement('div');
                        headerElement.className = 'section-header';
                        
                        const seeAllButton = document.createElement('button');
                        seeAllButton.className = 'see-all-btn';
                        seeAllButton.textContent = 'See All';
                        seeAllButton.onclick = () => this.showAllCatalogItems('trending-series', 'Trending Series', allResults, 'tv');
                        
                        headerElement.appendChild(titleElement);
                        headerElement.appendChild(seeAllButton);
                        section.insertBefore(headerElement, container);
                    }
                }
                
                // Limit to 30 items for carousel display
                const displayContent = allResults.slice(0, 30);
                this.catalogCarousel.render(container, displayContent, 'tv');
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
            const section = document.getElementById('popular-series');
            
            if (container && section) {
                // Create header with title and see all button
                const existingHeader = section.querySelector('.section-header');
                if (!existingHeader) {
                    const titleElement = section.querySelector('.carousel-title');
                    if (titleElement) {
                        const headerElement = document.createElement('div');
                        headerElement.className = 'section-header';
                        
                        const seeAllButton = document.createElement('button');
                        seeAllButton.className = 'see-all-btn';
                        seeAllButton.textContent = 'See All';
                        seeAllButton.onclick = () => this.showAllCatalogItems('popular-series', 'Popular Series', allResults, 'tv');
                        
                        headerElement.appendChild(titleElement);
                        headerElement.appendChild(seeAllButton);
                        section.insertBefore(headerElement, container);
                    }
                }
                
                // Limit to 30 items for carousel display
                const displayContent = allResults.slice(0, 30);
                this.catalogCarousel.render(container, displayContent, 'tv');
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
            
            // Create header with title and see all button
            const headerElement = document.createElement('div');
            headerElement.className = 'section-header';
            
            const titleElement = document.createElement('h2');
            titleElement.className = 'section-title';
            titleElement.textContent = title;
            
            const seeAllButton = document.createElement('button');
            seeAllButton.className = 'see-all-btn';
            seeAllButton.textContent = 'See All';
            seeAllButton.onclick = () => this.showAllCatalogItems(sectionId, title, content, mediaType);
            
            headerElement.appendChild(titleElement);
            headerElement.appendChild(seeAllButton);
            
            // Use carousel for MDBList catalogs, grid for others  
            const isCarousel = sectionId.includes('catalog-') && (title.toLowerCase().includes('mdblist') || title.includes('(mdblist)'));
            const containerElement = document.createElement('div');
            containerElement.className = isCarousel ? 'catalog-carousel' : 'catalog-grid';
            containerElement.id = `${sectionId}-container`;
            
            section.appendChild(headerElement);
            section.appendChild(containerElement);
            contentSections.appendChild(section);
        }

        const container = document.getElementById(`${sectionId}-container`);
        if (container && content.length > 0) {
            // Limit to 30 items for carousel display
            const displayContent = container.className.includes('carousel') ? content.slice(0, 30) : content;
            
            if (container.className.includes('carousel')) {
                this.catalogCarousel.render(container, displayContent, mediaType);
            } else {
                this.catalogGrid.render(container, displayContent, mediaType);
            }
            this.showSection(sectionId);
        }
    }
    
    showAllCatalogItems(sectionId, title, content, mediaType) {
        // Create a modal or new page to show all catalog items
        const modal = document.createElement('div');
        modal.className = 'catalog-modal';
        modal.innerHTML = `
            <div class="catalog-modal-content">
                <div class="catalog-modal-header">
                    <h2>${title} - All Items (${content.length})</h2>
                    <button class="catalog-modal-close">&times;</button>
                </div>
                <div class="catalog-modal-body">
                    <div class="catalog-grid" id="modal-catalog-grid"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Render all items in the modal
        const modalGrid = modal.querySelector('#modal-catalog-grid');
        if (modalGrid) {
            this.catalogGrid.render(modalGrid, content, mediaType);
        }
        
        // Close modal functionality
        const closeBtn = modal.querySelector('.catalog-modal-close');
        closeBtn.onclick = () => {
            document.body.removeChild(modal);
        };
        
        // Close on backdrop click
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
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

    async loadAddonCatalogs() {
        try {
            if (!this.app.catalogManager) return;
            
            // Get all enabled catalogs from catalog manager
            const enabledCatalogs = this.app.catalogManager.getEnabledCatalogs();
            
            // Remove existing addon sections first
            this.removeAddonSections();
            
            for (const catalog of enabledCatalogs) {
                if (catalog.items && catalog.items.length > 0) {
                    const sectionId = `catalog-${catalog.id}`;
                    const title = `${catalog.name} (${catalog.source})`;
                    
                    // Add section to home page
                    this.addCustomSection(sectionId, title, catalog.items, catalog.metadata.mediaType);
                }
            }
        } catch (error) {
            console.error('Error loading addon catalogs:', error);
        }
    }

    removeAddonSections() {
        // Remove all existing catalog sections
        const contentSections = document.querySelector('.content-sections');
        if (contentSections) {
            const catalogSections = contentSections.querySelectorAll('[id^="catalog-"]');
            catalogSections.forEach(section => section.remove());
        }
    }

    determineMediaType(catalogData) {
        if (!catalogData || catalogData.length === 0) return 'movie';
        
        // Check the first few items to determine type
        const sampleItems = catalogData.slice(0, 5);
        const movieCount = sampleItems.filter(item => 
            item.type === 'movie' || 
            (item.id && item.id.startsWith('tt') && !item.episode_count)
        ).length;
        
        return movieCount > sampleItems.length / 2 ? 'movie' : 'tv';
    }
}

// Make HomeTab available globally
window.HomeTab = HomeTab;