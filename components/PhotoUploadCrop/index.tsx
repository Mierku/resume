'use client'

import { useState, useRef } from 'react'
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import { Modal, Message } from '@/components/ui/radix-adapter'
import { IconUpload } from '@/components/ui/radix-icons'
import 'react-image-crop/dist/ReactCrop.css'

interface PhotoUploadCropProps {
  value?: string
  onChange?: (url: string) => void
}

const ASPECT_RATIO = 295 / 413 // 一寸照片比例

export function PhotoUploadCrop({ value, onChange }: PhotoUploadCropProps) {
  const [cropModalVisible, setCropModalVisible] = useState(false)
  const [imageSrc, setImageSrc] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理文件选择
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      Message.error('请选择图片文件')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      Message.error('图片大小不能超过 5MB')
      return
    }
    
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setCrop(undefined)
      setCropModalVisible(true)
    }
    reader.readAsDataURL(file)
  }

  // 点击上传
  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  // 拖拽上传
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  // 图片加载完成，初始化裁剪框
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    
    // 计算初始裁剪框，占图片的80%
    let cropWidth, cropHeight
    
    if (width / height > ASPECT_RATIO) {
      // 图片更宽，基于高度计算
      cropHeight = height * 0.8
      cropWidth = cropHeight * ASPECT_RATIO
    } else {
      // 图片更高，基于宽度计算
      cropWidth = width * 0.8
      cropHeight = cropWidth / ASPECT_RATIO
    }
    
    const x = (width - cropWidth) / 2
    const y = (height - cropHeight) / 2
    
    setCrop({
      unit: 'px',
      x,
      y,
      width: cropWidth,
      height: cropHeight,
    })
  }

  // 生成裁剪后的图片
  const getCroppedImg = async (
    image: HTMLImageElement,
    crop: PixelCrop
  ): Promise<Blob> => {
    const canvas = document.createElement('canvas')
    canvas.width = 295
    canvas.height = 413
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('No 2d context')
    }

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
      0,
      0,
      295,
      413
    )

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas is empty'))
        }
      }, 'image/jpeg', 0.95)
    })
  }

  // 裁剪并上传
  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current) {
      Message.error('请先选择裁剪区域')
      return
    }

    try {
      setUploading(true)

      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop)

      const formData = new FormData()
      formData.append('file', croppedBlob, 'avatar.jpg')

      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        onChange?.(data.url)
        Message.success('照片上传成功')
        setCropModalVisible(false)
        setImageSrc('')
      } else {
        const data = await res.json()
        Message.error(data.error || '上传失败')
      }
    } catch (error) {
      console.error('Upload error:', error)
      Message.error('上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setCropModalVisible(false)
    setImageSrc('')
  }

  return (
    <>
      {/* 自定义上传框 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center rounded-sm border-2 border-dashed cursor-pointer transition-colors
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
        `}
        style={{ width: '118px', height: '165px' }}
      >
        {value ? (
          <div className="relative group" style={{ width: '118px', height: '165px' }}>
            <img 
              src={value} 
              alt="照片" 
              className="w-full h-full object-contain rounded-sm border border-border"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-sm">
              <IconUpload className="text-white text-xl" />
            </div>
          </div>
        ) : (
          <div style={{ width: '118px', height: '165px' }} className="flex flex-col items-center justify-center px-2">
            <IconUpload className="text-2xl text-muted-foreground mb-1" />
            <p className="text-xs text-foreground text-center">点击或拖拽</p>
            <p className="text-xs text-muted-foreground mt-1 text-center">上传照片</p>
          </div>
        )}
      </div>

      {/* 裁剪弹窗 */}
      <Modal
        title="裁剪照片"
        visible={cropModalVisible}
        onCancel={handleCancel}
        onOk={handleCropComplete}
        confirmLoading={uploading}
        okText="确定"
        cancelText="取消"
        style={{ width: 600 }}
        unmountOnExit
      >
        <div className="flex justify-center bg-neutral-900" style={{ width: '100%', minHeight: 400 }}>
          {imageSrc && (
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={ASPECT_RATIO}
              minWidth={50}
              minHeight={50}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop"
                style={{ maxHeight: 500, maxWidth: '100%' }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground mt-3 text-center">
          拖拽裁剪框移动 · 拖拽边角调整大小 · 一寸照片比例（295×413）
        </p>
      </Modal>
    </>
  )
}
