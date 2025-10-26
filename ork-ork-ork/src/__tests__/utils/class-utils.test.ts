/**
 * Utility Functions Tests
 * 
 * Tests for utility functions including:
 * - Class name merging (cn function)
 * - Tailwind CSS class handling
 * - Edge cases and error handling
 */

import { cn } from '@/lib/utils'

describe('Utility Functions', () => {
  describe('cn (className merger)', () => {
    test('should merge simple class names', () => {
      const result = cn('class1', 'class2', 'class3')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
      expect(result).toContain('class3')
    })

    test('should handle conditional classes', () => {
      const isActive = true
      const isDisabled = false
      
      const result = cn(
        'base-class',
        isActive && 'active-class',
        isDisabled && 'disabled-class'
      )
      
      expect(result).toContain('base-class')
      expect(result).toContain('active-class')
      expect(result).not.toContain('disabled-class')
    })

    test('should handle object syntax', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': true
      })
      
      expect(result).toContain('class1')
      expect(result).not.toContain('class2')
      expect(result).toContain('class3')
    })

    test('should handle array syntax', () => {
      const result = cn(['class1', 'class2'], ['class3'])
      
      expect(result).toContain('class1')
      expect(result).toContain('class2')
      expect(result).toContain('class3')
    })

    test('should handle mixed input types', () => {
      const result = cn(
        'base',
        { active: true, disabled: false },
        ['flex', 'items-center'],
        true && 'conditional-class'
      )
      
      expect(result).toContain('base')
      expect(result).toContain('active')
      expect(result).not.toContain('disabled')
      expect(result).toContain('flex')
      expect(result).toContain('items-center')
      expect(result).toContain('conditional-class')
    })

    test('should handle empty inputs', () => {
      const result = cn()
      expect(typeof result).toBe('string')
    })

    test('should handle null and undefined inputs', () => {
      const result = cn(null, undefined, 'valid-class')
      expect(result).toContain('valid-class')
    })

    test('should handle Tailwind CSS conflicts', () => {
      // Test that twMerge properly handles conflicting Tailwind classes
      const result = cn('p-4', 'p-8') // padding conflict
      
      // Should resolve to the last valid padding class
      expect(result).toContain('p-8')
      expect(result).not.toContain('p-4')
    })

    test('should merge responsive Tailwind classes', () => {
      const result = cn('text-sm', 'md:text-lg', 'lg:text-xl')
      
      expect(result).toContain('text-sm')
      expect(result).toContain('md:text-lg')
      expect(result).toContain('lg:text-xl')
    })

    test('should handle state modifiers', () => {
      const result = cn('hover:bg-blue-500', 'focus:ring-2', 'active:scale-95')
      
      expect(result).toContain('hover:bg-blue-500')
      expect(result).toContain('focus:ring-2')
      expect(result).toContain('active:scale-95')
    })

    test('should handle color conflicts in Tailwind', () => {
      const result = cn('bg-red-500', 'bg-blue-500')
      
      // Should resolve to the last color
      expect(result).toContain('bg-blue-500')
      expect(result).not.toContain('bg-red-500')
    })

    test('should handle spacing conflicts', () => {
      const result = cn('m-2', 'm-4', 'mx-8')
      
      // Should handle margin conflicts appropriately
      expect(result).toContain('mx-8') // This should remain as it's more specific
    })

    test('should preserve non-Tailwind classes', () => {
      const result = cn('custom-class', 'another-custom', 'p-4')
      
      expect(result).toContain('custom-class')
      expect(result).toContain('another-custom')
      expect(result).toContain('p-4')
    })

    test('should handle very long class lists', () => {
      const longClassList = Array.from({ length: 50 }, (_, i) => `class-${i}`)
      const result = cn(...longClassList)
      
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('class-0')
      expect(result).toContain('class-49')
    })

    test('should handle duplicate classes', () => {
      const result = cn('duplicate', 'other', 'duplicate', 'another')
      
      // Should deduplicate
      const classArray = result.split(' ')
      const duplicateCount = classArray.filter(cls => cls === 'duplicate').length
      expect(duplicateCount).toBeLessThanOrEqual(1)
    })

    test('should handle empty strings', () => {
      const result = cn('', 'valid-class', '', 'another-valid')
      
      expect(result).toContain('valid-class')
      expect(result).toContain('another-valid')
    })

    test('should handle special characters in class names', () => {
      const result = cn('class-with-dashes', 'class_with_underscores', 'class123')
      
      expect(result).toContain('class-with-dashes')
      expect(result).toContain('class_with_underscores')
      expect(result).toContain('class123')
    })

    test('should return string type', () => {
      const result = cn('test')
      expect(typeof result).toBe('string')
    })

    test('should handle complex Tailwind utility combinations', () => {
      const result = cn(
        'flex',
        'items-center',
        'justify-between',
        'p-4',
        'bg-white',
        'rounded-lg',
        'shadow-md',
        'hover:shadow-lg',
        'transition-shadow',
        'duration-200'
      )
      
      expect(result).toContain('flex')
      expect(result).toContain('items-center')
      expect(result).toContain('justify-between')
      expect(result).toContain('p-4')
      expect(result).toContain('bg-white')
      expect(result).toContain('rounded-lg')
      expect(result).toContain('shadow-md')
      expect(result).toContain('hover:shadow-lg')
      expect(result).toContain('transition-shadow')
      expect(result).toContain('duration-200')
    })

    test('should handle dark mode classes', () => {
      const result = cn('bg-white', 'dark:bg-gray-800', 'text-black', 'dark:text-white')
      
      expect(result).toContain('bg-white')
      expect(result).toContain('dark:bg-gray-800')
      expect(result).toContain('text-black')
      expect(result).toContain('dark:text-white')
    })

    test('should handle arbitrary value classes', () => {
      const result = cn('w-[200px]', 'h-[100px]', 'bg-[#ff0000]')
      
      expect(result).toContain('w-[200px]')
      expect(result).toContain('h-[100px]')
      expect(result).toContain('bg-[#ff0000]')
    })
  })

  describe('Edge Cases', () => {
    test('should handle functions that return classes', () => {
      const getClass = () => 'dynamic-class'
      const result = cn('static-class', getClass())
      
      expect(result).toContain('static-class')
      expect(result).toContain('dynamic-class')
    })

    test('should handle performance with many arguments', () => {
      const start = performance.now()
      const result = cn(...Array.from({ length: 100 }, (_, i) => `class-${i}`))
      const end = performance.now()
      
      expect(typeof result).toBe('string')
      expect(end - start).toBeLessThan(50) // Should complete in less than 50ms
    })

    test('should handle memory efficiency', () => {
      // Test with many small class combinations
      for (let i = 0; i < 1000; i++) {
        const result = cn('base', `dynamic-${i}`, i % 2 === 0 && 'even')
        expect(typeof result).toBe('string')
      }
    })

    test('should be deterministic', () => {
      const input = ['class1', 'class2', { active: true, disabled: false }]
      const result1 = cn(...input)
      const result2 = cn(...input)
      
      expect(result1).toBe(result2)
    })

    test('should handle circular references gracefully', () => {
      const obj: any = { active: true }
      obj.self = obj
      
      // Should not crash with circular references
      expect(() => cn('base', obj)).not.toThrow()
    })
  })
})
