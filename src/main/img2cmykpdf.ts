import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { PDFDocument, degrees } from 'pdf-lib'
import sharp from 'sharp'

export async function PDF({ imageUrls, width = 0, height = 0, saveFilePath, name = `img2pdf-${performance.now()}` }) {
  let success = false
  let err
  let filePath
  try {
    const pdfBytes = await createPdfFromImages({
      imageUrls,
      width,
      height,
    })
    const downloadsPath = app.getPath('downloads')

    filePath = path.join(saveFilePath || downloadsPath, `${name.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_')}.pdf`)
    fs.writeFileSync(filePath, pdfBytes)
    success = true
  } catch (error) {
    err = error
    success = false
  }
  return { success, err, filePath }
}

export async function createPdfFromImages({
  imageUrls,
  width = 0,
  height = 0,
}: {
  imageUrls: string[]

  width?: number
  height?: number
}) {
  const pdfDoc = await PDFDocument.create()
  let pageWidth = width
  let pageHeight = height

  const images = imageUrls

  if (images.length > 0 && pageWidth === 0 && pageHeight === 0) {
    const firstImageSource = imageUrls[0]
    const firstImageBuffer = await fs.readFileSync(firstImageSource)

    const firstImageMetadata = await sharp(firstImageBuffer).metadata()
    pageWidth = firstImageMetadata.width || pageWidth
    pageHeight = firstImageMetadata.height || pageHeight
  }
  for (const imageUrl of imageUrls) {
    const data = await fs.readFileSync(imageUrl)

    const cmykBuffer = await sharp(data, { density: 72 })
      .withMetadata({ icc: 'cmyk' })
      .jpeg({ chromaSubsampling: '4:2:0' })
      .toBuffer()

    const cmykImage = await pdfDoc.embedJpg(cmykBuffer)
    const page = pdfDoc.addPage([pageWidth, pageHeight])
    page.drawImage(cmykImage, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      rotate: degrees(0),
    })
  }

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}
