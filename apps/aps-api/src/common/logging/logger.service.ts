import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

@Injectable()
export class JsonLogger implements NestLoggerService {
  private readonly serviceName: string;
  private readonly level: LogLevel;

  constructor(config: ConfigService) {
    this.serviceName = config.getOrThrow<string>('app.serviceName');
    this.level = config.getOrThrow<LogLevel>('app.logLevel');
  }

  log(message: string, context?: string): void {
    this.write('info', message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.write('error', message, context, { trace: trace ? 'redacted' : undefined });
  }

  warn(message: string, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: string, context?: string): void {
    this.write('debug', message, context);
  }

  private write(level: LogLevel, message: string, context?: string, extra: Record<string, unknown> = {}): void {
    if (!this.shouldLog(level)) {
      return;
    }
    const event = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      context,
      message,
      ...extra
    };
    const line = JSON.stringify(event);
    if (level === 'error') {
      process.stderr.write(`${line}\n`);
      return;
    }
    process.stdout.write(`${line}\n`);
  }

  private shouldLog(level: LogLevel): boolean {
    const order: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };
    return order[level] <= order[this.level];
  }
}
