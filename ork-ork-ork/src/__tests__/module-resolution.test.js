describe('Module Resolution Test', () => {
  test('should resolve module paths correctly', () => {
    // Test basic module resolution first
    expect(require.resolve('../lib/types')).toBeTruthy()
  })
  
  test('should resolve utils', () => {
    const utils = require('../lib/utils')
    expect(utils).toBeDefined()
  })
})
