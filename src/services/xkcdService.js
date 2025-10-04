const fetch = require('node-fetch');
const NodeCache = require('node-cache');

class XKCDService {
  constructor() {
    this.baseUrl = 'https://xkcd.com';
    this.cache = new NodeCache({ stdTTL: 3600 });
  }

  // Get the latest comic
  async getLatest() {
    const cacheKey = 'comic-latest';
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${this.baseUrl}/info.0.json`);
      if (!response.ok) throw new Error('Failed to fetch latest comic');

      const data = await response.json();
      const processedComic = this.processComic(data);
      this.cache.set(cacheKey, processedComic);
      return processedComic;
    } catch (error) {

      if (error.message === 'Failed to fetch latest comic') {
        throw error;
      }
      throw new Error(`Failed to fetch latest comic: ${error.message}`);
    }
  }

  // Get a comic by ID
  async getById(id) {

    if (!id || isNaN(id) || id < 1 || !Number.isInteger(Number(id))) {
      throw new Error('Invalid comic ID');
    }

    const numericId = parseInt(id);
    const cacheKey = `comic-${numericId}`;
    

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${this.baseUrl}/${numericId}/info.0.json`);
      if (response.status === 404) throw new Error('Comic not found');
      if (!response.ok) throw new Error(`Failed to fetch comic ${numericId}`);

      const data = await response.json();
      const processedComic = this.processComic(data);
      this.cache.set(cacheKey, processedComic);
      return processedComic;
    } catch (error) {
      if (error.message === 'Comic not found') {
        throw error;
      }
      throw new Error(`Failed to fetch comic ${numericId}: ${error.message}`);
    }
  }

  // Get a random comic
  async getRandom() {
    try {
      const latest = await this.getLatest();
      const randomId = Math.floor(Math.random() * latest.num) + 1;
      return await this.getById(randomId);
    } catch (error) {
      throw new Error(`Failed to fetch random comic: ${error.message}`);
    }
  }

  // Search comics with pagination
  async search(query, page = 1, limit = 10) {
    if (!query || typeof query !== 'string' || query.length < 1 || query.length > 100) {
      throw new Error('Query must be between 1 and 100 characters');
    }

    const searchQuery = query.toLowerCase();
    const numericPage = parseInt(page);
    const numericLimit = parseInt(limit);
    const offset = (numericPage - 1) * numericLimit;

    try {
      const latest = await this.getLatest();
      const maxId = latest.num;
      

      const startId = Math.max(1, maxId - 99);
      const searchPromises = [];
      
      for (let id = startId; id <= maxId; id++) {
        searchPromises.push(this.getById(id).catch(() => null));
      }
      
      const comics = await Promise.all(searchPromises);
      const validComics = comics.filter(comic => comic !== null);
      

      const matchingComics = validComics.filter(comic => {
        const titleMatch = comic.title.toLowerCase().includes(searchQuery);
        const transcriptMatch = comic.transcript && comic.transcript.toLowerCase().includes(searchQuery);
        const altMatch = comic.alt && comic.alt.toLowerCase().includes(searchQuery);
        
        return titleMatch || transcriptMatch || altMatch;
      });
      

      const total = matchingComics.length;
      const paginatedResults = matchingComics.slice(offset, offset + numericLimit);
      
      return {
        query: searchQuery,
        results: paginatedResults,
        total,
        pagination: {
          page: numericPage,
          limit: numericLimit,
          totalPages: Math.ceil(total / numericLimit),
          hasNext: offset + numericLimit < total,
          hasPrev: numericPage > 1,
          offset: offset
        }
      };
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }


  processComic(comicData) {
    return {
      id: comicData.num,
      title: comicData.title,
      safe_title: comicData.safe_title,
      date: `${comicData.year}-${comicData.month}-${comicData.day}`,
      img: comicData.img,
      alt: comicData.alt,
      transcript: comicData.transcript || '',
      news: comicData.news || '',
      link: comicData.link || '',
      num: comicData.num,
      year: comicData.year,
      month: comicData.month,
      day: comicData.day
    };
  }
}


module.exports = new XKCDService();