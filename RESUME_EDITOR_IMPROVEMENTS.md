# 简历编辑器改进说明

## 改进内容

### 1. 表单模式真实字段编辑 ✅

**功能**：
- 每个模块可展开/折叠编辑
- 支持拖拽排序
- 支持以下内置模块：
  - 基本信息：姓名、邮箱、电话、所在地、年龄、性别、工作年限
  - 求职意向：岗位、城市、薪资、到岗时间
  - 个人简介：多行文本
  - 教育经历：学校、专业、学历、时间、描述（数组）
  - 工作经历：公司、职位、时间、工作内容（数组）
  - 项目经历：项目名、角色、时间、描述（数组）
  - 技能：逗号分隔的技能列表

**自定义板块**：
- 点击"添加自定义板块"按钮
- 输入板块名称（如：获奖经历、志愿活动）
- 自定义板块支持多行文本内容
- 可删除自定义板块

### 2. 四种模板 HTML/CSS 渲染 ✅

**模板列表**：
1. **Classic（经典简约）**：左侧栏 + 主内容区，蓝色主题
2. **Modern（现代专业）**：单栏布局，蓝色强调，技能标签
3. **Tech（技术极客）**：深色侧边栏，代码风格，适合技术岗
4. **Creative（创意设计）**：波浪头部，渐变色，适合创意行业

**文件位置**：
- `website/components/ClassicResumeTemplate.tsx`
- `website/components/ModernResumeTemplate.tsx`
- `website/components/TechResumeTemplate.tsx`
- `website/components/CreativeResumeTemplate.tsx`

### 3. 头像上传功能 ✅

**上传接口**：`POST /api/upload/avatar`

**支持格式**：JPG、PNG、WEBP

**文件限制**：最大 5MB

**存储位置**：`public/uploads/avatars/`

**使用方式**：
- 在编辑器预览工具栏点击"照片"上传按钮
- 选择图片文件
- 上传成功后自动显示在简历预览中

### 4. 编辑模式说明 ✅

**设计决策**：
- Markdown 模式：自由编辑，适合有 Markdown 经验的用户
- 表单模式：结构化输入，可关联数据源，字段规范

**模式选择**：
- 仅在创建简历时选择
- 编辑时不可切换（因为两种模式数据结构不同）
- 顶部显示当前模式标签

### 5. 工具栏优化 ✅

**改进点**：
- 居中对齐布局
- 使用分隔线分组功能
- 功能分组：照片 | 字号/行高/字体 | 缩放 | 压缩

**工具栏功能**：
- 照片上传
- 字号调整（10-20px）
- 行高调整（1.0-2.0）
- 字体选择（系统/宋体/Times/Arial）
- 缩放（50%-150%）
- 智能压缩

### 6. 画布留白优化 ✅

**改进点**：
- A4 页面移除内边距
- 简历内容由模板自身控制边距
- 打印时自动适配

**尺寸**：
- 标准 A4：210mm × 297mm
- 缩放范围：50%-150%

## 技术实现

### 数据结构

```typescript
interface ResumeContent {
  markdownText: string
  styles: {
    fontSize: number
    lineHeight: number
    fontFamily: string
    photoUrl?: string
  }
  moduleOrder: string[]
  formData: Record<string, unknown>
  customModules?: FormModule[]
}

interface FormModule {
  id: string
  label: string
  fields: FormField[]
}
```

### 关键组件

- `FormModuleEditor`：可展开/折叠的表单模块编辑器
- `renderTemplatePreview()`：根据模板 ID 渲染对应组件
- `buildResumeData()`：将表单数据转换为模板数据格式

## 使用流程

1. **创建简历**：选择模板 → 选择编辑模式（Markdown/表单）
2. **编辑内容**：
   - 表单模式：展开模块 → 填写字段 → 添加数组项 → 添加自定义板块
   - Markdown 模式：直接编辑 Markdown 文本
3. **上传头像**：点击工具栏"照片"按钮 → 选择图片
4. **调整样式**：字号、行高、字体、缩放
5. **保存导出**：保存 → 导出 PDF/Markdown

## 注意事项

1. 头像上传需要服务器写入权限，首次使用会自动创建 `public/uploads/avatars/` 目录
2. 表单模式和 Markdown 模式数据结构不同，不建议切换
3. 自定义板块会按添加顺序显示在简历中
4. 打印 PDF 时建议使用 Chrome 浏览器的打印功能
