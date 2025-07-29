import Foundation

struct MovieCatalog: Codable {
    let page: Int
    let results: [Movie]
    let totalPages: Int
    let totalResults: Int
    
    enum CodingKeys: String, CodingKey {
        case page, results
        case totalPages = "total_pages"
        case totalResults = "total_results"
    }
}

struct Movie: Codable {
    let id: Int
    let title: String
    let overview: String?
    let posterPath: String?
    let backdropPath: String?
    let releaseDate: String?
    let voteAverage: Double
    let voteCount: Int
    let genreIds: [Int]
    let adult: Bool
    let originalLanguage: String
    let originalTitle: String
    let popularity: Double
    let video: Bool
    
    enum CodingKeys: String, CodingKey {
        case id, title, overview, adult, video, popularity
        case posterPath = "poster_path"
        case backdropPath = "backdrop_path"
        case releaseDate = "release_date"
        case voteAverage = "vote_average"
        case voteCount = "vote_count"
        case genreIds = "genre_ids"
        case originalLanguage = "original_language"
        case originalTitle = "original_title"
    }
}

class MovieFetcher {
    private let baseURL = "https://api.themoviedb.org/3"
    private let defaultAPIKey = "90acb3adf6e0af93b6c0055ed8a721aa"
    private var apiKey: String
    
    init(apiKey: String? = nil) {
        self.apiKey = apiKey ?? defaultAPIKey
    }
    
    func updateAPIKey(_ newKey: String) {
        self.apiKey = newKey
    }
    
    // MARK: - Popular Movies
    func fetchPopularMovies(page: Int = 1, completion: @escaping (Result<MovieCatalog, Error>) -> Void) {
        let urlString = "\(baseURL)/movie/popular?api_key=\(apiKey)&page=\(page)"
        performRequest(urlString: urlString, completion: completion)
    }
    
    // MARK: - Trending Movies
    func fetchTrendingMovies(timeWindow: String = "day", page: Int = 1, completion: @escaping (Result<MovieCatalog, Error>) -> Void) {
        let urlString = "\(baseURL)/trending/movie/\(timeWindow)?api_key=\(apiKey)&page=\(page)"
        performRequest(urlString: urlString, completion: completion)
    }
    
    // MARK: - Top Rated Movies
    func fetchTopRatedMovies(page: Int = 1, completion: @escaping (Result<MovieCatalog, Error>) -> Void) {
        let urlString = "\(baseURL)/movie/top_rated?api_key=\(apiKey)&page=\(page)"
        performRequest(urlString: urlString, completion: completion)
    }
    
    // MARK: - Now Playing Movies
    func fetchNowPlayingMovies(page: Int = 1, completion: @escaping (Result<MovieCatalog, Error>) -> Void) {
        let urlString = "\(baseURL)/movie/now_playing?api_key=\(apiKey)&page=\(page)"
        performRequest(urlString: urlString, completion: completion)
    }
    
    // MARK: - Upcoming Movies
    func fetchUpcomingMovies(page: Int = 1, completion: @escaping (Result<MovieCatalog, Error>) -> Void) {
        let urlString = "\(baseURL)/movie/upcoming?api_key=\(apiKey)&page=\(page)"
        performRequest(urlString: urlString, completion: completion)
    }
    
    // MARK: - Movies by Genre
    func fetchMoviesByGenre(genreId: Int, page: Int = 1, completion: @escaping (Result<MovieCatalog, Error>) -> Void) {
        let urlString = "\(baseURL)/discover/movie?api_key=\(apiKey)&with_genres=\(genreId)&page=\(page)"
        performRequest(urlString: urlString, completion: completion)
    }
    
    // MARK: - Search Movies
    func searchMovies(query: String, page: Int = 1, completion: @escaping (Result<MovieCatalog, Error>) -> Void) {
        guard let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else {
            completion(.failure(NSError(domain: "MovieFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid query string"])))
            return
        }
        let urlString = "\(baseURL)/search/movie?api_key=\(apiKey)&query=\(encodedQuery)&page=\(page)"
        performRequest(urlString: urlString, completion: completion)
    }
    
    // MARK: - Private Helper Methods
    private func performRequest(urlString: String, completion: @escaping (Result<MovieCatalog, Error>) -> Void) {
        guard let url = URL(string: urlString) else {
            completion(.failure(NSError(domain: "MovieFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }
        
        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "MovieFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data received"])))
                return
            }
            
            do {
                let movieCatalog = try JSONDecoder().decode(MovieCatalog.self, from: data)
                completion(.success(movieCatalog))
            } catch {
                completion(.failure(error))
            }
        }
        
        task.resume()
    }
}

// MARK: - Cache Manager
class MovieCacheManager {
    private let cache = NSCache<NSString, NSData>()
    private let cacheExpiry: TimeInterval = 3600 // 1 hour
    
    func cacheData(_ data: Data, forKey key: String) {
        let cacheKey = NSString(string: key)
        cache.setObject(data as NSData, forKey: cacheKey)
    }
    
    func getCachedData(forKey key: String) -> Data? {
        let cacheKey = NSString(string: key)
        return cache.object(forKey: cacheKey) as Data?
    }
    
    func clearCache() {
        cache.removeAllObjects()
    }
}