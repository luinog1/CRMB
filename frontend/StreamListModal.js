// Stream List Modal Component
class StreamListModal {
    constructor(app) {
        this.app = app;
        this.currentStreams = [];
        this.currentMedia = null;
        this.externalPlayerHandler = new ExternalPlayerHandler(app);
    }

    show(streams, mediaType, mediaId, title = null) {
        this.currentStreams = streams || [];
        this.currentMedia = { type: mediaType, id: mediaId, title };
        
        const modal = document.getElementById('stream-modal');
        const titleElement = document.getElementById('stream-modal-title');
        const streamList = document.getElementById('stream-list');

        if (titleElement) {
            titleElement.textContent = title ? `Select Stream - ${title}` : 'Select Stream';
        }

        if (streamList) {
            this.renderStreamList(streamList);
        }

        if (modal) {
            modal.classList.add('active');
        }
    }

    hide() {
        const modal = document.getElementById('stream-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.currentStreams = [];
        this.currentMedia = null;
    }

    renderStreamList(container) {
        if (!container) return;

        if (this.currentStreams.length === 0) {
            container.innerHTML = this.renderNoStreamsState();
            return;
        }

        // Sort streams by quality and availability
        const sortedStreams = this.sortStreams(this.currentStreams);
        
        container.innerHTML = sortedStreams.map((stream, index) => 
            this.renderStreamItem(stream, index)
        ).join('');

        this.addStreamItemEventListeners();
    }

    renderNoStreamsState() {
        return `
            <div class="no-streams-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3>No Streams Available</h3>
                <p>No streaming sources found for this content.</p>
                <div class="no-streams-suggestions">
                    <h4>Try:</h4>
                    <ul>
                        <li>Adding more Stremio add-ons in Settings</li>
                        <li>Checking your internet connection</li>
                        <li>Searching for alternative titles</li>
                    </ul>
                </div>
                <button class="btn-secondary" onclick="streamModal.hide(); app.switchTab('settings')">
                    Manage Add-ons
                </button>
            </div>
        `;
    }

    renderStreamItem(stream, index) {
        const quality = this.extractQuality(stream);
        const size = this.extractSize(stream);
        const source = stream.addon || 'Unknown Source';
        const seeders = this.extractSeeders(stream);
        const language = this.extractLanguage(stream);
        
        return `
            <div class="stream-item" data-stream-index="${index}">
                <div class="stream-info">
                    <h4 class="stream-title">${stream.title || 'Stream'}</h4>
                    <div class="stream-meta">
                        ${quality ? `<span class="stream-quality">${quality}</span>` : ''}
                        ${size ? `<span class="stream-size">${size}</span>` : ''}
                        ${seeders ? `<span class="stream-seeders">👥 ${seeders}</span>` : ''}
                        ${language ? `<span class="stream-language">${language}</span>` : ''}
                        <span class="stream-source">📡 ${source}</span>
                    </div>
                    ${stream.description ? `<p class="stream-description">${stream.description}</p>` : ''}
                </div>
                <div class="stream-actions">
                    <button class="stream-btn primary" onclick="streamModal.playStream(${index})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="5,3 19,12 5,21"/>
                        </svg>
                        Play
                    </button>
                    <div class="external-players">
                        ${this.renderExternalPlayerButtons(index)}
                    </div>
                </div>
            </div>
        `;
    }

    renderExternalPlayerButtons(streamIndex) {
        const enabledPlayers = [];
        
        if (this.app.playerSettings.infuse) {
            enabledPlayers.push({
                name: 'INFUSE',
                icon: '📱',
                action: `streamModal.playInExternal(${streamIndex}, 'infuse')`
            });
        }
        
        if (this.app.playerSettings.vlc) {
            enabledPlayers.push({
                name: 'VLC',
                icon: '🎬',
                action: `streamModal.playInExternal(${streamIndex}, 'vlc')`
            });
        }
        
        if (this.app.playerSettings.outplayer) {
            enabledPlayers.push({
                name: 'OUTPLAYER',
                icon: '▶️',
                action: `streamModal.playInExternal(${streamIndex}, 'outplayer')`
            });
        }

        return enabledPlayers.map(player => `
            <button class="stream-btn external" onclick="${player.action}" title="Play in ${player.name}">
                ${player.icon}
            </button>
        `).join('');
    }

    addStreamItemEventListeners() {
        // Add hover effects and additional interactions
        document.querySelectorAll('.stream-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.classList.add('hovered');
            });
            
            item.addEventListener('mouseleave', () => {
                item.classList.remove('hovered');
            });
        });

        this.addStreamItemCSS();
    }

    addStreamItemCSS() {
        if (document.getElementById('stream-item-styles')) return;

        const style = document.createElement('style');
        style.id = 'stream-item-styles';
        style.textContent = `
            .no-streams-state {
                text-align: center;
                padding: 60px 20px;
                color: var(--text-muted);
            }

            .no-streams-state svg {
                width: 64px;
                height: 64px;
                margin-bottom: 24px;
                color: #ff4444;
            }

            .no-streams-state h3 {
                font-size: 24px;
                color: var(--text-primary);
                margin-bottom: 12px;
            }

            .no-streams-state p {
                font-size: 16px;
                margin-bottom: 32px;
            }

            .no-streams-suggestions {
                max-width: 400px;
                margin: 0 auto 32px;
                text-align: left;
                background: var(--secondary-bg);
                padding: 24px;
                border-radius: var(--border-radius);
                border: 1px solid var(--border-color);
            }

            .no-streams-suggestions h4 {
                color: var(--text-primary);
                margin-bottom: 16px;
                font-size: 18px;
            }

            .no-streams-suggestions ul {
                list-style: none;
                padding: 0;
            }

            .no-streams-suggestions li {
                padding: 8px 0;
                border-bottom: 1px solid var(--border-color);
                font-size: 14px;
            }

            .no-streams-suggestions li:last-child {
                border-bottom: none;
            }

            .no-streams-suggestions li::before {
                content: "•";
                color: var(--accent-green);
                margin-right: 12px;
            }

            .stream-item {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 24px;
                background: var(--tertiary-bg);
                border-radius: var(--border-radius);
                border: 1px solid var(--border-color);
                transition: var(--transition);
                margin-bottom: 16px;
            }

            .stream-item:hover,
            .stream-item.hovered {
                border-color: var(--accent-green);
                background: var(--hover-bg);
                transform: translateY(-2px);
                box-shadow: var(--shadow);
            }

            .stream-info {
                flex: 1;
                margin-right: 24px;
            }

            .stream-title {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 12px;
                color: var(--text-primary);
                line-height: 1.3;
            }

            .stream-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 8px;
                font-size: 14px;
            }

            .stream-meta span {
                padding: 4px 8px;
                background: var(--secondary-bg);
                border-radius: 4px;
                color: var(--text-secondary);
                border: 1px solid var(--border-color);
            }

            .stream-quality {
                background: var(--accent-green) !important;
                color: var(--primary-bg) !important;
                font-weight: 600;
            }

            .stream-size {
                color: var(--text-primary) !important;
            }

            .stream-seeders {
                color: var(--accent-green) !important;
            }

            .stream-description {
                font-size: 14px;
                color: var(--text-muted);
                line-height: 1.4;
                margin-top: 8px;
            }

            .stream-actions {
                display: flex;
                flex-direction: column;
                gap: 12px;
                min-width: 120px;
            }

            .stream-btn {
                padding: 12px 16px;
                border: none;
                border-radius: var(--border-radius-small);
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: var(--transition);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }

            .stream-btn.primary {
                background: var(--accent-green);
                color: var(--primary-bg);
            }

            .stream-btn.primary:hover {
                background: var(--accent-green-dim);
                transform: translateY(-1px);
            }

            .stream-btn.external {
                background: var(--secondary-bg);
                color: var(--text-secondary);
                border: 1px solid var(--border-color);
                padding: 8px;
                min-width: 36px;
                font-size: 16px;
            }

            .stream-btn.external:hover {
                background: var(--hover-bg);
                color: var(--text-primary);
                border-color: var(--accent-green);
            }

            .stream-btn svg {
                width: 16px;
                height: 16px;
            }

            .external-players {
                display: flex;
                gap: 6px;
                justify-content: center;
            }

            @media (max-width: 768px) {
                .stream-item {
                    flex-direction: column;
                    gap: 16px;
                }

                .stream-info {
                    margin-right: 0;
                }

                .stream-actions {
                    flex-direction: row;
                    align-items: center;
                    min-width: auto;
                    width: 100%;
                }

                .stream-btn.primary {
                    flex: 1;
                }

                .external-players {
                    flex-shrink: 0;
                }
            }
        `;

        document.head.appendChild(style);
    }

    sortStreams(streams) {
        return [...streams].sort((a, b) => {
            // Priority order: quality, seeders, size
            const qualityA = this.getQualityScore(this.extractQuality(a));
            const qualityB = this.getQualityScore(this.extractQuality(b));
            
            if (qualityA !== qualityB) {
                return qualityB - qualityA; // Higher quality first
            }
            
            const seedersA = this.extractSeeders(a) || 0;
            const seedersB = this.extractSeeders(b) || 0;
            
            if (seedersA !== seedersB) {
                return seedersB - seedersA; // More seeders first
            }
            
            // If all else equal, prefer smaller file sizes for faster streaming
            const sizeA = this.extractSizeBytes(a) || Infinity;
            const sizeB = this.extractSizeBytes(b) || Infinity;
            
            return sizeA - sizeB;
        });
    }

    getQualityScore(quality) {
        const qualityMap = {
            '4K': 4000,
            '2160p': 4000,
            '1440p': 1440,
            '1080p': 1080,
            '720p': 720,
            '480p': 480,
            '360p': 360,
            'HD': 1080,
            'FHD': 1080,
            'UHD': 4000
        };
        
        if (!quality) return 0;
        
        for (const [key, score] of Object.entries(qualityMap)) {
            if (quality.includes(key)) {
                return score;
            }
        }
        
        return 0;
    }

    extractQuality(stream) {
        const title = stream.title || '';
        const description = stream.description || '';
        const text = `${title} ${description}`.toLowerCase();
        
        const qualities = ['4K', '2160p', '1440p', '1080p', '720p', '480p', '360p', 'UHD', 'FHD', 'HD'];
        
        for (const quality of qualities) {
            if (text.includes(quality.toLowerCase())) {
                return quality;
            }
        }
        
        return null;
    }

    extractSize(stream) {
        const title = stream.title || '';
        const description = stream.description || '';
        const text = `${title} ${description}`;
        
        // Look for size patterns like "1.5GB", "750MB", etc.
        const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
        
        return sizeMatch ? `${sizeMatch[1]}${sizeMatch[2].toUpperCase()}` : null;
    }

    extractSizeBytes(stream) {
        const sizeStr = this.extractSize(stream);
        if (!sizeStr) return null;
        
        const match = sizeStr.match(/(\d+(?:\.\d+)?)(GB|MB|TB)/i);
        if (!match) return null;
        
        const value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        
        switch (unit) {
            case 'TB': return value * 1024 * 1024 * 1024 * 1024;
            case 'GB': return value * 1024 * 1024 * 1024;
            case 'MB': return value * 1024 * 1024;
            default: return value;
        }
    }

    extractSeeders(stream) {
        const title = stream.title || '';
        const description = stream.description || '';
        const text = `${title} ${description}`;
        
        // Look for seeder patterns
        const seederMatch = text.match(/(\d+)\s*(?:seeders?|👥)/i);
        
        return seederMatch ? parseInt(seederMatch[1]) : null;
    }

    extractLanguage(stream) {
        const title = stream.title || '';
        const description = stream.description || '';
        const text = `${title} ${description}`.toLowerCase();
        
        const languages = {
            'english': 'EN',
            'spanish': 'ES',
            'french': 'FR',
            'german': 'DE',
            'italian': 'IT',
            'portuguese': 'PT',
            'russian': 'RU',
            'japanese': 'JP',
            'korean': 'KR',
            'chinese': 'CN'
        };
        
        for (const [lang, code] of Object.entries(languages)) {
            if (text.includes(lang)) {
                return code;
            }
        }
        
        return null;
    }

    playStream(streamIndex) {
        const stream = this.currentStreams[streamIndex];
        if (!stream) return;

        // For web playback, we would typically use a video player
        // For now, we'll show a placeholder or try to open the stream URL
        if (stream.url) {
            this.openStreamInBrowser(stream);
        } else {
            this.app.showNotification('Stream URL not available', 'error');
        }
    }

    playInExternal(streamIndex, playerType) {
        const stream = this.currentStreams[streamIndex];
        if (!stream || !stream.url) {
            this.app.showNotification('Stream URL not available', 'error');
            return;
        }

        this.externalPlayerHandler.openInPlayer(stream.url, playerType, this.currentMedia);
    }

    openStreamInBrowser(stream) {
        if (stream.url) {
            // Try to determine if it's a direct video file or needs special handling
            if (this.isDirectVideoUrl(stream.url)) {
                this.openVideoPlayer(stream.url);
            } else {
                // For magnet links or other protocols, show instructions
                this.showStreamInstructions(stream);
            }
        }
    }

    isDirectVideoUrl(url) {
        const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m3u8'];
        return videoExtensions.some(ext => url.toLowerCase().includes(ext)) || 
               url.includes('blob:') || 
               url.includes('data:video');
    }

    openVideoPlayer(url) {
        // Create a simple video player modal
        const playerModal = document.createElement('div');
        playerModal.className = 'video-player-modal';
        playerModal.innerHTML = `
            <div class="video-player-container">
                <div class="video-player-header">
                    <h3>${this.currentMedia?.title || 'Video Player'}</h3>
                    <button class="video-player-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <video controls autoplay class="video-player">
                    <source src="${url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
        `;

        document.body.appendChild(playerModal);
        this.addVideoPlayerCSS();
        this.hide(); // Close stream modal
    }

    addVideoPlayerCSS() {
        if (document.getElementById('video-player-styles')) return;

        const style = document.createElement('style');
        style.id = 'video-player-styles';
        style.textContent = `
            .video-player-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(10px);
            }

            .video-player-container {
                width: 90vw;
                max-width: 1200px;
                background: var(--secondary-bg);
                border-radius: var(--border-radius);
                overflow: hidden;
                border: 1px solid var(--border-color);
            }

            .video-player-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 24px;
                background: var(--tertiary-bg);
                border-bottom: 1px solid var(--border-color);
            }

            .video-player-header h3 {
                margin: 0;
                color: var(--text-primary);
            }

            .video-player-close {
                background: none;
                border: none;
                color: var(--text-muted);
                font-size: 24px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: var(--transition);
            }

            .video-player-close:hover {
                background: var(--hover-bg);
                color: var(--text-primary);
            }

            .video-player {
                width: 100%;
                height: 60vh;
                background: #000;
            }
        `;

        document.head.appendChild(style);
    }

    showStreamInstructions(stream) {
        const instructionsModal = document.createElement('div');
        instructionsModal.className = 'stream-instructions-modal';
        
        let instructions = '';
        if (stream.url.startsWith('magnet:')) {
            instructions = `
                <h3>Magnet Link</h3>
                <p>This is a torrent magnet link. To play this content:</p>
                <ol>
                    <li>Copy the magnet link below</li>
                    <li>Open your preferred torrent client</li>
                    <li>Add the magnet link to start downloading</li>
                    <li>Play the file once downloaded</li>
                </ol>
                <div class="magnet-link">
                    <input type="text" value="${stream.url}" readonly>
                    <button onclick="navigator.clipboard.writeText('${stream.url}'); this.textContent='Copied!'">Copy</button>
                </div>
            `;
        } else {
            instructions = `
                <h3>Stream Link</h3>
                <p>Copy this link to play in your preferred media player:</p>
                <div class="stream-link">
                    <input type="text" value="${stream.url}" readonly>
                    <button onclick="navigator.clipboard.writeText('${stream.url}'); this.textContent='Copied!'">Copy</button>
                </div>
            `;
        }

        instructionsModal.innerHTML = `
            <div class="instructions-container">
                <div class="instructions-header">
                    <button class="instructions-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="instructions-content">
                    ${instructions}
                </div>
            </div>
        `;

        document.body.appendChild(instructionsModal);
        this.addInstructionsCSS();
    }

    addInstructionsCSS() {
        if (document.getElementById('instructions-styles')) return;

        const style = document.createElement('style');
        style.id = 'instructions-styles';
        style.textContent = `
            .stream-instructions-modal {
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

            .instructions-container {
                width: 90vw;
                max-width: 600px;
                background: var(--secondary-bg);
                border-radius: var(--border-radius);
                border: 1px solid var(--border-color);
            }

            .instructions-header {
                display: flex;
                justify-content: flex-end;
                padding: 16px;
                border-bottom: 1px solid var(--border-color);
            }

            .instructions-close {
                background: none;
                border: none;
                color: var(--text-muted);
                font-size: 24px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: var(--transition);
            }

            .instructions-close:hover {
                background: var(--hover-bg);
                color: var(--text-primary);
            }

            .instructions-content {
                padding: 24px;
            }

            .instructions-content h3 {
                color: var(--accent-green);
                margin-bottom: 16px;
            }

            .instructions-content p {
                color: var(--text-secondary);
                margin-bottom: 16px;
                line-height: 1.6;
            }

            .instructions-content ol {
                color: var(--text-secondary);
                margin-bottom: 24px;
                padding-left: 20px;
            }

            .instructions-content li {
                margin-bottom: 8px;
            }

            .magnet-link,
            .stream-link {
                display: flex;
                gap: 12px;
                background: var(--tertiary-bg);
                padding: 16px;
                border-radius: var(--border-radius-small);
                border: 1px solid var(--border-color);
            }

            .magnet-link input,
            .stream-link input {
                flex: 1;
                background: transparent;
                border: none;
                color: var(--text-primary);
                font-family: monospace;
                font-size: 14px;
            }

            .magnet-link button,
            .stream-link button {
                background: var(--accent-green);
                color: var(--primary-bg);
                border: none;
                padding: 8px 16px;
                border-radius: var(--border-radius-small);
                cursor: pointer;
                font-weight: 600;
                transition: var(--transition);
            }

            .magnet-link button:hover,
            .stream-link button:hover {
                background: var(--accent-green-dim);
            }
        `;

        document.head.appendChild(style);
    }
}

// Make StreamListModal available globally
window.StreamListModal = StreamListModal;