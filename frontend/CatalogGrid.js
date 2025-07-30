// Catalog Grid Component
class CatalogGrid {
    constructor(app) {
        this.app = app;
    }

    render(container, items, mediaType) {
        if (!container || !items || !Array.isArray(items)) {
            console.warn('Invalid parameters for CatalogGrid.render');
            return;
        }

        // Clear existing content
        container.innerHTML = '';

        // Create media cards
        const fragment = document.createDocumentFragment();
        
        items.forEach(item => {
            const card = this.createMediaCard(item, mediaType);
            fragment.appendChild(card);
        });

        container.appendChild(fragment);
        
        // Add fade-in animation
        container.classList.add('fade-in');
    }

    createMediaCard(item, mediaType) {
        const card = document.createElement('div');
        card.className = 'media-card';
        card.setAttribute('data-media-type', mediaType);
        card.setAttribute('data-media-id', item.id);

        const title = mediaType === 'movie' ? item.title : item.name;
        const releaseDate = mediaType === 'movie' ? item.release_date : item.first_air_date;
        const posterUrl = this.app.getImageUrl(item.poster_path);

        card.innerHTML = `
            <img src="${posterUrl}" 
                 alt="${title}" 
                 class="media-poster"
                 loading="lazy"
                 onerror="this.src='/placeholder-poster.jpg'">
            <div class="media-info">
                <h3 class="media-title">${title}</h3>
                <div class="media-meta">
                    <span class="media-year">${this.app.formatDate(releaseDate)}</span>
                    <span class="media-rating">
                        ⭐ ${this.app.formatRating(item.vote_average)}
                    </span>
                </div>
                <div class="media-actions">
                    <button class="action-btn primary" onclick="this.app.showStreamOptions('${mediaType}', ${item.id})">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        Play
                    </button>
                    <button class="action-btn secondary" onclick="this.app.openMediaDetails('${mediaType}', ${item.id})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        More Info
                    </button>
                </div>
            </div>
        `;

        // Add click handler
        card.addEventListener('click', () => {
            this.app.openMediaDetails(mediaType, item.id);
        });

        // Add hover effects
        card.addEventListener('mouseenter', () => {
            this.onCardHover(card, item, mediaType);
        });

        card.addEventListener('mouseleave', () => {
            this.onCardLeave(card);
        });

        return card;
    }

    onCardHover(card, item, mediaType) {
        // Add hover class for CSS animations
        card.classList.add('hovered');
        
        // Optional: Show quick actions or preview
        this.showQuickActions(card, item, mediaType);
    }

    onCardLeave(card) {
        card.classList.remove('hovered');
        this.hideQuickActions(card);
    }

    showQuickActions(card, item, mediaType) {
        // Check if quick actions already exist
        if (card.querySelector('.quick-actions')) return;

        const quickActions = document.createElement('div');
        quickActions.className = 'quick-actions';
        quickActions.innerHTML = `
            <button class="quick-action-btn" data-action="play" title="Play">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5,3 19,12 5,21"/>
                </svg>
            </button>
            <button class="quick-action-btn" data-action="watchlist" title="Add to Watchlist">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>
                </svg>
            </button>
            <button class="quick-action-btn" data-action="info" title="More Info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                </svg>
            </button>
        `;

        // Add event listeners for quick actions
        quickActions.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click
            const action = e.target.closest('.quick-action-btn')?.dataset.action;
            
            switch (action) {
                case 'play':
                    this.app.showStreamOptions(mediaType, item.id);
                    break;
                case 'watchlist':
                    this.app.addToWatchlist(mediaType, item.id);
                    break;
                case 'info':
                    this.app.openMediaDetails(mediaType, item.id);
                    break;
            }
        });

        card.appendChild(quickActions);

        // Add CSS for quick actions if not already present
        this.addQuickActionsCSS();
    }

    hideQuickActions(card) {
        const quickActions = card.querySelector('.quick-actions');
        if (quickActions) {
            quickActions.remove();
        }
    }

    addQuickActionsCSS() {
        // Check if styles already added
        if (document.getElementById('quick-actions-styles')) return;

        const style = document.createElement('style');
        style.id = 'quick-actions-styles';
        style.textContent = `
            .quick-actions {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                display: flex;
                gap: 8px;
                opacity: 0;
                transition: opacity 0.3s ease;
                z-index: 10;
            }

            .media-card:hover .quick-actions {
                opacity: 1;
            }

            .quick-action-btn {
                width: 40px;
                height: 40px;
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid var(--accent-green);
                border-radius: 50%;
                color: var(--accent-green);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
            }

            .quick-action-btn:hover {
                background: var(--accent-green);
                color: var(--primary-bg);
                transform: scale(1.1);
            }

            .quick-action-btn svg {
                width: 20px;
                height: 20px;
            }

            .media-card {
                position: relative;
                overflow: hidden;
            }

            .media-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                opacity: 0;
                transition: opacity 0.3s ease;
                z-index: 5;
            }

            .media-card:hover::before {
                opacity: 1;
            }
        `;

        document.head.appendChild(style);
    }

    renderWithPagination(container, items, mediaType, page = 1, itemsPerPage = 20) {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = items.slice(startIndex, endIndex);

        this.render(container, paginatedItems, mediaType);

        // Add pagination controls if needed
        if (items.length > itemsPerPage) {
            this.addPaginationControls(container, items, mediaType, page, itemsPerPage);
        }
    }

    addPaginationControls(container, items, mediaType, currentPage, itemsPerPage) {
        const totalPages = Math.ceil(items.length / itemsPerPage);
        
        // Remove existing pagination
        const existingPagination = container.parentNode.querySelector('.pagination');
        if (existingPagination) {
            existingPagination.remove();
        }

        const pagination = document.createElement('div');
        pagination.className = 'pagination';
        
        // Previous button
        if (currentPage > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'pagination-btn';
            prevBtn.textContent = 'Previous';
            prevBtn.addEventListener('click', () => {
                this.renderWithPagination(container, items, mediaType, currentPage - 1, itemsPerPage);
            });
            pagination.appendChild(prevBtn);
        }

        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                this.renderWithPagination(container, items, mediaType, i, itemsPerPage);
            });
            pagination.appendChild(pageBtn);
        }

        // Next button
        if (currentPage < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'pagination-btn';
            nextBtn.textContent = 'Next';
            nextBtn.addEventListener('click', () => {
                this.renderWithPagination(container, items, mediaType, currentPage + 1, itemsPerPage);
            });
            pagination.appendChild(nextBtn);
        }

        container.parentNode.appendChild(pagination);
        this.addPaginationCSS();
    }

    addPaginationCSS() {
        if (document.getElementById('pagination-styles')) return;

        const style = document.createElement('style');
        style.id = 'pagination-styles';
        style.textContent = `
            .pagination {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin-top: 32px;
                padding: 20px 0;
            }

            .pagination-btn {
                padding: 12px 16px;
                background: var(--secondary-bg);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius-small);
                color: var(--text-secondary);
                cursor: pointer;
                transition: var(--transition);
                font-size: 14px;
                font-weight: 500;
            }

            .pagination-btn:hover {
                background: var(--hover-bg);
                color: var(--text-primary);
                border-color: var(--accent-green);
            }

            .pagination-btn.active {
                background: var(--accent-green);
                color: var(--primary-bg);
                border-color: var(--accent-green);
            }

            .pagination-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        `;

        document.head.appendChild(style);
    }

    renderSkeleton(container, count = 20) {
        container.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'media-card skeleton';
            skeleton.innerHTML = `
                <div class="skeleton-poster"></div>
                <div class="skeleton-info">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-meta"></div>
                </div>
            `;
            container.appendChild(skeleton);
        }

        this.addSkeletonCSS();
    }

    addSkeletonCSS() {
        if (document.getElementById('skeleton-styles')) return;

        const style = document.createElement('style');
        style.id = 'skeleton-styles';
        style.textContent = `
            .skeleton {
                animation: skeleton-loading 1.5s infinite ease-in-out;
            }

            .skeleton-poster {
                width: 100%;
                aspect-ratio: 2/3;
                background: var(--tertiary-bg);
                border-radius: var(--border-radius-small);
            }

            .skeleton-info {
                padding: 16px;
            }

            .skeleton-title {
                height: 20px;
                background: var(--tertiary-bg);
                border-radius: 4px;
                margin-bottom: 8px;
            }

            .skeleton-meta {
                height: 16px;
                background: var(--tertiary-bg);
                border-radius: 4px;
                width: 70%;
            }

            @keyframes skeleton-loading {
                0% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.5;
                }
                100% {
                    opacity: 1;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Method to filter items by genre
    filterByGenre(items, genreId) {
        return items.filter(item => 
            item.genre_ids && item.genre_ids.includes(genreId)
        );
    }

    // Method to sort items
    sortItems(items, sortBy = 'popularity') {
        const sortedItems = [...items];
        
        switch (sortBy) {
            case 'popularity':
                return sortedItems.sort((a, b) => b.popularity - a.popularity);
            case 'rating':
                return sortedItems.sort((a, b) => b.vote_average - a.vote_average);
            case 'release_date':
                return sortedItems.sort((a, b) => {
                    const dateA = new Date(a.release_date || a.first_air_date || 0);
                    const dateB = new Date(b.release_date || b.first_air_date || 0);
                    return dateB - dateA;
                });
            case 'title':
                return sortedItems.sort((a, b) => {
                    const titleA = (a.title || a.name || '').toLowerCase();
                    const titleB = (b.title || b.name || '').toLowerCase();
                    return titleA.localeCompare(titleB);
                });
            default:
                return sortedItems;
        }
    }
}

// Make CatalogGrid available globally
window.CatalogGrid = CatalogGrid;