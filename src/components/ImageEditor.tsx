import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, RotateCw, Move, Save, X } from 'lucide-react'

interface ImageEditorProps {
  imageUrl: string
  onSave: (transform: ImageTransform) => void
  onCancel: () => void
  initialTransform?: ImageTransform
}

export interface ImageTransform {
  scale: number
  translateX: number
  translateY: number
  rotate: number
}

export function ImageEditor({ imageUrl, onSave, onCancel, initialTransform }: ImageEditorProps) {
  const [transform, setTransform] = useState<ImageTransform>(
    initialTransform || {
      scale: 1,
      translateX: 0,
      translateY: 0,
      rotate: 0,
    }
  )
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(prev.scale + 0.2, 5),
    }))
  }

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(prev.scale - 0.2, 0.5),
    }))
  }

  const handleRotate = () => {
    setTransform((prev) => ({
      ...prev,
      rotate: (prev.rotate + 90) % 360,
    }))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX - transform.translateX,
      y: e.clientY - transform.translateY,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setTransform((prev) => ({
      ...prev,
      translateX: e.clientX - dragStart.x,
      translateY: e.clientY - dragStart.y,
    }))
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      setIsDragging(true)
      setDragStart({
        x: touch.clientX - transform.translateX,
        y: touch.clientY - transform.translateY,
      })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return
    const touch = e.touches[0]
    setTransform((prev) => ({
      ...prev,
      translateX: touch.clientX - dragStart.x,
      translateY: touch.clientY - dragStart.y,
    }))
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.5, Math.min(5, prev.scale + delta)),
    }))
  }

  const handleReset = () => {
    setTransform({
      scale: 1,
      translateX: 0,
      translateY: 0,
      rotate: 0,
    })
  }

  const transformStyle = {
    transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale}) rotate(${transform.rotate}deg)`,
    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b bg-gray-50" dir="rtl">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut} title="הקטן">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(transform.scale * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={handleZoomIn} title="הגדל">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRotate} title="סובב 90°">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} title="איפוס">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            ביטול
          </Button>
          <Button onClick={() => onSave(transform)}>
            <Save className="w-4 h-4 mr-2" />
            שמור
          </Button>
        </div>
      </div>

      <div
        className="flex-1 relative overflow-hidden bg-gray-900"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={imageUrl}
            alt="עריכה"
            style={transformStyle}
            className="max-w-none select-none"
            draggable={false}
          />
        </div>
        
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm" dir="rtl">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4" />
            <span>גרור להזזה • גלגל עכבר לזום</span>
          </div>
        </div>
      </div>
    </div>
  )
}
