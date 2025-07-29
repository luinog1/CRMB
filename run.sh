#!/bin/bash

# CRUMBLE - Media Streaming Application Runner
# This script helps launch the CRUMBLE application

echo "🎬 CRUMBLE - Media Streaming Application"
echo "========================================"

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  Warning: This application is optimized for macOS"
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to open in browser
open_browser() {
    local url="$1"
    
    if command_exists open; then
        # macOS
        open "$url"
    elif command_exists xdg-open; then
        # Linux
        xdg-open "$url"
    elif command_exists start; then
        # Windows
        start "$url"
    else
        echo "Please open $url in your web browser"
    fi
}

# Function to start a simple HTTP server
start_server() {
    local port=${1:-8080}
    local frontend_dir="frontend"
    
    if [[ ! -d "$frontend_dir" ]]; then
        echo "❌ Error: Frontend directory not found!"
        echo "Please run this script from the CRUMBLE root directory"
        exit 1
    fi
    
    echo "🚀 Starting local server on port $port..."
    
    # Try different server options
    if command_exists python3; then
        echo "Using Python 3 HTTP server"
        cd "$frontend_dir"
        python3 -m http.server "$port" &
        SERVER_PID=$!
    elif command_exists python; then
        echo "Using Python 2 HTTP server"
        cd "$frontend_dir"
        python -m SimpleHTTPServer "$port" &
        SERVER_PID=$!
    elif command_exists node; then
        if command_exists npx; then
            echo "Using Node.js HTTP server"
            cd "$frontend_dir"
            npx http-server -p "$port" &
            SERVER_PID=$!
        else
            echo "❌ Error: npx not found. Please install Node.js with npm"
            exit 1
        fi
    else
        echo "❌ Error: No suitable HTTP server found!"
        echo "Please install Python 3 or Node.js to run the local server"
        echo "Alternatively, open frontend/index.html directly in your browser"
        exit 1
    fi
    
    # Wait a moment for server to start
    sleep 2
    
    # Open in browser
    local url="http://localhost:$port"
    echo "🌐 Opening CRUMBLE at $url"
    open_browser "$url"
    
    echo ""
    echo "✅ CRUMBLE is now running!"
    echo "📱 Access the app at: $url"
    echo "⚙️  Configure your TMDB API key in Settings for better performance"
    echo "🧩 Add Stremio add-ons in Settings to enable streaming"
    echo ""
    echo "Press Ctrl+C to stop the server"
    
    # Wait for server process
    wait $SERVER_PID
}

# Function to open directly in browser (file:// protocol)
open_direct() {
    local file_path="$(pwd)/frontend/index.html"
    
    if [[ ! -f "$file_path" ]]; then
        echo "❌ Error: index.html not found at $file_path"
        exit 1
    fi
    
    echo "🌐 Opening CRUMBLE directly in browser..."
    open_browser "file://$file_path"
    
    echo "✅ CRUMBLE opened in browser!"
    echo "⚠️  Note: Some features may be limited when running from file:// protocol"
    echo "⚙️  For full functionality, consider using the server mode: ./run.sh --server"
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --server, -s [PORT]    Start local HTTP server (default port: 8080)"
    echo "  --direct, -d           Open directly in browser (file:// protocol)"
    echo "  --help, -h             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                     Start server on default port (8080)"
    echo "  $0 --server 3000       Start server on port 3000"
    echo "  $0 --direct            Open directly in browser"
    echo ""
    echo "Requirements:"
    echo "  - Modern web browser"
    echo "  - Python 3 or Node.js (for server mode)"
    echo "  - Internet connection (for TMDB API and add-ons)"
}

# Function to check system requirements
check_requirements() {
    echo "🔍 Checking system requirements..."
    
    # Check for modern browser
    local browsers=("Google Chrome" "Safari" "Firefox" "Microsoft Edge")
    local browser_found=false
    
    for browser in "${browsers[@]}"; do
        browser_lower=$(echo "$browser" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
        if command_exists "$browser_lower" || [[ -d "/Applications/$browser.app" ]]; then
            echo "✅ Found browser: $browser"
            browser_found=true
            break
        fi
    done
    
    if [[ "$browser_found" == false ]]; then
        echo "⚠️  Warning: No modern browser detected"
    fi
    
    # Check for server capabilities
    if command_exists python3; then
        echo "✅ Python 3 available for server mode"
    elif command_exists python; then
        echo "✅ Python 2 available for server mode"
    elif command_exists node; then
        echo "✅ Node.js available for server mode"
    else
        echo "⚠️  Warning: No HTTP server available. Direct mode only."
    fi
    
    # Check internet connection
    if ping -c 1 google.com >/dev/null 2>&1; then
        echo "✅ Internet connection available"
    else
        echo "⚠️  Warning: No internet connection detected"
        echo "   Some features may not work properly"
    fi
    
    echo ""
}

# Parse command line arguments
case "${1:-}" in
    --server|-s)
        check_requirements
        PORT="${2:-8080}"
        start_server "$PORT"
        ;;
    --direct|-d)
        check_requirements
        open_direct
        ;;
    --help|-h)
        show_help
        ;;
    "")
        # Default behavior: start server
        check_requirements
        start_server
        ;;
    *)
        echo "❌ Error: Unknown option '$1'"
        echo "Use --help for usage information"
        exit 1
        ;;
esac