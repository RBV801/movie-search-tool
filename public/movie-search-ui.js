Vue.component('movie-search-ui', {
  template: `
    <div>
      <input type="text" v-model="searchQuery" placeholder="Enter movie title" />
      <button @click="search">Search</button>
      <div v-if="isLoading">Loading...</div>
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="movies.length">
        <h3>Search Results:</h3>
        <ul>
          <li v-for="movie in movies" :key="movie.id">
            {{ movie.title }} ({{ movie.year }})
          </li>
        </ul>
      </div>
    </div>
  `,
  data() {
    return {
      searchQuery: '',
      movies: [],
      isLoading: false,
      error: null,
      movieScraper: new MovieScraper()
    };
  },
  methods: {
    async search() {
      try {
        this.isLoading = true;
        this.error = null;
        this.movies = await this.movieScraper.searchMovie(this.searchQuery);
        this.$emit('search-complete', this.movies);
      } catch (error) {
        this.error = error.message;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
