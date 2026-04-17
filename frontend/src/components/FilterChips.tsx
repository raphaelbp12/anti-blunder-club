interface FilterOption {
  label: string
  value: string
}

interface FilterChipsProps {
  options: FilterOption[]
  activeValue: string
  onChange: (value: string) => void
}

export function FilterChips({
  options,
  activeValue,
  onChange,
}: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto" role="group">
      {options.map((option) => {
        const isActive = option.value === activeValue
        return (
          <button
            key={option.value}
            onClick={() => {
              if (!isActive) onChange(option.value)
            }}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-accent border-accent text-white'
                : 'border-border text-secondary hover:border-accent hover:text-accent'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
