/**
 * Mock Electron module for testing
 */

const path = require('path');
const os = require('os');

// Mock Electron API
const electron = {
  app: {
    getPath: jest.fn((name) => {
      if (name === 'userData') {
        // Use temp directory for testing
        return path.join(os.tmpdir(), 'botwaffle-test');
      }
      return os.tmpdir();
    }),
    isReady: jest.fn(() => true),
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
    quit: jest.fn(),
    exit: jest.fn()
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    loadURL: jest.fn(),
    webContents: {
      send: jest.fn(),
      on: jest.fn(),
      openDevTools: jest.fn()
    },
    show: jest.fn(),
    hide: jest.fn(),
    close: jest.fn(),
    on: jest.fn()
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    removeHandler: jest.fn(),
    removeAllListeners: jest.fn()
  },
  ipcRenderer: {
    invoke: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
    showMessageBox: jest.fn()
  }
};

module.exports = electron;
