import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlayerCard } from '../PlayerCard'

const defaultProps = {
  username: 'hikaru',
  avatarUrl: 'https://example.com/avatar.png',
  highestRating: 3200 as number | null,
  onDelete: vi.fn(),
  onClick: vi.fn(),
}

describe('PlayerCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the username', () => {
    render(<PlayerCard {...defaultProps} />)
    expect(screen.getByText('hikaru')).toBeInTheDocument()
  })

  it('renders the highest rating', () => {
    render(<PlayerCard {...defaultProps} />)
    expect(screen.getByText('3200')).toBeInTheDocument()
  })

  it('renders the avatar image when avatarUrl is provided', () => {
    render(<PlayerCard {...defaultProps} />)
    const img = screen.getByRole('img', { name: /hikaru/i })
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png')
  })

  it('renders a fallback when avatarUrl is undefined', () => {
    render(<PlayerCard {...defaultProps} avatarUrl={undefined} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('H')).toBeInTheDocument()
  })

  it('shows "No rating" when highestRating is null', () => {
    render(<PlayerCard {...defaultProps} highestRating={null} />)
    expect(screen.getByText('No rating')).toBeInTheDocument()
  })

  it('calls onDelete with the username when delete button is clicked', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<PlayerCard {...defaultProps} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: /remove hikaru/i }))

    expect(onDelete).toHaveBeenCalledWith('hikaru')
  })

  it('calls onClick with the username when the card is clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<PlayerCard {...defaultProps} onClick={onClick} />)

    await user.click(screen.getByText('hikaru'))

    expect(onClick).toHaveBeenCalledWith('hikaru')
  })

  it('does not call onClick when the delete button is clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const onDelete = vi.fn()
    render(
      <PlayerCard {...defaultProps} onClick={onClick} onDelete={onDelete} />,
    )

    await user.click(screen.getByRole('button', { name: /remove hikaru/i }))

    expect(onDelete).toHaveBeenCalled()
    expect(onClick).not.toHaveBeenCalled()
  })
})
