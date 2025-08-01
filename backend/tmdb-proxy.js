const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3003;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// TMDB API base URL
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'TMDB Proxy Server',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Generic TMDB API proxy endpoint
app.all('/api/tmdb/*', async (req, res) => {
    try {
        const apiKey = req.headers['x-tmdb-api-key'];
        
        if (!apiKey) {
            return res.status(400).json({ 
                error: 'Missing TMDB API key in headers',
                message: 'Please provide x-tmdb-api-key header'
            });
        }

        // Extract the TMDB path from the request
        const tmdbPath = req.path.replace('/api/tmdb', '');
        
        // Build the full TMDB URL
        const url = new URL(`${TMDB_BASE_URL}${tmdbPath}`);
        
        // Add API key to query parameters
        url.searchParams.set('api_key', apiKey);
        
        // Forward original query parameters
        Object.entries(req.query).forEach(([key, value]) => {
            if (key !== 'api_key') { // Don't override our API key
                url.searchParams.set(key, value);
            }
        });

        console.log(`[TMDB Proxy] ${req.method} ${url.toString()}`);

        // Make the request to TMDB
        const response = await fetch(url.toString(), {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CRMB-TMDB-Proxy/1.0'
            },
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`[TMDB Proxy] Error ${response.status}:`, data);
            return res.status(response.status).json({
                error: 'TMDB API Error',
                status: response.status,
                message: data.status_message || 'Unknown error',
                details: data
            });
        }

        // Forward the successful response
        res.json(data);

    } catch (error) {
        console.error('[TMDB Proxy] Server error:', error);
        res.status(500).json({
            error: 'Proxy server error',
            message: error.message
        });
    }
});

// Get TMDB API limits and account info
app.get('/api/tmdb-account', async (req, res) => {
    try {
        const apiKey = req.headers['x-tmdb-api-key'];
        
        if (!apiKey) {
            return res.status(400).json({ 
                error: 'Missing TMDB API key in headers'
            });
        }

        // Get account details
        const accountUrl = `${TMDB_BASE_URL}/account?api_key=${apiKey}`;
        const response = await fetch(accountUrl);
        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Failed to fetch account info',
                details: data
            });
        }

        res.json({
            account: data,
            limits: {
                requests_per_second: 40,
                requests_per_day: 1000000,
                note: 'TMDB API limits are generous for most use cases'
            }
        });

    } catch (error) {
        console.error('[TMDB Proxy] Account error:', error);
        res.status(500).json({
            error: 'Failed to fetch account info',
            message: error.message
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🎬 TMDB Proxy Server running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🔑 TMDB API proxy: http://localhost:${PORT}/api/tmdb/*`);
    console.log(`👤 Account info: http://localhost:${PORT}/api/tmdb-account`);
});

module.exports = app;