/**
 * Agent Card — updateAgentState, createAgentCard
 */

function updateAgentState(agentId, container, agentOrState) {
  const isAgentObj = typeof agentOrState === 'object';
  const state = isAgentObj ? agentOrState.state : agentOrState;
  const isAggregated = isAgentObj && agentOrState.isAggregated;

  const baseConfig = stateConfig[state] || stateConfig['Waiting'];
  const config = { ...baseConfig };

  if (isAggregated) {
    config.label = "Managing...";
  }

  const currentTool = isAgentObj ? agentOrState.currentTool : null;
  if (currentTool && state === 'Working') {
    config.label = currentTool;
  }

  const bubble = container.querySelector('.agent-bubble');
  const character = container.querySelector('.agent-character');

  // ARIA 라벨 업데이트
  const agentDisplayName = container.querySelector('.agent-name')?.textContent || 'Agent';
  container.setAttribute('aria-label', `${agentDisplayName} - ${config.label}`);

  // Update container class
  container.className = `agent-card ${config.class}`;
  if (isAggregated) container.classList.add('is-aggregated');

  if (isAgentObj) {
    if (agentOrState.isSubagent) container.classList.add('is-subagent');
    else container.classList.remove('is-subagent');

    if (agentOrState.isTeammate) container.classList.add('is-teammate');
    else container.classList.remove('is-teammate');
  }

  // Play animation
  playAnimation(agentId, character, config.anim);

  // Get agent state
  let agentState = agentStates.get(agentId);
  if (!agentState) {
    agentState = {
      animName: null,
      frameIdx: 0,
      interval: null,
      startTime: null,
      timerInterval: null,
      lastFormattedTime: ''
    };
    agentStates.set(agentId, agentState);
  }

  // Timer logic
  if (config.anim === 'working') {
    if (!agentState.startTime) {
      agentState.startTime = Date.now();
    }
    if (!agentState.timerInterval) {
      agentState.timerInterval = setInterval(() => {
        const elapsed = Date.now() - agentState.startTime;
        agentState.lastFormattedTime = window.electronAPI.formatTime(elapsed);
        if (bubble) {
          bubble.textContent = `${config.label}\n${agentState.lastFormattedTime}`;
        }
      }, 1000);
    }

    const elapsed = Date.now() - agentState.startTime;
    agentState.lastFormattedTime = window.electronAPI.formatTime(elapsed);
    if (bubble) {
      bubble.textContent = `${config.label}\n${agentState.lastFormattedTime}`;
    }

  } else if (config.anim === 'complete') {
    if (agentState.timerInterval) {
      clearInterval(agentState.timerInterval);
      agentState.timerInterval = null;
    }
    if (bubble) {
      const finalTime = agentState.lastFormattedTime || '00:00';
      bubble.textContent = `${config.label}\n${finalTime}`;
    }

  } else {
    if (agentState.timerInterval) {
      clearInterval(agentState.timerInterval);
      agentState.timerInterval = null;
    }
    agentState.startTime = null;
    agentState.lastFormattedTime = '';
    if (bubble) {
      bubble.textContent = config.label;
    }
  }

  agentStates.set(agentId, agentState);
  console.log(`[Renderer] ${agentId.slice(0, 8)}: ${state} -> ${config.label}`);
}

function createAgentCard(agent) {
  const card = document.createElement('div');
  card.className = 'agent-card';
  card.dataset.agentId = agent.id;
  card.tabIndex = 0;

  card.setAttribute('role', 'article');
  card.setAttribute('aria-label', `${agent.displayName || 'Agent'} - ${agent.state || 'Waiting'}`);

  if (agent.isSubagent) {
    card.classList.add('is-subagent');
    card.setAttribute('aria-label', `Subagent ${agent.displayName || 'Agent'} - ${agent.state || 'Waiting'}`);
  }

  // Create bubble
  const bubble = document.createElement('div');
  bubble.className = 'agent-bubble';
  bubble.textContent = 'Waiting...';
  bubble.setAttribute('role', 'status');
  bubble.setAttribute('aria-live', 'polite');

  // Create character
  const character = document.createElement('div');
  character.className = 'agent-character';

  // 에이전트 별 랜덤 아바타 지정
  let assignedAvatar = agentAvatars.get(agent.id);
  if (!assignedAvatar && availableAvatars.length > 0) {
    assignedAvatar = availableAvatars[Math.floor(Math.random() * availableAvatars.length)];
    agentAvatars.set(agent.id, assignedAvatar);
  } else if (!assignedAvatar) {
    assignedAvatar = idleAvatar || 'avatar_0.png';
  }

  if (assignedAvatar) {
    character.style.backgroundImage = `url('./public/characters/${assignedAvatar}')`;
  }

  // 카드 타입 구분 (배지 및 테두리)
  let typeLabel = 'Main';
  let typeClass = 'type-main';
  if (agent.isSubagent) {
    typeLabel = agent.agentType ? agent.agentType : 'Sub';
    typeClass = 'type-sub';
  } else if (agent.isTeammate) {
    typeLabel = agent.teammateName || 'Team';
    typeClass = 'type-team';
  }
  card.classList.add(typeClass);

  // 상단 배지
  const typeTag = document.createElement('span');
  typeTag.className = `type-tag ${typeClass}`;
  typeTag.textContent = typeLabel;
  typeTag.title = agent.projectPath || '';
  card.appendChild(typeTag);

  // 에이전트 이름
  const nameBadge = document.createElement('div');
  nameBadge.className = 'agent-name';
  nameBadge.textContent = agent.displayName || typeLabel;
  nameBadge.title = agent.displayName;

  const projectNameStr = agent.projectPath ? agent.projectPath.split(/[\\/]/).pop() : 'Default';
  if (!agent.displayName || agent.displayName === projectNameStr || agent.displayName === 'Agent') {
    nameBadge.style.display = 'none';
  }

  // Assemble card
  card.appendChild(bubble);
  card.appendChild(character);
  card.appendChild(nameBadge);

  // 터미널 포커스 버튼
  const focusBtn = document.createElement('button');
  focusBtn.className = 'focus-terminal-btn';
  focusBtn.textContent = '>';
  focusBtn.title = 'Focus terminal';
  focusBtn.setAttribute('aria-label', `Focus terminal for ${agent.displayName || 'Agent'}`);
  focusBtn.onclick = (e) => {
    e.stopPropagation();
    if (window.electronAPI && window.electronAPI.focusTerminal) {
      window.electronAPI.focusTerminal(agent.id);
    }
    focusBtn.classList.add('clicked');
    setTimeout(() => focusBtn.classList.remove('clicked'), 300);
  };
  card.appendChild(focusBtn);

  // 캐릭터 찌르기(Poke) 상호작용
  character.style.cursor = 'pointer';
  const pokeMessages = [
    "앗, 깜짝이야!",
    "열심히 일하는 중입니다!",
    "코드 짜는 중...",
    "커피가 필요해요",
    "이 부분 버그 아니죠?",
    "간지러워요!",
    "제 타수 엄청 빠르죠?",
    "칭찬해주세요!"
  ];

  let pokeTimeout = null;
  character.onclick = (e) => {
    e.stopPropagation();
    if (pokeTimeout) return;
    const originalText = bubble.textContent;
    const randomMsg = pokeMessages[Math.floor(Math.random() * pokeMessages.length)];
    bubble.textContent = randomMsg;
    bubble.style.borderColor = '#ff4081';
    pokeTimeout = setTimeout(() => {
      bubble.style.borderColor = '';
      pokeTimeout = null;
      bubble.textContent = originalText;
    }, 2000);
  };

  return card;
}
