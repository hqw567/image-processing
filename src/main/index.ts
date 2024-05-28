import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron'
import fs, { readdirSync } from 'fs'
import path, { extname, join } from 'path'
import icon from '../../resources/icon.png?asset'
import { PDF } from './img2cmykpdf'
let mainWindow
function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this _ occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg', 'ico']
ipcMain.handle('select-images-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })

  if (result.canceled) {
    return []
  } else {
    const folderPath = result.filePaths[0]
    const files = readdirSync(folderPath)

    const imageFiles = files.filter((file) =>
      imageExtensions.map((ext) => '.' + ext).includes(extname(file).toLowerCase()),
    )
    const filePaths = imageFiles.map((file) => join(folderPath, file))

    const filesInfo = filePaths.map((filePath) => {
      const stats = fs.statSync(filePath)
      return {
        name: path.basename(filePath),
        size: stats.size,
        path: filePath,
        directory: path.dirname(filePath),
        createdAt: stats.birthtime, // 创建时间
        modifiedAt: stats.mtime, // 修改时间
      }
    })
    return filesInfo
  }
})

ipcMain.handle('select-images', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Images',
        extensions: imageExtensions,
      },
    ],
  })

  const filesInfo = result.filePaths.map((filePath) => {
    const stats = fs.statSync(filePath)
    return {
      name: path.basename(filePath),
      size: stats.size,
      path: filePath,
      directory: path.dirname(filePath),
      createdAt: stats.birthtime, // 创建时间
      modifiedAt: stats.mtime, // 修改时间
    }
  })
  return filesInfo
})

ipcMain.handle('convert-to-cmyk-pdf', async (_, data) => {
  return await PDF(data)
})

ipcMain.handle('open-folder', (_, folderPath) => {
  shell.openPath(folderPath)
})

ipcMain.handle('select-new-folder', async (_, oldFolderPath) => {
  const result = await dialog.showOpenDialog({
    defaultPath: oldFolderPath,
    properties: ['openDirectory'],
  })
  if (result.canceled) {
    return null
  }

  return result.filePaths[0]
})
