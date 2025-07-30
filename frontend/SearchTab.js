class SearchTab {
    constructor() {
        this.searchInput = null;
        this.searchButton = null;
        this.searchResults = null;
        this.filterButtons = [];
        this.currentFilter = 'all';
        this.searchTimeout = null;
        this.currentQuery = '';
        this.isLoading = false;
        this.searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        
        this.init();
    }

    init() {
        this.searchInput = document.getElementById('search-input');
        this.searchButton = document.getElementById('search-button');
        this.searchResults = document.querySelector('.search-results');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.displayPlaceholder();
    }

    setupEventListeners() {
        // Search input with debouncing
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        // Search button click
        this.searchButton.addEventListener('click', () => {
            this.performSearch(this.searchInput.value);
        });

        // Enter key search
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch(this.searchInput.value);
            }
        });

        // Filter buttons
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setActiveFilter(btn.dataset.filter);
                if (this.currentQuery) {
                    this.performSearch(this.currentQuery);
                }
            });
        });

        // Focus management
        this.searchInput.addEventListener('focus', () => {
            this.searchInput.parentElement.classList.add('focused');
        });

        this.searchInput.addEventListener('blur', () => {
            this.searchInput.parentElement.classList.remove('focused');
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+K or Cmd+K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.searchInput.focus();
            }
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
                this.displayPlaceholder();
            }
        }, 300);
    }

    async performSearch(query) {
        if (!query.trim() || this.isLoading) return;

        this.currentQuery = query.trim();
        this.isLoading = true;
        this.displayLoading();

        try {
            const results = await this.fetchSearchResults(query);
            this.displayResults(results, query);
            this.addToSearchHistory(query);
        } catch (error) {
            console.error('Search error:', error);
            this.displayError('Failed to search. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    async fetchSearchResults(query) {
        const apiKey = '4f5f43495afcc67e9553f6c684a82f84';
        const baseUrl = 'https://api.themoviedb.org/3';
        
        let endpoint;
        switch (this.currentFilter) {
            case 'movies':
                endpoint = `/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}`;
                break;
            case 'series':
                endpoint = `/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}`;
                break;
            case 'people':
                endpoint = `/search/person?api_key=${apiKey}&query=${encodeURIComponent(query)}`;
                break;
            default:
                endpoint = `/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}`;
        }

        const response = await fetch(`${baseUrl}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.results || [];
    }

    displayResults(results, query) {
        if (!results || results.length === 0) {
            this.displayNoResults(query);
            return;
        }

        const resultsHtml = `
            <div class="search-results-header">
                <div class="search-summary">
                    <h3>Search Results</h3>
                    <p>Found ${results.length} results for "${query}"</p>
                </div>
            </div>
            <div class="search-grid carousel-grid">
                ${results.map(item => this.createResultCard(item)).join('')}
            </div>
        `;

        this.searchResults.innerHTML = resultsHtml;
        this.attachResultEventListeners();
    }

    createResultCard(item) {
        const title = item.title || item.name || 'Unknown Title';
        const year = item.release_date || item.first_air_date;
        const yearText = year ? new Date(year).getFullYear() : 'N/A';
        const posterPath = item.poster_path 
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMUExQTFBIi8+CjxwYXRoIGQ9Ik0xNTAgMjI1QzE2NS4xNTUgMjI1IDE3Ny41IDIxMi42NTUgMTc3LjUgMTk3LjVDMTc3LjUgMTgyLjM0NSAxNjUuMTU1IDE3MCAxNTAgMTcwQzEzNC44NDUgMTcwIDEyMi41IDE4Mi4zNDUgMTIyLjUgMTk3LjVDMTIyLjUgMjEyLjY1NSAxMzQuODQ1IDIyNSAxNTAgMjI1WiIgZmlsbD0iIzMzMzMzMyIvPgo8cGF0aCBkPSJNMTg3LjUgMjYyLjVIMTEyLjVDMTA2Ljk3NyAyNjIuNSAxMDIuNSAyNjYuOTc3IDEwMi41IDI3Mi41VjI4MEMxMDIuNSAyODUuNTIzIDEwNi45NzcgMjkwIDExMi41IDI5MEgxODcuNUMxOTMuMDIzIDI5MCAxOTcuNSAyODUuNTIzIDE5Ny41IDI4MFYyNzIuNUMxOTcuNSAyNjYuOTc3IDE5My4wMjMgMjYyLjUgMTg3LjUgMjYyLjVaIiBmaWxsPSIjMzMzMzMzIi8+Cjwvc3ZnPgo=';
        
        const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

        return `
            <div class="poster-card" data-id="${item.id}" data-type="${mediaType}">
                <div class="poster-image">
                    <img src="${posterPath}" alt="${title}" loading="lazy">
                    <div class="poster-overlay">
                        <div class="poster-actions">
                            <button class="poster-button play-btn" title="Play">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                            </button>
                            <button class="poster-button info-btn" title="More Info">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="poster-info">
                    <h3 class="poster-title">${title}</h3>
                    <div class="poster-metadata">
                        <span class="year">${yearText}</span>
                        <span class="rating">⭐ ${rating}</span>
                        <span class="type">${mediaType.toUpperCase()}</span>
                    </div>
                </div>
            </div>
        `;
    }

    attachResultEventListeners() {
        const cards = this.searchResults.querySelectorAll('.poster-card');
        cards.forEach(card => {
            const playBtn = card.querySelector('.play-btn');
            const infoBtn = card.querySelector('.info-btn');
            
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handlePlay(card.dataset.id, card.dataset.type);
                });
            }
            
            if (infoBtn) {
                infoBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handleInfo(card.dataset.id, card.dataset.type);
                });
            }
        });
    }

    handlePlay(id, type) {
        console.log(`Playing ${type} with ID: ${id}`);
        // Integrate with existing player functionality
        if (window.streamScraper) {
            window.streamScraper.searchStreams(id, type);
        }
    }

    handleInfo(id, type) {
        console.log(`Showing info for ${type} with ID: ${id}`);
        // Integrate with existing modal functionality
        if (window.mediaDetailsModal) {
            window.mediaDetailsModal.show(id, type);
        }
    }

    displayPlaceholder() {
        this.searchResults.innerHTML = `
            <div class="search-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <p>Search for movies, TV shows, and more...</p>
                <div class="search-suggestions">
                    <p>Try searching for:</p>
                    <div class="suggestion-tags">
                        <span class="suggestion-tag">Marvel</span>
                        <span class="suggestion-tag">Breaking Bad</span>
                        <span class="suggestion-tag">The Office</span>
                        <span class="suggestion-tag">Inception</span>
                    </div>
                </div>
            </div>
        `;

        // Add click handlers for suggestions
        const suggestionTags = this.searchResults.querySelectorAll('.suggestion-tag');
        suggestionTags.forEach(tag => {
            tag.addEventListener('click', () => {
                this.searchInput.value = tag.textContent;
                this.performSearch(tag.textContent);
            });
        });
    }

    displayLoading() {
        this.searchResults.innerHTML = `
            <div class="search-loading">
                <div class="loading-spinner"></div>
                <p>Searching...</p>
            </div>
        `;
    }

    displayNoResults(query) {
        this.searchResults.innerHTML = `
            <div class="search-no-results">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                    <line x1="9" y1="9" x2="13" y2="13"></line>
                    <line x1="13" y1="9" x2="9" y2="13"></line>
                </svg>
                <h3>No results found</h3>
                <p>We couldn't find anything for "${query}"</p>
                <div class="no-results-suggestions">
                    <p>Try:</p>
                    <ul>
                        <li>Checking your spelling</li>
                        <li>Using different keywords</li>
                        <li>Searching for a different title</li>
                    </ul>
                </div>
            </div>
        `;
    }

    displayError(message) {
        this.searchResults.innerHTML = `
            <div class="search-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <h3>Search Error</h3>
                <p>${message}</p>
                <button class="retry-btn" onclick="searchTab.performSearch('${this.currentQuery}')">
                    Try Again
                </button>
            </div>
        `;
    }

    setActiveFilter(filter) {
        this.currentFilter = filter;
        
        // Update button states
        this.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
    }

    addToSearchHistory(query) {
        if (!this.searchHistory.includes(query)) {
            this.searchHistory.unshift(query);
            this.searchHistory = this.searchHistory.slice(0, 10); // Keep only last 10
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        }
    }

    clearSearch() {
        this.searchInput.value = '';
        this.currentQuery = '';
        this.displayPlaceholder();
    }
}

// Initialize search tab when DOM is loaded
let searchTab;
document.addEventListener('DOMContentLoaded', () => {
    searchTab = new SearchTab();
});

// Export for global access
window.searchTab = searchTab;