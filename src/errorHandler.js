/**
 * P0-3: Error Recovery System - Central Error Handler
 * 모든 에러를 캡처, 분류, 로깅하고 UI에 전달
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const { ErrorSeverity, ErrorCategory } = require('./errorConstants');
const { getMessageByErrorCode, getMessageByErrorName } = require('./errorMessages');

class ErrorHandler {
  constructor() {
    this.mainWindow = null;
    this.logPath = path.join(app.getPath('userData'), 'logs');
    this.currentLogFile = null;
    this.errorCount = 0;
    this.deduplicationSet = new Set();
    this.setupLogDirectory();
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  setupLogDirectory() {
    try {
      if (!fs.existsSync(this.logPath)) {
        fs.mkdirSync(this.logPath, { recursive: true });
      }
      this.rotateLogFile();
    } catch (e) {
      console.error('[ErrorHandler] Failed to setup log directory:', e);
    }
  }

  rotateLogFile() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.currentLogFile = path.join(this.logPath, `error-${timestamp}.log`);

    // 오래된 로그 파일 정리 (최대 5개, 10MB 제한)
    try {
      const files = fs.readdirSync(this.logPath)
        .filter(f => f.startsWith('error-') && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(this.logPath, f),
          time: fs.statSync(path.join(this.logPath, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      // 5개 초과 시 삭제
      if (files.length > 5) {
        files.slice(5).forEach(f => {
          try {
            fs.unlinkSync(f.path);
          } catch (e) { /* ignore */ }
        });
      }

      // 현재 파일이 10MB 초과 시 회전
      if (files.length > 0) {
        const newest = files[0];
        const stats = fs.statSync(newest.path);
        if (stats.size > 10 * 1024 * 1024) {
          // 새 파일 생성
          const newTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
          this.currentLogFile = path.join(this.logPath, `error-${newTimestamp}.log`);
        }
      }
    } catch (e) {
      console.error('[ErrorHandler] Failed to rotate logs:', e);
    }
  }

  /**
   * P1-2: 에러를 캡처하고 처리합니다 (비동기 로깅)
   * @param {Error|object} error - 에러 객체
   * @param {object} context - 추가 컨텍스트
   * @returns {object} 정규화된 에러 컨텍스트
   */
  async capture(error, context = {}) {
    try {
      const errorContext = this.normalize(error, context);

      // 중복 제거 (같은 에러 코드 + 메시지 조합)
      const dedupKey = `${errorContext.code}:${errorContext.message}`;
      if (this.deduplicationSet.has(dedupKey)) {
        return errorContext; // 이미 처리된 에러는 건너뜀
      }
      this.deduplicationSet.add(dedupKey);

      // 5초 후 중복 제거 세트에서 제거
      setTimeout(() => {
        this.deduplicationSet.delete(dedupKey);
      }, 5000);

      // P1-2: 비동기 로그 기록
      await this.logToFile(errorContext);

      // Renderer로 전송
      this.sendToRenderer(errorContext);

      // 카운터 증가
      this.errorCount++;

      return errorContext;
    } catch (e) {
      console.error('[ErrorHandler] Failed to capture error:', e);
      return this.normalize(error, context);
    }
  }

  /**
   * 에러를 표준 형식으로 정규화합니다.
   */
  normalize(error, context) {
    const errorCode = context.code || 'E000';
    const messageData = getMessageByErrorCode(errorCode);

    return {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      code: errorCode,
      name: error?.name || context.name || 'UnknownError',
      message: error?.message || context.message || messageData.short || 'Unknown error',
      userMessage: messageData.short || messageData.userMessage || '작업을 완료할 수 없어요',
      explanation: messageData.detail || messageData.explanation || '',
      severity: context.severity || ErrorSeverity.ERROR,
      category: context.category || ErrorCategory.UNKNOWN,
      stack: error?.stack || '',
      recovery: messageData.recovery || [],
      context: context
    };
  }

  /**
   * 고유 ID 생성
   */
  generateId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * P1-2: 로그 파일에 기록 (비동기)
   */
  async logToFile(errorContext) {
    if (!this.currentLogFile) return;

    try {
      const logEntry = {
        timestamp: errorContext.timestamp,
        id: errorContext.id,
        code: errorContext.code,
        severity: errorContext.severity,
        message: errorContext.message,
        stack: errorContext.stack,
        context: errorContext.context
      };

      const logLine = JSON.stringify(logEntry) + '\n';

      // P1-2: 비동기 파일 쓰기 (fs.promises 사용)
      await fs.promises.appendFile(this.currentLogFile, logLine, 'utf8');
    } catch (e) {
      console.error('[ErrorHandler] Failed to write log:', e);
    }
  }

  /**
   * Renderer 프로세스로 에러 전송
   */
  sendToRenderer(errorContext) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    try {
      this.mainWindow.webContents.send('error-occurred', errorContext);
    } catch (e) {
      console.error('[ErrorHandler] Failed to send to renderer:', e);
    }
  }

  /**
   * 에러 카운트 초기화
   */
  resetErrorCount() {
    this.errorCount = 0;
  }

  /**
   * 최근 로그 파일 내용 읽기
   */
  readRecentLogs(maxLines = 100) {
    if (!this.currentLogFile || !fs.existsSync(this.currentLogFile)) {
      return '로그 파일이 없어요';
    }

    try {
      const content = fs.readFileSync(this.currentLogFile, 'utf8');
      const lines = content.trim().split('\n');
      const recentLines = lines.slice(-maxLines);

      return recentLines.map(line => {
        try {
          const parsed = JSON.parse(line);
          return `[${parsed.timestamp}] [${parsed.code}] ${parsed.message}`;
        } catch (e) {
          return line;
        }
      }).join('\n');
    } catch (e) {
      return `로그 읽기 실패: ${e.message}`;
    }
  }

  /**
   * 현재 로그 파일 경로 반환
   */
  getLogFilePath() {
    return this.currentLogFile;
  }
}

// 싱글톤 인스턴스
const errorHandler = new ErrorHandler();

module.exports = errorHandler;
