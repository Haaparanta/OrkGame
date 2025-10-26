import React from 'react'
import { render } from '@testing-library/react'
import { OrkBattleUI } from '../components/ork/OrkBattleUI'

describe('Import Test', () => {
  test('should import successfully', () => {
    expect(React).toBeDefined()
    expect(OrkBattleUI).toBeDefined()
  })
})
