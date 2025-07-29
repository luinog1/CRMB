// External Player Handler
class ExternalPlayerHandler {
    constructor(app) {
        this.app = app;
        this.playerSchemes = {
            infuse: {
                scheme: 'infuse://x-callback-url/play',
                name: 'INFUSE',
                supportsHDR: true,
                supportedFormats: ['mp4', 'mkv', 'avi', 'mov', 'm4v', 'wmv', 'flv', 'webm']
            },
            vlc: {
                scheme: 'vlc://',
                name: 'VLC',
                supportsHDR: false,
                supportedFormats: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'ts', 'm3u8']
            },
            outplayer: {
                scheme: 'outplayer://',
                name: 'OUTPLAYER',
                supportsHDR: true,
                supportedFormats: ['mp4', 'mkv', 'avi', 'mov', 'm4v', 'wmv', 'flv', 'webm']
            }
        };
    }

    openInPlayer(streamUrl, playerType, mediaInfo = null) {
        if (!this.app.playerSettings[playerType]) {
            this.app.showNotification(`${playerType.toUpperCase()} player is disabled`, 'warning');
            return;
        }

        const player = this.playerSchemes[playerType];
        if (!player) {
            this.app.showNotification('Unknown player type', 'error');
            return;
        }

        try {
            const playerUrl = this.buildPlayerUrl(streamUrl, playerType, mediaInfo);
            this.launchPlayer(playerUrl, player.name);
        } catch (error) {
            console.error('Error opening external player:', error);
            this.app.showNotification(`Failed to open ${player.name}`, 'error');
        }
    }

    buildPlayerUrl(streamUrl, playerType, mediaInfo) {
        const player = this.playerSchemes[playerType];
        
        switch (playerType) {
            case 'infuse':
                return this.buildInfuseUrl(streamUrl, mediaInfo);
            case 'vlc':
                return this.buildVLCUrl(streamUrl, mediaInfo);
            case 'outplayer':
                return this.buildOutplayerUrl(streamUrl, mediaInfo);
            default:
                throw new Error(`Unsupported player: ${playerType}`);
        }
    }

    buildInfuseUrl(streamUrl, mediaInfo) {
        const params = new URLSearchParams();
        params.append('url', streamUrl);
        
        if (mediaInfo) {
            if (mediaInfo.title) {
                params.append('title', mediaInfo.title);
            }
            
            // Add metadata for better organization in INFUSE
            if (mediaInfo.type === 'tv') {
                params.append('type', 'tv');
                if (mediaInfo.season) params.append('season', mediaInfo.season);
                if (mediaInfo.episode) params.append('episode', mediaInfo.episode);
            } else {
                params.append('type', 'movie');
            }
        }

        return `infuse://x-callback-url/play?${params.toString()}`;
    }

    buildVLCUrl(streamUrl, mediaInfo) {
        // VLC for iOS/macOS uses a simple scheme
        return `vlc://${encodeURIComponent(streamUrl)}`;
    }

    buildOutplayerUrl(streamUrl, mediaInfo) {
        const params = new URLSearchParams();
        params.append('url', streamUrl);
        
        if (mediaInfo?.title) {
            params.append('title', mediaInfo.title);
        }

        return `outplayer://${params.toString()}`;
    }

    launchPlayer(playerUrl, playerName) {
        // Try to open the URL scheme
        const link = document.createElement('a');
        link.href = playerUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Attempt to trigger the URL scheme
        link.click();
        document.body.removeChild(link);

        // Show user feedback
        this.showPlayerLaunchFeedback(playerName, playerUrl);
    }

    showPlayerLaunchFeedback(playerName, playerUrl) {
        // Create a modal to show launch status and fallback options
        const modal = document.createElement('div');
        modal.className = 'player-launch-modal';
        modal.innerHTML = `
            <div class="player-launch-container">
                <div class="player-launch-header">
                    <h3>Opening in ${playerName}</h3>
                    <button class="player-launch-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="player-launch-content">
                    <div class="launch-status">
                        <div class="launch-spinner"></div>
                        <p>Attempting to open ${playerName}...</p>
                    </div>
                    
                    <div class="launch-instructions">
                        <h4>If ${playerName} doesn't open automatically:</h4>
                        <ol>
                            <li>Make sure ${playerName} is installed on your device</li>
                            <li>Copy the stream URL below and paste it in ${playerName}</li>
                            <li>Or try one of the alternative methods</li>
                        </ol>
                    </div>

                    <div class="stream-url-section">
                        <label>Stream URL:</label>
                        <div class="url-input-group">
                            <input type="text" value="${this.extractStreamUrl(playerUrl)}" readonly class="stream-url-input">
                            <button onclick="this.copyStreamUrl()" class="copy-url-btn">Copy</button>
                        </div>
                    </div>

                    <div class="alternative-methods">
                        <h4>Alternative Methods:</h4>
                        <div class="method-buttons">
                            <button onclick="this.openInBrowser()" class="method-btn">Open in Browser</button>
                            <button onclick="this.downloadFile()" class="method-btn">Download File</button>
                            <button onclick="this.shareUrl()" class="method-btn">Share URL</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.addPlayerLaunchCSS();

        // Add event handlers
        this.setupPlayerLaunchHandlers(modal, playerUrl);

        // Auto-close after 10 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 10000);
    }

    setupPlayerLaunchHandlers(modal, playerUrl) {
        const streamUrl = this.extractStreamUrl(playerUrl);
        
        // Copy URL function
        window.copyStreamUrl = () => {
            navigator.clipboard.writeText(streamUrl).then(() => {
                const btn = modal.querySelector('.copy-url-btn');
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                btn.style.background = 'var(--accent-green)';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 2000);
            });
        };

        // Open in browser
        window.openInBrowser = () => {
            window.open(streamUrl, '_blank');
            modal.remove();
        };

        // Download file
        window.downloadFile = () => {
            const a = document.createElement('a');
            a.href = streamUrl;
            a.download = 'video';
            a.click();
            modal.remove();
        };

        // Share URL
        window.shareUrl = () => {
            if (navigator.share) {
                navigator.share({
                    title: 'Stream URL',
                    url: streamUrl
                });
            } else {
                navigator.clipboard.writeText(streamUrl);
                this.app.showNotification('URL copied to clipboard');
            }
            modal.remove();
        };
    }

    extractStreamUrl(playerUrl) {
        try {
            const url = new URL(playerUrl);
            return url.searchParams.get('url') || playerUrl;
        } catch {
            return playerUrl;
        }
    }

    addPlayerLaunchCSS() {
        if (document.getElementById('player-launch-styles')) return;

        const style = document.createElement('style');
        style.id = 'player-launch-styles';
        style.textContent = `
            .player-launch-modal {
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

            .player-launch-container {
                width: 90vw;
                max-width: 600px;
                background: var(--secondary-bg);
                border-radius: var(--border-radius);
                border: 1px solid var(--border-color);
                max-height: 90vh;
                overflow-y: auto;
            }

            .player-launch-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                background: var(--tertiary-bg);
                border-bottom: 1px solid var(--border-color);
            }

            .player-launch-header h3 {
                margin: 0;
                color: var(--accent-green);
                font-size: 20px;
            }

            .player-launch-close {
                background: none;
                border: none;
                color: var(--text-muted);
                font-size: 24px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: var(--transition);
            }

            .player-launch-close:hover {
                background: var(--hover-bg);
                color: var(--text-primary);
            }

            .player-launch-content {
                padding: 24px;
            }

            .launch-status {
                display: flex;
                align-items: center;
                gap: 16px;
                margin-bottom: 32px;
                padding: 20px;
                background: var(--tertiary-bg);
                border-radius: var(--border-radius-small);
                border: 1px solid var(--border-color);
            }

            .launch-spinner {
                width: 24px;
                height: 24px;
                border: 3px solid var(--border-color);
                border-top: 3px solid var(--accent-green);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            .launch-status p {
                margin: 0;
                color: var(--text-secondary);
                font-size: 16px;
            }

            .launch-instructions {
                margin-bottom: 24px;
            }

            .launch-instructions h4 {
                color: var(--text-primary);
                margin-bottom: 12px;
                font-size: 16px;
            }

            .launch-instructions ol {
                color: var(--text-secondary);
                padding-left: 20px;
                line-height: 1.6;
            }

            .launch-instructions li {
                margin-bottom: 8px;
            }

            .stream-url-section {
                margin-bottom: 24px;
            }

            .stream-url-section label {
                display: block;
                color: var(--text-primary);
                font-weight: 600;
                margin-bottom: 8px;
            }

            .url-input-group {
                display: flex;
                gap: 12px;
            }

            .stream-url-input {
                flex: 1;
                padding: 12px;
                background: var(--tertiary-bg);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius-small);
                color: var(--text-primary);
                font-family: monospace;
                font-size: 14px;
            }

            .copy-url-btn {
                padding: 12px 20px;
                background: var(--accent-green);
                color: var(--primary-bg);
                border: none;
                border-radius: var(--border-radius-small);
                font-weight: 600;
                cursor: pointer;
                transition: var(--transition);
                white-space: nowrap;
            }

            .copy-url-btn:hover {
                background: var(--accent-green-dim);
            }

            .alternative-methods h4 {
                color: var(--text-primary);
                margin-bottom: 16px;
                font-size: 16px;
            }

            .method-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
            }

            .method-btn {
                padding: 12px 20px;
                background: var(--tertiary-bg);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius-small);
                color: var(--text-secondary);
                cursor: pointer;
                transition: var(--transition);
                font-size: 14px;
                font-weight: 500;
            }

            .method-btn:hover {
                background: var(--hover-bg);
                color: var(--text-primary);
                border-color: var(--accent-green);
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            @media (max-width: 768px) {
                .player-launch-container {
                    width: 95vw;
                    margin: 20px;
                }

                .url-input-group {
                    flex-direction: column;
                }

                .method-buttons {
                    flex-direction: column;
                }

                .method-btn {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Check if a player is available on the system
    async checkPlayerAvailability(playerType) {
        const player = this.playerSchemes[playerType];
        if (!player) return false;

        try {
            // This is a simplified check - in a real app you might use more sophisticated detection
            const testUrl = `${player.scheme}test`;
            const link = document.createElement('a');
            link.href = testUrl;
            
            // Return true for now - actual detection would require native app integration
            return true;
        } catch {
            return false;
        }
    }

    // Get supported formats for a player
    getSupportedFormats(playerType) {
        const player = this.playerSchemes[playerType];
        return player ? player.supportedFormats : [];
    }

    // Check if a player supports HDR
    supportsHDR(playerType) {
        const player = this.playerSchemes[playerType];
        return player ? player.supportsHDR : false;
    }

    // Get all available players
    getAvailablePlayers() {
        return Object.entries(this.playerSchemes)
            .filter(([type]) => this.app.playerSettings[type])
            .map(([type, player]) => ({
                type,
                name: player.name,
                supportsHDR: player.supportsHDR,
                supportedFormats: player.supportedFormats
            }));
    }

    // Recommend best player for a stream
    recommendPlayer(streamUrl, streamInfo = {}) {
        const availablePlayers = this.getAvailablePlayers();
        
        if (availablePlayers.length === 0) {
            return null;
        }

        // If HDR content is detected, prefer HDR-capable players
        if (streamInfo.isHDR) {
            const hdrPlayers = availablePlayers.filter(p => p.supportsHDR);
            if (hdrPlayers.length > 0) {
                return hdrPlayers[0]; // Return first HDR-capable player
            }
        }

        // For general content, prefer INFUSE if available, then VLC
        const preferenceOrder = ['infuse', 'vlc', 'outplayer'];
        
        for (const preferred of preferenceOrder) {
            const player = availablePlayers.find(p => p.type === preferred);
            if (player) {
                return player;
            }
        }

        return availablePlayers[0]; // Return first available
    }

    // Show player selection modal
    showPlayerSelection(streamUrl, mediaInfo = null) {
        const availablePlayers = this.getAvailablePlayers();
        
        if (availablePlayers.length === 0) {
            this.app.showNotification('No external players enabled', 'warning');
            return;
        }

        if (availablePlayers.length === 1) {
            // Only one player available, use it directly
            this.openInPlayer(streamUrl, availablePlayers[0].type, mediaInfo);
            return;
        }

        // Show selection modal
        const modal = document.createElement('div');
        modal.className = 'player-selection-modal';
        modal.innerHTML = `
            <div class="player-selection-container">
                <div class="player-selection-header">
                    <h3>Choose Player</h3>
                    <button class="player-selection-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="player-selection-content">
                    <p>Select which player to use for this stream:</p>
                    <div class="player-options">
                        ${availablePlayers.map(player => `
                            <button class="player-option" onclick="externalPlayerHandler.openInPlayer('${streamUrl}', '${player.type}', ${JSON.stringify(mediaInfo)}); this.closest('.player-selection-modal').remove();">
                                <div class="player-option-info">
                                    <h4>${player.name}</h4>
                                    <p>${player.supportsHDR ? 'HDR Support' : 'Standard Playback'}</p>
                                </div>
                                <div class="player-option-arrow">→</div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.addPlayerSelectionCSS();
    }

    addPlayerSelectionCSS() {
        if (document.getElementById('player-selection-styles')) return;

        const style = document.createElement('style');
        style.id = 'player-selection-styles';
        style.textContent = `
            .player-selection-modal {
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

            .player-selection-container {
                width: 90vw;
                max-width: 500px;
                background: var(--secondary-bg);
                border-radius: var(--border-radius);
                border: 1px solid var(--border-color);
            }

            .player-selection-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                background: var(--tertiary-bg);
                border-bottom: 1px solid var(--border-color);
            }

            .player-selection-header h3 {
                margin: 0;
                color: var(--text-primary);
                font-size: 20px;
            }

            .player-selection-close {
                background: none;
                border: none;
                color: var(--text-muted);
                font-size: 24px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: var(--transition);
            }

            .player-selection-close:hover {
                background: var(--hover-bg);
                color: var(--text-primary);
            }

            .player-selection-content {
                padding: 24px;
            }

            .player-selection-content p {
                color: var(--text-secondary);
                margin-bottom: 20px;
                text-align: center;
            }

            .player-options {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .player-option {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                background: var(--tertiary-bg);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius-small);
                cursor: pointer;
                transition: var(--transition);
                text-align: left;
            }

            .player-option:hover {
                background: var(--hover-bg);
                border-color: var(--accent-green);
                transform: translateY(-2px);
            }

            .player-option-info h4 {
                margin: 0 0 4px 0;
                color: var(--text-primary);
                font-size: 18px;
            }

            .player-option-info p {
                margin: 0;
                color: var(--text-muted);
                font-size: 14px;
            }

            .player-option-arrow {
                color: var(--accent-green);
                font-size: 20px;
                font-weight: bold;
            }
        `;

        document.head.appendChild(style);
    }
}

// Make ExternalPlayerHandler available globally
window.ExternalPlayerHandler = ExternalPlayerHandler;