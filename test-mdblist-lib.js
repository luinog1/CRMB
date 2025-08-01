/**
 * Test script for mdblist-lib integration
 * This script tests the mdblist-lib package functionality
 */

const { MDBList } = require('mdblist-lib');

// Test API key (replace with actual key)
const API_KEY = process.env.MDBLIST_API_KEY || 'your-api-key-here';

async function testMDBListLib() {
    if (!API_KEY || API_KEY === 'your-api-key-here') {
        console.error('Please set MDBLIST_API_KEY environment variable or update the API_KEY constant');
        process.exit(1);
    }

    const mdb = new MDBList(API_KEY);

    try {
        console.log('Testing MDBList library...');
        
        // Test 1: Search for movies
        console.log('\n1. Testing movie search...');
        const movieResults = await mdb.search('Inception', null, 'movie');
        console.log('Movie search results:', JSON.stringify(movieResults, null, 2));
        
        // Test 2: Search for TV shows
        console.log('\n2. Testing TV show search...');
        const tvResults = await mdb.search('Breaking Bad', null, 'show');
        console.log('TV show search results:', JSON.stringify(tvResults, null, 2));
        
        // Test 3: Get details by IMDb ID
        if (movieResults.search && movieResults.search.length > 0) {
            const firstMovie = movieResults.search[0];
            if (firstMovie.imdbid) {
                console.log('\n3. Testing get by IMDb ID...');
                const movieDetails = await mdb.byImdbID(firstMovie.imdbid);
                console.log('Movie details by IMDb ID:', JSON.stringify(movieDetails, null, 2));
            }
        }
        
        // Test 4: Get details by TMDB ID
        if (movieResults.search && movieResults.search.length > 0) {
            const firstMovie = movieResults.search[0];
            if (firstMovie.tmdbid) {
                console.log('\n4. Testing get by TMDB ID...');
                const movieDetails = await mdb.byTmdbID(firstMovie.tmdbid.toString());
                console.log('Movie details by TMDB ID:', JSON.stringify(movieDetails, null, 2));
            }
        }
        
        console.log('\n✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testMDBListLib();