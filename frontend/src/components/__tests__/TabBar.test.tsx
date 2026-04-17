import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { TabBar } from '../TabBar'

const tabs = [
  { key: 'games', label: 'Games' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'openings', label: 'Openings' },
]

describe('TabBar', () => {
  it('renders all tabs as buttons', () => {
    render(<TabBar tabs={tabs} activeTab="games" onTabChange={vi.fn()} />)

    for (const tab of tabs) {
      expect(screen.getByRole('tab', { name: tab.label })).toBeInTheDocument()
    }
  })

  it('marks the active tab with aria-selected', () => {
    render(<TabBar tabs={tabs} activeTab="accuracy" onTabChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: 'Accuracy' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Games' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('calls onTabChange with the tab key when clicked', async () => {
    const onTabChange = vi.fn()
    const user = userEvent.setup()

    render(<TabBar tabs={tabs} activeTab="games" onTabChange={onTabChange} />)

    await user.click(screen.getByRole('tab', { name: 'Openings' }))
    expect(onTabChange).toHaveBeenCalledWith('openings')
  })

  it('does not call onTabChange when the active tab is clicked', async () => {
    const onTabChange = vi.fn()
    const user = userEvent.setup()

    render(<TabBar tabs={tabs} activeTab="games" onTabChange={onTabChange} />)

    await user.click(screen.getByRole('tab', { name: 'Games' }))
    expect(onTabChange).not.toHaveBeenCalled()
  })

  it('renders a tablist role on the container', () => {
    render(<TabBar tabs={tabs} activeTab="games" onTabChange={vi.fn()} />)

    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })
})
