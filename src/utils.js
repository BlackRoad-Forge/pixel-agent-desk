/**
 * Shared Utilities for Pixel Agent Desk
 * Eliminates code duplication across modules
 */

/**
 * Format slug to display name
 * @param {string} slug - Slug like "toasty-sparking-lecun"
 * @returns {string} Formatted name like "Toasty Sparking Lecun"
 */
function formatSlugToDisplayName(slug) {
  if (!slug) return 'Agent';
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Get visual CSS class for agent state
 * @param {string} state - Agent state (Working, Idle, Waiting, Error, Help)
 * @returns {string} CSS class name
 */
function getVisualClassForState(state) {
  const mapping = {
    'Working': 'is-working',
    'Thinking': 'is-working',
    'Done': 'is-complete',
    'Error': 'is-alert',
    'Help': 'is-alert',
    'Offline': 'is-offline'
  };
  return mapping[state] || 'is-complete';
}

/**
 * Get elapsed time for display
 * @param {Object} agent - Agent object with state, activeStartTime, lastDuration
 * @returns {number} Elapsed time in milliseconds
 */
function getElapsedTime(agent) {
  if (agent.state === 'Done') {
    return agent.lastDuration || 0;
  } else if (agent.state === 'Working' || agent.state === 'Thinking') {
    return agent.activeStartTime ? Date.now() - agent.activeStartTime : 0;
  }
  return 0;
}

/**
 * Normalize path for comparison (Windows/Unix compatible)
 * @param {string} path - Path to normalize
 * @returns {string} Normalized path
 */
function normalizePath(path) {
  return (path || '').toLowerCase().replace(/\\/g, '/').replace(/\/$/, '');
}

/**
 * Safe file stat operation
 * @param {string} filePath - Path to file
 * @returns {fs.Stats|null} Stats object or null if error
 */
function safeStatSync(filePath) {
  try {
    const fs = require('fs');
    return fs.statSync(filePath);
  } catch (e) {
    return null;
  }
}

/**
 * Safe file existence check
 * @param {string} filePath - Path to file
 * @returns {boolean} True if file exists
 */
function safeExistsSync(filePath) {
  try {
    const fs = require('fs');
    return fs.existsSync(filePath);
  } catch (e) {
    return false;
  }
}

/**
 * Format time in milliseconds to MM:SS format
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string (e.g., "05:30")
 */
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Calculate window size based on agent count
 * @param {number|Array} agentsOrCount - Agent count or array of agents
 * @returns {Object} Window dimensions {width, height}
 */
function getWindowSizeForAgents(agentsOrCount) {
  let count = 0;
  let agents = [];
  if (Array.isArray(agentsOrCount)) {
    agents = agentsOrCount;
    count = agents.length;
  } else {
    count = agentsOrCount || 0;
  }

  if (count <= 1) return { width: 220, height: 300 };

  const CARD_W = 90;
  const GAP = 10;
  const OUTER = 120 + 20; // 팀 디자인 여백 감안
  const ROW_H = 240;
  const BASE_H = 300;
  const maxCols = 10;

  if (agents.length > 0) {
    const groups = {};
    agents.forEach(a => {
      const p = a.projectPath || 'default';
      if (!groups[p]) groups[p] = [];
      groups[p].push(a);
    });

    let teamRows = 0;
    let soloCount = 0;
    let maxColsInRow = 0;

    for (const group of Object.values(groups)) {
      const isTeam = group.some(a => a.isSubagent || a.isTeammate);
      if (isTeam) {
        teamRows += Math.ceil(group.length / maxCols);
        maxColsInRow = Math.max(maxColsInRow, Math.min(group.length, maxCols));
      } else {
        soloCount += group.length;
      }
    }

    const soloRows = Math.ceil(soloCount / maxCols);
    if (soloCount > 0) {
      maxColsInRow = Math.max(maxColsInRow, Math.min(soloCount, maxCols));
    }

    const totalRows = teamRows + soloRows;
    const width = Math.max(220, maxColsInRow * CARD_W + (maxColsInRow - 1) * GAP + OUTER);
    const height = BASE_H + Math.max(0, totalRows - 1) * ROW_H + (teamRows * 30); // 팀 그룹 여백(padding) 감안

    return { width, height };
  }

  // Fallback (agents 배열이 없는 경우 단순 count로 계산)
  const cols = Math.min(count, maxCols);
  const rows = Math.ceil(count / maxCols);

  const width = Math.max(220, cols * CARD_W + (cols - 1) * GAP + OUTER);
  const height = BASE_H + (rows - 1) * ROW_H;

  return { width, height };
}

/**
 * Check if a session is active by querying the process via PowerShell
 * @param {string} sessionId - Session ID (for logging)
 * @param {number} pid - Process ID to check
 * @returns {Promise<boolean>} True if session is active
 */
async function checkSessionActive(sessionId, pid) {
  try {
    // Use PowerShell to check if process is actually running
    const { spawnSync } = require('child_process');
    const ps = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `$proc = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; ` +
        `if ($proc) { 'true' } else { 'false' }`
      ],
      { encoding: 'utf8', timeout: 5000 }
    );

    const isActive = ps.stdout.trim() === 'true';

    if (!isActive) {
      // Check parent process if target process doesn't exist
      const psParent = spawnSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          `$proc = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; ` +
          `if ($proc) { $proc.Parent.Id } else { '' }`
        ],
        { encoding: 'utf8', timeout: 5000 }
      );

      const parentId = psParent.stdout.trim();
      if (parentId) {
        // Check parent process
        const psParentCheck = spawnSync(
          'powershell.exe',
          [
            '-NoProfile',
            '-Command',
            `$parent = Get-Process -Id ${parentId} -ErrorAction SilentlyContinue; ` +
            `if ($parent) { 'true' } else { 'false' }`
          ],
          { encoding: 'utf8', timeout: 5000 }
        );

        return psParentCheck.stdout.trim() === 'true';
      }
    }

    return isActive;
  } catch (error) {
    // Return false on error to allow removal
    return false;
  }
}

module.exports = {
  formatSlugToDisplayName,
  getVisualClassForState,
  getElapsedTime,
  normalizePath,
  safeStatSync,
  safeExistsSync,
  formatTime,
  getWindowSizeForAgents,
  checkSessionActive
};
