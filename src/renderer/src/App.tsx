import { DndContext, DragOverlay, MouseSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core/dist/types/index'
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DragHandleDots2Icon } from '@radix-ui/react-icons'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@renderer/components/ui/dialog'
import { Label } from '@renderer/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@renderer/components/ui/radio-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { nanoid } from 'nanoid'
import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'

function App(): JSX.Element {
  const [images, setImages] = useState<
    {
      name: string
      size: number
      path: string
      directory: string
      createdAt: Date
      modifiedAt: Date
      id: string
    }[]
  >([])
  const [originalFilePath, setOriginalFilePath] = useState('')
  const [customFilePath, setCustomFilePath] = useState('')
  const [saveFilePathType, setSaveFilePathType] = useState('1')
  const [values, setValues] = useState({
    width: 0,
    height: 0,
    outputName: '',
  })
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const saveFilePath = saveFilePathType === '1' ? originalFilePath : customFilePath
  useEffect(() => {
    if (images.length > 0 && saveFilePathType === '1') {
      setOriginalFilePath(images[0].directory)
    }
    if (!customFilePath && images[0]?.directory) {
      setCustomFilePath(images[0].directory)
    }
  }, [images, saveFilePathType])

  useEffect(() => {
    if (images.length > 0) {
      preloadImage(images[0].path).then((img) => {
        setValues((prev) => ({
          ...prev,
          width: img.width,
          height: img.height,
        }))
      })
    }
  }, [images])

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // 按住不动移动5px 时 才进行拖拽, 这样就可以触发点击事件
      },
    }),
  )
  const [activeId, setActiveId] = useState(null)
  const handleDragStart = (event: any) => {
    setActiveId(event.active?.id)
  }
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    if (active.id !== over.id) {
      const data = [...images]

      const oldIndex = data?.findIndex((item: any) => item?.id === active?.id)
      const newIndex = data?.findIndex((item: any) => item?.id === over?.id)
      const newArr = arrayMove(data, oldIndex, newIndex)
      setImages(newArr)
    }
  }

  return (
    <>
      <div className='  flex  h-dvh flex-col divide-y '>
        <div className='  space-x-3  p-4'>
          <Button
            variant={'outline'}
            onClick={async () => {
              const imgs = await window.electron.ipcRenderer.invoke('select-images')
              setImages((prev) => [...prev, ...imgs.map((item: any) => ({ ...item, id: nanoid() }))])
            }}
          >
            添加图片
          </Button>
          <Button
            variant={'outline'}
            onClick={async () => {
              const imgs = await window.electron.ipcRenderer.invoke('select-images-folder')
              setImages((prev) => [...prev, ...imgs.map((item: any) => ({ ...item, id: nanoid() }))])
            }}
          >
            添加文件夹
          </Button>
          <Button
            variant={'outline'}
            disabled={images.length === 0}
            onClick={async () => {
              setImages([])
            }}
          >
            清空列表
          </Button>
        </div>
        <div className=' flex flex-1 flex-col overflow-auto border-t p-4'>
          <h3 className=' mb-2 font-bold'>待转换列表</h3>
          <div className=' flex-1 space-y-3 overflow-auto'>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              onDragStart={handleDragStart}
              modifiers={[restrictToFirstScrollableAncestor]}
            >
              <SortableContext items={images || []} strategy={rectSortingStrategy}>
                {images.map((item: any, index: number) => {
                  return (
                    <Item
                      key={item.id}
                      item={item}
                      id={item.id}
                      index={index}
                      onDelete={() => {
                        setImages((prev) => prev.filter((_, fIndex) => fIndex !== index))
                      }}
                    />
                  )
                })}
                <DragOverlay>
                  {activeId ? (
                    <Item
                      item={images.find((item: any) => item.id === activeId)}
                      id={-1}
                      index={images.findIndex((item: any) => item.id === activeId)}
                      isDragOverlay={true}
                    />
                  ) : null}
                </DragOverlay>
              </SortableContext>
            </DndContext>
          </div>
        </div>
        <div className=' flex justify-between  p-4'>
          <div className=' flex items-center'>
            <p className=' font-bold'>输出目录：</p>
            <div className=' items-center '>
              <RadioGroup
                value={saveFilePathType}
                onValueChange={(value) => {
                  setSaveFilePathType(value)
                }}
                defaultValue='option-one'
                className=' flex'
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='1' id='option-one' />
                  <Label htmlFor='option-one'>原文件夹</Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='2' id='option-two' />
                  <Label htmlFor='option-two'>自定义</Label>
                </div>
              </RadioGroup>
              <div className='ml-1    items-center '>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <p className=' line-clamp-1  w-52   text-xs'>{saveFilePath}</p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{saveFilePath}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  onClick={() => {
                    window.electron.ipcRenderer.invoke('open-folder', saveFilePath)
                  }}
                  className=' ml-1'
                  variant={'outline'}
                  size={'sm'}
                >
                  打开文件夹
                </Button>
                {saveFilePathType === '2' && (
                  <Button
                    className=' ml-1'
                    onClick={async () => {
                      const newPath = await window.electron.ipcRenderer.invoke('select-new-folder')
                      if (newPath) {
                        setCustomFilePath(newPath)
                      }
                    }}
                    variant={'outline'}
                    size={'sm'}
                  >
                    更换目录
                  </Button>
                )}
              </div>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={images.length === 0}>转换为PDF</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>转换设置</DialogTitle>
              </DialogHeader>

              <Label className=' flex w-full max-w-sm items-center gap-1.5'>
                <p className=' w-16 whitespace-nowrap'>页面尺寸</p>
                <Input
                  value={values.width}
                  type='number'
                  onChange={(e) => {
                    setValues((prev) => ({
                      ...prev,
                      width: Number(e.target.value),
                    }))
                  }}
                  placeholder='宽'
                />
                <span>x</span>
                <Input
                  value={values.height}
                  onChange={(e) => {
                    setValues((prev) => ({
                      ...prev,
                      height: Number(e.target.value),
                    }))
                  }}
                  type='number'
                  placeholder='高'
                />
              </Label>
              <Label className=' flex w-full max-w-sm items-center gap-1.5'>
                <p className=' w-16 whitespace-nowrap'>输出名称</p>
                <Input
                  value={values.outputName}
                  onChange={(e) => {
                    setValues((prev) => ({
                      ...prev,
                      outputName: e.target.value.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_'),
                    }))
                  }}
                  type='text'
                  placeholder='输出名称'
                />
              </Label>

              <div className=' flex w-full  items-center gap-1 text-sm'>
                <p className=' w-16  whitespace-nowrap '>输出目录：</p>
                <div className=' items-center '>
                  <RadioGroup
                    value={saveFilePathType}
                    onValueChange={(value) => {
                      setSaveFilePathType(value)
                    }}
                    defaultValue='option-one'
                    className=' flex'
                  >
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem value='1' id='option-one' />
                      <Label htmlFor='option-one'>原文件夹</Label>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem value='2' id='option-two' />
                      <Label htmlFor='option-two'>自定义</Label>
                    </div>
                  </RadioGroup>
                  <div className='ml-1    items-center '>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <p className=' line-clamp-1  w-52   text-xs'>{saveFilePath}</p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{saveFilePath}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Button
                      onClick={() => {
                        window.electron.ipcRenderer.invoke('open-folder', saveFilePath)
                      }}
                      className=' ml-1'
                      variant={'outline'}
                      size={'sm'}
                    >
                      打开文件夹
                    </Button>
                    {saveFilePathType === '2' && (
                      <Button
                        className=' ml-1'
                        onClick={async () => {
                          const newPath = await window.electron.ipcRenderer.invoke('select-new-folder')
                          if (newPath) {
                            setCustomFilePath(newPath)
                          }
                        }}
                        variant={'outline'}
                        size={'sm'}
                      >
                        更换目录
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={loading}
                  onClick={async () => {
                    const toastId = toast.loading('正在转换中...')
                    try {
                      const res = await window.electron.ipcRenderer.invoke('convert-to-cmyk-pdf', {
                        imageUrls: images.map((img) => img.path),
                        saveFilePath: saveFilePath,
                        width: values.width,
                        height: values.height,
                        name: values.outputName,
                      })
                      if (res.success) {
                        toast.success('转换成功', {
                          id: toastId,
                        })
                        setOpen(false)
                      } else {
                        toast.error('转换失败:\n' + JSON.stringify(res.err, null, 2), {
                          id: toastId,
                        })
                      }
                    } catch (error) {
                      toast.error('转换失败:\n' + JSON.stringify(error, null, 2), {
                        id: toastId,
                      })
                    }
                  }}
                >
                  开始转换
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Toaster />
    </>
  )
}

export default App

const Item = ({ item, index, id, onDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div
      {...attributes}
      style={style}
      ref={setNodeRef}
      key={id}
      className=' flex items-center justify-between space-x-2 rounded-lg border p-2'
    >
      <div className=' flex items-center space-x-2'>
        <p className='  mr-2 flex size-8  shrink-0 items-center justify-center rounded-full border'>{index + 1}</p>
        <img src={item.path} alt={`image-${index}`} className=' size-20 rounded-md' />
        <p className=' line-clamp-1  break-words'>{item.name}</p>
      </div>
      <div className=' flex items-center space-x-2'>
        <Button
          onClick={() => {
            onDelete()
            // setImages((prev) => prev.filter((_, fIndex) => fIndex !== index))
          }}
          size={'sm'}
          variant={'destructive'}
        >
          删除
        </Button>
        <Button {...listeners} size={'icon'} variant={'outline'}>
          <DragHandleDots2Icon />
        </Button>
      </div>
    </div>
  )
}

function preloadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}
