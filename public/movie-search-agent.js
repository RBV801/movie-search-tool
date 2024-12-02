Vue.component('movie-search-agent', {
  props: ['results'],
  template: `
    <div>
      <h2>Search Results</h2>
      <ul>
        <li v-for="movie in results" :key="movie.id">
          <h3>{{ movie.title }} ({{ movie.year }})</h3>
          <p>Director: {{ movie.director }}</p>
          <p>Rating: {{ movie.rating }}</p>
          <p>Genres: {{ movie.genres.join(', ') }}</p>
          <ul>
            <li v-for="(castMember, index) in movie.cast" :key="index">
              {{ castMember.actor }} as {{ castMember.character }}
            </li>
          </ul>
        </li>
      </ul>
    </div>
  `
});