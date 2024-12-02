class MovieScraper {
    constructor() {
        this.movies = [];
        this.searchHistory = [];
    }

    async braveSearch(searchQuery) {
        try {
            const response = await fetch('https://api.search.brave.com/res/v1/web/search', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                params: {
                    q: searchQuery,
                    count: 5
                }
            });

            const data = await response.json();
            return this.parseSearchResults(data);
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
            .filter(result => result.URL.includes('/fullcredits'))
            .map(result => {
                const castList = [];
                const castLines = result.Description.split('\n');
                
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
        const titleMatch = result.Title.match(/^(.*?)\((\d{4})\)/);
        if (!titleMatch) return null;

        // Parse rating
        const ratingMatch = result.Title.match(/⭐\s*([0-9.]+)/);
        
        // Parse genres
        const genreMatch = result.Title.match(/\|(.*?)$/);
        
        // Parse director
        const directorMatch = result.Description.match(/Directed by ([^.]+)/);

        // Extract movie ID from URL
        const movieId = result.URL.match(/title\/(tt\d+)/)?.[1];

        // Get detailed cast information if we have a movie ID
        const castDetails = movieId ? await this.getCastDetails(movieId) : [];

        // Parse basic cast from description as fallback
        const basicCastMatch = result.Description.match(/With ([^.]+)/);
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
            url: result.URL,
            description: result.Description,
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

// Test the implementation
const testScraper = async () => {
    const scraper = new MovieScraper();
    try {
        console.log('Searching for Inception...');
        const results = await scraper.searchMovie('Inception', 2010);
        console.log('Results with cast:', JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('Test failed:', error);
    }
};

testScraper();
