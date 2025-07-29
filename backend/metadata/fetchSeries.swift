import Foundation

struct SeriesCatalog: Codable {
    let page: Int
    let results: [Series]
    let totalPages: Int
    let totalResults: Int
    
    enum CodingKeys: String, CodingKey {
        case page, results
        case totalPages = "total_pages"
        case totalResults = "total_results"
    }
}

struct Series: Codable {
    let id: Int
    let name: String
    let overview: String?
    let posterPath: String?
    let backdropPath: String?
    let firstAirDate: String?
    let lastAirDate: String?
    let voteAverage: Double
    let voteCount: Int
    let genreIds: [Int]
    let originalLanguage: String
    let originalName: String
    let popularity: Double
    let originCountry: [String]
    let adult: Bool
    
    enum CodingKeys: String, CodingKey {
        case id, name, overview, adult, popularity
        case posterPath = "poster_path"
        case backdropPath = "backdrop_path"
        case firstAirDate = "first_air_date"
        case lastAirDate = "last_air_date"
        case voteAverage = "vote_average"
        case voteCount = "vote_count"
        case genreIds = "genre_ids"
        case originalLanguage = "original_language"
        case originalName = "original_name"
        case originCountry = "origin_country"
    }
}

class SeriesFetcher {
    private let baseURL = "https://api.themoviedb.org/3"
    private let defaultAPIKey = "90acb3adf6e0af93b6c0055ed8a721aa"
    private var apiKey: String
    
    init(apiKey: String? = nil) {
        self.apiKey = apiKey ?? defaultAPIKey
    }
    
    func updateAPIKey(_ newKey: String) {
        self.apiKey = newKey
    }
    
    // MARK: - Popular TV Shows
    func fetchPopularSeries(page: Int = 1, completion: @escaping (Result<SeriesCatalog, Error>) -> Void) {
        let urlString = "\(baseURL)/tv/popular?api_key=\(apiKey)&page=\(page)"
        performRequest(urlString: urlString, completion: completion)
    }
    
    // MARK: - Trending TV Shows
    func fetchTrendingSeries(timeWindow: String = "day", page: Int = 1, completion: @escaping (Result<SeriesCatalog, Error>) -> Void) {
        let urlString = "\(baseURL)/trending/tv/\(timeWindow)?api_key=\(apiKey)&page=\(page)"
        performRequest(urlString: urlString, completion: completion)
    }
    
    // MARK: - Top Rated TV Shows
    func fetchTopRatedSeries(page: Int = 1, completion: @escaping (Result<SeriesCatalog, Error>) -> Void) {
        let urlString = "\(baseURL)/tv/top_rated?api_key=\(apiKey)&page=\(page)"
        performRequest(urlString: urlString, completion: completion)
    }
    
    // MARK: - Airing Today
    func fetchAiringTodaySeries(page: Int = 1, completion: @escaping (Result<SeriesCatalog, Error>) -> Void) {
        let urlString = "\(baseURL)/tv/airing_today?api_key=\(apiKey)&page=\(page)"
        performRequest(urlString: urlString, completion: completion)
    }
    
    // MARK: - On The Air
    func fetchOnTheAirSeries(page: Int = 1, completion: @escaping (Result<SeriesCatalog, Error>) -> Void) {
        let urlString = "\(baseURL)/tv/on_the_air?api_key=\(apiKey)&page=\(page)"
        performRequest(urlString: urlString, completion: completion)
    }
    
    // MARK: - TV Shows by Genre
    func fetchSeriesByGenre(genreId: Int, page: Int = 1, completion: @escaping (Result<SeriesCatalog, Error>) -> Void) {
        let urlString = "\(baseURL)/discover/tv?api_key=\(apiKey)&with_genres=\(genreId)&page=\(page)"
        performRequest(urlString: urlString, completion: completion)
    }
    
    // MARK: - Search TV Shows
    func searchSeries(query: String, page: Int = 1, completion: @escaping (Result<SeriesCatalog, Error>) -> Void) {
        guard let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else {
            completion(.failure(NSError(domain: "SeriesFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid query string"])))
            return
        }
        let urlString = "\(baseURL)/search/tv?api_key=\(apiKey)&query=\(encodedQuery)&page=\(page)"
        performRequest(urlString: urlString, completion: completion)
    }
    
    // MARK: - Private Helper Methods
    private func performRequest(urlString: String, completion: @escaping (Result<SeriesCatalog, Error>) -> Void) {
        guard let url = URL(string: urlString) else {
            completion(.failure(NSError(domain: "SeriesFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }
        
        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "SeriesFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data received"])))
                return
            }
            
            do {
                let seriesCatalog = try JSONDecoder().decode(SeriesCatalog.self, from: data)
                completion(.success(seriesCatalog))
            } catch {
                completion(.failure(error))
            }
        }
        
        task.resume()
    }
}

// MARK: - Season and Episode Models
struct Season: Codable {
    let id: Int
    let name: String
    let overview: String?
    let posterPath: String?
    let seasonNumber: Int
    let airDate: String?
    let episodeCount: Int
    
    enum CodingKeys: String, CodingKey {
        case id, name, overview
        case posterPath = "poster_path"
        case seasonNumber = "season_number"
        case airDate = "air_date"
        case episodeCount = "episode_count"
    }
}

struct Episode: Codable {
    let id: Int
    let name: String
    let overview: String?
    let stillPath: String?
    let episodeNumber: Int
    let seasonNumber: Int
    let airDate: String?
    let voteAverage: Double
    let voteCount: Int
    let runtime: Int?
    
    enum CodingKeys: String, CodingKey {
        case id, name, overview, runtime
        case stillPath = "still_path"
        case episodeNumber = "episode_number"
        case seasonNumber = "season_number"
        case airDate = "air_date"
        case voteAverage = "vote_average"
        case voteCount = "vote_count"
    }
}

// MARK: - Series Cache Manager
class SeriesCacheManager {
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