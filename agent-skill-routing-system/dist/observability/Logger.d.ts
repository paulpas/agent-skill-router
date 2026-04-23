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
export declare class Logger {
    private config;
    private category;
    private logStream;
    private logDirectory;
    constructor(category: string, config?: Partial<LoggerConfig>);
    /**
     * Log at debug level
     */
    debug(message: string, data?: Record<string, unknown>): void;
    /**
     * Log at info level
     */
    info(message: string, data?: Record<string, unknown>): void;
    /**
     * Log at warn level
     */
    warn(message: string, data?: Record<string, unknown>): void;
    /**
     * Log at error level
     */
    error(message: string, data?: Record<string, unknown>): void;
    /**
     * Main log function
     */
    private log;
    /**
     * Check if log level is enabled
     */
    private isLevelEnabled;
    /**
     * Generate a task ID
     */
    private generateTaskId;
    /**
     * Format log entry
     */
    private formatEntry;
    /**
     * Write to console
     */
    private writeToConsole;
    /**
     * Get ANSI color code for log level
     */
    private getColorForLevel;
    /**
     * Ensure log directory exists
     */
    private ensureLogDirectory;
    /**
     * Setup log file stream
     */
    private setupLogStream;
    /**
     * Close the logger
     */
    close(): Promise<void>;
    /**
     * Create a logger with a different category
     */
    withCategory(category: string): Logger;
    /**
     * Create a logger for a specific task
     */
    forTask(_taskId: string): Logger;
}
//# sourceMappingURL=Logger.d.ts.map