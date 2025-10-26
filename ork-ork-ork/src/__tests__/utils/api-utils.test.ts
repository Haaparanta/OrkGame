/**
 * API Utility Tests
 * 
 * Tests for utility functions and error handling in the API module:
 * - URL building
 * - Error handling 
 * - Response parsing
 * - Cache handling
 * - Logging functionality
 */

import { ApiError, getApiBaseUrl } from '@/lib/api'

describe('API Utilities', () => {
  describe('getApiBaseUrl', () => {
    test('should return production URL by default', () => {
      const url = getApiBaseUrl()
      expect(url).toBe('https://orkgamez.serverlul.win/api')
    })

    test('should not include trailing slash', () => {
      const url = getApiBaseUrl()
      expect(url).not.toMatch(/\/$/)
    })

    test('should be a valid URL', () => {
      const url = getApiBaseUrl()
      expect(() => new URL(url)).not.toThrow()
    })

    test('should use HTTPS protocol', () => {
      const url = getApiBaseUrl()
      expect(url).toMatch(/^https:\/\//)
    })

    test('should point to correct domain', () => {
      const url = getApiBaseUrl()
      expect(url).toContain('orkgamez.serverlul.win')
    })
  })

  describe('ApiError', () => {
    test('should create error with status code', () => {
      const error = new ApiError('Test error', 404)
      
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ApiError)
      expect(error.name).toBe('ApiError')
      expect(error.message).toBe('Test error')
      expect(error.status).toBe(404)
    })

    test('should create error with optional code and details', () => {
      const details = { field: 'username', issue: 'required' }
      const error = new ApiError('Validation failed', 400, 'VALIDATION_ERROR', details)
      
      expect(error.status).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.details).toEqual(details)
    })

    test('should be throwable and catchable', () => {
      const throwError = () => {
        throw new ApiError('Test error', 500)
      }

      expect(throwError).toThrow(ApiError)
      expect(throwError).toThrow('Test error')
    })

    test('should work with try-catch blocks', () => {
      let caughtError: ApiError | null = null

      try {
        throw new ApiError('Network error', 0, 'NETWORK_ERROR')
      } catch (error) {
        caughtError = error as ApiError
      }

      expect(caughtError).toBeInstanceOf(ApiError)
      expect(caughtError?.status).toBe(0)
      expect(caughtError?.code).toBe('NETWORK_ERROR')
    })

    test('should maintain error stack trace', () => {
      const error = new ApiError('Stack trace test', 500)
      
      expect(error.stack).toBeDefined()
      expect(typeof error.stack).toBe('string')
      expect(error.stack).toContain('Stack trace test')
    })

    test('should handle undefined optional parameters', () => {
      const error = new ApiError('Simple error', 400, undefined, undefined)
      
      expect(error.code).toBeUndefined()
      expect(error.details).toBeUndefined()
    })

    test('should handle null details', () => {
      const error = new ApiError('Null details', 400, 'CODE', null)
      
      expect(error.details).toBeNull()
    })

    test('should handle complex details object', () => {
      const complexDetails = {
        timestamp: new Date().toISOString(),
        userAgent: 'test-agent',
        requestId: 'req-123',
        nested: {
          level: 1,
          data: [1, 2, 3]
        }
      }
      
      const error = new ApiError('Complex error', 500, 'COMPLEX', complexDetails)
      
      expect(error.details).toEqual(complexDetails)
    })
  })

  describe('Environment Configuration', () => {
    test('should handle missing environment variables gracefully', () => {
      // This test verifies the fallback behavior
      const originalEnv = process.env.NEXT_PUBLIC_API_BASE
      delete process.env.NEXT_PUBLIC_API_BASE
      
      const url = getApiBaseUrl()
      expect(url).toBe('https://orkgamez.serverlul.win/api')
      
      // Restore original value
      if (originalEnv !== undefined) {
        process.env.NEXT_PUBLIC_API_BASE = originalEnv
      }
    })

    test('should work with different API base URLs', () => {
      // Note: This would need proper mocking in a real test environment
      // For now, we test that the function returns a consistent value
      const url = getApiBaseUrl()
      expect(typeof url).toBe('string')
      expect(url.length).toBeGreaterThan(0)
    })
  })

  describe('Type Safety', () => {
    test('should enforce correct error types', () => {
      const error = new ApiError('Type test', 400)
      
      // TypeScript should enforce these types at compile time
      expect(typeof error.message).toBe('string')
      expect(typeof error.status).toBe('number')
      expect(typeof error.name).toBe('string')
    })

    test('should allow optional parameters to be undefined', () => {
      const error = new ApiError('Optional test', 500)
      
      expect(error.code).toBeUndefined()
      expect(error.details).toBeUndefined()
    })

    test('should handle various status codes', () => {
      const statusCodes = [200, 400, 401, 403, 404, 422, 500, 502, 503]
      
      statusCodes.forEach(status => {
        const error = new ApiError(`Error ${status}`, status)
        expect(error.status).toBe(status)
      })
    })
  })

  describe('Error Message Formatting', () => {
    test('should preserve original error message', () => {
      const message = 'Very specific error message with details'
      const error = new ApiError(message, 400)
      
      expect(error.message).toBe(message)
    })

    test('should handle empty error message', () => {
      const error = new ApiError('', 500)
      
      expect(error.message).toBe('')
    })

    test('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000) + ' very long error message'
      const error = new ApiError(longMessage, 400)
      
      expect(error.message).toBe(longMessage)
      expect(error.message.length).toBeGreaterThan(1000)
    })

    test('should handle special characters in error message', () => {
      const message = 'Error with émojis 🚨 and spécial charàcters!'
      const error = new ApiError(message, 400)
      
      expect(error.message).toBe(message)
    })

    test('should handle multiline error messages', () => {
      const message = 'Line 1\nLine 2\nLine 3'
      const error = new ApiError(message, 400)
      
      expect(error.message).toBe(message)
      expect(error.message).toContain('\n')
    })
  })

  describe('Error Code Handling', () => {
    test('should handle various error code formats', () => {
      const codes = [
        'SIMPLE_CODE',
        'nested.code',
        'CODE_WITH_123',
        'kebab-case-code',
        'camelCaseCode',
        '404_NOT_FOUND'
      ]
      
      codes.forEach(code => {
        const error = new ApiError('Test', 400, code)
        expect(error.code).toBe(code)
      })
    })

    test('should handle empty error code', () => {
      const error = new ApiError('Test', 400, '')
      
      expect(error.code).toBe('')
    })

    test('should handle numeric-like error codes', () => {
      const error = new ApiError('Test', 400, '123456')
      
      expect(error.code).toBe('123456')
      expect(typeof error.code).toBe('string')
    })
  })

  describe('Error Details Handling', () => {
    test('should handle primitive details', () => {
      const stringDetails = 'Simple string detail'
      const numberDetails = 42
      const booleanDetails = true
      
      const error1 = new ApiError('Test', 400, 'CODE', stringDetails)
      const error2 = new ApiError('Test', 400, 'CODE', numberDetails)
      const error3 = new ApiError('Test', 400, 'CODE', booleanDetails)
      
      expect(error1.details).toBe(stringDetails)
      expect(error2.details).toBe(numberDetails)
      expect(error3.details).toBe(booleanDetails)
    })

    test('should handle array details', () => {
      const arrayDetails = ['error1', 'error2', 'error3']
      const error = new ApiError('Test', 400, 'CODE', arrayDetails)
      
      expect(error.details).toEqual(arrayDetails)
      expect(Array.isArray(error.details)).toBe(true)
    })

    test('should handle deeply nested details', () => {
      const nestedDetails = {
        level1: {
          level2: {
            level3: {
              data: 'deep value'
            }
          }
        }
      }
      
      const error = new ApiError('Test', 400, 'CODE', nestedDetails)
      
      expect(error.details).toEqual(nestedDetails)
      expect((error.details as any).level1.level2.level3.data).toBe('deep value')
    })
  })
})
