// Structured Logger for the Agent Skill Routing System

import fs from 'fs';
import path from 'path';
import { createWriteStream, WriteStream } from 'fs';
import { LogEntry } from '../core/types.js';

/**
 * Log level
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  includePayloads: boolean;
  logDirectory: string;
  logToConsole: boolean;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private config: LoggerConfig;
  private category: string;
  private logStream: WriteStream | null = null;
  private logDirectory: string;

  constructor(category: string, config: Partial<LoggerConfig> = {}) {
    this.category = category;
    this.config = {
      level: 'info',
      includePayloads: false,
      logDirectory: './logs',
      logToConsole: true,
      ...config,
    };
    this.logDirectory = this.config.logDirectory;

    // Ensure log directory exists
    this.ensureLogDirectory();

    // Setup file stream if needed
    if (!this.config.logToConsole) {
      this.setupLogStream();
    }
  }

  /**
   * Log at debug level
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  /**
   * Log at info level
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  /**
   * Log at warn level
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  /**
   * Log at error level
   */
  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }

  /**
   * Main log function
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    // Check if level is enabled
    if (!this.isLevelEnabled(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      taskId: data?.taskId ? String(data.taskId) : this.generateTaskId(),
      level,
      category: this.category,
      message,
      data: this.config.includePayloads ? data : undefined,
    };

    // Format log entry
    const formatted = this.formatEntry(entry);

    // Write to console
    if (this.config.logToConsole) {
      this.writeToConsole(entry);
    }

    // Write to file
    if (this.logStream) {
      this.logStream.write(formatted + '\n');
    }
  }

  /**
   * Check if log level is enabled
   */
  private isLevelEnabled(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.config.level);
  }

  /**
   * Generate a task ID
   */
  private generateTaskId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format log entry
   */
  private formatEntry(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  /**
   * Write to console
   */
  private writeToConsole(entry: LogEntry): void {
    const color = this.getColorForLevel(entry.level);
    const timestamp = entry.timestamp.split('T')[1].slice(0, 12);

    console.log(
      `${color}[${timestamp}] [${entry.category}] ${entry.message}${entry.data && this.config.includePayloads ? ' ' + JSON.stringify(entry.data) : ''}\x1b[0m`
    );
  }

  /**
   * Get ANSI color code for log level
   */
  private getColorForLevel(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
    };
    return colors[level] || '\x1b[0m';
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.logDirectory)) {
        fs.mkdirSync(this.logDirectory, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * Setup log file stream
   */
  private setupLogStream(): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const logFile = path.join(
      this.logDirectory,
      `agent-routing-${timestamp}.log`
    );

    try {
      this.logStream = createWriteStream(logFile, { flags: 'a' });
    } catch (error) {
      console.error('Failed to setup log stream:', error);
    }
  }

  /**
   * Close the logger
   */
  async close(): Promise<void> {
    if (this.logStream) {
      await new Promise((resolve) => this.logStream!.end(resolve));
      this.logStream = null;
    }
  }

  /**
   * Create a logger with a different category
   */
  withCategory(category: string): Logger {
    return new Logger(category, this.config);
  }

  /**
   * Create a logger for a specific task
   */
  forTask(_taskId: string): Logger {
    return new Logger(this.category, {
      ...this.config,
      includePayloads: true,
    });
  }
}
