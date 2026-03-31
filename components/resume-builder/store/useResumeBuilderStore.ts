'use client'

import { useSyncExternalStore } from 'react'
import {
  applyDataSourceToResume,
  type FillStrategy,
  type ResumeDataSource,
} from '@/lib/resume/mappers'
import {
  createDefaultResumeData,
  type CustomSection,
  type CustomSectionType,
  type ResumeData,
  type StandardSectionType,
} from '@/lib/resume/types'
import { getTemplateDefaultPrimaryColor } from '@/lib/constants'

interface SaveState {
  status: 'idle' | 'saving' | 'saved' | 'error'
  error?: string
  lastSavedAt?: number
}

interface BuilderState {
  resumeId: string
  data: ResumeData
  initialized: boolean
  dirty: boolean
  selectedDataSourceId: string
  dataSources: ResumeDataSource[]
  save: SaveState
}

interface BuilderActions {
  initialize: (payload: {
    resumeId: string
    data: ResumeData
    dataSources: ResumeDataSource[]
    selectedDataSourceId?: string
  }) => void
  updateResumeData: (fn: (draft: ResumeData) => void) => void
  setSelectedDataSourceId: (id: string) => void
  applyDataSource: (strategy?: FillStrategy, dataSourceId?: string) => void
  setTemplate: (templateId: ResumeData['metadata']['template']) => void
  setSidebarWidth: (value: number) => void
  setPageFullWidth: (pageIndex: number, fullWidth: boolean) => void
  addPage: () => void
  removePage: (pageIndex: number) => void
  setPageSections: (pageIndex: number, column: 'main' | 'sidebar', sectionIds: string[]) => void
  addStandardSectionItem: (sectionId: StandardSectionType) => void
  updateStandardSectionItem: (sectionId: StandardSectionType, index: number, patch: Record<string, unknown>) => void
  removeStandardSectionItem: (sectionId: StandardSectionType, index: number) => void
  addCustomSection: (type?: CustomSectionType) => void
  updateCustomSection: (sectionId: string, patch: Partial<CustomSection>) => void
  removeCustomSection: (sectionId: string) => void
  addCustomSectionItem: (sectionId: string) => void
  updateCustomSectionItem: (sectionId: string, index: number, patch: Record<string, unknown>) => void
  removeCustomSectionItem: (sectionId: string, index: number) => void
  saveNow: () => Promise<void>
  scheduleSave: () => void
  undo: () => void
  redo: () => void
}

type BuilderStore = BuilderState & BuilderActions

type StoreContainer = {
  state: BuilderStore
  listeners: Set<() => void>
  history: {
    past: ResumeData[]
    future: ResumeData[]
  }
}

let saveController: AbortController | null = null

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function cloneData(data: ResumeData): ResumeData {
  return structuredClone(data)
}

function dedupeSectionIds(sectionIds: string[]) {
  return Array.from(new Set(sectionIds.filter(Boolean)))
}

function collectAvailableSectionIds(data: ResumeData) {
  const standard = ['summary', ...Object.keys(data.sections)]
  const custom = data.customSections.map(section => section.id)
  return new Set([...standard, ...custom])
}

function buildSectionOrder(data: ResumeData) {
  return ['summary', ...Object.keys(data.sections), ...data.customSections.map(section => section.id)]
}

function normalizeDataForSingleColumnLayout(input: ResumeData): ResumeData {
  const data = cloneData(input)
  const available = collectAvailableSectionIds(data)
  const canonicalOrder = buildSectionOrder(data)

  if (!Array.isArray(data.metadata.layout.pages) || data.metadata.layout.pages.length === 0) {
    data.metadata.layout.pages = [
      {
        fullWidth: true,
        main: canonicalOrder,
        sidebar: [],
      },
    ]
    return data
  }

  data.metadata.layout.pages = data.metadata.layout.pages.map((page, index) => {
    const merged = dedupeSectionIds([...(page.main || []), ...(page.sidebar || [])]).filter(id => available.has(id))
    const missing = index === 0 ? canonicalOrder.filter(id => !merged.includes(id)) : []
    return {
      ...page,
      fullWidth: true,
      main: [...merged, ...missing],
      sidebar: [],
    }
  })

  return data
}

function createSectionItem(sectionId: StandardSectionType): Record<string, unknown> {
  const base = {
    id: createId(),
    hidden: false,
  }

  switch (sectionId) {
    case 'profiles':
      return { ...base, icon: '', network: '', username: '', website: { url: '', label: '' } }
    case 'experience':
      return {
        ...base,
        company: '',
        position: '',
        location: '',
        period: '',
        website: { url: '', label: '' },
        description: '',
      }
    case 'education':
      return {
        ...base,
        school: '',
        degree: '',
        area: '',
        grade: '',
        location: '',
        period: '',
        website: { url: '', label: '' },
        description: '',
      }
    case 'projects':
      return {
        ...base,
        name: '',
        period: '',
        website: { url: '', label: '' },
        description: '',
      }
    case 'skills':
      return { ...base, icon: 'code', name: '', proficiency: '', level: 0, keywords: [] }
    case 'languages':
      return { ...base, language: '', fluency: '', level: 0 }
    case 'interests':
      return { ...base, icon: '', name: '', keywords: [] }
    case 'awards':
      return { ...base, title: '', awarder: '', date: '', website: { url: '', label: '' }, description: '' }
    case 'certifications':
      return { ...base, title: '', issuer: '', date: '', website: { url: '', label: '' }, description: '' }
    case 'publications':
      return { ...base, title: '', publisher: '', date: '', website: { url: '', label: '' }, description: '' }
    case 'volunteer':
      return {
        ...base,
        organization: '',
        location: '',
        period: '',
        website: { url: '', label: '' },
        description: '',
      }
    case 'references':
      return {
        ...base,
        name: '',
        position: '',
        website: { url: '', label: '' },
        phone: '',
        description: '',
      }
    default:
      return base
  }
}

function buildPatchPayload(data: ResumeData) {
  return {
    mode: 'form',
    templateId: data.metadata.template,
    content: {
      version: 2,
      builder: 'reactive-core',
      data,
      migratedAt: new Date().toISOString(),
    },
  }
}

const store: StoreContainer = {
  listeners: new Set(),
  history: {
    past: [],
    future: [],
  },
  state: undefined as unknown as BuilderStore,
}

function emitChange() {
  store.listeners.forEach(listener => listener())
}

function setState(mutator: (state: BuilderStore) => void, options?: { trackHistory?: boolean }) {
  const shouldTrackHistory = options?.trackHistory !== false

  if (shouldTrackHistory) {
    store.history.past.push(cloneData(store.state.data))
    if (store.history.past.length > 100) {
      store.history.past.shift()
    }
    store.history.future = []
  }

  const nextState: BuilderStore = {
    ...store.state,
    data: cloneData(store.state.data),
    dataSources: [...store.state.dataSources],
    save: { ...store.state.save },
  }

  mutator(nextState)
  store.state = nextState
  emitChange()
}

function getState() {
  return store.state
}

function subscribe(listener: () => void) {
  store.listeners.add(listener)
  return () => {
    store.listeners.delete(listener)
  }
}

async function saveNowInternal() {
  const state = getState()
  if (!state.initialized || !state.resumeId || !state.dirty) {
    return
  }

  if (saveController) {
    saveController.abort()
  }

  saveController = new AbortController()

  setState(draft => {
    draft.save = { status: 'saving' }
  }, { trackHistory: false })

  try {
    const response = await fetch(`/api/resumes/${state.resumeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...buildPatchPayload(state.data),
        dataSourceId: state.selectedDataSourceId || null,
      }),
      signal: saveController.signal,
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: '保存失败' }))
      throw new Error(payload.error || '保存失败')
    }

    setState(draft => {
      draft.dirty = false
      draft.save = {
        status: 'saved',
        lastSavedAt: Date.now(),
      }
    }, { trackHistory: false })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return
    }

    setState(draft => {
      draft.save = {
        status: 'error',
        error: error instanceof Error ? error.message : '保存失败',
      }
    }, { trackHistory: false })
  }
}

const actions: BuilderActions = {
  initialize: payload => {
    setState(draft => {
      draft.resumeId = payload.resumeId
      draft.data = normalizeDataForSingleColumnLayout(payload.data)
      draft.initialized = true
      draft.dirty = false
      draft.dataSources = [...payload.dataSources]
      draft.selectedDataSourceId = payload.selectedDataSourceId || ''
      draft.save = { status: 'idle' }
    }, { trackHistory: false })

    store.history.past = []
    store.history.future = []
  },

  updateResumeData: fn => {
    setState(draft => {
      fn(draft.data)
      draft.dirty = true
      if (draft.save.status === 'saved') {
        draft.save.status = 'idle'
      }
    })
  },

  setSelectedDataSourceId: id => {
    setState(draft => {
      draft.selectedDataSourceId = id
    }, { trackHistory: false })
  },

  applyDataSource: (strategy = 'overwrite', dataSourceId) => {
    const state = getState()
    const targetId = dataSourceId || state.selectedDataSourceId
    if (!targetId) return

    const dataSource = state.dataSources.find(source => source.id === targetId)
    if (!dataSource) return

    setState(draft => {
      draft.data = applyDataSourceToResume(draft.data, dataSource, strategy)
      draft.selectedDataSourceId = targetId
      draft.dirty = true
      if (draft.save.status === 'saved') {
        draft.save.status = 'idle'
      }
    })
  },

  setTemplate: templateId => {
    setState(draft => {
      draft.data.metadata.template = templateId
      draft.data.metadata.design.colors.primary = getTemplateDefaultPrimaryColor(templateId)
      draft.dirty = true
    })
  },

  setSidebarWidth: value => {
    setState(draft => {
      draft.data.metadata.layout.sidebarWidth = Math.max(10, Math.min(50, value))
      draft.dirty = true
    })
  },

  setPageFullWidth: (pageIndex, fullWidth) => {
    setState(draft => {
      const page = draft.data.metadata.layout.pages[pageIndex]
      if (!page) return
      page.fullWidth = fullWidth
      page.main = dedupeSectionIds([...page.main, ...page.sidebar])
      page.sidebar = []

      draft.dirty = true
    })
  },

  addPage: () => {
    setState(draft => {
      draft.data.metadata.layout.pages.push({
        fullWidth: true,
        main: [],
        sidebar: [],
      })
      draft.dirty = true
    })
  },

  removePage: pageIndex => {
    setState(draft => {
      if (draft.data.metadata.layout.pages.length <= 1) return

      const [removed] = draft.data.metadata.layout.pages.splice(pageIndex, 1)
      if (!removed) return

      const firstPage = draft.data.metadata.layout.pages[0]
      firstPage.main.push(...removed.main)
      firstPage.main = dedupeSectionIds(firstPage.main)
      firstPage.sidebar = []
      draft.dirty = true
    })
  },

  setPageSections: (pageIndex, column, sectionIds) => {
    setState(draft => {
      const page = draft.data.metadata.layout.pages[pageIndex]
      if (!page) return

      const availableSectionIds = collectAvailableSectionIds(draft.data)
      const nextIds = dedupeSectionIds(sectionIds).filter(id => availableSectionIds.has(id))

      if (column === 'main') {
        page.main = nextIds
      } else {
        page.main = dedupeSectionIds([...page.main, ...nextIds])
      }
      page.sidebar = []

      draft.dirty = true
    })
  },

  addStandardSectionItem: sectionId => {
    setState(draft => {
      draft.data.sections[sectionId].items.push(createSectionItem(sectionId) as never)
      draft.dirty = true
    })
  },

  updateStandardSectionItem: (sectionId, index, patch) => {
    setState(draft => {
      const section = draft.data.sections[sectionId]
      if (!section?.items[index]) return
      section.items[index] = {
        ...section.items[index],
        ...patch,
      } as never
      draft.dirty = true
    })
  },

  removeStandardSectionItem: (sectionId, index) => {
    setState(draft => {
      const section = draft.data.sections[sectionId]
      if (!section?.items[index]) return
      section.items.splice(index, 1)
      draft.dirty = true
    })
  },

  addCustomSection: (type = 'summary') => {
    setState(draft => {
      const sectionId = createId()
      const section: CustomSection = {
        id: sectionId,
        type,
        title: '自定义板块',
        columns: 1,
        hidden: false,
        items:
          type === 'cover-letter'
            ? [
                {
                  id: createId(),
                  hidden: false,
                  recipient: '',
                  content: '',
                },
              ]
            : [
                {
                  id: createId(),
                  hidden: false,
                  content: '',
                },
              ],
      }

      draft.data.customSections.push(section)
      draft.data.metadata.layout.pages[0].main = dedupeSectionIds([
        ...draft.data.metadata.layout.pages[0].main,
        sectionId,
      ])
      draft.dirty = true
    })
  },

  updateCustomSection: (sectionId, patch) => {
    setState(draft => {
      const section = draft.data.customSections.find(item => item.id === sectionId)
      if (!section) return
      Object.assign(section, patch)
      draft.dirty = true
    })
  },

  removeCustomSection: sectionId => {
    setState(draft => {
      draft.data.customSections = draft.data.customSections.filter(item => item.id !== sectionId)
      draft.data.metadata.layout.pages = draft.data.metadata.layout.pages.map(page => ({
        ...page,
        main: page.main.filter(item => item !== sectionId),
        sidebar: [],
      }))
      draft.dirty = true
    })
  },

  addCustomSectionItem: sectionId => {
    setState(draft => {
      const section = draft.data.customSections.find(item => item.id === sectionId)
      if (!section) return

      const nextItem =
        section.type === 'cover-letter'
          ? {
              id: createId(),
              hidden: false,
              recipient: '',
              content: '',
            }
          : {
              id: createId(),
              hidden: false,
              content: '',
            }

      section.items.push(nextItem as never)
      draft.dirty = true
    })
  },

  updateCustomSectionItem: (sectionId, index, patch) => {
    setState(draft => {
      const section = draft.data.customSections.find(item => item.id === sectionId)
      if (!section?.items[index]) return
      section.items[index] = {
        ...section.items[index],
        ...patch,
      } as never
      draft.dirty = true
    })
  },

  removeCustomSectionItem: (sectionId, index) => {
    setState(draft => {
      const section = draft.data.customSections.find(item => item.id === sectionId)
      if (!section?.items[index]) return
      section.items.splice(index, 1)
      draft.dirty = true
    })
  },

  saveNow: async () => {
    await saveNowInternal()
  },

  scheduleSave: () => {
    // 已切换为手动保存，不再自动触发网络请求。
  },

  undo: () => {
    const previous = store.history.past.pop()
    if (!previous) return

    store.history.future.push(cloneData(store.state.data))
    setState(draft => {
      draft.data = previous
      draft.dirty = true
      if (draft.save.status === 'saved') {
        draft.save.status = 'idle'
      }
    }, { trackHistory: false })
  },

  redo: () => {
    const next = store.history.future.pop()
    if (!next) return

    store.history.past.push(cloneData(store.state.data))
    setState(draft => {
      draft.data = next
      draft.dirty = true
      if (draft.save.status === 'saved') {
        draft.save.status = 'idle'
      }
    }, { trackHistory: false })
  },
}

store.state = {
  resumeId: '',
  data: createDefaultResumeData(),
  initialized: false,
  dirty: false,
  selectedDataSourceId: '',
  dataSources: [],
  save: { status: 'idle' },
  ...actions,
}

export function useResumeBuilderStore<T>(selector: (state: BuilderStore) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getState()), () => selector(getState()))
}

useResumeBuilderStore.getState = getState
