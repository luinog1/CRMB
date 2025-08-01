// Media Details Modal Component
class MediaDetailsModal {
    constructor(app) {
        this.app = app;
        this.currentMedia = null;
        this.currentMediaType = null;
    }

    async show(item, mediaType) {
        this.currentMedia = item;
        this.currentMediaType = mediaType;
        
        try {
            this.app.showLoading();
            
            // Fetch detailed information from TMDB
            const details = await this.fetchMediaDetails(item.id, mediaType);
            
            // Create and show modal
            this.createModal(details, mediaType);
            
        } catch (error) {
            console.error('Error loading media details:', error);
            this.app.showNotification('Error loading media details', 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    async fetchMediaDetails(id, mediaType) {
        let tmdbId = id;
        let originalId = id;
        let fallbackData = null;
        
        // Check if the ID is an IMDb ID (starts with 'tt')
        if (typeof id === 'string' && id.startsWith('tt')) {
            try {
                tmdbId = await this.app.convertImdbToTmdbId(id, mediaType);
                console.log(`Converted IMDb ID ${id} to TMDB ID ${tmdbId}`);
            } catch (error) {
                console.warn(`Failed to convert IMDb ID ${id} to TMDB ID:`, error);
                // Don't throw error, try to use IMDb ID directly or provide fallback
                tmdbId = null;
                
                // Try to get basic info from addon data or provide fallback
                fallbackData = {
                    id: originalId,
                    title: 'Unknown Title',
                    overview: 'Additional details not available from TMDB',
                    poster_path: null,
                    backdrop_path: null,
                    vote_average: 0,
                    release_date: '',
                    genres: [],
                    credits: { cast: [], crew: [] },
                    videos: { results: [] },
                    isFallback: true,
                    originalId: originalId
                };
            }
        }
        
        // Handle temporary IDs from MDBList
        if (typeof id === 'string' && id.startsWith('temp:')) {
            console.warn('Temporary ID detected, using fallback data:', id);
            return {
                id: id,
                title: 'MDBList Item',
                overview: 'Limited metadata available for this item',
                poster_path: null,
                backdrop_path: null,
                vote_average: 0,
                release_date: '',
                genres: [],
                credits: { cast: [], crew: [] },
                videos: { results: [] },
                isFallback: true,
                originalId: id
            };
        }
        
        if (fallbackData) {
            return fallbackData;
        }
        
        try {
            const endpoint = mediaType === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
            const details = await this.app.fetchFromTMDB(endpoint);
            
            // Fetch additional data
            const [credits, videos] = await Promise.all([
                this.app.fetchFromTMDB(`${endpoint}/credits`).catch(() => ({ cast: [], crew: [] })),
                this.app.fetchFromTMDB(`${endpoint}/videos`).catch(() => ({ results: [] }))
            ]);
            
            return { ...details, credits, videos, isFallback: false };
        } catch (error) {
            console.warn('Failed to fetch TMDB data for ID:', tmdbId, error);
            
            // Provide fallback data for missing TMDB entries
            return {
                id: originalId,
                title: 'Content Not Found',
                overview: 'This content may not be available in TMDB or the ID may be incorrect.',
                poster_path: null,
                backdrop_path: null,
                vote_average: 0,
                release_date: '',
                genres: [],
                credits: { cast: [], crew: [] },
                videos: { results: [] },
                isFallback: true,
                originalId: originalId,
                tmdbId: tmdbId
            };
        }
    }

    createModal(details, mediaType) {
        // Remove existing modal if any
        const existingModal = document.getElementById('media-details-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'media-details-modal';
        modal.className = 'modal media-details-modal';
        
        const title = details.title || details.name || 'Unknown Title';
        const releaseDate = details.release_date || details.first_air_date || '';
        const year = releaseDate ? new Date(releaseDate).getFullYear() : '';
        const runtime = details.runtime || (details.episode_run_time && details.episode_run_time[0]) || '';
        const rating = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
        const overview = details.overview || 'No description available.';
        const tagline = details.tagline || '';
        const status = details.status || 'N/A';
        const contentRating = details.content_rating || 'NR';
        
        // Handle fallback cases gracefully
        const isFallback = details.isFallback || false;
        const fallbackNotice = isFallback ? 
            '<div class="fallback-notice">⚠️ Limited metadata available from TMDB</div>' : '';
        
        const backdropUrl = details.backdrop_path 
            ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`
            : '/placeholder-backdrop.jpg';
        
        const posterUrl = details.poster_path 
            ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
            : this.getPlaceholderImage();

        const genres = details.genres ? details.genres.map(g => g.name).join(', ') : '';
        const cast = details.credits && details.credits.cast 
            ? details.credits.cast.slice(0, 5).map(c => c.name).join(', ')
            : '';
        const director = details.credits?.crew?.find(person => person.job === 'Director')?.name || 'N/A';
        const productionCompanies = details.production_companies?.map(company => company.name).join(', ') || 'N/A';
        const keywords = details.keywords?.keywords?.map(k => k.name).slice(0, 5).join(', ') || 'N/A';

        modal.innerHTML = `
            <div class="modal-content media-details-content">
                <div class="modal-header">
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="media-details-backdrop" style="background-image: url('${backdropUrl}')">
                        <div class="media-details-overlay">
                            <div class="media-details-main">
                                <div class="media-details-poster">
                                    <img src="${posterUrl}" alt="${title}" loading="lazy">
                                </div>
                                <div class="media-details-info">
                                    <h1 class="media-details-title">${title}</h1>
                                    ${fallbackNotice}
                                    <div class="media-details-meta">
                                        <span class="media-year">${year}</span>
                                        ${runtime ? `<span class="media-runtime">${runtime} min</span>` : ''}
                                        <span class="media-rating">★ ${rating}</span>
                                        ${genres ? `<span class="media-genres">${genres}</span>` : ''}
                                    </div>
                                    <p class="media-overview">${overview}</p>
                                    ${cast ? `<p class="media-cast"><strong>Cast:</strong> ${cast}</p>` : ''}
                                    <div class="media-actions">
                                        <button class="btn-primary play-button" onclick="mediaDetailsModal.playMedia()" ${isFallback ? 'disabled title="Streaming may not be available"' : ''}>
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M8 5v14l11-7z"/>
                                            </svg>
                                            ${isFallback ? 'Limited Info' : 'Play'}
                                        </button>
                                        <button class="btn-secondary" onclick="mediaDetailsModal.addToWatchlist()">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l11 11z"/>
                                            </svg>
                                            Watchlist
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('active');
        this.addModalCSS();
    }

    async playMedia() {
        if (!this.currentMedia || !this.currentMediaType) return;
        
        try {
            this.app.showLoading();
            
            // Fetch streams for this media
            const mediaTitle = this.currentMedia.title || this.currentMedia.name || 'Unknown Title';
            
            // For TV shows, ensure season and episode are properly set
            let season = null;
            let episode = null;
            if (this.currentMediaType === 'tv') {
                // Get the first available season if not specified
                season = this.currentMedia.seasons ? this.currentMedia.seasons[0]?.season_number : 1;
                episode = 1; // Default to first episode
                
                if (!season) season = 1; // Fallback to season 1 if no seasons data
            }
            
            const streams = await this.app.streamScraper.queryWithImdbFallback(
                this.currentMediaType, 
                this.currentMedia.id, 
                season, 
                episode, 
                mediaTitle
            );
            
            // Close details modal and show stream modal
            document.getElementById('media-details-modal').remove();
            
            const title = this.currentMedia.title || this.currentMedia.name || 'Unknown Title';
            window.streamModal.show(streams, this.currentMediaType, this.currentMedia.id, title);
            
        } catch (error) {
            console.error('Error fetching streams:', error);
            this.app.showNotification('Error loading streams', 'error');
        } finally {
            this.app.hideLoading();
        }
    }

    addToWatchlist() {
        // Placeholder for watchlist functionality
        this.app.showNotification('Added to watchlist', 'success');
    }

    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMkEyQTJBIi8+CjxwYXRoIGQ9Ik0xNTAgMjI1TDE3NSAyMDBIMTI1TDE1MCAyMjVaIiBmaWxsPSIjNEE0QTRBIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNzc3Nzc3IiBmb250LXNpemU9IjE0Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
    }

    addModalCSS() {
        if (document.getElementById('media-details-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'media-details-modal-styles';
        style.textContent = `
            .media-tagline {
                font-style: italic;
                color: rgba(255,255,255,0.7);
                margin-bottom: 12px;
            }

            .media-status {
                color: #4CAF50;
                font-weight: 500;
            }

            .media-production,
            .media-keywords {
                font-size: 14px;
                color: rgba(255,255,255,0.7);
                margin-top: 8px;
            }

            .content-rating {
                background: rgba(0,0,0,0.6);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
            }
            .media-details-modal .modal-content {
                max-width: 900px;
                width: 90vw;
                max-height: 90vh;
                padding: 0;
                overflow: hidden;
            }

            .media-details-backdrop {
                position: relative;
                background-size: cover;
                background-position: center;
                min-height: 500px;
            }

            .media-details-overlay {
                background: linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 100%);
                padding: 40px;
                min-height: 500px;
                display: flex;
                align-items: center;
            }

            .media-details-main {
                display: flex;
                gap: 30px;
                width: 100%;
                align-items: flex-start;
            }

            .media-details-poster {
                flex-shrink: 0;
            }

            .media-details-poster img {
                width: 200px;
                height: 300px;
                object-fit: cover;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }

            .fallback-notice {
                background: rgba(255, 193, 7, 0.2);
                border: 1px solid rgba(255, 193, 7, 0.3);
                color: #ffc107;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                margin-bottom: 10px;
                display: inline-block;
            }

            .media-details-title {
                font-size: 2.5em;
                margin: 0 0 10px 0;
                color: white;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            }

            .media-details-meta {
                display: flex;
                gap: 15px;
                align-items: center;
                margin-bottom: 15px;
                flex-wrap: wrap;
            }

            .media-year, .media-runtime, .media-rating, .media-genres {
                background: rgba(0,0,0,0.6);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 14px;
            }

            .media-rating {
                color: #ffd700;
            }

            .media-overview {
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 15px;
                color: rgba(255,255,255,0.9);
            }

            .media-cast {
                font-size: 14px;
                color: rgba(255,255,255,0.8);
                margin-bottom: 20px;
            }

            .media-actions {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .media-actions button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .media-actions button:disabled:hover {
                transform: none;
            };
                object-fit: cover;
                border-radius: var(--border-radius);
                box-shadow: var(--shadow-hover);
            }

            .media-details-info {
                flex: 1;
                color: white;
            }

            .media-details-title {
                font-size: 36px;
                font-weight: 700;
                margin-bottom: 16px;
                line-height: 1.2;
            }

            .media-details-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 16px;
                margin-bottom: 20px;
                font-size: 16px;
            }

            .media-details-meta span {
                padding: 6px 12px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                backdrop-filter: blur(10px);
            }

            .media-rating {
                background: var(--accent-green) !important;
                color: var(--primary-bg) !important;
                font-weight: 600;
            }

            .media-overview {
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 20px;
                opacity: 0.9;
            }

            .media-cast {
                font-size: 14px;
                margin-bottom: 30px;
                opacity: 0.8;
            }

            .media-actions {
                display: flex;
                gap: 16px;
            }

            .media-actions .btn-primary,
            .media-actions .btn-secondary {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 24px;
                font-size: 16px;
                font-weight: 600;
            }

            .media-actions svg {
                width: 20px;
                height: 20px;
            }

            @media (max-width: 768px) {
                .media-details-main {
                    flex-direction: column;
                    text-align: center;
                }

                .media-details-poster img {
                    width: 150px;
                    height: 225px;
                }

                .media-details-title {
                    font-size: 28px;
                }

                .media-actions {
                    justify-content: center;
                }
            }
        `;

        document.head.appendChild(style);
    }
}

// Make it globally available
window.MediaDetailsModal = MediaDetailsModal;