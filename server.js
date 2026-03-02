const http = require('http');
const url = require('url');

// 설정
const CONFIG = {
  DEFAULT_PORT: 3456,
  MAX_MESSAGE_LENGTH: 200
};

// 상태 저장소
let agentStates = new Map();
let serverPort;

// 메인 윈도우 참조
let mainWindow = null;

function setMainWindow(window) {
  mainWindow = window;
}

// 포트 충돌 방지: 사용 가능한 포트 찾기
async function findAvailablePort(startPort = CONFIG.DEFAULT_PORT) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

// 상태 조회 공통 함수
function getAgentStates() {
  return Array.from(agentStates.entries()).map(([sessionId, data]) => ({
    sessionId,
    ...data
  }));
}

// HTTP 서버 생성
async function createHttpServer() {
  serverPort = await findAvailablePort(CONFIG.DEFAULT_PORT);
  console.log(`HTTP 서버 시작: 포트 ${serverPort}`);

  const httpServer = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // 상태 업데이트 엔드포인트
    if (req.method === 'POST' && parsedUrl.pathname === '/agent/status') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          if (!body || body.trim().length === 0) {
            res.writeHead(200); res.end(); return;
          }

          const data = JSON.parse(body);
          const sessionId = data.session_id || data.sessionId;
          const state = data.hook_event_name || data.state;
          let mappedState = state;
          let message = data.last_assistant_message || data.prompt || data.tool_name || data.message || "";

          // --- 에러/상태 감지 로직 (훅 기반 단순화) ---
          const isErrorState = state === 'PostToolUseFailure';

          if (isErrorState) {
            mappedState = 'Error';
            message = (data.error && data.error.message) || data.error || message || 'Execution Failed';
          }
          // 2. 강제 중단 감지 (사용자 개입 필요 상황)
          else if (data.is_interrupt === true) {
            mappedState = 'Help';
            message = 'Interrupted';
          }
          // 3. 일반적인 훅 이벤트 매핑
          else {
            // renderer.js에서 처리하므로 mappedState는 유지하되, 
            // 텍스트 내의 'error' 단어 때문에 mappedState가 변하지 않도록 함
            mappedState = state;
          }

          // 메시지 길이 제한
          if (message.length > CONFIG.MAX_MESSAGE_LENGTH) message = message.substring(0, CONFIG.MAX_MESSAGE_LENGTH - 3) + "...";

          if (sessionId && mappedState) {
            console.log(`[Server] Update: [${mappedState}] ${message}`);
            // 디버깅을 위한 전체 데이터 로그
            // console.log('Raw payload:', JSON.stringify(data, null, 2));

            agentStates.set(sessionId, { state: mappedState, message, timestamp: Date.now() });

            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('agent-state-update', { sessionId, state: mappedState, message });
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          console.error('데이터 파싱 오류:', error.message);
          res.writeHead(200); res.end();
        }
      });
    } else if (req.method === 'GET' && parsedUrl.pathname === '/agent/states') {
      const states = getAgentStates();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(states));
    } else if (req.method === 'GET' && parsedUrl.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', port: serverPort }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  httpServer.listen(serverPort, 'localhost');
  return httpServer;
}

function getServerPort() {
  return serverPort;
}

module.exports = {
  createHttpServer,
  getAgentStates,
  setMainWindow,
  getServerPort,
  CONFIG
};
