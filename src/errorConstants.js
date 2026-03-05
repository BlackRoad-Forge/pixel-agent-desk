/**
 * P0-3: Error Recovery System - Error Constants
 * 에러 코드, 카테고리, 심각도, 복구 액션 타입 정의
 */

// 에러 카테고리
const ErrorCategory = {
  FILE_IO: 'FILE_IO',
  NETWORK: 'NETWORK',
  PARSE: 'PARSE',
  PERMISSION: 'PERMISSION',
  AGENT_LIFECYCLE: 'AGENT_LIFECYCLE',
  UI_RENDER: 'UI_RENDER',
  HOOK_SERVER: 'HOOK_SERVER',
  UNKNOWN: 'UNKNOWN'
};

// 에러 심각도
const ErrorSeverity = {
  FATAL: 'fatal',      // 앱 계속 실행 불가
  ERROR: 'error',      // 기능 작동하지 않음
  WARNING: 'warning',  // 기능 제한적 작동
  INFO: 'info'         // 정보성
};

// 복구 액션 타입
const RecoveryActionType = {
  RETRY: 'retry',
  SKIP: 'skip',
  RESET: 'reset',
  OPEN_SETTINGS: 'open_settings',
  VIEW_LOGS: 'view_logs',
  COPY_ERROR: 'copy_error',
  OPEN_DOCS: 'open_docs',
  REPORT_BUG: 'report_bug'
};

// 표준 에러 코드
const ErrorCodes = {
  SETTINGS_NOT_FOUND: 'E001',
  SETTINGS_PARSE_ERROR: 'E002',
  AVATAR_LOAD_FAILED: 'E003',
  PORT_CONFLICT: 'E004',
  FOCUS_FAILED: 'E005',
  HOOK_SERVER_ERROR: 'E006',
  LOG_WRITE_FAILED: 'E007',
  AGENT_NOT_FOUND: 'E008',
  AGENTS_LOAD_FAILED: 'E009'
};

module.exports = {
  ErrorCategory,
  ErrorSeverity,
  RecoveryActionType,
  ErrorCodes
};
