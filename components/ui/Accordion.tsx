'use client'

import { useState, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionItem {
  id: string
  title: string
  content: ReactNode
}

interface AccordionProps {
  items: AccordionItem[]
  className?: string
}

export function Accordion({ items, className = '' }: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>([])

  const toggle = (id: string) => {
    setOpenIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  return (
    <div className={`border border-border rounded-sm divide-y divide-border ${className}`}>
      {items.map(item => (
        <div key={item.id} className="p-4">
          <button
            className="flex items-center justify-between w-full text-left text-sm font-medium text-foreground"
            onClick={() => toggle(item.id)}
          >
            <span>{item.title}</span>
            <ChevronDown
              className={`size-4 transition-transform ${
                openIds.includes(item.id) ? 'rotate-180' : ''
              }`}
            />
          </button>
          {openIds.includes(item.id) && (
            <div className="text-sm text-muted-foreground mt-3 animate-slide-down">
              {item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
