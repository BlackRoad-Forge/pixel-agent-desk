/**
 * Session Persistence
 * state.json 저장/복구 — 앱 재시작 시 활성 세션 복원
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const { execFileSync } = require('child_process');

function getPersistedStatePath() {
  return path.join(os.homedir(), '.pixel-agent-desk', 'state.json');
}

/**
 * PID가 실제 Claude Code CLI 프로세스인지 확인
 * Claude Desktop App (WindowsApps/Claude.app)은 제외
 */
function isClaudeProcess(pid) {
  try {
    if (process.platform === 'win32') {
      const result = execFileSync('powershell.exe', [
        '-NoProfile', '-Command',
        `$p = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" -ErrorAction SilentlyContinue; if ($p) { "$($p.Name)|$($p.CommandLine)" }`
      ], { timeout: 5000, encoding: 'utf-8' });
      if (!result) return false;
      const lower = result.toLowerCase();
      if (!lower.includes('claude')) return false;
      // Claude Desktop App 제외 (WindowsApps 경로)
      if (lower.includes('windowsapps')) return false;
      // node.exe로 실행되는 Claude Code CLI만 허용
      return lower.startsWith('node.exe|');
    } else {
      const result = execFileSync('ps', ['-p', String(pid), '-o', 'command='],
        { timeout: 3000, encoding: 'utf-8' });
      if (!result) return false;
      const lower = result.toLowerCase();
      if (!lower.includes('claude')) return false;
      // Claude Desktop App 제외 (macOS .app 번들)
      if (lower.includes('claude.app')) return false;
      return true;
    }
  } catch (e) {
    return false;
  }
}

function savePersistedState({ agentManager, sessionPids }) {
  if (!agentManager) return;
  const statePath = getPersistedStatePath();
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const agents = agentManager.getAllAgents();
  const state = {
    agents: agents,
    pids: Array.from(sessionPids.entries())
  };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

function recoverExistingSessions({ agentManager, sessionPids, firstPreToolUseDone, debugLog, errorHandler }) {
  if (!agentManager) return;
  const statePath = getPersistedStatePath();

  if (!fs.existsSync(statePath)) {
    debugLog('[Recover] No persisted state found.');
    return;
  }

  try {
    const raw = fs.readFileSync(statePath, 'utf-8');
    const state = JSON.parse(raw);
    const savedAgents = state.agents || [];
    const savedPids = new Map((state.pids || []));

    let recoveredCount = 0;
    for (const agent of savedAgents) {
      const pid = savedPids.get(agent.id);

      if (!pid) {
        debugLog(`[Recover] Skipped agent (no pid): ${agent.id.slice(0, 8)}`);
        continue;
      }

      // PID 존재 확인
      try {
        process.kill(pid, 0);
      } catch (e) {
        debugLog(`[Recover] Skipped dead agent (pid gone): ${agent.id.slice(0, 8)}`);
        continue;
      }

      // PID가 실제 Claude 프로세스인지 확인 (Windows PID 재사용 방지)
      if (!isClaudeProcess(pid)) {
        debugLog(`[Recover] Skipped agent (pid=${pid} is not claude): ${agent.id.slice(0, 8)}`);
        continue;
      }

      sessionPids.set(agent.id, pid);
      firstPreToolUseDone.set(agent.id, true);

      agentManager.updateAgent({
        sessionId: agent.id,
        projectPath: agent.projectPath,
        displayName: agent.displayName,
        state: agent.state,
        jsonlPath: agent.jsonlPath,
        isTeammate: agent.isTeammate,
        isSubagent: agent.isSubagent,
        parentId: agent.parentId
      }, 'recover');

      recoveredCount++;
      debugLog(`[Recover] Restored: ${agent.id.slice(0, 8)} (${agent.displayName}) state=${agent.state} pid=${pid} (will re-verify via liveness)`);
    }

    debugLog(`[Recover] Done — ${recoveredCount} session(s) restored from state.json`);
  } catch (e) {
    errorHandler.capture(e, {
      code: 'E009',
      category: 'FILE_IO',
      severity: 'WARNING'
    });
    debugLog(`[Recover] Error reading or parsing state.json: ${e.message}`);
  }

  // 복구된 에이전트 state.json 초기화
  try {
    fs.writeFileSync(statePath, JSON.stringify({ agents: [], pids: [] }, null, 2), 'utf-8');
    debugLog('[Recover] state.json reset after recovery');
  } catch (e) { }
}

module.exports = { savePersistedState, recoverExistingSessions };
