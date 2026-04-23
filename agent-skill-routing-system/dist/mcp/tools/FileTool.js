"use strict";
// MCP Tool: File Operations
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileTool = void 0;
const types_js_1 = require("../types.js");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
/**
 * File Tool for reading and writing files
 */
class FileTool extends types_js_1.BaseMCPTool {
    allowedDirectories = [];
    constructor(timeoutMs = 30000) {
        super('file_operations', 'Read and write files with security validations', timeoutMs);
        // Configure allowed directories for security
        this.allowedDirectories = [
            process.cwd(),
            path_1.default.join(process.cwd(), 'src'),
            path_1.default.join(process.cwd(), 'tests'),
        ];
    }
    /**
     * Execute file operations
     */
    async execute(args) {
        const startTime = Date.now();
        try {
            this.validateArgs(args, ['operation', 'filepath']);
            const operation = String(args.operation);
            const filepath = String(args.filepath);
            // Validate filepath
            const resolvedPath = this.validatePath(filepath);
            // Execute operation
            let output;
            switch (operation) {
                case 'read':
                    output = await this.readFile(resolvedPath);
                    break;
                case 'write':
                    this.validateArgs(args, ['content']);
                    const content = String(args.content);
                    output = await this.writeFile(resolvedPath, content);
                    break;
                case 'append':
                    this.validateArgs(args, ['content']);
                    const appendContent = String(args.content);
                    output = await this.appendFile(resolvedPath, appendContent);
                    break;
                case 'exists':
                    output = await this.fileExists(resolvedPath);
                    break;
                case 'list':
                    output = await this.listFiles(resolvedPath);
                    break;
                default:
                    throw new Error(`Unknown operation: ${operation}`);
            }
            return {
                success: true,
                output,
                latencyMs: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                latencyMs: Date.now() - startTime,
            };
        }
    }
    /**
     * Validate and resolve filepath
     */
    validatePath(filepath) {
        // Prevent path traversal
        if (filepath.includes('..') || filepath.startsWith('/')) {
            throw new Error('Path traversal not allowed');
        }
        // Check if directory is allowed
        const resolvedPath = path_1.default.resolve(filepath);
        const isAllowed = this.allowedDirectories.some((dir) => resolvedPath.startsWith(dir));
        if (!isAllowed) {
            throw new Error(`Access to directory not allowed: ${path_1.default.dirname(resolvedPath)}`);
        }
        return resolvedPath;
    }
    /**
     * Read file contents
     */
    async readFile(filepath) {
        try {
            return await fs_1.promises.readFile(filepath, 'utf-8');
        }
        catch (error) {
            throw new Error(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Write file contents
     */
    async writeFile(filepath, content) {
        try {
            await fs_1.promises.writeFile(filepath, content, 'utf-8');
        }
        catch (error) {
            throw new Error(`Failed to write file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Append to file
     */
    async appendFile(filepath, content) {
        try {
            await fs_1.promises.appendFile(filepath, content, 'utf-8');
        }
        catch (error) {
            throw new Error(`Failed to append to file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Check if file exists
     */
    async fileExists(filepath) {
        try {
            await fs_1.promises.access(filepath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * List directory contents
     */
    async listFiles(dirpath) {
        try {
            return await fs_1.promises.readdir(dirpath);
        }
        catch (error) {
            throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get tool specification
     */
    getSpecification() {
        return {
            name: this.name,
            description: this.description,
            parameters: {
                type: 'object',
                properties: {
                    operation: {
                        type: 'string',
                        enum: ['read', 'write', 'append', 'exists', 'list'],
                        description: 'The file operation to perform',
                    },
                    filepath: {
                        type: 'string',
                        description: 'The file path',
                    },
                    content: {
                        type: 'string',
                        description: 'Content to write (for write/append operations)',
                    },
                },
                required: ['operation', 'filepath'],
            },
        };
    }
}
exports.FileTool = FileTool;
//# sourceMappingURL=FileTool.js.map