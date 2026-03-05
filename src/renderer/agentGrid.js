/**
 * Agent Grid — add/update/remove Agent, updateGridLayout, resize
 */

function addAgent(agent) {
  if (document.querySelector(`[data-agent-id="${agent.id}"]`)) {
    return;
  }

  const card = createAgentCard(agent);
  agentGrid.appendChild(card);

  if (!window.lastAgents) window.lastAgents = [];
  if (!window.lastAgents.some(a => a.id === agent.id)) {
    window.lastAgents.push(agent);
  }

  updateAgentState(agent.id, card, agent);
  updateGridLayout();
  requestDynamicResize();

  console.log(`[Renderer] Agent added: ${agent.displayName} (${agent.id.slice(0, 8)})`);
}

function updateAgent(agent) {
  const card = document.querySelector(`[data-agent-id="${agent.id}"]`);
  if (!card) return;

  if (window.lastAgents) {
    const idx = window.lastAgents.findIndex(a => a.id === agent.id);
    if (idx > -1) {
      window.lastAgents[idx] = agent;
    } else {
      window.lastAgents.push(agent);
    }
  }

  updateAgentState(agent.id, card, agent);
  updateGridLayout();
  requestDynamicResize();
}

function removeAgent(data) {
  const card = document.querySelector(`[data-agent-id="${data.id}"]`);
  if (!card) return;

  const state = agentStates.get(data.id);
  if (state) {
    if (state.interval) {
      clearInterval(state.interval);
      state.interval = null;
    }
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }
  agentStates.delete(data.id);

  console.log(`[Renderer] Cleaned up agent ${data.id.slice(0, 8)} (intervals cleared)`);

  card.remove();

  updateGridLayout();
  requestDynamicResize();

  console.log(`[Renderer] Agent removed: ${data.displayName} (${data.id.slice(0, 8)})`);
}

function cleanupAgents(data) {
  updateGridLayout();
  console.log(`[Renderer] Cleaned up ${data.count} agents`);
}

// --- 빈 상태(에이전트 0개) 대기 아바타 ---
const idleContainer = document.getElementById('container');
const idleCharacter = document.getElementById('character');
const idleBubble = document.getElementById('speech-bubble');

function startIdleAnimation() {
  if (!idleCharacter) return;
  const seq = ANIM_SEQUENCES.waiting;
  drawFrameOn(idleCharacter, seq.frames[0]);
  idleBubble.textContent = 'Waiting...';
}

function drawFrameOn(el, frameIndex) {
  if (!el) return;
  const col = frameIndex % SHEET.cols;
  const row = Math.floor(frameIndex / SHEET.cols);
  el.style.backgroundPosition = `${col * -SHEET.width}px ${row * -SHEET.height}px`;
}

function updateGridLayout() {
  const cards = Array.from(agentGrid.querySelectorAll('.agent-card'));
  if (cards.length === 0) {
    agentGrid.classList.remove('has-multiple');
    agentGrid.querySelectorAll('.agent-party-bg').forEach(el => el.remove());
    if (idleContainer) {
      if (!idleContainer.parentNode) {
        agentGrid.appendChild(idleContainer);
      }
      idleContainer.style.display = 'flex';
    }
    return;
  }

  if (idleContainer) idleContainer.style.display = 'none';
  agentGrid.classList.add('has-multiple');

  const cardDataList = cards.map(c => {
    return {
      card: c,
      data: window.lastAgents?.find(ag => ag.id === c.dataset.agentId) || { id: c.dataset.agentId }
    };
  });

  const mains = cardDataList.filter(item => !item.data.isSubagent && !item.data.isTeammate);
  const others = cardDataList.filter(item => item.data.isSubagent || item.data.isTeammate);
  const fallbackSubList = [...others];

  mains.sort((a, b) => (a.data.projectPath || '').localeCompare(b.data.projectPath || ''));

  Array.from(agentGrid.children).forEach(child => {
    if (child !== idleContainer) {
      agentGrid.removeChild(child);
    }
  });

  let lastProject = null;
  let mainIndex = 0;

  let col = 1;
  let currentRow = 1;
  let maxRowInBatch = 1;

  mains.forEach(mainItem => {
    const proj = mainItem.data.projectPath;
    if (lastProject !== null && proj !== lastProject) {
      mainIndex = 0;
    }
    lastProject = proj;

    const typeTag = mainItem.card.querySelector('.type-tag');
    const label = `Main_${mainIndex}`;
    if (typeTag) typeTag.textContent = label;
    mainIndex++;

    const mySubs = [];
    for (let i = fallbackSubList.length - 1; i >= 0; i--) {
      const sub = fallbackSubList[i];
      if (sub.data.parentId === mainItem.data.id || (!sub.data.parentId && sub.data.projectPath === proj)) {
        mySubs.push(sub);
        fallbackSubList.splice(i, 1);
      }
    }

    mySubs.reverse();

    if (col > 10) {
      col = 1;
      currentRow = maxRowInBatch + 1;
      maxRowInBatch = currentRow;
    }

    const bgBox = document.createElement('div');
    bgBox.className = 'agent-party-bg';
    bgBox.style.gridColumn = col;
    bgBox.style.gridRow = `${currentRow} / span ${1 + mySubs.length}`;
    agentGrid.appendChild(bgBox);

    mainItem.card.classList.remove('group-start');
    mainItem.card.style.gridColumn = col;
    mainItem.card.style.gridRow = currentRow;
    agentGrid.appendChild(mainItem.card);

    mySubs.forEach((s, sIdx) => {
      const subRow = currentRow + 1 + sIdx;
      s.card.classList.remove('group-start');
      s.card.style.gridColumn = col;
      s.card.style.gridRow = subRow;
      agentGrid.appendChild(s.card);
      if (subRow > maxRowInBatch) maxRowInBatch = subRow;
    });

    col++;
  });

  fallbackSubList.forEach(s => {
    if (col > 10) {
      col = 1;
      currentRow = maxRowInBatch + 1;
      maxRowInBatch = currentRow;
    }
    s.card.classList.remove('group-start');
    s.card.style.gridColumn = col;
    s.card.style.gridRow = currentRow;
    agentGrid.appendChild(s.card);
    col++;
  });

  setTimeout(() => requestDynamicResize(), 50);
}

// 윈도우 높이 오토 조절 로직
let resizeObserver = null;
function requestDynamicResize() {
  if (!window.electronAPI || !window.electronAPI.resizeWindow) return;
  const grid = document.getElementById('agent-grid');
  if (!grid) return;

  const width = grid.scrollWidth;
  const height = grid.scrollHeight;

  if (width < 100 || height < 100) return;

  window.electronAPI.resizeWindow({ width, height });
}

if (window.ResizeObserver) {
  resizeObserver = new ResizeObserver(() => requestDynamicResize());
  if (agentGrid) resizeObserver.observe(agentGrid);
  resizeObserver.observe(document.body);
}
