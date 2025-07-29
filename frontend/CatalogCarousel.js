// Catalog Carousel Component
class CatalogCarousel {
    constructor(app) {
        this.app = app;
    }

    render(container, items, mediaType) {
        if (!container || !items || items.length === 0) {
            container.innerHTML = '<div class="no-content">No content available</div>';
            return;
        }

        // Clear existing content
        container.innerHTML = '';
        
        // Create carousel items
        items.forEach(item => {
            const carouselItem = this.createCarouselItem(item, mediaType);
            container.appendChild(carouselItem);
        });

        // Add navigation functionality
        this.addNavigationControls(container);
    }

    createCarouselItem(item, mediaType) {
        const carouselItem = document.createElement('div');
        carouselItem.className = 'carousel-item';
        carouselItem.dataset.id = item.id;
        carouselItem.dataset.type = mediaType;

        const posterPath = item.poster_path 
            ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
            : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMkEyQTJBIi8+CjxwYXRoIGQ9Ik0xNTAgMjI1TDE3NSAyMDBIMTI1TDE1MCAyMjVaIiBmaWxsPSIjNEE0QTRBIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNzc3Nzc3IiBmb250LXNpemU9IjE0Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';

        const title = item.title || item.name || 'Unknown Title';
        const year = item.release_date || item.first_air_date 
            ? new Date(item.release_date || item.first_air_date).getFullYear()
            : '';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

        carouselItem.innerHTML = `
            <div class="media-card">
                <div class="media-poster-container">
                    <img class="media-poster" src="${posterPath}" alt="${title}" loading="lazy">
                    <div class="play-button-overlay">
                        <div class="play-button">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </div>
                    </div>
                </div>
                <div class="media-info">
                    <h3 class="media-title">${title}</h3>
                    <div class="media-meta">
                        <span class="media-year">${year}</span>
                        <span class="media-rating">★ ${rating}</span>
                    </div>
                </div>
            </div>
        `;

        // Add click event listener
        carouselItem.addEventListener('click', () => {
            this.handleItemClick(item, mediaType);
        });

        return carouselItem;
    }

    handleItemClick(item, mediaType) {
        // Show media details modal
        if (window.mediaDetailsModal) {
            window.mediaDetailsModal.show(item, mediaType);
        } else {
            console.error('MediaDetailsModal not initialized');
            this.app.showNotification('Media details modal not available', 'error');
        }
    }

    // Utility method to get image URL with fallback
    getImageUrl(path, size = 'w300') {
        if (!path) return this.getPlaceholderImage();
        return `https://image.tmdb.org/t/p/${size}${path}`;
    }

    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMkEyQTJBIi8+CjxwYXRoIGQ9Ik0xNTAgMjI1TDE3NSAyMDBIMTI1TDE1MCAyMjVaIiBmaWxsPSIjNEE0QTRBIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNzc3Nzc3IiBmb250LXNpemU9IjE0Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
    }

    addNavigationControls(container) {
        const carouselContainer = container.parentElement;
        if (!carouselContainer) return;

        // Remove existing navigation buttons
        const existingPrev = carouselContainer.querySelector('.carousel-nav-prev');
        const existingNext = carouselContainer.querySelector('.carousel-nav-next');
        if (existingPrev) existingPrev.remove();
        if (existingNext) existingNext.remove();

        // Create navigation buttons
        const prevButton = document.createElement('button');
        prevButton.className = 'carousel-nav carousel-nav-prev';
        prevButton.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
        
        const nextButton = document.createElement('button');
        nextButton.className = 'carousel-nav carousel-nav-next';
        nextButton.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';

        // Add event listeners with proper event handling
        prevButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.scrollCarousel(container, -1);
        });
        nextButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.scrollCarousel(container, 1);
        });

        // Ensure buttons are clickable by setting higher z-index
        prevButton.style.zIndex = '100';
        nextButton.style.zIndex = '100';

        // Append buttons to carousel container
        carouselContainer.appendChild(prevButton);
        carouselContainer.appendChild(nextButton);

        // Update button visibility based on scroll position
        this.updateNavigationButtons(container, prevButton, nextButton);
        
        // Use passive scroll listener for better performance
        container.addEventListener('scroll', () => {
            this.updateNavigationButtons(container, prevButton, nextButton);
        }, { passive: true });
        
        // Add scroll bar if content overflows
        this.addScrollIndicator(container, carouselContainer);
        
        // Force initial visibility check
        setTimeout(() => {
            this.updateNavigationButtons(container, prevButton, nextButton);
        }, 100);
    }

    scrollCarousel(container, direction) {
        const itemWidth = 160; // carousel-item width
        const gap = 16; // gap between items
        const scrollAmount = (itemWidth + gap) * 3; // Scroll 3 items at a time
        const currentScroll = container.scrollLeft;
        const targetScroll = Math.max(0, Math.min(
            currentScroll + (scrollAmount * direction),
            container.scrollWidth - container.clientWidth
        ));
        
        // Ensure container is scrollable
        if (container.scrollWidth <= container.clientWidth) {
            return; // Don't scroll if content fits
        }
        
        container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    }

    updateNavigationButtons(container, prevButton, nextButton) {
        const isAtStart = container.scrollLeft <= 0;
        const isAtEnd = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;
        
        prevButton.style.opacity = isAtStart ? '0.3' : '1';
        nextButton.style.opacity = isAtEnd ? '0.3' : '1';
        prevButton.disabled = isAtStart;
        nextButton.disabled = isAtEnd;
    }
    
    addScrollIndicator(container, carouselContainer) {
        // Only add scroll indicator if content overflows
        if (container.scrollWidth <= container.clientWidth) return;
        
        // Remove existing scroll indicator
        const existingIndicator = carouselContainer.querySelector('.scroll-indicator');
        if (existingIndicator) existingIndicator.remove();
        
        const scrollIndicator = document.createElement('div');
        scrollIndicator.className = 'scroll-indicator';
        scrollIndicator.innerHTML = '<div class="scroll-thumb"></div>';
        
        carouselContainer.appendChild(scrollIndicator);
        
        const thumb = scrollIndicator.querySelector('.scroll-thumb');
        
        const updateScrollIndicator = () => {
            const scrollPercentage = container.scrollLeft / (container.scrollWidth - container.clientWidth);
            const thumbWidth = (container.clientWidth / container.scrollWidth) * 100;
            const thumbPosition = scrollPercentage * (100 - thumbWidth);
            
            thumb.style.width = `${thumbWidth}%`;
            thumb.style.left = `${thumbPosition}%`;
        };
        
        container.addEventListener('scroll', updateScrollIndicator);
        updateScrollIndicator();
    }
}

// Make it globally available
window.CatalogCarousel = CatalogCarousel;