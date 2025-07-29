# CRUMBLE - Media Streaming Application

A modular, web-based media streaming application designed for macOS systems with a mobile-style iOS interface. CRUMBLE provides a seamless streaming experience with support for Stremio-style add-ons, external player integration, and comprehensive media management.

## 🌟 Features

### 🎬 Core Functionality
- **Dark-themed UI** with neon green accents and iOS-style interface
- **Modular architecture** with extendable Stremio-style add-ons
- **Multi-source streaming** with automatic quality detection
- **External player support** (INFUSE, VLC, OUTPLAYER)
- **HDR10, HDR10+, and Dolby Vision** playback support

### 📱 User Interface
- **Minimalist sidebar navigation** with Home, Search, Library, and Settings
- **Dynamic Hero Banner** showcasing featured content
- **Responsive catalog grids** for movies and TV series
- **Advanced search** with filtering and history
- **Personal library management** with watchlist and progress tracking

### 🧩 Add-on System
- **Stremio-compatible add-ons** for expanded content sources
- **Easy add-on management** with enable/disable functionality
- **Automatic stream aggregation** from multiple sources
- **Quality-based stream sorting** and recommendation

### ⚙️ Advanced Settings
- **Custom TMDB API key** support with fallback
- **Catalog source toggles** for personalized content
- **Theme customization** (Dark, Light, Auto)
- **Cache management** and performance optimization

## 🏗️ Architecture

### Backend (Swift)
```
/backend/metadata/
├── fetchMovies.swift      # Movie catalog fetching
├── fetchSeries.swift      # TV series catalog fetching
└── fetchMetaById.swift    # Detailed metadata retrieval
```

### Frontend (TypeScript/JavaScript)
```
/frontend/
├── index.html             # Main application shell
├── styles.css             # Dark theme styling
├── app.js                 # Core application controller
├── HomeTab.js             # Home page functionality
├── SearchTab.js           # Search and filtering
├── LibraryTab.js          # Personal library management
├── SettingsTab.js         # Configuration interface
├── CatalogGrid.js         # Content grid component
├── HeroBanner.js          # Featured content banner
├── StreamListModal.js     # Stream selection interface
└── ExternalPlayerHandler.js # External player integration
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser with ES6+ support
- Internet connection for TMDB API and add-on sources
- Optional: External media players (INFUSE, VLC, OUTPLAYER)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/CRUMB.git
   cd CRUMB
   ```

2. Open `frontend/index.html` in your web browser

3. Configure your TMDB API key in Settings (optional - uses fallback key)

4. Add Stremio-compatible add-ons for streaming sources

### Configuration

#### TMDB API Key
- Default key provided: `90acb3adf6e0af93b6c0055ed8a721aa`
- Get your own key at [TMDB API](https://www.themoviedb.org/settings/api)
- Enter in Settings > API Configuration

#### Add-ons
Popular Stremio add-ons you can add:
- **Torrentio**: `https://torrentio.strem.fun/manifest.json`
- **Cinemeta**: `https://v3-cinemeta.strem.io/manifest.json`
- **OpenSubtitles**: `https://opensubtitles.strem.io/manifest.json`

## 🎮 Usage

### Navigation
- **Home**: Browse trending and popular content
- **Search**: Find specific movies and TV series
- **Library**: Manage watchlist and viewing progress
- **Settings**: Configure app preferences and add-ons

### Streaming
1. Browse or search for content
2. Click on any title to view details
3. Click "Watch Now" to see available streams
4. Choose stream quality and source
5. Play in browser or external player

### External Players
- **INFUSE**: Premium player with HDR support
- **VLC**: Universal media player
- **OUTPLAYER**: Advanced iOS/macOS player

## 🔧 Development

### Project Structure
- **Modular components** for easy maintenance
- **Event-driven architecture** with clean separation
- **Responsive design** with mobile-first approach
- **Progressive enhancement** for better performance

### Key Technologies
- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Backend**: Swift (for metadata services)
- **APIs**: TMDB API, Stremio Add-on Protocol
- **Storage**: LocalStorage for settings and cache

### Adding New Features
1. Create component in appropriate directory
2. Follow existing naming conventions
3. Implement error handling and loading states
4. Add responsive CSS styling
5. Update main app controller if needed

## 📊 Performance

### Optimization Features
- **Lazy loading** for images and content
- **Caching system** for metadata and images
- **Debounced search** to reduce API calls
- **Progressive loading** for large catalogs
- **Memory management** for smooth performance

### Cache Management
- Automatic cache expiration (1-2 hours)
- Manual cache clearing in Settings
- Configurable cache size limits
- Smart cache invalidation

## 🔒 Privacy & Security

- **No user data collection** - everything stored locally
- **Optional API key** usage for enhanced privacy
- **Secure add-on validation** before installation
- **Local storage only** - no external data transmission

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Add comments for complex functionality
- Test on multiple browsers and screen sizes
- Ensure responsive design compatibility
- Update documentation for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **TMDB** for providing comprehensive movie and TV data
- **Stremio** for the add-on protocol inspiration
- **Inter Font** for the clean typography
- **Feather Icons** for the beautiful iconography

## 📞 Support

For support, feature requests, or bug reports:
- Open an issue on GitHub
- Check existing documentation
- Review the troubleshooting guide

## 🗺️ Roadmap

### Upcoming Features
- [ ] Subtitle support and management
- [ ] Advanced filtering and sorting options
- [ ] Offline viewing capabilities
- [ ] Multi-language interface
- [ ] Enhanced recommendation engine
- [ ] Social features and sharing
- [ ] Mobile app companion
- [ ] Advanced analytics and insights

### Technical Improvements
- [ ] Service worker for offline functionality
- [ ] WebAssembly for performance-critical operations
- [ ] Advanced caching strategies
- [ ] Real-time sync across devices
- [ ] Enhanced security measures

---

**CRUMBLE** - Your ultimate media streaming companion. Built with ❤️ for the streaming community.