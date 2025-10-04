const XKCDService = require('../../src/services/xkcdService');
const fetch = require('node-fetch');

jest.mock('node-fetch');
const mockFetch = fetch;

describe('XKCDService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the cache by flushing all entries
    XKCDService.cache.flushAll();
  });

  describe('getLatest', () => {
    test('should fetch and return latest comic with correct structure', async () => {
      const mockComic = {
        num: 2750,
        title: 'Test Comic',
        img: 'https://imgs.xkcd.com/comics/test.png',
        alt: 'Test alt text',
        transcript: 'Test transcript',
        year: '2023',
        month: '4',
        day: '1',
        safe_title: 'Test Comic'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComic
      });

      const result = await XKCDService.getLatest();

      expect(mockFetch).toHaveBeenCalledWith('https://xkcd.com/info.0.json');
      expect(result).toEqual({
        id: 2750,
        title: 'Test Comic',
        img: 'https://imgs.xkcd.com/comics/test.png',
        alt: 'Test alt text',
        transcript: 'Test transcript',
        year: '2023',
        month: '4',
        day: '1',
        safe_title: 'Test Comic',
        date: '2023-4-1',
        link: '',
        news: '',
        num: 2750
      });
    });

    test('should handle missing transcript gracefully', async () => {
      const mockComic = {
        num: 1,
        title: 'Test',
        img: 'https://test.com/test.png',
        alt: 'Alt text',
        year: '2023',
        month: '1',
        day: '1',
        safe_title: 'Test'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComic
      });

      const result = await XKCDService.getLatest();
      expect(result.transcript).toBe('');
    });

    test('should cache results for performance', async () => {
      const mockComic = {
        num: 1,
        title: 'Cached',
        img: 'https://test.com/cached.png',
        alt: 'Cached comic',
        year: '2023',
        month: '1',
        day: '1',
        safe_title: 'Cached'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComic
      });

      await XKCDService.getLatest();
      await XKCDService.getLatest();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should handle HTTP errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(XKCDService.getLatest()).rejects.toThrow('Failed to fetch latest comic');
    });

    test('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Fix the expected error message
      await expect(XKCDService.getLatest()).rejects.toThrow('Network error');
    });
  });

  describe('getById', () => {
    test('should fetch comic by ID', async () => {
      const mockComic = {
        num: 614,
        title: 'Woodpecker',
        img: 'https://imgs.xkcd.com/comics/woodpecker.png',
        alt: 'Test alt',
        year: '2009',
        month: '7',
        day: '24',
        safe_title: 'Woodpecker'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComic
      });

      const result = await XKCDService.getById(614);
      expect(result.id).toBe(614);
      expect(result.title).toBe('Woodpecker');
    });

    test('should validate ID parameter', async () => {
      await expect(XKCDService.getById(0)).rejects.toThrow('Invalid comic ID');
      await expect(XKCDService.getById(-1)).rejects.toThrow('Invalid comic ID');
      await expect(XKCDService.getById('invalid')).rejects.toThrow('Invalid comic ID');
    });

    test('should handle non-existent comic', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 404,
        ok: false
      });

      await expect(XKCDService.getById(999999)).rejects.toThrow('Comic not found');
    });
  });

  describe('getRandom', () => {
    test('should return random comic', async () => {
      const mockLatest = {
        num: 2750,
        title: 'Latest',
        img: 'https://test.com/latest.png',
        alt: 'Latest comic',
        year: '2023',
        month: '1',
        day: '1',
        safe_title: 'Latest'
      };

      const mockRandom = {
        num: 1234,
        title: 'Random Comic',
        img: 'https://test.com/random.png',
        alt: 'Random alt',
        year: '2022',
        month: '6',
        day: '15',
        safe_title: 'Random Comic'
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLatest
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRandom
        });

      const result = await XKCDService.getRandom();
      expect(result.id).toBe(1234);
      expect(result.title).toBe('Random Comic');
    });
  });

  describe('search', () => {
    test('should search comics', async () => {
      const mockLatest = {
        num: 10, // Small number for testing
        title: 'Latest',
        img: 'https://test.com/latest.png',
        alt: 'Latest comic',
        year: '2023',
        month: '1',
        day: '1',
        safe_title: 'Latest'
      };

      // Mock multiple comic responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLatest
        });

      // Mock the individual comic fetches
      for (let i = 1; i <= 10; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            num: i,
            title: i === 5 ? 'Python Comic' : `Comic ${i}`,
            img: `https://test.com/comic${i}.png`,
            alt: `Alt ${i}`,
            year: '2023',
            month: '1',
            day: '1',
            safe_title: `Comic ${i}`
          })
        });
      }

      const result = await XKCDService.search('python', 1, 10);
      expect(result.query).toBe('python');
      expect(Array.isArray(result.results)).toBe(true);
      expect(result).toHaveProperty('pagination');
    });

    test('should validate query parameter', async () => {
      await expect(XKCDService.search('')).rejects.toThrow('Query must be between 1 and 100 characters');
      await expect(XKCDService.search('a'.repeat(101))).rejects.toThrow('Query must be between 1 and 100 characters');
    });
  });

  describe('processComic', () => {
    test('should process comic data correctly', () => {
      const rawComic = {
        num: 1,
        title: 'Barrel - Part 1',
        img: 'https://imgs.xkcd.com/comics/barrel_cropped_(1).jpg',
        alt: 'Don\'t we all.',
        transcript: 'Test transcript',
        year: '2006',
        month: '1',
        day: '1',
        safe_title: 'Barrel - Part 1'
      };

      const processed = XKCDService.processComic(rawComic);

      expect(processed).toEqual({
        id: 1,
        title: 'Barrel - Part 1',
        img: 'https://imgs.xkcd.com/comics/barrel_cropped_(1).jpg',
        alt: 'Don\'t we all.',
        transcript: 'Test transcript',
        year: '2006',
        month: '1',
        day: '1',
        safe_title: 'Barrel - Part 1',
        date: '2006-1-1',
        link: '',
        news: '',
        num: 1
      });
    });

    test('should handle missing transcript', () => {
      const rawComic = {
        num: 1,
        title: 'Test',
        img: 'https://test.com/test.png',
        alt: 'Alt text',
        year: '2023',
        month: '1',
        day: '1',
        safe_title: 'Test'
      };

      const processed = XKCDService.processComic(rawComic);
      expect(processed.transcript).toBe('');
    });
  });
});