export type BuilderTool = 'ai' | 'template' | 'typography' | 'typesetting' | 'height-debug'
export type ActiveBuilderTool = BuilderTool | null

export type StyleTool = Exclude<BuilderTool, 'ai' | 'height-debug'>

export const BUILDER_TOOL_META: Record<
  BuilderTool,
  {
    title: string
  }
> = {
  ai: {
    title: 'AI对话',
  },
  template: {
    title: '简历样式',
  },
  typography: {
    title: '文本设置',
  },
  typesetting: {
    title: '排版参数',
  },
  'height-debug': {
    title: 'Height Debug',
  },
}
