/**
 * Browser-compatible MDBList API client
 * Simplified version of mdblist-lib for frontend usage
 */
class MDBList {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://mdblist.com/api';
    }

    /**
     * Search for movies and TV shows
     * @param {string} title - Search query
     * @param {number|null} year - Release year (optional)
     * @param {string|null} type - 'movie' or 'show' (optional)
     * @returns {Promise<Object>} Search results
     */
    async search(title, year = null, type = null) {
        const params = new URLSearchParams({
            apikey: this.apiKey,
            s: title
        });

        if (year) {
            params.append('y', year.toString());
        }

        if (type) {
            params.append('m', type);
        }

        const url = `${this.baseUrl}/?${params.toString()}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('MDBList search error:', error);
            throw error;
        }
    }

    /**
     * Get item details by IMDb ID
     * @param {string} imdbId - IMDb ID (e.g., 'tt1234567')
     * @returns {Promise<Object>} Item details
     */
    async byImdbID(imdbId) {
        const params = new URLSearchParams({
            apikey: this.apiKey,
            i: imdbId
        });

        const url = `${this.baseUrl}/?${params.toString()}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('MDBList byImdbID error:', error);
            throw error;
        }
    }

    /**
     * Get item details by TMDB ID
     * @param {string} tmdbId - TMDB ID
     * @returns {Promise<Object>} Item details
     */
    async byTmdbID(tmdbId) {
        const params = new URLSearchParams({
            apikey: this.apiKey,
            tm: tmdbId
        });

        const url = `${this.baseUrl}/?${params.toString()}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('MDBList byTmdbID error:', error);
            throw error;
        }
    }

    /**
     * Search for public lists by title
     * @param {string} query - Search query for list titles
     * @param {number} limit - Number of results to return (default: 20)
     * @returns {Promise<Object>} List search results
     */
    async searchLists(query, limit = 20) {
        const params = new URLSearchParams({
            apikey: this.apiKey,
            s: query,
            limit: limit.toString()
        });

        const url = `${this.baseUrl}/lists/search/?${params.toString()}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('MDBList searchLists error:', error);
            throw error;
        }
    }

    /**
     * Get top lists sorted by Trakt likes
     * @param {number} limit - Number of results to return (default: 20)
     * @returns {Promise<Object>} Top lists
     */
    async getTopLists(limit = 20) {
        const params = new URLSearchParams({
            apikey: this.apiKey,
            limit: limit.toString()
        });

        const url = `${this.baseUrl}/lists/top/?${params.toString()}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('MDBList getTopLists error:', error);
            throw error;
        }
    }

    /**
     * Get list details by ID
     * @param {string} listId - List ID
     * @returns {Promise<Object>} List details
     */
    async getListById(listId) {
        const params = new URLSearchParams({
            apikey: this.apiKey
        });

        const url = `${this.baseUrl}/lists/${listId}/?${params.toString()}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('MDBList getListById error:', error);
            throw error;
        }
    }

    /**
     * Get list items by list ID
     * @param {string} listId - List ID
     * @param {number} limit - Number of items to return (default: 100)
     * @param {number} offset - Offset for pagination (default: 0)
     * @returns {Promise<Object>} List items
     */
    async getListItems(listId, limit = 100, offset = 0) {
        const params = new URLSearchParams({
            apikey: this.apiKey,
            limit: limit.toString(),
            offset: offset.toString(),
            append_to_response: 'genre,poster'
        });

        const url = `${this.baseUrl}/lists/${listId}/items/?${params.toString()}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('MDBList getListItems error:', error);
            throw error;
        }
    }

    /**
     * Get item details by TVDB ID
     * @param {string} tvdbId - TVDB ID
     * @returns {Promise<Object>} Item details
     */
    async byTvdbID(tvdbId) {
        const params = new URLSearchParams({
            apikey: this.apiKey,
            td: tvdbId
        });

        const url = `${this.baseUrl}/?${params.toString()}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('MDBList byTvdbID error:', error);
            throw error;
        }
    }

    /**
     * Get item details by Trakt ID
     * @param {string} traktId - Trakt ID
     * @returns {Promise<Object>} Item details
     */
    async byTraktID(traktId) {
        const params = new URLSearchParams({
            apikey: this.apiKey,
            t: traktId
        });

        const url = `${this.baseUrl}/?${params.toString()}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('MDBList byTraktID error:', error);
            throw error;
        }
    }
}

// Make it available globally
window.MDBList = MDBList;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MDBList };
}