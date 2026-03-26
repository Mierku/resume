# 照片上传和裁剪功能说明

## 功能特性

### ✅ 已实现

1. **自定义上传框**
   - 支持点击上传
   - 支持拖拽文件到上传区域
   - 支持 JPG、PNG、WEBP 格式
   - 不使用第三方 Upload 组件，完全自定义实现

2. **照片预览**
   - 上传后在左侧表单显示照片预览
   - 预览尺寸为一寸照片比例（295×413 像素）
   - Hover 显示上传图标，可重新上传

3. **图片裁剪（使用 react-image-crop）**
   - 自动弹出裁剪弹窗
   - 固定一寸照片比例（295×413）
   - **✅ 底图固定不动**
   - **✅ 裁剪框可按比例各方向伸缩**
   - **✅ 裁剪框有边界，不能超过图片之外**
   - 自动显示网格线

4. **简历预览**
   - 裁剪后的照片自动显示在简历模板中
   - 保持一寸照片比例，不拉伸变形
   - 所有模板（Classic、Modern、Tech、Creative）都支持照片显示

## 最新更新（2026-02-03）

### 使用 react-image-crop 库 ✅

**为什么使用 react-image-crop**：
- 轻量级的裁剪库（无额外依赖）
- 完美支持裁剪框移动和缩放
- 图片固定不动
- 裁剪框自动限制在图片范围内
- 支持固定宽高比
- 精确的像素坐标计算
- React 友好的 API

**核心功能**：
1. **底图固定不动**
   - 图片不可拖拽移动
   - 图片不可缩放
   - 只能操作裁剪框

2. **裁剪框可按比例各方向伸缩**
   - `aspect={ASPECT_RATIO}` - 固定比例 295:413
   - 可以拖拽裁剪框移动
   - 可以从边角拖拽调整大小
   - 自动保持宽高比

3. **裁剪框有边界限制**
   - 裁剪框自动限制在图片范围内
   - 不能超出图片边界

### 上传框比例调整 ✅
- 上传框现在使用一寸照片的宽高比（295:413）
- 固定尺寸：118px × 165px（保持 295:413 比例）
- 使用 `object-contain` 显示已上传的照片，不会拉伸变形
- 裁剪出来是什么样就显示什么样，完全保真

### React 19 兼容性警告
控制台若出现 `element.ref` 警告，通常是第三方组件与 React 19 的兼容性问题：
- 不影响功能正常使用
- 需要等待对应第三方组件库更新
- 可以暂时忽略此警告

## 组件位置

### PhotoUploadCrop 组件
**文件**: `website/components/PhotoUploadCrop.tsx`

**Props**:
```typescript
interface PhotoUploadCropProps {
  value?: string          // 当前照片 URL
  onChange?: (url: string) => void  // 照片变化回调
}
```

**使用示例**:
```tsx
<PhotoUploadCrop
  value={styles.photoUrl}
  onChange={url => setStyles(prev => ({ ...prev, photoUrl: url }))}
/>
```

## 技术实现

### 1. 上传流程
```
用户选择文件 → 读取为 Base64 → 显示裁剪弹窗 → 用户调整裁剪框 → 
生成裁剪后的 Blob → 上传到服务器 → 返回 URL → 更新状态
```

### 2. 裁剪实现
- 使用 **react-image-crop** 库
- 固定输出尺寸：295×413 像素（一寸照片标准）
- 图片固定不动（默认行为）
- 裁剪框可以拖拽移动
- 裁剪框可以从边角按比例缩放
- 裁剪框自动限制在图片范围内
- 固定裁剪框比例为 295:413
- 输出格式：JPEG，质量 95%

### 3. react-image-crop 优势
- 轻量级，无额外依赖
- 完美支持裁剪框移动和缩放
- 图片固定不动
- 自动处理边界检测
- 支持固定宽高比
- 精确的像素坐标计算
- React 友好的 API
- 高质量的图片输出

### 4. 核心代码

```typescript
// ReactCrop 组件
<ReactCrop
  crop={crop}
  onChange={(c) => setCrop(c)}
  onComplete={(c) => setCompletedCrop(c)}
  aspect={ASPECT_RATIO}        // 固定比例 295:413
  minWidth={50}                // 最小宽度
  minHeight={50}               // 最小高度
>
  <img
    ref={imgRef}
    src={imageSrc}
    alt="Crop"
    style={{ maxHeight: 500, maxWidth: '100%' }}
    onLoad={onImageLoad}
  />
</ReactCrop>
```

```typescript
// 图片加载完成，初始化裁剪框
const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const { width, height } = e.currentTarget
  
  // 计算初始裁剪框，占图片的80%
  let cropWidth, cropHeight
  
  if (width / height > ASPECT_RATIO) {
    cropHeight = height * 0.8
    cropWidth = cropHeight * ASPECT_RATIO
  } else {
    cropWidth = width * 0.8
    cropHeight = cropWidth / ASPECT_RATIO
  }
  
  const x = (width - cropWidth) / 2
  const y = (height - cropHeight) / 2
  
  setCrop({ unit: 'px', x, y, width: cropWidth, height: cropHeight })
}
```

```typescript
// 生成裁剪后的图片
const getCroppedImg = async (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
  const canvas = document.createElement('canvas')
  canvas.width = 295
  canvas.height = 413
  const ctx = canvas.getContext('2d')

  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0, 0, 295, 413
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas is empty'))
    }, 'image/jpeg', 0.95)
  })
}
```

## 一寸照片规格

- **尺寸**: 295×413 像素
- **比例**: 约 1:1.4 (295:413)
- **用途**: 标准证件照尺寸
- **文件大小**: 通常 < 100KB

## 使用说明

### 在编辑器中使用

1. 打开简历编辑器
2. 在左侧表单顶部找到"照片"上传区域
3. 点击或拖拽上传照片
4. 在弹出的裁剪窗口中：
   - 拖拽裁剪框中心移动位置
   - 拖拽裁剪框边角按比例调整大小
   - 裁剪框自动保持一寸照片比例（295:413）
   - 裁剪框不能超出图片范围
   - 图片固定不动
5. 点击"确定"完成裁剪和上传
6. 照片自动显示在右侧简历预览中

### 在模板中显示

所有简历模板都已支持照片显示：

**Classic 模板**:
```tsx
{data.photoUrl && (
  <img src={data.photoUrl} alt="头像" className="avatar-img" />
)}
```

**其他模板**: 类似实现，使用 `photoUrl` 属性

## 注意事项

1. **文件大小限制**: 最大 5MB（在组件中配置）
2. **格式限制**: 仅支持 JPG、PNG、WEBP
3. **存储位置**: `public/uploads/avatars/`
4. **文件命名**: `{userId}-{timestamp}.{ext}`
5. **裁剪质量**: JPEG 质量设置为 95%，平衡质量和文件大小

## 测试建议

1. 测试不同尺寸的图片（横图、竖图、正方形）
2. 测试不同比例的图片（16:9、4:3、1:1 等）
3. 验证裁剪框是否能正确限制在图片范围内
4. 验证图片是否固定不动
5. 验证裁剪框是否可以移动和缩放
6. 验证裁剪输出是否与预览一致
7. 验证上传后的图片是否正确显示在简历模板中

## 依赖

```json
{
  "react-image-crop": "^11.0.7"
}
```

## 相关文件

- `website/components/PhotoUploadCrop.tsx` - 照片上传裁剪组件
- `website/app/api/upload/avatar/route.ts` - 上传 API
- `website/app/(main)/resume/editor/[resumeId]/page.tsx` - 编辑器集成
- `website/components/ClassicResumeTemplate.tsx` - 模板照片显示
- `website/components/ModernResumeTemplate.tsx` - 模板照片显示
- `website/components/TechResumeTemplate.tsx` - 模板照片显示
- `website/components/CreativeResumeTemplate.tsx` - 模板照片显示
