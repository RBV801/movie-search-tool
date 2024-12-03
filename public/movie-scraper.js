class MovieScraper {
    constructor() {
        this.movies = [];
        this.searchHistory = [];
        console.log('Initializing MovieScraper with config:', window.config); // Debug log
        if (typeof config === 'undefined') {
            throw new Error('Brave API key not found. Please set up config.js with your API key.');
        }
        if (!config.BRAVE_API_KEY) {
            throw new Error('BRAVE_API_KEY not found in config.');
        }
        this.apiKey = config.BRAVE_API_KEY;
        console.log('MovieScraper initialized successfully with API key:', this.apiKey.substring(0, 5) + '...'); // Debug log
    }

    async braveSearch(searchQuery) {
        try {
            const queryParams = new URLSearchParams({
                q: searchQuery,
                count: '5'
            }).toString();

            console.log('Making API request with params:', queryParams); // Debug log

            const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Subscription-Token': this.apiKey
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Response not OK:', response.status, errorText); // Debug log
                throw new Error(`Brave Search API error: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log('API Response:', data); // Debug log

            if (!data.web || !data.web.results) {
                console.error('Unexpected API response:', data);
                throw new Error('Invalid API response format');
            }
            return data.web.results;
        } catch (error) {
            console.error('Search failed:', error);
            throw error;
        }
    }

    async getCastDetails(movieId) {
        // Search specifically for cast information
        const castQuery = `site:imdb.com ${movieId} cast`;
        const castResults = await this.braveSearch(castQuery);
        return this.parseCastPage(castResults);
    }

    parseCastPage(results) {
        if (!results || !Array.isArray(results)) return [];

        // Look for cast entries in the description
        const castEntries = results
            .filter(result => result.url.includes('/fullcredits'))
            .map(result => {
                const castList = [];
                const castLines = result.description.split('\n');
                
                castLines.forEach(line => {
                    const castMatch = line.match(/(.*?)\s+as\s+(.*?)(?:\.|$)/i);
                    if (castMatch) {
                        castList.push({
                            actor: castMatch[1].trim(),
                            character: castMatch[2].trim(),
                            order: castList.length + 1
                        });
                    }
                });

                return castList;
            })
            .flat();

        return castEntries;
    }

    async extractMovieData(result) {
        // Parse title and year
        const titleMatch = result.title.match(/^(.*?)\((\d{4})\)/);
        if (!titleMatch) return null;

        // Parse rating
        const ratingMatch = result.title.match(/⭐\s*([0-9.]+)/);
        
        // Parse genres
        const genreMatch = result.title.match(/\|(.*?)$/);
        
        // Parse director
        const directorMatch = result.description.match(/Directed by ([^.]+)/);

        // Extract movie ID from URL
        const movieId = result.url.match(/title\/(tt\d+)/)?.[1];

        // Get detailed cast information if we have a movie ID
        const castDetails = movieId ? await this.getCastDetails(movieId) : [];

        // Parse basic cast from description as fallback
        const basicCastMatch = result.description.match(/With ([^.]+)/);
        const basicCast = basicCastMatch ? 
            basicCastMatch[1].split(',')
                .map(actor => ({
                    actor: actor.replace(/\band\b/, '').trim(),
                    character: '',
                    order: 0
                })) : 
            [];

        // Use detailed cast if available, otherwise use basic cast
        const cast = castDetails.length > 0 ? castDetails : basicCast;

        return {
            id: movieId,
            title: titleMatch[1].trim(),
            year: parseInt(titleMatch[2]),
            rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
            genres: genreMatch ? 
                genreMatch[1].split(',').map(g => g.trim()) : 
                [],
            director: directorMatch ? directorMatch[1].trim() : '',
            cast: cast,
            url: result.url,
            description: result.description,
            lastUpdated: new Date()
        };
    }

    async searchMovie(title, year = null) {
        const query = year ? 
            `site:imdb.com movie "${title}" ${year}` : 
            `site:imdb.com movie "${title}"`;

        try {
            const results = await this.braveSearch(query);
            
            this.searchHistory.push({
                query,
                timestamp: new Date(),
                resultsCount: results.length
            });

            const moviesWithCast = await Promise.all(
                results.map(async (result) => {
                    const movieData = await this.extractMovieData(result);
                    if (movieData) {
                        const existingIndex = this.movies.findIndex(m => m.id === movieData.id);
                        if (existingIndex >= 0) {
                            this.movies[existingIndex] = movieData;
                        } else {
                            this.movies.push(movieData);
                        }
                    }
                    return movieData;
                })
            );

            return moviesWithCast.filter(Boolean);
        } catch (error) {
            console.error('Movie search failed:', error);
            throw error;
        }
    }

    getSearchHistory() {
        return this.searchHistory;
    }

    getMovies() {
        return this.movies;
    }
}