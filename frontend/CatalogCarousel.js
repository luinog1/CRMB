// CSS-Only Carousel Implementation
class CatalogCarousel {
    constructor(app) {
        this.app = app;
    }

    render(container, items, mediaType, title) {
        if (!container || !items || items.length === 0) {
            return;
        }

        // Clear existing content
        container.innerHTML = '';
        
        // Only add section header if container doesn't have a parent with existing title
        const parentSection = container.closest('.carousel-section');
        const hasExistingTitle = parentSection && parentSection.querySelector('.carousel-title, h2');
        
        if (title && !hasExistingTitle) {
            const header = this.createSectionHeader(title, mediaType);
            container.appendChild(header);
        }
        
        // Create carousel structure
        const carousel = this.createCarousel(items, mediaType, title);
        container.appendChild(carousel);
        
        // Add navigation functionality
        this.addNavigationControls(container, carousel);
    }

    createSectionHeader(title, mediaType) {
        const header = document.createElement('div');
        header.className = 'section-header';
        
        const titleElement = document.createElement('h2');
        titleElement.className = 'section-title';
        titleElement.textContent = title;
        
        const seeAllButton = document.createElement('button');
        seeAllButton.className = 'see-all-btn';
        seeAllButton.textContent = 'See All';
        seeAllButton.onclick = () => {
            // Switch to search tab and filter by media type
            this.app.switchTab('search');
            // Set search filters based on the section
            if (title.toLowerCase().includes('trending')) {
                this.app.searchTab?.setFilter('trending', mediaType);
            } else if (title.toLowerCase().includes('popular')) {
                this.app.searchTab?.setFilter('popular', mediaType);
            } else {
                this.app.searchTab?.setFilter('all', mediaType);
            }
        };
        
        header.appendChild(titleElement);
        header.appendChild(seeAllButton);
        
        return header;
    }

    createCarousel(items, mediaType, title) {
        const carousel = document.createElement('div');
        carousel.className = 'carousel';
        
        const carouselContainer = document.createElement('div');
        carouselContainer.className = 'carousel-container';
        carouselContainer.id = `carousel-${Date.now()}`;
        
        // Create carousel items
        items.forEach((item, index) => {
            const carouselItem = this.createCarouselItem(item, mediaType, index);
            carouselContainer.appendChild(carouselItem);
        });
        
        carousel.appendChild(carouselContainer);
        return carousel;
    }

    createCarouselItem(item, mediaType, index) {
        const carouselItem = document.createElement('div');
        carouselItem.className = 'carousel-item';
        carouselItem.dataset.mediaType = mediaType;
        carouselItem.dataset.itemId = item.id;
        
        // Create image - enhanced poster handling following fusion-mdblist-importer pattern
        const img = document.createElement('img');
        let posterUrl;
        
        // Enhanced poster URL handling with better validation
        if (item.poster && item.poster.startsWith('http')) {
            // Use full URL (already complete)
            posterUrl = item.poster;
        } else if (item.poster_path && item.poster_path.startsWith('/')) {
            // TMDB format - construct full URL
            posterUrl = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
        } else if (item.poster && item.poster.startsWith('/')) {
            // TMDB path format - construct full URL
            posterUrl = `https://image.tmdb.org/t/p/w500${item.poster}`;
        } else if (item.poster && item.poster.length > 0) {
            // Handle other poster formats - try with leading slash
            posterUrl = `https://image.tmdb.org/t/p/w500/${item.poster}`;
        } else {
            // Fallback to placeholder - use absolute path
            posterUrl = '/placeholder-poster.jpg';
        }
        

        
        // Log only for MDBList items to reduce noise
        if (item.title && (item.title.includes('MDBList') || (typeof item.source === 'string' && item.source.toLowerCase().includes('mdb')))) {
            console.log('MDBList poster debug:', item.title, '- URL:', posterUrl, '- Original:', item.poster);
        }
        
        img.src = posterUrl;
        img.alt = item.title || item.name || 'Media poster';
        img.loading = 'lazy';
        
        // Add error handling for failed poster loads
        img.onerror = function() {
            if (this.src !== '/placeholder-poster.jpg') {
                console.warn('Failed to load poster for', item.title, '- trying placeholder');
                this.src = '/placeholder-poster.jpg';
            }
        }
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'carousel-item-overlay';
        
        const title = document.createElement('div');
        title.className = 'carousel-item-title';
        title.textContent = item.title || item.name || 'Unknown Title';
        
        const year = document.createElement('div');
        year.className = 'carousel-item-year';
        // Handle both TMDB and MDBList date formats
        const releaseDate = item.release_date || item.first_air_date || item.released;
        const yearValue = item.year || (releaseDate ? new Date(releaseDate).getFullYear() : null);
        year.textContent = yearValue || 'Unknown';
        
        // Create action buttons
        const actions = document.createElement('div');
        actions.className = 'carousel-item-actions';
        
        const playButton = document.createElement('button');
        playButton.className = 'carousel-action-btn primary';
        playButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
            Play
        `;
        playButton.onclick = (e) => {
            e.stopPropagation();
            this.app.showStreamOptions(mediaType, item.id);
        };
        
        const infoButton = document.createElement('button');
        infoButton.className = 'carousel-action-btn secondary';
        infoButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
            </svg>
            Info
        `;
        infoButton.onclick = (e) => {
            e.stopPropagation();
            this.app.openMediaDetails(mediaType, item.id);
        };
        
        actions.appendChild(playButton);
        actions.appendChild(infoButton);
        
        overlay.appendChild(title);
        overlay.appendChild(year);
        overlay.appendChild(actions);
        
        carouselItem.appendChild(img);
        carouselItem.appendChild(overlay);
        
        // Add click handler
        carouselItem.addEventListener('click', () => {
            this.handleItemClick(item, mediaType);
        });
        
        return carouselItem;
    }

    addNavigationControls(container, carousel) {
        const carouselContainer = carousel.querySelector('.carousel-container');
        if (!carouselContainer) return;
        
        // Create navigation buttons
        const prevButton = document.createElement('button');
        prevButton.className = 'carousel-nav carousel-nav-prev';
        prevButton.innerHTML = '‹';
        prevButton.setAttribute('aria-label', 'Previous items');
        
        const nextButton = document.createElement('button');
        nextButton.className = 'carousel-nav carousel-nav-next';
        nextButton.innerHTML = '›';
        nextButton.setAttribute('aria-label', 'Next items');
        
        // Add navigation functionality
        prevButton.addEventListener('click', () => {
            this.scrollCarousel(carouselContainer, 'left');
        });
        
        nextButton.addEventListener('click', () => {
            this.scrollCarousel(carouselContainer, 'right');
        });
        
        // Add buttons to carousel
        carousel.appendChild(prevButton);
        carousel.appendChild(nextButton);
        
        // Update button visibility
        this.updateNavigationButtons(carouselContainer, prevButton, nextButton);
        
        // Listen for scroll events to update button states
        carouselContainer.addEventListener('scroll', () => {
            this.updateNavigationButtons(carouselContainer, prevButton, nextButton);
        });
    }

    scrollCarousel(container, direction) {
        const scrollAmount = 220; // Item width + gap
        const currentScroll = container.scrollLeft;
        
        if (direction === 'left') {
            container.scrollTo({
                left: currentScroll - scrollAmount * 3,
                behavior: 'smooth'
            });
        } else {
            container.scrollTo({
                left: currentScroll + scrollAmount * 3,
                behavior: 'smooth'
            });
        }
    }

    updateNavigationButtons(container, prevButton, nextButton) {
        const isAtStart = container.scrollLeft <= 0;
        const isAtEnd = container.scrollLeft >= (container.scrollWidth - container.clientWidth - 1);
        
        prevButton.style.opacity = isAtStart ? '0.5' : '1';
        prevButton.disabled = isAtStart;
        
        nextButton.style.opacity = isAtEnd ? '0.5' : '1';
        nextButton.disabled = isAtEnd;
    }

    handleItemClick(item, mediaType) {
        // Open media details modal using the app's method
        this.app.openMediaDetails(mediaType, item.id);
    }

    // Utility method to create a simple grid layout (fallback)
    renderGrid(container, items, mediaType) {
        if (!container || !items || items.length === 0) {
            return;
        }

        container.innerHTML = '';
        container.className = 'catalog-grid';
        
        items.forEach(item => {
            const gridItem = this.createGridItem(item, mediaType);
            container.appendChild(gridItem);
        });
    }

    createGridItem(item, mediaType) {
        const gridItem = document.createElement('div');
        gridItem.className = 'grid-item';
        gridItem.dataset.mediaType = mediaType;
        gridItem.dataset.itemId = item.id;
        
        const img = document.createElement('img');
        let posterUrl;
        
        if (item.poster && item.poster.startsWith('http')) {
            // Use enhanced TMDB URL from CatalogManager
            posterUrl = item.poster;
        } else if (item.poster_path) {
            // TMDB format - use high quality
            posterUrl = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
        } else if (item.poster) {
            // MDBList format fallback
            posterUrl = `https://image.tmdb.org/t/p/w500${item.poster}`;
        } else {
            // Fallback placeholder
            posterUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4=';
        }
        
        img.src = posterUrl;
        img.alt = item.title || item.name || 'Media poster';
        img.loading = 'lazy';
        
        const info = document.createElement('div');
        info.className = 'grid-item-info';
        
        const title = document.createElement('div');
        title.className = 'grid-item-title';
        title.textContent = item.title || item.name || 'Unknown Title';
        
        const year = document.createElement('div');
        year.className = 'grid-item-year';
        const releaseDate = item.release_date || item.first_air_date;
        year.textContent = releaseDate ? new Date(releaseDate).getFullYear() : 'Unknown';
        
        info.appendChild(title);
        info.appendChild(year);
        
        gridItem.appendChild(img);
        gridItem.appendChild(info);
        
        // Add click handler
        gridItem.addEventListener('click', () => {
            this.handleItemClick(item, mediaType);
        });
        
        return gridItem;
    }

    // Method to refresh carousel content
    refresh(container, items, mediaType, title) {
        this.render(container, items, mediaType, title);
    }

    // Method to clear carousel
    clear(container) {
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Make it globally available
window.CatalogCarousel = CatalogCarousel;