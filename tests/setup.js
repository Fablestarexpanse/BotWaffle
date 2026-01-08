/**
 * Jest setup file - runs before all tests
 */

// Mock Electron app if not in Electron environment
if (!global.process.versions.electron) {
  // Mock Electron app.getPath
  jest.mock('electron', () => ({
    app: {
      getPath: jest.fn((name) => {
        if (name === 'userData') {
          // Use temp directory for testing
          return require('path').join(require('os').tmpdir(), 'botwaffle-test');
        }
        return require('os').tmpdir();
      }),
      isReady: jest.fn(() => true),
      on: jest.fn(),
      whenReady: jest.fn(() => Promise.resolve())
    },
    BrowserWindow: jest.fn(),
    ipcMain: {
      handle: jest.fn(),
      on: jest.fn(),
      removeHandler: jest.fn()
    },
    dialog: {
      showOpenDialog: jest.fn(),
      showSaveDialog: jest.fn()
    }
  }));
}

// Increase timeout for file operations
jest.setTimeout(10000);

// Suppress console errors/warnings in tests (unless needed)
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress console errors unless TEST_VERBOSE is set
  if (!process.env.TEST_VERBOSE) {
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.error = originalError;
  console.warn = originalWarn;
});
