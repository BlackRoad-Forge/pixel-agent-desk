/**
 * Pixel Agent Desk Renderer
 * 프레임 기반 2D 스프라이트 애니메이션 구조화
 */

const container = document.getElementById('container');
const character = document.getElementById('character');
const speechBubble = document.getElementById('speech-bubble');

// --- 스프라이트 시트 설정 ---
const SHEET = {
  cols: 9,        // 가로 프레임 수
  width: 48,      // 프레임 너비
  height: 64      // 프레임 높이
};

// --- 애니메이션 시퀀스 정의 ---
const ANIM_SEQUENCES = {
  working: { frames: [1, 2, 3, 4], fps: 8, loop: true },
  complete: { frames: [20, 21, 22, 23, 24, 25, 26, 27], fps: 6, loop: true },
  waiting: { frames: [32], fps: 1, loop: true },
  alert: { frames: [0, 31], fps: 4, loop: true }
};

// --- 상태별 맵핑 (단순화된 라벨 적용) ---
const stateConfig = {
  'SessionStart': { anim: 'waiting', class: 'state-waiting', label: 'Waiting...' },
  'UserPromptSubmit': { anim: 'working', class: 'state-working', label: 'Working...' },
  'PreToolUse': { anim: 'working', class: 'state-working', label: 'Working...' },
  'PostToolUse': { anim: 'working', class: 'state-working', label: 'Working...' },
  'PostToolUseFailure': { anim: 'alert', class: 'state-alert', label: 'Error!' },
  'Stop': { anim: 'complete', class: 'state-complete', label: 'Done!' },
  'Notification': { anim: 'alert', class: 'state-alert', label: 'Help!' },
  'SessionEnd': { anim: 'waiting', class: 'state-waiting', label: 'Waiting...' },
  'TaskCompleted': { anim: 'complete', class: 'state-complete', label: 'Done!' },
  'PermissionRequest': { anim: 'alert', class: 'state-alert', label: 'Help!' },
  'SubagentStart': { anim: 'working', class: 'state-working', label: 'Working...' },
  'SubagentStop': { anim: 'working', class: 'state-working', label: 'Working...' },
  'Idle': { anim: 'waiting', class: 'state-waiting', label: 'Waiting...' },
  // 시스템 내부 호환용
  'Thinking': { anim: 'working', class: 'state-working', label: 'Working...' },
  'Working': { anim: 'working', class: 'state-working', label: 'Working...' },
  'Complete': { anim: 'complete', class: 'state-complete', label: 'Done!' },
  'Alert': { anim: 'alert', class: 'state-alert', label: 'Help!' },
  'Error': { anim: 'alert', class: 'state-alert', label: 'Error!' }
};

let currentAnimName = null;
let animInterval = null;
let currentFrameIdx = 0;

// --- 타이머 관련 변수 ---
let startTime = null;
let timerInterval = null;
let lastFormattedTime = '';

/**
 * 밀리초를 MM:SS 형식으로 변환
 */
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * 프레임 인덱스를 background-position으로 변환하여 적용
 */
function drawFrame(frameIndex) {
  if (!character) return;
  const col = frameIndex % SHEET.cols;
  const row = Math.floor(frameIndex / SHEET.cols);

  const x = col * -SHEET.width;
  const y = row * -SHEET.height;

  character.style.backgroundPosition = `${x}px ${y}px`;
}

/**
 * 애니메이션 재생 엔진
 */
function playAnimation(animName) {
  const sequence = ANIM_SEQUENCES[animName];
  if (!sequence || currentAnimName === animName) return;

  // 이전 타이머 정리
  if (animInterval) clearInterval(animInterval);

  currentAnimName = animName;
  currentFrameIdx = 0;

  // 첫 프레임 즉시 실행
  drawFrame(sequence.frames[0]);

  // 프레임 루프 시작
  animInterval = setInterval(() => {
    currentFrameIdx++;

    if (currentFrameIdx >= sequence.frames.length) {
      if (sequence.loop) {
        currentFrameIdx = 0;
      } else {
        clearInterval(animInterval);
        return;
      }
    }

    drawFrame(sequence.frames[currentFrameIdx]);
  }, 1000 / sequence.fps);
}

/**
 * 상태 업데이트 (상세 메시지 무시, 라벨 및 타이머 사용)
 */
function updateState(state, message) {
  const config = stateConfig[state] || stateConfig['Stop'];

  // 컨테이너 클래스 업데이트
  if (container) container.className = 'container ' + config.class;

  // 애니메이션 재생
  playAnimation(config.anim);

  // 타이머 로직 처리
  if (config.anim === 'working') {
    // 작업 시작 시 타이머 초기화 및 시작
    if (!startTime) {
      startTime = Date.now();
      if (timerInterval) clearInterval(timerInterval);

      timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        lastFormattedTime = formatTime(elapsed);
        if (speechBubble) {
          speechBubble.textContent = `${config.label} (${lastFormattedTime})`;
        }
      }, 1000);
    }
    // 즉시 표시
    const elapsed = Date.now() - (startTime || Date.now());
    lastFormattedTime = formatTime(elapsed);
    if (speechBubble) speechBubble.textContent = `${config.label} (${lastFormattedTime})`;

  } else if (config.anim === 'complete') {
    // 작업 완료 시 타이머 멈춤 및 최종 시간 유지
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (speechBubble) {
      const finalTime = lastFormattedTime || '00:00';
      speechBubble.textContent = `${config.label} (${finalTime})`;
    }
    startTime = null; // 다음 작업을 위해 초기화

  } else {
    // 그 외 상태 (Waiting, Alert 등) 타이머 초기화
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    startTime = null;
    lastFormattedTime = '';
    if (speechBubble) speechBubble.textContent = config.label || 'Waiting...';
  }

  console.log(`[Renderer] State: ${state}, Label: ${config.label}, Timer: ${lastFormattedTime}`);
}

// IPC 수신
if (window.electronAPI) {
  window.electronAPI.onStateUpdate((data) => {
    updateState(data.state, data.message);
  });
}

// 초기 상태
updateState('Idle');

// 가시성 처리
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (animInterval) clearInterval(animInterval);
  } else if (currentAnimName) {
    const anim = currentAnimName;
    currentAnimName = null; // 초기화 후 재시작 유도
    playAnimation(anim);
  }
});
