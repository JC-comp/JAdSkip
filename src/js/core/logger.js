class LogEntry {
    constructor(message) {
        this.message = message;
        this.timestamp = new Date().toISOString();
    }

    toString() {
        return `[${this.timestamp}] ${this.message}`;
    }
}

class Logger {
    constructor() {
        this.logs = [];
        this.debugMode = false;
    }

    log(message) {
        const logEntry = new LogEntry(message);
        this.logs.push(logEntry);
        if (this.debugMode) {
            console.log(logEntry.toString());
        }
    }

    getLogs() {
        return this.logs;
    }

    clearLogs() {
        this.logs = [];
    }

    setDebugMode(enabled) {
        this.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
        this.debugMode = enabled;
    }

    toString() {
        return this.logs.map(log => log.toString()).join('\n');
    }
}