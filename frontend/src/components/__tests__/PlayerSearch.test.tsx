import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlayerSearch } from '../PlayerSearch'

describe('PlayerSearch', () => {
  it('renders an input and a search button', () => {
    render(<PlayerSearch onSearch={vi.fn()} isLoading={false} />)
    expect(
      screen.getByRole('textbox', { name: /username/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('calls onSearch with the username on submit', async () => {
    const onSearch = vi.fn()
    const user = userEvent.setup()
    render(<PlayerSearch onSearch={onSearch} isLoading={false} />)

    await user.type(
      screen.getByRole('textbox', { name: /username/i }),
      'hikaru',
    )
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(onSearch).toHaveBeenCalledWith('hikaru')
  })

  it('does not call onSearch when the input is empty', async () => {
    const onSearch = vi.fn()
    const user = userEvent.setup()
    render(<PlayerSearch onSearch={onSearch} isLoading={false} />)

    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(onSearch).not.toHaveBeenCalled()
  })

  it('disables the button while loading', () => {
    render(<PlayerSearch onSearch={vi.fn()} isLoading={true} />)
    expect(screen.getByRole('button', { name: /searching/i })).toBeDisabled()
  })
})
