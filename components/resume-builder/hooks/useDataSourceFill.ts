'use client'

import { useCallback } from 'react'
import { Message } from '@/components/resume-builder/primitives'

type FillStrategy = 'overwrite' | 'preserve'

interface UseDataSourceFillOptions {
  ensureAuthForAction: () => Promise<boolean>
  selectedDataSourceId: string
  applyDataSource: (strategy: FillStrategy, sourceId: string) => void
}

export function useDataSourceFill({
  ensureAuthForAction,
  selectedDataSourceId,
  applyDataSource,
}: UseDataSourceFillOptions) {
  const handleFill = useCallback(
    async (strategy: FillStrategy) => {
      if (!(await ensureAuthForAction())) {
        return
      }

      if (!selectedDataSourceId) {
        Message.warning('请先选择数据源')
        return
      }

      applyDataSource(strategy, selectedDataSourceId)
      Message.success(
        strategy === 'overwrite'
          ? '已按数据源覆盖当前简历文案'
          : '已按数据源补全当前简历空白内容',
      )
    },
    [applyDataSource, ensureAuthForAction, selectedDataSourceId],
  )

  return {
    handleFill,
  }
}
