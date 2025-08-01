const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = 3002;

// Enable CORS for frontend requests
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
    credentials: true
}));

app.use(express.json());

// MDBList API base URL
const MDBLIST_BASE_URL = 'https://api.mdblist.com';

/**
 * Proxy endpoint for MDBList API requests
 * Handles CORS and API key authentication
 */
app.get('/api/mdblist/*', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            return res.status(400).json({ error: 'API key required in x-api-key header' });
        }

        // Extract the MDBList API path from the request
        const mdblistPath = req.path.replace('/api/mdblist', '');
        const queryParams = new URLSearchParams(req.query);
        queryParams.set('apikey', apiKey);
        
        // Handle specific MDBList API endpoints
        let mdblistUrl;
        if (mdblistPath.includes('/lists/search')) {
            // For list search, use the correct endpoint format
            const query = req.query.query || req.query.q;
            if (!query) {
                return res.status(400).json({ error: 'Search query is required' });
            }
            mdblistUrl = `${MDBLIST_BASE_URL}/lists/search?apikey=${apiKey}&query=${encodeURIComponent(query)}`;
        } else {
            mdblistUrl = `${MDBLIST_BASE_URL}${mdblistPath}?${queryParams.toString()}`;
        }
        
        console.log(`Proxying request to: ${mdblistUrl}`);
        
        const response = await fetch(mdblistUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'CRMB-MDBList-Integration/1.0',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`MDBList API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check if MDBList returned an error response
        if (data && data.response === false && data.error) {
            console.error('MDBList API error:', data.error);
            return res.status(400).json({
                error: 'MDBList API Error',
                message: data.error,
                details: data
            });
        }
        
        res.json(data);
        
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch from MDBList API',
            details: error.message 
        });
    }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'mdblist-proxy', port: PORT });
});

/**
 * Get MDBList user limits
 */
app.get('/api/mdblist-limits', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            return res.status(400).json({ error: 'API key required' });
        }

        const response = await fetch(`${MDBLIST_BASE_URL}/user?apikey=${apiKey}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch user limits: ${response.statusText}`);
        }
        
        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('Limits check error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch user limits',
            details: error.message 
        });
    }
});

/**
 * Start the proxy server
 */
app.listen(PORT, () => {
    console.log(`MDBList Proxy Server running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log(`  - GET /health - Health check`);
    console.log(`  - GET /api/mdblist/* - Proxy MDBList API calls`);
    console.log(`  - GET /api/mdblist-limits - Get user API limits`);
});

module.exports = app;