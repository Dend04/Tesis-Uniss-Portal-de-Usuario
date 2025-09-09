// src/services/verificationStorage.ts
interface VerificationData {
    code: string;
    expiresAt: number;
    email: string;
    createdAt: number;
  }
  
  class VerificationStorage {
    private storage: Map<string, VerificationData>;
    
    constructor() {
      this.storage = new Map();
      // Limpiar códigos expirados cada hora
      setInterval(() => this.cleanExpiredCodes(), 60 * 60 * 1000);
    }
    
    setCode(email: string, code: string, ttl: number = 10 * 60 * 1000): void {
      const normalizedEmail = email.toLowerCase().trim();
      const expiresAt = Date.now() + ttl;
      
      this.storage.set(normalizedEmail, {
        code,
        expiresAt,
        email: normalizedEmail,
        createdAt: Date.now()
      });
      
      console.log(`Código almacenado para: ${normalizedEmail}`, { code, expiresAt });
      
      // Para depuración: mostrar todos los códigos almacenados
      this.debugPrintStorage();
    }
    
    getCode(email: string): VerificationData | undefined {
      const normalizedEmail = email.toLowerCase().trim();
      const data = this.storage.get(normalizedEmail);
      
      // Para depuración: mostrar el código que se está buscando
      console.log(`Buscando código para: ${normalizedEmail}`);
      this.debugPrintStorage();
      
      if (data && Date.now() > data.expiresAt) {
        console.log(`Código expirado para: ${normalizedEmail}`);
        this.storage.delete(normalizedEmail);
        return undefined;
      }
      
      return data;
    }
    
    deleteCode(email: string): void {
      const normalizedEmail = email.toLowerCase().trim();
      this.storage.delete(normalizedEmail);
      console.log(`Código eliminado para: ${normalizedEmail}`);
      this.debugPrintStorage();
    }
    
    cleanExpiredCodes(): void {
      const now = Date.now();
      let deletedCount = 0;
      
      for (const [email, data] of this.storage.entries()) {
        if (now > data.expiresAt) {
          this.storage.delete(email);
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        console.log(`Limpiados ${deletedCount} códigos expirados`);
      }
    }
    
    // Método para depuración: mostrar todo el almacenamiento
    debugPrintStorage(): void {
      console.log('=== ALMACENAMIENTO ACTUAL DE CÓDIGOS ===');
      for (const [email, data] of this.storage.entries()) {
        console.log(`Email: ${email}, Código: ${data.code}, Expira: ${new Date(data.expiresAt).toLocaleString()}`);
      }
      console.log('========================================');
    }
    
    // Método para obtener todos los códigos (útil para API de depuración)
    getAllCodes(): Array<{email: string, code: string, expiresAt: number}> {
      const result = [];
      for (const [email, data] of this.storage.entries()) {
        result.push({
          email,
          code: data.code,
          expiresAt: data.expiresAt
        });
      }
      return result;
    }
  }
  
  export const verificationStorage = new VerificationStorage();