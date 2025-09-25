import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface LogEntry {
  timestamp: string;
  username: string;
  action: string;
  result: string;
  details?: any;
  ip: string;
  userAgent: string;
}

export class AuditService {
  private readonly logDir: string;
  
  constructor() {
    this.logDir = join(__dirname, '../../logs');
    this.ensureLogDirExists();
  }

  private ensureLogDirExists(): void {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  async addLogEntry(username: string, action: string, result: string, details?: any): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const logEntry: LogEntry = {
        timestamp,
        username,
        action,
        result,
        details,
        ip: details?.ip || 'unknown',
        userAgent: details?.userAgent || 'unknown'
      };
      
      // Log en consola (sin datos sensibles)
      console.log(`📝 ${timestamp} - ${action} - ${result}`);
      
      // Guardar en archivo JSONL
      const logFile = join(this.logDir, 'security_events.jsonl');
      writeFileSync(logFile, JSON.stringify(logEntry) + '\n', { flag: 'a' });
      
      // Log específico para cambios de contraseña
      if (action === 'change_password') {
        const passwordLogFile = join(this.logDir, 'password_changes.jsonl');
        writeFileSync(passwordLogFile, JSON.stringify(logEntry) + '\n', { flag: 'a' });
      }
      
    } catch (error) {
      console.warn('⚠️ Error no crítico en logging:', error);
    }
  }

  async logPasswordChange(username: string, success: boolean, details?: any): Promise<void> {
    const result = success ? 'success' : 'failed';
    await this.addLogEntry(username, 'change_password', result, details);
  }

  async logAuthenticationAttempt(username: string, success: boolean, details?: any): Promise<void> {
    const result = success ? 'success' : 'failed';
    await this.addLogEntry(username, 'authentication', result, details);
  }
}

export const auditService = new AuditService();