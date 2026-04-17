import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { FilterChips } from '../FilterChips'

const options = [
  { label: 'All', value: 'all' },
  { label: 'Bullet', value: 'bullet' },
  { label: 'Blitz', value: 'blitz' },
  { label: 'Rapid', value: 'rapid' },
]

describe('FilterChips', () => {
  it('renders all options as buttons', () => {
    render(
      <FilterChips options={options} activeValue="all" onChange={vi.fn()} />,
    )

    for (const opt of options) {
      expect(
        screen.getByRole('button', { name: opt.label }),
      ).toBeInTheDocument()
    }
  })

  it('applies active styling to the selected option', () => {
    render(
      <FilterChips options={options} activeValue="blitz" onChange={vi.fn()} />,
    )

    const blitzButton = screen.getByRole('button', { name: 'Blitz' })
    expect(blitzButton.className).toContain('bg-accent')

    const allButton = screen.getByRole('button', { name: 'All' })
    expect(allButton.className).not.toContain('bg-accent')
  })

  it('calls onChange with the value when a chip is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <FilterChips options={options} activeValue="all" onChange={onChange} />,
    )

    await user.click(screen.getByRole('button', { name: 'Rapid' }))
    expect(onChange).toHaveBeenCalledWith('rapid')
  })

  it('does not call onChange when the active chip is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <FilterChips options={options} activeValue="blitz" onChange={onChange} />,
    )

    await user.click(screen.getByRole('button', { name: 'Blitz' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
