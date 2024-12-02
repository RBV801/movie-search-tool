Vue.component('movie-search-ui', {
  template: `
    <div>
      <input type="text" v-model="searchQuery" placeholder="Enter movie title" />
      <button @click="search">Search</button>
    </div>
  `,
  data() {
    return {
      searchQuery: ''
    };
  },
  methods: {
    search() {
      this.$emit('search', this.searchQuery);
    }
  }
});