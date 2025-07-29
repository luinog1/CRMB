import Foundation

// MARK: - Unified Metadata Models
struct MediaMetadata: Codable {
    let id: Int
    let title: String
    let overview: String?
    let posterPath: String?
    let backdropPath: String?
    let releaseDate: String?
    let voteAverage: Double
    let voteCount: Int
    let genres: [Genre]
    let runtime: Int?
    let status: String?
    let tagline: String?
    let homepage: String?
    let originalLanguage: String
    let originalTitle: String
    let popularity: Double
    let adult: Bool
    let budget: Int?
    let revenue: Int?
    let productionCompanies: [ProductionCompany]
    let productionCountries: [ProductionCountry]
    let spokenLanguages: [SpokenLanguage]
    let mediaType: MediaType
    
    // Series-specific fields
    let numberOfSeasons: Int?
    let numberOfEpisodes: Int?
    let firstAirDate: String?
    let lastAirDate: String?
    let seasons: [Season]?
    let networks: [Network]?
    let createdBy: [Creator]?
    let episodeRunTime: [Int]?
    let inProduction: Bool?
    let lastEpisodeToAir: Episode?
    let nextEpisodeToAir: Episode?
    let originCountry: [String]?
    let type: String?
    
    enum CodingKeys: String, CodingKey {
        case id, title, overview, runtime, status, tagline, homepage, popularity, adult, budget, revenue, genres
        case posterPath = "poster_path"
        case backdropPath = "backdrop_path"
        case releaseDate = "release_date"
        case voteAverage = "vote_average"
        case voteCount = "vote_count"
        case originalLanguage = "original_language"
        case originalTitle = "original_title"
        case productionCompanies = "production_companies"
        case productionCountries = "production_countries"
        case spokenLanguages = "spoken_languages"
        case numberOfSeasons = "number_of_seasons"
        case numberOfEpisodes = "number_of_episodes"
        case firstAirDate = "first_air_date"
        case lastAirDate = "last_air_date"
        case seasons, networks
        case createdBy = "created_by"
        case episodeRunTime = "episode_run_time"
        case inProduction = "in_production"
        case lastEpisodeToAir = "last_episode_to_air"
        case nextEpisodeToAir = "next_episode_to_air"
        case originCountry = "origin_country"
        case type
        case mediaType
    }
}

enum MediaType: String, Codable {
    case movie = "movie"
    case tv = "tv"
}

struct Genre: Codable {
    let id: Int
    let name: String
}

struct ProductionCompany: Codable {
    let id: Int
    let name: String
    let logoPath: String?
    let originCountry: String
    
    enum CodingKeys: String, CodingKey {
        case id, name
        case logoPath = "logo_path"
        case originCountry = "origin_country"
    }
}

struct ProductionCountry: Codable {
    let iso31661: String
    let name: String
    
    enum CodingKeys: String, CodingKey {
        case iso31661 = "iso_3166_1"
        case name
    }
}

struct SpokenLanguage: Codable {
    let englishName: String
    let iso6391: String
    let name: String
    
    enum CodingKeys: String, CodingKey {
        case englishName = "english_name"
        case iso6391 = "iso_639_1"
        case name
    }
}

struct Network: Codable {
    let id: Int
    let name: String
    let logoPath: String?
    let originCountry: String
    
    enum CodingKeys: String, CodingKey {
        case id, name
        case logoPath = "logo_path"
        case originCountry = "origin_country"
    }
}

struct Creator: Codable {
    let id: Int
    let name: String
    let profilePath: String?
    let creditId: String
    let gender: Int?
    
    enum CodingKeys: String, CodingKey {
        case id, name, gender
        case profilePath = "profile_path"
        case creditId = "credit_id"
    }
}

// MARK: - Credits Models
struct Credits: Codable {
    let cast: [CastMember]
    let crew: [CrewMember]
}

struct CastMember: Codable {
    let id: Int
    let name: String
    let character: String
    let profilePath: String?
    let order: Int
    let castId: Int
    let creditId: String
    let adult: Bool
    let gender: Int?
    let knownForDepartment: String
    let originalName: String
    let popularity: Double
    
    enum CodingKeys: String, CodingKey {
        case id, name, character, order, adult, gender, popularity
        case profilePath = "profile_path"
        case castId = "cast_id"
        case creditId = "credit_id"
        case knownForDepartment = "known_for_department"
        case originalName = "original_name"
    }
}

struct CrewMember: Codable {
    let id: Int
    let name: String
    let job: String
    let department: String
    let profilePath: String?
    let creditId: String
    let adult: Bool
    let gender: Int?
    let knownForDepartment: String
    let originalName: String
    let popularity: Double
    
    enum CodingKeys: String, CodingKey {
        case id, name, job, department, adult, gender, popularity
        case profilePath = "profile_path"
        case creditId = "credit_id"
        case knownForDepartment = "known_for_department"
        case originalName = "original_name"
    }
}

// MARK: - External IDs
struct ExternalIds: Codable {
    let imdbId: String?
    let facebookId: String?
    let instagramId: String?
    let twitterId: String?
    let tvdbId: Int?
    let tvRageId: Int?
    
    enum CodingKeys: String, CodingKey {
        case imdbId = "imdb_id"
        case facebookId = "facebook_id"
        case instagramId = "instagram_id"
        case twitterId = "twitter_id"
        case tvdbId = "tvdb_id"
        case tvRageId = "tvrage_id"
    }
}

// MARK: - Metadata Fetcher
class MetadataFetcher {
    private let baseURL = "https://api.themoviedb.org/3"
    private let defaultAPIKey = "90acb3adf6e0af93b6c0055ed8a721aa"
    private var apiKey: String
    private let cacheManager = MetadataCacheManager()
    
    init(apiKey: String? = nil) {
        self.apiKey = apiKey ?? defaultAPIKey
    }
    
    func updateAPIKey(_ newKey: String) {
        self.apiKey = newKey
    }
    
    // MARK: - Fetch Movie Metadata
    func fetchMovieMetadata(id: Int, completion: @escaping (Result<MediaMetadata, Error>) -> Void) {
        let cacheKey = "movie_\(id)"
        
        // Check cache first
        if let cachedData = cacheManager.getCachedData(forKey: cacheKey) {
            do {
                var metadata = try JSONDecoder().decode(MediaMetadata.self, from: cachedData)
                metadata = MediaMetadata(
                    id: metadata.id,
                    title: metadata.title,
                    overview: metadata.overview,
                    posterPath: metadata.posterPath,
                    backdropPath: metadata.backdropPath,
                    releaseDate: metadata.releaseDate,
                    voteAverage: metadata.voteAverage,
                    voteCount: metadata.voteCount,
                    genres: metadata.genres,
                    runtime: metadata.runtime,
                    status: metadata.status,
                    tagline: metadata.tagline,
                    homepage: metadata.homepage,
                    originalLanguage: metadata.originalLanguage,
                    originalTitle: metadata.originalTitle,
                    popularity: metadata.popularity,
                    adult: metadata.adult,
                    budget: metadata.budget,
                    revenue: metadata.revenue,
                    productionCompanies: metadata.productionCompanies,
                    productionCountries: metadata.productionCountries,
                    spokenLanguages: metadata.spokenLanguages,
                    mediaType: .movie,
                    numberOfSeasons: nil,
                    numberOfEpisodes: nil,
                    firstAirDate: nil,
                    lastAirDate: nil,
                    seasons: nil,
                    networks: nil,
                    createdBy: nil,
                    episodeRunTime: nil,
                    inProduction: nil,
                    lastEpisodeToAir: nil,
                    nextEpisodeToAir: nil,
                    originCountry: nil,
                    type: nil
                )
                completion(.success(metadata))
                return
            } catch {
                // Cache corrupted, continue with network request
            }
        }
        
        let urlString = "\(baseURL)/movie/\(id)?api_key=\(apiKey)&append_to_response=credits,external_ids"
        performMetadataRequest(urlString: urlString, mediaType: .movie, cacheKey: cacheKey, completion: completion)
    }
    
    // MARK: - Fetch TV Series Metadata
    func fetchSeriesMetadata(id: Int, completion: @escaping (Result<MediaMetadata, Error>) -> Void) {
        let cacheKey = "tv_\(id)"
        
        // Check cache first
        if let cachedData = cacheManager.getCachedData(forKey: cacheKey) {
            do {
                var metadata = try JSONDecoder().decode(MediaMetadata.self, from: cachedData)
                metadata = MediaMetadata(
                    id: metadata.id,
                    title: metadata.title,
                    overview: metadata.overview,
                    posterPath: metadata.posterPath,
                    backdropPath: metadata.backdropPath,
                    releaseDate: metadata.firstAirDate,
                    voteAverage: metadata.voteAverage,
                    voteCount: metadata.voteCount,
                    genres: metadata.genres,
                    runtime: metadata.episodeRunTime?.first,
                    status: metadata.status,
                    tagline: metadata.tagline,
                    homepage: metadata.homepage,
                    originalLanguage: metadata.originalLanguage,
                    originalTitle: metadata.originalTitle,
                    popularity: metadata.popularity,
                    adult: metadata.adult,
                    budget: nil,
                    revenue: nil,
                    productionCompanies: metadata.productionCompanies,
                    productionCountries: metadata.productionCountries,
                    spokenLanguages: metadata.spokenLanguages,
                    mediaType: .tv,
                    numberOfSeasons: metadata.numberOfSeasons,
                    numberOfEpisodes: metadata.numberOfEpisodes,
                    firstAirDate: metadata.firstAirDate,
                    lastAirDate: metadata.lastAirDate,
                    seasons: metadata.seasons,
                    networks: metadata.networks,
                    createdBy: metadata.createdBy,
                    episodeRunTime: metadata.episodeRunTime,
                    inProduction: metadata.inProduction,
                    lastEpisodeToAir: metadata.lastEpisodeToAir,
                    nextEpisodeToAir: metadata.nextEpisodeToAir,
                    originCountry: metadata.originCountry,
                    type: metadata.type
                )
                completion(.success(metadata))
                return
            } catch {
                // Cache corrupted, continue with network request
            }
        }
        
        let urlString = "\(baseURL)/tv/\(id)?api_key=\(apiKey)&append_to_response=credits,external_ids"
        performMetadataRequest(urlString: urlString, mediaType: .tv, cacheKey: cacheKey, completion: completion)
    }
    
    // MARK: - Fetch Credits
    func fetchCredits(for mediaType: MediaType, id: Int, completion: @escaping (Result<Credits, Error>) -> Void) {
        let mediaTypeString = mediaType == .movie ? "movie" : "tv"
        let urlString = "\(baseURL)/\(mediaTypeString)/\(id)/credits?api_key=\(apiKey)"
        
        guard let url = URL(string: urlString) else {
            completion(.failure(NSError(domain: "MetadataFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }
        
        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "MetadataFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data received"])))
                return
            }
            
            do {
                let credits = try JSONDecoder().decode(Credits.self, from: data)
                completion(.success(credits))
            } catch {
                completion(.failure(error))
            }
        }
        
        task.resume()
    }
    
    // MARK: - Fetch External IDs
    func fetchExternalIds(for mediaType: MediaType, id: Int, completion: @escaping (Result<ExternalIds, Error>) -> Void) {
        let mediaTypeString = mediaType == .movie ? "movie" : "tv"
        let urlString = "\(baseURL)/\(mediaTypeString)/\(id)/external_ids?api_key=\(apiKey)"
        
        guard let url = URL(string: urlString) else {
            completion(.failure(NSError(domain: "MetadataFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }
        
        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "MetadataFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data received"])))
                return
            }
            
            do {
                let externalIds = try JSONDecoder().decode(ExternalIds.self, from: data)
                completion(.success(externalIds))
            } catch {
                completion(.failure(error))
            }
        }
        
        task.resume()
    }
    
    // MARK: - Private Helper Methods
    private func performMetadataRequest(urlString: String, mediaType: MediaType, cacheKey: String, completion: @escaping (Result<MediaMetadata, Error>) -> Void) {
        guard let url = URL(string: urlString) else {
            completion(.failure(NSError(domain: "MetadataFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }
        
        let task = URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "MetadataFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data received"])))
                return
            }
            
            do {
                var metadata = try JSONDecoder().decode(MediaMetadata.self, from: data)
                
                // Normalize the metadata based on media type
                metadata = MediaMetadata(
                    id: metadata.id,
                    title: mediaType == .movie ? metadata.title : metadata.title,
                    overview: metadata.overview,
                    posterPath: metadata.posterPath,
                    backdropPath: metadata.backdropPath,
                    releaseDate: mediaType == .movie ? metadata.releaseDate : metadata.firstAirDate,
                    voteAverage: metadata.voteAverage,
                    voteCount: metadata.voteCount,
                    genres: metadata.genres,
                    runtime: mediaType == .movie ? metadata.runtime : metadata.episodeRunTime?.first,
                    status: metadata.status,
                    tagline: metadata.tagline,
                    homepage: metadata.homepage,
                    originalLanguage: metadata.originalLanguage,
                    originalTitle: metadata.originalTitle,
                    popularity: metadata.popularity,
                    adult: metadata.adult,
                    budget: mediaType == .movie ? metadata.budget : nil,
                    revenue: mediaType == .movie ? metadata.revenue : nil,
                    productionCompanies: metadata.productionCompanies,
                    productionCountries: metadata.productionCountries,
                    spokenLanguages: metadata.spokenLanguages,
                    mediaType: mediaType,
                    numberOfSeasons: mediaType == .tv ? metadata.numberOfSeasons : nil,
                    numberOfEpisodes: mediaType == .tv ? metadata.numberOfEpisodes : nil,
                    firstAirDate: mediaType == .tv ? metadata.firstAirDate : nil,
                    lastAirDate: mediaType == .tv ? metadata.lastAirDate : nil,
                    seasons: mediaType == .tv ? metadata.seasons : nil,
                    networks: mediaType == .tv ? metadata.networks : nil,
                    createdBy: mediaType == .tv ? metadata.createdBy : nil,
                    episodeRunTime: mediaType == .tv ? metadata.episodeRunTime : nil,
                    inProduction: mediaType == .tv ? metadata.inProduction : nil,
                    lastEpisodeToAir: mediaType == .tv ? metadata.lastEpisodeToAir : nil,
                    nextEpisodeToAir: mediaType == .tv ? metadata.nextEpisodeToAir : nil,
                    originCountry: mediaType == .tv ? metadata.originCountry : nil,
                    type: mediaType == .tv ? metadata.type : nil
                )
                
                // Cache the result
                self?.cacheManager.cacheData(data, forKey: cacheKey)
                
                completion(.success(metadata))
            } catch {
                completion(.failure(error))
            }
        }
        
        task.resume()
    }
}

// MARK: - Metadata Cache Manager
class MetadataCacheManager {
    private let cache = NSCache<NSString, NSData>()
    private let cacheExpiry: TimeInterval = 7200 // 2 hours
    
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