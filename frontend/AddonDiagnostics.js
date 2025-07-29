// Addon Diagnostics and Health Check Tool
class AddonDiagnostics {
    constructor(app) {
        this.app = app;
        this.testResults = new Map();
        this.commonAddons = [
            {
                name: 'Torrentio',
                url: 'https://torrentio.strem.fun',
                description: 'Popular torrent streaming addon'
            },
            {
                name: 'Cinemeta',
                url: 'https://v3-cinemeta.strem.io',
                description: 'Official Stremio metadata addon'
            },
            {
                name: 'OpenSubtitles',
                url: 'https://opensubtitles.strem.io',
                description: 'Subtitle provider addon'
            }
        ];
    }

    // Comprehensive addon health check
    async performHealthCheck() {
        console.log('🔍 Starting comprehensive addon health check...');
        
        const results = {
            timestamp: new Date().toISOString(),
            totalAddons: this.app.addons.length,
            healthyAddons: 0,
            unhealthyAddons: 0,
            addonResults: [],
            networkTests: {},
            recommendations: []
        };

        // Test network connectivity
        results.networkTests = await this.testNetworkConnectivity();

        // Test each addon
        for (const addon of this.app.addons) {
            const addonResult = await this.testAddon(addon);
            results.addonResults.push(addonResult);
            
            if (addonResult.status === 'healthy') {
                results.healthyAddons++;
            } else {
                results.unhealthyAddons++;
            }
        }

        // Generate recommendations
        results.recommendations = this.generateRecommendations(results);

        this.displayHealthCheckResults(results);
        return results;
    }

    // Test individual addon
    async testAddon(addon) {
        const result = {
            name: addon.name,
            url: addon.url,
            status: 'unknown',
            responseTime: null,
            errors: [],
            capabilities: [],
            lastTested: new Date().toISOString()
        };

        try {
            // Test 1: Manifest accessibility
            const manifestTest = await this.testManifest(addon);
            result.responseTime = manifestTest.responseTime;
            result.capabilities = manifestTest.capabilities;

            if (!manifestTest.success) {
                result.status = 'unhealthy';
                result.errors.push('Manifest not accessible');
                return result;
            }

            // Test 2: Stream endpoint test
            const streamTest = await this.testStreamEndpoint(addon);
            if (!streamTest.success) {
                result.errors.push('Stream endpoint not responding');
            }

            // Test 3: CORS test
            const corsTest = await this.testCORS(addon);
            if (!corsTest.success) {
                result.errors.push('CORS issues detected');
            }

            // Determine overall status
            result.status = result.errors.length === 0 ? 'healthy' : 'degraded';

        } catch (error) {
            result.status = 'unhealthy';
            result.errors.push(error.message);
        }

        return result;
    }

    // Test addon manifest
    async testManifest(addon) {
        const startTime = Date.now();
        
        try {
            const manifestUrl = `${addon.url}/manifest.json`;
            const response = await fetch(manifestUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(10000)
            });

            const responseTime = Date.now() - startTime;

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const manifest = await response.json();
            
            return {
                success: true,
                responseTime,
                capabilities: this.extractCapabilities(manifest)
            };

        } catch (error) {
            return {
                success: false,
                responseTime: Date.now() - startTime,
                error: error.message,
                capabilities: []
            };
        }
    }

    // Test stream endpoint
    async testStreamEndpoint(addon) {
        try {
            // Test with a popular movie ID (The Matrix - 603)
            const testUrl = `${addon.url}/stream/movie/603.json`;
            
            const response = await fetch(testUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(15000)
            });

            return { success: response.ok };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Test CORS configuration
    async testCORS(addon) {
        try {
            const response = await fetch(`${addon.url}/manifest.json`, {
                method: 'OPTIONS',
                signal: AbortSignal.timeout(5000)
            });

            const corsHeaders = {
                'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
                'access-control-allow-headers': response.headers.get('access-control-allow-headers')
            };

            return {
                success: corsHeaders['access-control-allow-origin'] !== null,
                headers: corsHeaders
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Test network connectivity
    async testNetworkConnectivity() {
        const tests = {
            internet: false,
            dns: false,
            https: false,
            corsProxies: []
        };

        try {
            // Test internet connectivity
            const response = await fetch('https://httpbin.org/get', {
                signal: AbortSignal.timeout(5000)
            });
            tests.internet = response.ok;
            tests.https = true;
            tests.dns = true;
        } catch (error) {
            console.warn('Network connectivity test failed:', error);
        }

        // Test CORS proxies
        for (const proxy of this.app.streamScraper.corsProxies) {
            try {
                const testUrl = proxy + encodeURIComponent('https://httpbin.org/get');
                const response = await fetch(testUrl, {
                    signal: AbortSignal.timeout(5000)
                });
                tests.corsProxies.push({
                    url: proxy,
                    working: response.ok,
                    responseTime: response.ok ? 'fast' : 'slow'
                });
            } catch (error) {
                tests.corsProxies.push({
                    url: proxy,
                    working: false,
                    error: error.message
                });
            }
        }

        return tests;
    }

    // Extract addon capabilities from manifest
    extractCapabilities(manifest) {
        const capabilities = [];
        
        if (manifest.resources) {
            manifest.resources.forEach(resource => {
                capabilities.push(resource.name);
            });
        }

        if (manifest.types) {
            capabilities.push(...manifest.types);
        }

        return capabilities;
    }

    // Generate recommendations based on test results
    generateRecommendations(results) {
        const recommendations = [];

        if (results.unhealthyAddons > 0) {
            recommendations.push({
                type: 'warning',
                title: 'Unhealthy Addons Detected',
                description: `${results.unhealthyAddons} addon(s) are not responding properly. Consider removing or replacing them.`
            });
        }

        if (results.totalAddons === 0) {
            recommendations.push({
                type: 'info',
                title: 'No Addons Installed',
                description: 'Install some popular addons like Torrentio to enable streaming functionality.',
                action: 'installCommonAddons'
            });
        }

        if (!results.networkTests.internet) {
            recommendations.push({
                type: 'error',
                title: 'Network Connectivity Issues',
                description: 'Internet connection problems detected. Check your network settings.'
            });
        }

        const workingProxies = results.networkTests.corsProxies.filter(p => p.working).length;
        if (workingProxies === 0) {
            recommendations.push({
                type: 'warning',
                title: 'CORS Proxy Issues',
                description: 'No working CORS proxies found. This may limit addon functionality.'
            });
        }

        if (results.healthyAddons === 0 && results.totalAddons > 0) {
            recommendations.push({
                type: 'error',
                title: 'All Addons Unhealthy',
                description: 'None of your installed addons are working. Try clearing cache or reinstalling addons.'
            });
        }

        return recommendations;
    }

    // Display health check results in UI
    displayHealthCheckResults(results) {
        const modal = document.createElement('div');
        modal.className = 'diagnostic-modal';
        modal.innerHTML = `
            <div class="diagnostic-container">
                <div class="diagnostic-header">
                    <h2>🔍 Addon Health Check Results</h2>
                    <button class="diagnostic-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="diagnostic-content">
                    ${this.renderHealthSummary(results)}
                    ${this.renderAddonResults(results.addonResults)}
                    ${this.renderNetworkTests(results.networkTests)}
                    ${this.renderRecommendations(results.recommendations)}
                </div>
                <div class="diagnostic-actions">
                    <button onclick="addonDiagnostics.installCommonAddons()" class="btn-primary">
                        Install Popular Addons
                    </button>
                    <button onclick="addonDiagnostics.exportResults()" class="btn-secondary">
                        Export Results
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.addDiagnosticStyles();
    }

    renderHealthSummary(results) {
        const healthPercentage = results.totalAddons > 0 
            ? Math.round((results.healthyAddons / results.totalAddons) * 100)
            : 0;

        return `
            <div class="health-summary">
                <div class="health-score ${healthPercentage >= 80 ? 'good' : healthPercentage >= 50 ? 'warning' : 'poor'}">
                    <div class="score-circle">
                        <span class="score-number">${healthPercentage}%</span>
                        <span class="score-label">Health Score</span>
                    </div>
                </div>
                <div class="health-stats">
                    <div class="stat">
                        <span class="stat-number">${results.totalAddons}</span>
                        <span class="stat-label">Total Addons</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${results.healthyAddons}</span>
                        <span class="stat-label">Healthy</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${results.unhealthyAddons}</span>
                        <span class="stat-label">Unhealthy</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderAddonResults(addonResults) {
        if (addonResults.length === 0) {
            return '<div class="no-addons">No addons installed</div>';
        }

        return `
            <div class="addon-results">
                <h3>Addon Status</h3>
                ${addonResults.map(addon => `
                    <div class="addon-result ${addon.status}">
                        <div class="addon-info">
                            <h4>${addon.name}</h4>
                            <p class="addon-url">${addon.url}</p>
                            <div class="addon-meta">
                                <span class="status-badge ${addon.status}">${addon.status.toUpperCase()}</span>
                                ${addon.responseTime ? `<span class="response-time">${addon.responseTime}ms</span>` : ''}
                                ${addon.capabilities.length > 0 ? `<span class="capabilities">${addon.capabilities.join(', ')}</span>` : ''}
                            </div>
                        </div>
                        ${addon.errors.length > 0 ? `
                            <div class="addon-errors">
                                ${addon.errors.map(error => `<span class="error">${error}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderNetworkTests(networkTests) {
        return `
            <div class="network-tests">
                <h3>Network Connectivity</h3>
                <div class="network-grid">
                    <div class="network-test ${networkTests.internet ? 'pass' : 'fail'}">
                        <span class="test-name">Internet</span>
                        <span class="test-status">${networkTests.internet ? '✓' : '✗'}</span>
                    </div>
                    <div class="network-test ${networkTests.dns ? 'pass' : 'fail'}">
                        <span class="test-name">DNS</span>
                        <span class="test-status">${networkTests.dns ? '✓' : '✗'}</span>
                    </div>
                    <div class="network-test ${networkTests.https ? 'pass' : 'fail'}">
                        <span class="test-name">HTTPS</span>
                        <span class="test-status">${networkTests.https ? '✓' : '✗'}</span>
                    </div>
                </div>
                <div class="cors-proxies">
                    <h4>CORS Proxies</h4>
                    ${networkTests.corsProxies.map(proxy => `
                        <div class="proxy-test ${proxy.working ? 'working' : 'failed'}">
                            <span class="proxy-url">${proxy.url}</span>
                            <span class="proxy-status">${proxy.working ? '✓' : '✗'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderRecommendations(recommendations) {
        if (recommendations.length === 0) {
            return '<div class="no-recommendations">✅ All systems appear to be working correctly!</div>';
        }

        return `
            <div class="recommendations">
                <h3>Recommendations</h3>
                ${recommendations.map(rec => `
                    <div class="recommendation ${rec.type}">
                        <div class="rec-icon">${rec.type === 'error' ? '🚨' : rec.type === 'warning' ? '⚠️' : 'ℹ️'}</div>
                        <div class="rec-content">
                            <h4>${rec.title}</h4>
                            <p>${rec.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Install common/popular addons
    async installCommonAddons() {
        for (const addon of this.commonAddons) {
            try {
                await this.app.addStremioAddon(addon.url);
                console.log(`✅ Installed ${addon.name}`);
            } catch (error) {
                console.error(`❌ Failed to install ${addon.name}:`, error);
            }
        }
        
        this.app.showNotification('Popular addons installation completed');
    }

    // Export diagnostic results
    exportResults() {
        const results = this.testResults;
        const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `crumble-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Add diagnostic modal styles
    addDiagnosticStyles() {
        if (document.getElementById('diagnostic-styles')) return;

        const style = document.createElement('style');
        style.id = 'diagnostic-styles';
        style.textContent = `
            .diagnostic-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(10px);
            }

            .diagnostic-container {
                width: 90vw;
                max-width: 1000px;
                max-height: 90vh;
                background: var(--secondary-bg);
                border-radius: var(--border-radius);
                border: 1px solid var(--border-color);
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .diagnostic-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                background: var(--tertiary-bg);
                border-bottom: 1px solid var(--border-color);
            }

            .diagnostic-header h2 {
                margin: 0;
                color: var(--accent-green);
            }

            .diagnostic-close {
                background: none;
                border: none;
                color: var(--text-muted);
                font-size: 24px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: var(--transition);
            }

            .diagnostic-close:hover {
                background: var(--hover-bg);
                color: var(--text-primary);
            }

            .diagnostic-content {
                flex: 1;
                padding: 24px;
                overflow-y: auto;
            }

            .health-summary {
                display: flex;
                align-items: center;
                gap: 32px;
                margin-bottom: 32px;
                padding: 24px;
                background: var(--tertiary-bg);
                border-radius: var(--border-radius);
            }

            .health-score {
                text-align: center;
            }

            .score-circle {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border: 4px solid;
            }

            .health-score.good .score-circle {
                border-color: var(--accent-green);
                background: rgba(0, 255, 65, 0.1);
            }

            .health-score.warning .score-circle {
                border-color: #ffaa00;
                background: rgba(255, 170, 0, 0.1);
            }

            .health-score.poor .score-circle {
                border-color: #ff4444;
                background: rgba(255, 68, 68, 0.1);
            }

            .score-number {
                font-size: 24px;
                font-weight: 700;
                color: var(--text-primary);
            }

            .score-label {
                font-size: 12px;
                color: var(--text-muted);
            }

            .health-stats {
                display: flex;
                gap: 24px;
            }

            .stat {
                text-align: center;
            }

            .stat-number {
                display: block;
                font-size: 20px;
                font-weight: 600;
                color: var(--accent-green);
            }

            .stat-label {
                font-size: 14px;
                color: var(--text-muted);
            }

            .addon-results h3,
            .network-tests h3,
            .recommendations h3 {
                color: var(--text-primary);
                margin-bottom: 16px;
                font-size: 18px;
            }

            .addon-result {
                padding: 16px;
                margin-bottom: 12px;
                background: var(--tertiary-bg);
                border-radius: var(--border-radius-small);
                border-left: 4px solid;
            }

            .addon-result.healthy {
                border-left-color: var(--accent-green);
            }

            .addon-result.degraded {
                border-left-color: #ffaa00;
            }

            .addon-result.unhealthy {
                border-left-color: #ff4444;
            }

            .addon-info h4 {
                margin: 0 0 4px 0;
                color: var(--text-primary);
            }

            .addon-url {
                font-size: 12px;
                color: var(--text-muted);
                font-family: monospace;
                margin-bottom: 8px;
            }

            .addon-meta {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }

            .status-badge {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .status-badge.healthy {
                background: var(--accent-green);
                color: var(--primary-bg);
            }

            .status-badge.degraded {
                background: #ffaa00;
                color: var(--primary-bg);
            }

            .status-badge.unhealthy {
                background: #ff4444;
                color: white;
            }

            .response-time,
            .capabilities {
                font-size: 12px;
                color: var(--text-secondary);
            }

            .addon-errors {
                margin-top: 8px;
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .error {
                padding: 4px 8px;
                background: rgba(255, 68, 68, 0.2);
                color: #ff4444;
                border-radius: 4px;
                font-size: 12px;
            }

            .network-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 12px;
                margin-bottom: 20px;
            }

            .network-test {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                background: var(--tertiary-bg);
                border-radius: var(--border-radius-small);
                border-left: 4px solid;
            }

            .network-test.pass {
                border-left-color: var(--accent-green);
            }

            .network-test.fail {
                border-left-color: #ff4444;
            }

            .test-name {
                font-weight: 500;
                color: var(--text-primary);
            }

            .test-status {
                font-weight: 600;
                font-size: 18px;
            }

            .network-test.pass .test-status {
                color: var(--accent-green);
            }

            .network-test.fail .test-status {
                color: #ff4444;
            }

            .cors-proxies h4 {
                color: var(--text-secondary);
                margin-bottom: 12px;
                font-size: 14px;
            }

            .proxy-test {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                margin-bottom: 8px;
                background: var(--secondary-bg);
                border-radius: var(--border-radius-small);
                border-left: 3px solid;
            }

            .proxy-test.working {
                border-left-color: var(--accent-green);
            }

            .proxy-test.failed {
                border-left-color: #ff4444;
            }

            .proxy-url {
                font-size: 12px;
                font-family: monospace;
                color: var(--text-secondary);
            }

            .proxy-status {
                font-weight: 600;
            }

            .proxy-test.working .proxy-status {
                color: var(--accent-green);
            }

            .proxy-test.failed .proxy-status {
                color: #ff4444;
            }

            .recommendation {
                display: flex;
                gap: 16px;
                padding: 16px;
                margin-bottom: 12px;
                background: var(--tertiary-bg);
                border-radius: var(--border-radius-small);
                border-left: 4px solid;
            }

            .recommendation.error {
                border-left-color: #ff4444;
            }

            .recommendation.warning {
                border-left-color: #ffaa00;
            }

            .recommendation.info {
                border-left-color: var(--accent-green);
            }

            .rec-icon {
                font-size: 20px;
                flex-shrink: 0;
            }

            .rec-content h4 {
                margin: 0 0 8px 0;
                color: var(--text-primary);
            }

            .rec-content p {
                margin: 0;
                color: var(--text-secondary);
                line-height: 1.4;
            }

            .diagnostic-actions {
                display: flex;
                gap: 12px;
                padding: 20px 24px;
                background: var(--tertiary-bg);
                border-top: 1px solid var(--border-color);
            }

            .no-addons,
            .no-recommendations {
                text-align: center;
                padding: 40px 20px;
                color: var(--text-muted);
                font-style: italic;
            }

            @media (max-width: 768px) {
                .diagnostic-container {
                    width: 95vw;
                    height: 95vh;
                }

                .health-summary {
                    flex-direction: column;
                    text-align: center;
                }

                .health-stats {
                    justify-content: center;
                }

                .diagnostic-actions {
                    flex-direction: column;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Quick addon connectivity test
    async quickTest(addonUrl) {
        try {
            const response = await fetch(`${addonUrl}/manifest.json`, {
                signal: AbortSignal.timeout(5000)
            });
            return {
                success: response.ok,
                status: response.status,
                responseTime: response.ok ? 'fast' : 'slow'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Make AddonDiagnostics available globally
window.AddonDiagnostics = AddonDiagnostics;