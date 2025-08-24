import React, { useState } from 'react'
import { RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri'

interface ThinkingBlockProps {
  children: React.ReactNode
}

const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="cdx-my-2 cdx-border cdx-border-neutral-300 dark:cdx-border-neutral-600 cdx-rounded-md cdx-overflow-hidden">
      <button
        onClick={toggleExpanded}
        className="cdx-w-full cdx-flex cdx-items-center cdx-gap-2 cdx-px-3 cdx-py-2 cdx-bg-neutral-100 dark:cdx-bg-neutral-800 cdx-text-left cdx-text-sm cdx-font-medium cdx-text-neutral-700 dark:cdx-text-neutral-300 hover:cdx-bg-neutral-200 dark:hover:cdx-bg-neutral-700 cdx-transition-colors"
      >
        {isExpanded ? (
          <RiArrowDownSLine className="cdx-flex-shrink-0" size={16} />
        ) : (
          <RiArrowRightSLine className="cdx-flex-shrink-0" size={16} />
        )}
        <span className="cdx-text-xs cdx-text-neutral-500 dark:cdx-text-neutral-400">
          Thinking
        </span>
        {!isExpanded && (
          <span className="cdx-text-xs cdx-text-neutral-400 dark:cdx-text-neutral-500">
            (click to expand)
          </span>
        )}
      </button>
      {isExpanded && (
        <div className="cdx-p-3 cdx-bg-white dark:cdx-bg-neutral-900 cdx-text-sm cdx-text-neutral-700 dark:cdx-text-neutral-300 cdx-whitespace-pre-wrap">
          {children}
        </div>
      )}
    </div>
  )
}

export default ThinkingBlock
