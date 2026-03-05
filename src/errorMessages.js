/**
 * P0-3: Error Recovery System - User-Friendly Messages
 * 기술적 에러를 사용자 친화적 메시지로 변환
 */

const ErrorMessages = {
  // 파일 I/O 에러
  'ENOENT': {
    userMessage: '파일을 찾을 수 없어요',
    explanation: '필요한 파일이 존재하지 않거나 경로가 잘못되었을 수 있어요',
    recovery: ['RESET', 'VIEW_LOGS']
  },
  'EACCES': {
    userMessage: '파일에 접근할 수 없어요',
    explanation: '파일 권한이 없거나 다른 프로그램이 사용 중일 수 있어요',
    recovery: ['VIEW_LOGS', 'OPEN_DOCS']
  },
  'EEXIST': {
    userMessage: '파일이 이미 존재해요',
    explanation: '같은 이름의 파일을 만들 수 없어요',
    recovery: ['SKIP', 'VIEW_LOGS']
  },

  // 파싱 에러
  'SyntaxError': {
    userMessage: '파일 형식이 올바르지 않아요',
    explanation: 'JSON 형식이 잘못되었거나 파일이 손상되었을 수 있어요',
    recovery: ['RESET', 'VIEW_LOGS']
  },
  'UnexpectedToken': {
    userMessage: '파일 내용을 읽을 수 없어요',
    explanation: '파일 인코딩이나 형식이 올바르지 않아요',
    recovery: ['RESET', 'VIEW_LOGS']
  },

  // 네트워크 에러
  'EADDRINUSE': {
    userMessage: '포트가 이미 사용 중이에요',
    explanation: '다른 프로그램이 같은 포트를 사용하고 있어요',
    recovery: ['RETRY', 'VIEW_LOGS']
  },
  'ETIMEDOUT': {
    userMessage: '연결 시간이 초과되었어요',
    explanation: '서버 응답이 너무 늦거나 인터넷 연결을 확인해주세요',
    recovery: ['RETRY', 'OPEN_DOCS']
  },
  'ECONNREFUSED': {
    userMessage: '연결이 거부되었어요',
    explanation: '서버가 실행 중이지 않거나 연결을 거부했어요',
    recovery: ['RETRY', 'VIEW_LOGS']
  },

  // 기본값
  'default': {
    userMessage: '작업을 완료할 수 없어요',
    explanation: '예상치 못한 문제가 발생했어요',
    recovery: ['VIEW_LOGS', 'COPY_ERROR']
  }
};

// 에러 코드별 메시지
const ErrorCodeMessages = {
  'E001': {
    short: '설정 파일을 찾을 수 없어요',
    detail: 'settings.json 파일이 존재하지 않아요. 새로 만들까요?',
    recovery: [
      { type: 'reset', label: '기본값으로 초기화' },
      { type: 'view_logs', label: '로그 보기' }
    ]
  },
  'E002': {
    short: '설정 파일 형식 오류',
    detail: 'settings.json 형식이 올바르지 않아요. 백업이 있어요',
    recovery: [
      { type: 'reset', label: '백업에서 복구' },
      { type: 'open_settings', label: '설정 폴더 열기' }
    ]
  },
  'E003': {
    short: '아바타를 불러올 수 없어요',
    detail: '아바타 이미지 파일을 찾을 수 없어요',
    recovery: [
      { type: 'retry', label: '다시 시도' },
      { type: 'skip', label: '기본 아이콘 사용' }
    ]
  },
  'E004': {
    short: '포트 충돌',
    detail: '후킹 서버 포트가 이미 사용 중이에요',
    recovery: [
      { type: 'retry', label: '다른 포트로 시도' },
      { type: 'view_logs', label: '로그 보기' }
    ]
  },
  'E005': {
    short: '포커스 실패',
    detail: '에이전트 창을 찾을 수 없어요',
    recovery: [
      { type: 'retry', label: '다시 시도' },
      { type: 'view_logs', label: '로그 보기' }
    ]
  },
  'E006': {
    short: '후킹 서버 오류',
    detail: 'HTTP 서버에서 문제가 발생했어요',
    recovery: [
      { type: 'retry', label: '다시 시작' },
      { type: 'view_logs', label: '로그 보기' }
    ]
  },
  'E007': {
    short: '로그 쓰기 실패',
    detail: '로그 파일을 저장할 수 없어요',
    recovery: [
      { type: 'skip', label: '계속 진행' },
      { type: 'open_settings', label: '설정 폴더 열기' }
    ]
  },
  'E008': {
    short: '에이전트를 찾을 수 없어요',
    detail: '해당 PID의 에이전트가 존재하지 않아요',
    recovery: [
      { type: 'skip', label: '닫기' },
      { type: 'view_logs', label: '로그 보기' }
    ]
  },
  'E009': {
    short: '에이전트 목록 로딩 실패',
    detail: '실행 중인 에이전트를 불러올 수 없어요',
    recovery: [
      { type: 'retry', label: '다시 시도' },
      { type: 'reset', label: '초기화' }
    ]
  },
  'E010': {
    short: '훅 데이터 검증 실패',
    detail: '클로드로부터 받은 데이터 형식이 올바르지 않아요. 스키마를 확인해주세요.',
    recovery: [
      { type: 'skip', label: '알림 보류' },
      { type: 'view_logs', label: '로그 보기' }
    ]
  },
  'E000': {
    short: '알 수 없는 오류',
    detail: '예상치 못한 문제가 발생했어요. 로그를 확인해주세요.',
    recovery: [
      { type: 'retry', label: '다시 시도' },
      { type: 'view_logs', label: '로그 보기' }
    ]
  }
};

/**
 * 에러 코드로 메시지 조회
 */
function getMessageByErrorCode(errorCode) {
  return ErrorCodeMessages[errorCode] || ErrorCodeMessages['E000'];
}

/**
 * 에러 이름으로 메시지 조회
 */
function getMessageByErrorName(errorName) {
  return ErrorMessages[errorName] || ErrorMessages['default'];
}

module.exports = {
  ErrorMessages,
  ErrorCodeMessages,
  getMessageByErrorCode,
  getMessageByErrorName
};
