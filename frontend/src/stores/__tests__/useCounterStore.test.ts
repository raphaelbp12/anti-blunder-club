import { useCounterStore } from '../useCounterStore'

describe('useCounterStore', () => {
  beforeEach(() => {
    useCounterStore.setState({ count: 0 })
  })

  it('starts with count of 0', () => {
    expect(useCounterStore.getState().count).toBe(0)
  })

  it('increments the count', () => {
    useCounterStore.getState().increment()
    expect(useCounterStore.getState().count).toBe(1)
  })

  it('decrements the count', () => {
    useCounterStore.getState().increment()
    useCounterStore.getState().decrement()
    expect(useCounterStore.getState().count).toBe(0)
  })
})
