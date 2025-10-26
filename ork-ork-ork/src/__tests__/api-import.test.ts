// Test importing the API functions with ES6 import syntax
import * as api from '../lib/api'

describe('API Import Test', () => {
  test('should import API module with ES6 imports', () => {
    console.log('API exports:', Object.keys(api))
    expect(api).toBeDefined()
    
    // Check if specific functions exist
    if ('getCurrentSession' in api) {
      expect(typeof api.getCurrentSession).toBe('function')
    }
  })
})
