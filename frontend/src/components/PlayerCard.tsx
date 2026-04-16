interface PlayerCardProps {
  username: string
  avatarUrl?: string
  highestRating: number | null
  onDelete: (username: string) => void
  onClick: (username: string) => void
}

export function PlayerCard({
  username,
  avatarUrl,
  highestRating,
  onDelete,
  onClick,
}: PlayerCardProps) {
  return (
    <div
      role="article"
      className="relative flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:bg-surface-alt"
      onClick={() => onClick(username)}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${username}'s avatar`}
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-alt text-sm font-bold text-secondary">
          {username.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-primary">{username}</p>
        <p className="text-sm text-secondary">
          {highestRating !== null ? highestRating : 'No rating'}
        </p>
      </div>

      <button
        type="button"
        aria-label={`Remove ${username}`}
        className="text-muted hover:text-danger"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(username)
        }}
      >
        ✕
      </button>
    </div>
  )
}
