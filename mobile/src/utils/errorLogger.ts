// Comprehensive error logging system for terminal

type ErrorLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  timestamp: string;
  level: ErrorLevel;
  message: string;
  error?: any;
  context?: Record<string, any>;
  stack?: string;
}

class ErrorLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatError(error: any): string {
    if (!error) return 'No error details';
    
    if (error instanceof Error) {
      return JSON.stringify({
        name: error.name,
        message: error.message,
        stack: error.stack,
      }, null, 2);
    }
    
    return JSON.stringify(error, null, 2);
  }

  private log(level: ErrorLevel, message: string, error?: any, context?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      message,
      error: error ? this.formatError(error) : undefined,
      context,
      stack: error?.stack,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with formatting
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`${prefix} ${message}`);
    
    if (context) {
      console.log('Context:', JSON.stringify(context, null, 2));
    }
    
    if (error) {
      console.log('Error Details:', this.formatError(error));
    }
    
    if (error?.stack) {
      console.log('Stack Trace:', error.stack);
    }
    console.log(`${'='.repeat(80)}\n`);
  }

  error(message: string, error?: any, context?: Record<string, any>) {
    this.log('error', message, error, context);
  }

  warn(message: string, error?: any, context?: Record<string, any>) {
    this.log('warn', message, error, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, undefined, context);
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, undefined, context);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  // Log React Native errors
  logReactError(error: Error, isFatal: boolean = false) {
    this.error(
      `React Native ${isFatal ? 'FATAL' : 'NON-FATAL'} Error`,
      error,
      {
        isFatal,
        errorBoundary: true,
      }
    );
  }

  // Log API errors
  logApiError(endpoint: string, error: any, requestData?: any) {
    this.error(
      `API Error: ${endpoint}`,
      error,
      {
        endpoint,
        requestData,
        response: error?.response?.data,
        status: error?.response?.status,
      }
    );
  }

  // Log navigation errors
  logNavigationError(route: string, error: any) {
    this.error(
      `Navigation Error: ${route}`,
      error,
      {
        route,
        navigationError: true,
      }
    );
  }
}

export const errorLogger = new ErrorLogger();

// Global error handlers
if (typeof global !== 'undefined') {
  // Catch unhandled promise rejections
  const originalUnhandledRejection = global.onunhandledrejection;
  global.onunhandledrejection = (event: any) => {
    errorLogger.error(
      'Unhandled Promise Rejection',
      event?.reason || event,
      { type: 'unhandledRejection' }
    );
    if (originalUnhandledRejection) {
      originalUnhandledRejection(event);
    }
  };

  // Log when app starts
  errorLogger.info('App starting...', {
    platform: 'react-native',
    timestamp: new Date().toISOString(),
  });
}

