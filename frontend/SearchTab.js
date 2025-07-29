// Search Tab Controller
class SearchTab {
    constructor(app) {
        this.app = app;
        this.catalogGrid = new CatalogGrid(app);
        this.searchTimeout = null;
        this.currentFilter = 'all';
        this.currentQuery = '';
        this.searchHistory = JSON.parse(localStorage.getItem('search_history') || '[]');
        this.maxHistoryItems = 10;
    }

    init() {
        this.setupEventListeners();
        this.loadSearchHistory();
    }

    setupEventListeners() {
        const searchInput = document.getElementById('search-input');
        const searchButton = document.getElementById('search-button');
        const filterButtons = document.querySelectorAll('.filter-btn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value);
                }
            });

            // Focus search input when tab is activated
            searchInput.addEventListener('focus', () => {
                this.showSearchSuggestions();
            });

            searchInput.addEventListener('blur', () => {
                // Delay hiding suggestions to allow for clicks
                setTimeout(() => this.hideSearchSuggestions(), 200);
            });
        }

        if (searchButton) {
            searchButton.addEventListener('click', () => {
                const query = searchInput?.value || '';
                this.performSearch(query);
            });
        }

        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });
    }

    handleSearchInput(query) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Debounce search
        this.searchTimeout = setTimeout(() => {
            if (query.trim().length >= 2) {
                this.performSearch(query);
            } else if (query.trim().length === 0) {
                this.clearResults();
                this.showSearchHistory();
            }
        }, 300);
    }

    async performSearch(query) {
        if (!query || query.trim().length < 2) {
            this.clearResults();
            return;
        }

        this.currentQuery = query.trim();
        this.app.showLoading();

        try {
            const results = await this.searchContent(this.currentQuery, this.currentFilter);
            this.displayResults(results);
            this.addToSearchHistory(this.currentQuery);
        } catch (error) {
            console.error('Search error:', error);
            this.app.showNotification('Search failed. Please try again.', 'error');
            this.showErrorState();
        } finally {
            this.app.hideLoading();
        }
    }

    async searchContent(query, filter = 'all') {
        const results = {
            movies: [],
            series: [],
            combined: []
        };

        const searchPromises = [];

        // Search movies
        if (filter === 'all' || filter === 'movies') {
            searchPromises.push(
                this.app.fetchFromTMDB('/search/movie', { query })
                    .then(data => {
                        results.movies = data.results || [];
                        results.combined.push(...results.movies.map(item => ({ ...item, media_type: 'movie' })));
                    })
                    .catch(error => console.warn('Movie search failed:', error))
            );
        }

        // Search TV series
        if (filter === 'all' || filter === 'series') {
            searchPromises.push(
                this.app.fetchFromTMDB('/search/tv', { query })
                    .then(data => {
                        results.series = data.results || [];
                        results.combined.push(...results.series.map(item => ({ ...item, media_type: 'tv' })));
                    })
                    .catch(error => console.warn('TV search failed:', error))
            );
        }

        // Search people (actors, directors, etc.)
        if (filter === 'all') {
            searchPromises.push(
                this.app.fetchFromTMDB('/search/person', { query })
                    .then(data => {
                        results.people = data.results || [];
                    })
                    .catch(error => console.warn('People search failed:', error))
            );
        }

        await Promise.all(searchPromises);

        // Sort combined results by popularity
        results.combined.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

        return results;
    }

    displayResults(results) {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '';

        let itemsToShow = [];
        let mediaType = null;

        switch (this.currentFilter) {
            case 'movies':
                itemsToShow = results.movies;
                mediaType = 'movie';
                break;
            case 'series':
                itemsToShow = results.series;
                mediaType = 'tv';
                break;
            case 'all':
            default:
                itemsToShow = results.combined;
                break;
        }

        if (itemsToShow.length === 0) {
            this.showNoResults();
            return;
        }

        // Create results grid
        const gridContainer = document.createElement('div');
        gridContainer.className = 'catalog-grid search-results-grid';

        if (this.currentFilter === 'all') {
            // For 'all' filter, render mixed content
            this.renderMixedResults(gridContainer, itemsToShow);
        } else {
            // For specific filters, use catalog grid
            this.catalogGrid.render(gridContainer, itemsToShow, mediaType);
        }

        resultsContainer.appendChild(gridContainer);

        // Add results summary
        this.addResultsSummary(resultsContainer, results);
    }

    renderMixedResults(container, items) {
        container.innerHTML = '';
        
        items.forEach(item => {
            const mediaType = item.media_type;
            const card = this.catalogGrid.createMediaCard(item, mediaType);
            container.appendChild(card);
        });
    }

    addResultsSummary(container, results) {
        const summary = document.createElement('div');
        summary.className = 'search-summary';
        
        const totalResults = results.combined.length;
        const movieCount = results.movies?.length || 0;
        const seriesCount = results.series?.length || 0;

        summary.innerHTML = `
            <p class="search-summary-text">
                Found ${totalResults} result${totalResults !== 1 ? 's' : ''} for "${this.currentQuery}"
                ${this.currentFilter === 'all' ? `(${movieCount} movies, ${seriesCount} series)` : ''}
            </p>
        `;

        container.insertBefore(summary, container.firstChild);
        this.addSearchSummaryCSS();
    }

    addSearchSummaryCSS() {
        if (document.getElementById('search-summary-styles')) return;

        const style = document.createElement('style');
        style.id = 'search-summary-styles';
        style.textContent = `
            .search-summary {
                margin-bottom: 24px;
                padding: 16px 0;
                border-bottom: 1px solid var(--border-color);
            }

            .search-summary-text {
                color: var(--text-secondary);
                font-size: 16px;
                margin: 0;
            }

            .search-results-grid {
                margin-top: 24px;
            }
        `;

        document.head.appendChild(style);
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');

        // Re-search with new filter if there's a current query
        if (this.currentQuery) {
            this.performSearch(this.currentQuery);
        }
    }

    clearResults() {
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="search-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <p>Start typing to search for content</p>
                </div>
            `;
        }
    }

    showNoResults() {
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <h3>No results found</h3>
                    <p>Try adjusting your search terms or filters</p>
                    <div class="search-suggestions">
                        <h4>Suggestions:</h4>
                        <ul>
                            <li>Check your spelling</li>
                            <li>Try different keywords</li>
                            <li>Use broader search terms</li>
                            <li>Try searching in all categories</li>
                        </ul>
                    </div>
                </div>
            `;
        }

        this.addNoResultsCSS();
    }

    addNoResultsCSS() {
        if (document.getElementById('no-results-styles')) return;

        const style = document.createElement('style');
        style.id = 'no-results-styles';
        style.textContent = `
            .no-results {
                text-align: center;
                padding: 60px 20px;
                color: var(--text-muted);
            }

            .no-results svg {
                width: 64px;
                height: 64px;
                margin-bottom: 24px;
                opacity: 0.5;
            }

            .no-results h3 {
                font-size: 24px;
                color: var(--text-primary);
                margin-bottom: 12px;
            }

            .no-results p {
                font-size: 16px;
                margin-bottom: 32px;
            }

            .search-suggestions {
                max-width: 400px;
                margin: 0 auto;
                text-align: left;
                background: var(--secondary-bg);
                padding: 24px;
                border-radius: var(--border-radius);
                border: 1px solid var(--border-color);
            }

            .search-suggestions h4 {
                color: var(--text-primary);
                margin-bottom: 16px;
                font-size: 18px;
            }

            .search-suggestions ul {
                list-style: none;
                padding: 0;
            }

            .search-suggestions li {
                padding: 8px 0;
                border-bottom: 1px solid var(--border-color);
                font-size: 14px;
            }

            .search-suggestions li:last-child {
                border-bottom: none;
            }

            .search-suggestions li::before {
                content: "•";
                color: var(--accent-green);
                margin-right: 12px;
            }
        `;

        document.head.appendChild(style);
    }

    showErrorState() {
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="search-error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <h3>Search Error</h3>
                    <p>Unable to perform search. Please check your connection and try again.</p>
                    <button class="btn-primary" onclick="searchTab.performSearch('${this.currentQuery}')">
                        Retry Search
                    </button>
                </div>
            `;
        }

        this.addErrorStateCSS();
    }

    addErrorStateCSS() {
        if (document.getElementById('search-error-styles')) return;

        const style = document.createElement('style');
        style.id = 'search-error-styles';
        style.textContent = `
            .search-error {
                text-align: center;
                padding: 60px 20px;
                color: var(--text-muted);
            }

            .search-error svg {
                width: 64px;
                height: 64px;
                margin-bottom: 24px;
                color: #ff4444;
            }

            .search-error h3 {
                font-size: 24px;
                color: var(--text-primary);
                margin-bottom: 12px;
            }

            .search-error p {
                font-size: 16px;
                margin-bottom: 32px;
            }
        `;

        document.head.appendChild(style);
    }

    addToSearchHistory(query) {
        if (!query || this.searchHistory.includes(query)) return;

        this.searchHistory.unshift(query);
        
        // Limit history size
        if (this.searchHistory.length > this.maxHistoryItems) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
        }

        localStorage.setItem('search_history', JSON.stringify(this.searchHistory));
    }

    loadSearchHistory() {
        this.searchHistory = JSON.parse(localStorage.getItem('search_history') || '[]');
    }

    showSearchHistory() {
        if (this.searchHistory.length === 0) return;

        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = `
            <div class="search-history">
                <h3>Recent Searches</h3>
                <div class="history-items">
                    ${this.searchHistory.map(query => `
                        <button class="history-item" onclick="searchTab.performSearchFromHistory('${query}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                                <path d="M3 3v5h5"/>
                            </svg>
                            ${query}
                        </button>
                    `).join('')}
                </div>
                <button class="clear-history-btn" onclick="searchTab.clearSearchHistory()">
                    Clear History
                </button>
            </div>
        `;

        this.addSearchHistoryCSS();
    }

    addSearchHistoryCSS() {
        if (document.getElementById('search-history-styles')) return;

        const style = document.createElement('style');
        style.id = 'search-history-styles';
        style.textContent = `
            .search-history {
                padding: 24px 0;
            }

            .search-history h3 {
                font-size: 20px;
                color: var(--text-primary);
                margin-bottom: 20px;
            }

            .history-items {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 24px;
            }

            .history-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: var(--secondary-bg);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius-small);
                color: var(--text-secondary);
                cursor: pointer;
                transition: var(--transition);
                text-align: left;
                font-size: 16px;
            }

            .history-item:hover {
                background: var(--hover-bg);
                color: var(--text-primary);
                border-color: var(--accent-green);
            }

            .history-item svg {
                width: 16px;
                height: 16px;
                opacity: 0.7;
            }

            .clear-history-btn {
                padding: 12px 24px;
                background: transparent;
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius-small);
                color: var(--text-muted);
                cursor: pointer;
                transition: var(--transition);
                font-size: 14px;
            }

            .clear-history-btn:hover {
                background: #ff4444;
                color: white;
                border-color: #ff4444;
            }
        `;

        document.head.appendChild(style);
    }

    performSearchFromHistory(query) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = query;
        }
        this.performSearch(query);
    }

    clearSearchHistory() {
        this.searchHistory = [];
        localStorage.removeItem('search_history');
        this.clearResults();
        this.app.showNotification('Search history cleared');
    }

    showSearchSuggestions() {
        // This could be expanded to show trending searches or suggestions
        if (this.currentQuery === '' && this.searchHistory.length > 0) {
            this.showSearchHistory();
        }
    }

    hideSearchSuggestions() {
        // Hide suggestions when input loses focus
    }

    // Advanced search functionality
    async performAdvancedSearch(params) {
        try {
            this.app.showLoading();
            
            const results = await this.app.fetchFromTMDB('/discover/movie', params);
            this.displayResults({ movies: results.results, series: [], combined: results.results.map(item => ({ ...item, media_type: 'movie' })) });
        } catch (error) {
            console.error('Advanced search error:', error);
            this.showErrorState();
        } finally {
            this.app.hideLoading();
        }
    }

    // Method to search by genre
    async searchByGenre(genreId, mediaType = 'movie') {
        const endpoint = mediaType === 'movie' ? '/discover/movie' : '/discover/tv';
        const params = {
            with_genres: genreId,
            sort_by: 'popularity.desc'
        };

        try {
            const data = await this.app.fetchFromTMDB(endpoint, params);
            const results = mediaType === 'movie' 
                ? { movies: data.results, series: [], combined: data.results.map(item => ({ ...item, media_type: 'movie' })) }
                : { movies: [], series: data.results, combined: data.results.map(item => ({ ...item, media_type: 'tv' })) };
            
            this.displayResults(results);
        } catch (error) {
            console.error('Genre search error:', error);
            this.showErrorState();
        }
    }
}

// Make SearchTab available globally
window.SearchTab = SearchTab;