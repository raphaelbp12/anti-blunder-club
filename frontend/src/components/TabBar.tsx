interface Tab {
  key: string
  label: string
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (key: string) => void
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div
      role="tablist"
      className="flex w-full max-w-2xl gap-1 overflow-x-auto border-b border-border"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              if (!isActive) onTabChange(tab.key)
            }}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'border-b-2 border-accent text-accent'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
