"use strict";
// Structured Logger for the Agent Skill Routing System
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fs_2 = require("fs");
/**
 * Logger class for structured logging
 */
class Logger {
    config;
    category;
    logStream = null;
    logDirectory;
    constructor(category, config = {}) {
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
    debug(message, data) {
        this.log('debug', message, data);
    }
    /**
     * Log at info level
     */
    info(message, data) {
        this.log('info', message, data);
    }
    /**
     * Log at warn level
     */
    warn(message, data) {
        this.log('warn', message, data);
    }
    /**
     * Log at error level
     */
    error(message, data) {
        this.log('error', message, data);
    }
    /**
     * Main log function
     */
    log(level, message, data) {
        // Check if level is enabled
        if (!this.isLevelEnabled(level)) {
            return;
        }
        const entry = {
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
    isLevelEnabled(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.config.level);
    }
    /**
     * Generate a task ID
     */
    generateTaskId() {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Format log entry
     */
    formatEntry(entry) {
        return JSON.stringify(entry);
    }
    /**
     * Write to console
     */
    writeToConsole(entry) {
        const color = this.getColorForLevel(entry.level);
        const timestamp = entry.timestamp.split('T')[1].slice(0, 12);
        console.log(`${color}[${timestamp}] [${entry.category}] ${entry.message}${entry.data && this.config.includePayloads ? ' ' + JSON.stringify(entry.data) : ''}\x1b[0m`);
    }
    /**
     * Get ANSI color code for log level
     */
    getColorForLevel(level) {
        const colors = {
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
    ensureLogDirectory() {
        try {
            if (!fs_1.default.existsSync(this.logDirectory)) {
                fs_1.default.mkdirSync(this.logDirectory, { recursive: true });
            }
        }
        catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }
    /**
     * Setup log file stream
     */
    setupLogStream() {
        const timestamp = new Date().toISOString().split('T')[0];
        const logFile = path_1.default.join(this.logDirectory, `agent-routing-${timestamp}.log`);
        try {
            this.logStream = (0, fs_2.createWriteStream)(logFile, { flags: 'a' });
        }
        catch (error) {
            console.error('Failed to setup log stream:', error);
        }
    }
    /**
     * Close the logger
     */
    async close() {
        if (this.logStream) {
            await new Promise((resolve) => this.logStream.end(resolve));
            this.logStream = null;
        }
    }
    /**
     * Create a logger with a different category
     */
    withCategory(category) {
        return new Logger(category, this.config);
    }
    /**
     * Create a logger for a specific task
     */
    forTask(_taskId) {
        return new Logger(this.category, {
            ...this.config,
            includePayloads: true,
        });
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map