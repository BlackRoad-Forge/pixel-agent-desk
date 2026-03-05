/**
 * P0-4: Test Coverage - utils.js Tests
 * 모든 유틸리티 함수 테스트 (목표: 100% 커버리지)
 */

const {
  formatSlugToDisplayName,
  getVisualClassForState,
  getElapsedTime,
  normalizePath,
  safeStatSync,
  safeExistsSync,
  formatTime,
  getWindowSizeForAgents,
  checkSessionActive
} = require('../src/utils');
const fs = require('fs');

// Mock fs module
jest.mock('fs');

// Mock child_process module
jest.mock('child_process', () => ({
  spawnSync: jest.fn()
}));

describe('formatSlugToDisplayName', () => {
  test('converts slug to title case', () => {
    expect(formatSlugToDisplayName('toasty-sparking-lecun'))
      .toBe('Toasty Sparking Lecun');
  });

  test('handles empty input', () => {
    expect(formatSlugToDisplayName(null)).toBe('Agent');
    expect(formatSlugToDisplayName(undefined)).toBe('Agent');
    expect(formatSlugToDisplayName('')).toBe('Agent');
  });

  test('handles single word', () => {
    expect(formatSlugToDisplayName('claude')).toBe('Claude');
  });

  test('handles multiple hyphens', () => {
    expect(formatSlugToDisplayName('agent-one-two-three'))
      .toBe('Agent One Two Three');
  });
});

describe('getVisualClassForState', () => {
  test('returns correct class for each state', () => {
    expect(getVisualClassForState('Working')).toBe('is-working');
    expect(getVisualClassForState('Thinking')).toBe('is-working');
    expect(getVisualClassForState('Done')).toBe('is-complete');
    expect(getVisualClassForState('Error')).toBe('is-alert');
    expect(getVisualClassForState('Help')).toBe('is-alert');
    expect(getVisualClassForState('Offline')).toBe('is-offline');
  });

  test('returns default class for unknown state', () => {
    expect(getVisualClassForState('Unknown')).toBe('is-complete');
    expect(getVisualClassForState('Random')).toBe('is-complete');
  });
});

describe('getElapsedTime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-05T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns 0 for Done state with no duration', () => {
    const agent = { state: 'Done', lastDuration: 0 };
    expect(getElapsedTime(agent)).toBe(0);
  });

  test('returns lastDuration for Done state', () => {
    const agent = { state: 'Done', lastDuration: 5000 };
    expect(getElapsedTime(agent)).toBe(5000);
  });

  test('calculates elapsed time for Working state', () => {
    const agent = {
      state: 'Working',
      activeStartTime: Date.now() - 10000
    };
    const elapsed = getElapsedTime(agent);
    expect(elapsed).toBeGreaterThanOrEqual(9900);
    expect(elapsed).toBeLessThanOrEqual(10100);
  });

  test('calculates elapsed time for Thinking state', () => {
    const agent = {
      state: 'Thinking',
      activeStartTime: Date.now() - 5000
    };
    const elapsed = getElapsedTime(agent);
    expect(elapsed).toBeGreaterThanOrEqual(4900);
    expect(elapsed).toBeLessThanOrEqual(5100);
  });

  test('returns 0 for unknown state', () => {
    const agent = { state: 'Unknown', activeStartTime: Date.now() };
    expect(getElapsedTime(agent)).toBe(0);
  });

  test('returns 0 when activeStartTime is missing', () => {
    const agent = { state: 'Working' };
    expect(getElapsedTime(agent)).toBe(0);
  });
});

describe('normalizePath', () => {
  test('normalizes Windows paths', () => {
    expect(normalizePath('C:\\Users\\Test\\Project'))
      .toBe('c:/users/test/project');
    expect(normalizePath('D:\\Projects\\MyApp\\'))
      .toBe('d:/projects/myapp');
  });

  test('normalizes Unix paths', () => {
    expect(normalizePath('/home/user/project/'))
      .toBe('/home/user/project');
    expect(normalizePath('/var/log/test'))
      .toBe('/var/log/test');
  });

  test('converts to lowercase', () => {
    expect(normalizePath('C:\\Users\\TEST\\Project'))
      .toBe('c:/users/test/project');
  });

  test('handles empty input', () => {
    expect(normalizePath(null)).toBe('');
    expect(normalizePath(undefined)).toBe('');
    expect(normalizePath('')).toBe('');
  });

  test('handles mixed separators', () => {
    expect(normalizePath('C:\\Users/Test/Project\\'))
      .toBe('c:/users/test/project');
  });
});

describe('safeStatSync', () => {
  test('returns stats when file exists', () => {
    const mockStats = { size: 1024, mtime: new Date() };
    fs.statSync.mockReturnValue(mockStats);

    const result = safeStatSync('/path/to/file');
    expect(result).toEqual(mockStats);
    expect(fs.statSync).toHaveBeenCalledWith('/path/to/file');
  });

  test('returns null when file does not exist', () => {
    fs.statSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const result = safeStatSync('/path/to/nonexistent');
    expect(result).toBeNull();
  });

  test('returns null on permission error', () => {
    fs.statSync.mockImplementation(() => {
      throw new Error('EACCES');
    });

    const result = safeStatSync('/path/to/file');
    expect(result).toBeNull();
  });

  test('handles any error gracefully', () => {
    fs.statSync.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const result = safeStatSync('/path/to/file');
    expect(result).toBeNull();
  });
});

describe('safeExistsSync', () => {
  test('returns true when file exists', () => {
    fs.existsSync.mockReturnValue(true);

    expect(safeExistsSync('/path/to/file')).toBe(true);
    expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file');
  });

  test('returns false when file does not exist', () => {
    fs.existsSync.mockReturnValue(false);

    expect(safeExistsSync('/path/to/nonexistent')).toBe(false);
  });

  test('returns false on error', () => {
    fs.existsSync.mockImplementation(() => {
      throw new Error('Error');
    });

    expect(safeExistsSync('/path/to/file')).toBe(false);
  });

  test('handles various error types', () => {
    fs.existsSync.mockImplementation(() => {
      throw new Error('EACCES');
    });

    expect(safeExistsSync('/path/to/file')).toBe(false);
  });
});

describe('formatTime', () => {
  test('formats milliseconds to MM:SS', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(1000)).toBe('00:01');
    expect(formatTime(5000)).toBe('00:05');
    expect(formatTime(60000)).toBe('01:00');
    expect(formatTime(65000)).toBe('01:05');
    expect(formatTime(3600000)).toBe('60:00');
  });

  test('handles edge cases', () => {
    expect(formatTime(999)).toBe('00:00');
    expect(formatTime(1001)).toBe('00:01');
    expect(formatTime(59999)).toBe('00:59');
    expect(formatTime(60001)).toBe('01:00');
  });

  test('handles large values', () => {
    expect(formatTime(3599000)).toBe('59:59');
    expect(formatTime(3600000)).toBe('60:00');
    expect(formatTime(7200000)).toBe('120:00');
  });
});

describe('getWindowSizeForAgents', () => {
  test('returns minimum size for 0 or 1 agent', () => {
    expect(getWindowSizeForAgents(0)).toEqual({ width: 220, height: 300 });
    expect(getWindowSizeForAgents(1)).toEqual({ width: 220, height: 300 });
  });

  test('calculates size for multiple agents (count only)', () => {
    const size2 = getWindowSizeForAgents(2);
    expect(size2.width).toBeGreaterThan(220);
    expect(size2.height).toBe(300);

    const size10 = getWindowSizeForAgents(10);
    expect(size10.width).toBeGreaterThan(220);
    expect(size10.height).toBe(300);
  });

  test('calculates size for agent array with project groups', () => {
    const agents = [
      { id: '1', projectPath: '/project1', isSubagent: false, isTeammate: false },
      { id: '2', projectPath: '/project1', isSubagent: true, isTeammate: false },
      { id: '3', projectPath: '/project2', isSubagent: false, isTeammate: false }
    ];

    const size = getWindowSizeForAgents(agents);
    expect(size.width).toBeGreaterThan(220);
    expect(size.height).toBeGreaterThanOrEqual(300);
  });

  test('handles team agents (subagents/teammates)', () => {
    const teamAgents = Array.from({ length: 5 }, (_, i) => ({
      id: `agent-${i}`,
      projectPath: '/project1',
      isSubagent: i > 0,
      isTeammate: false
    }));

    const size = getWindowSizeForAgents(teamAgents);
    expect(size.width).toBeGreaterThan(220);
    expect(size.height).toBeGreaterThan(300);
  });

  test('handles solo agents', () => {
    const soloAgents = Array.from({ length: 3 }, (_, i) => ({
      id: `agent-${i}`,
      projectPath: `/project${i}`,
      isSubagent: false,
      isTeammate: false
    }));

    const size = getWindowSizeForAgents(soloAgents);
    expect(size.width).toBeGreaterThan(220);
    expect(size.height).toBe(300);
  });

  test('respects max column limit of 10', () => {
    const manyAgents = Array.from({ length: 15 }, (_, i) => ({
      id: `agent-${i}`,
      projectPath: '/project1',
      isSubagent: false,
      isTeammate: false
    }));

    const size = getWindowSizeForAgents(manyAgents);
    // Width should not exceed what 10 columns would allow
    expect(size.width).toBeLessThanOrEqual(1200);
  });
});

describe('checkSessionActive', () => {
  const { spawnSync } = require('child_process');

  beforeEach(() => {
    spawnSync.mockClear();
  });

  test('returns true when process is active', async () => {
    spawnSync.mockReturnValue({
      stdout: 'true',
      stderr: '',
      status: 0
    });

    const result = await checkSessionActive('session-id', 1234);
    expect(result).toBe(true);
    expect(spawnSync).toHaveBeenCalledWith(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        expect.stringContaining('Get-Process -Id 1234')
      ],
      expect.objectContaining({ encoding: 'utf8', timeout: 5000 })
    );
  });

  test('returns false when process is inactive', async () => {
    spawnSync.mockReturnValue({
      stdout: 'false',
      stderr: '',
      status: 0
    });

    const result = await checkSessionActive('session-id', 1234);
    expect(result).toBe(false);
  });

  test('checks parent process when target process not found', async () => {
    // First call: target process not found
    spawnSync.mockReturnValueOnce({
      stdout: 'false',
      stderr: '',
      status: 0
    });

    // Second call: get parent ID
    spawnSync.mockReturnValueOnce({
      stdout: '5678', // Parent PID
      stderr: '',
      status: 0
    });

    // Third call: check parent process
    spawnSync.mockReturnValueOnce({
      stdout: 'true',
      stderr: '',
      status: 0
    });

    const result = await checkSessionActive('session-id', 1234);
    expect(result).toBe(true);
    expect(spawnSync).toHaveBeenCalledTimes(3);
  });

  test('returns false on error', async () => {
    spawnSync.mockImplementation(() => {
      throw new Error('PowerShell not found');
    });

    const result = await checkSessionActive('session-id', 1234);
    expect(result).toBe(false);
  });

  test('handles timeout error', async () => {
    spawnSync.mockImplementation(() => {
      throw new Error('Timeout');
    });

    const result = await checkSessionActive('session-id', 1234);
    expect(result).toBe(false);
  });
});
