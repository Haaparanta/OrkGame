import React from 'react'
import { render, screen } from '@testing-library/react'

describe('Minimal Test', () => {
  test('should have document defined', () => {
    expect(document).toBeDefined()
  })
  
  test('should render a simple component', () => {
    const TestComponent = () => <div>Hello World</div>
    render(<TestComponent />)
    expect(screen.getByText('Hello World')).toBeTruthy()
  })
})
