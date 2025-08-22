// routes/2fa.ts
import express, { Request, Response } from 'express';
const router = express.Router();

// Generar secreto para TOTP (formato base32)
const generateSecret = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
};

// Generar códigos de respaldo
const generateBackupCodes = (): string[] => {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
  }
  return codes;
};

// Endpoint para generar secreto
router.get('/generate-secret', (req: Request, res: Response) => {
  try {
    const secret = generateSecret();
    const backupCodes = generateBackupCodes();

    res.json({ secret, backupCodes });
  } catch (error) {
    console.error('Error generating 2FA secret:', error);
    res.status(500).json({ error: 'Error generating 2FA secret' });
  }
});

// Endpoint para verificar código
router.post('/verify-code', (req: Request, res: Response) => {
  try {
    const { secret, verificationCode, userEmail } = req.body;
    
    // Validación básica del código (deberías implementar la validación real con una biblioteca TOTP)
    const isValid = verificationCode.length === 6 && /^\d+$/.test(verificationCode);
    
    res.json({ valid: isValid });
  } catch (error) {
    console.error('Error verifying 2FA code:', error);
    res.status(500).json({ error: 'Error verifying 2FA code' });
  }
});

export default router;