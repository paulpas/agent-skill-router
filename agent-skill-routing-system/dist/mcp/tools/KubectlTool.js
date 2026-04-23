"use strict";
// MCP Tool: Kubectl Command Execution
Object.defineProperty(exports, "__esModule", { value: true });
exports.KubectlTool = void 0;
const types_js_1 = require("../types.js");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Kubectl Tool for executing kubectl commands
 */
class KubectlTool extends types_js_1.BaseMCPTool {
    constructor(timeoutMs = 30000) {
        super('run_kubectl_command', 'Execute kubectl commands for Kubernetes cluster management. Supports commands like get, describe, logs, apply, delete, etc.', timeoutMs);
    }
    /**
     * Execute a kubectl command
     */
    async execute(args) {
        const startTime = Date.now();
        try {
            this.validateArgs(args, ['command']);
            const command = String(args.command);
            const fullCommand = `kubectl ${command}`;
            const result = await this.executeCommand(fullCommand);
            return {
                success: true,
                output: result,
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
     * Execute a kubectl command with security validation
     */
    async executeCommand(command) {
        // Security check for dangerous operations
        const dangerousPatterns = [
            /kubectl\s+run\s+.*--generator=run-pod\/v1/,
            /kubectl\s+delete\s+--all/,
            /kubectl\s+create\s+serviceaccount\s+.*--cluster-role=cluster-admin/,
        ];
        for (const pattern of dangerousPatterns) {
            if (pattern.test(command)) {
                throw new Error('Dangerous kubectl command detected and blocked');
            }
        }
        const { stdout, stderr } = await execAsync(command, {
            timeout: this.timeoutMs,
            maxBuffer: 1024 * 1024 * 10,
        });
        if (stderr && stderr.includes('Error')) {
            throw new Error(stderr);
        }
        return stdout || stderr || 'Command executed successfully';
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
                    command: {
                        type: 'string',
                        description: 'The kubectl subcommand to execute (e.g., "get pods", "describe node node-1")',
                    },
                },
                required: ['command'],
            },
        };
    }
}
exports.KubectlTool = KubectlTool;
//# sourceMappingURL=KubectlTool.js.map