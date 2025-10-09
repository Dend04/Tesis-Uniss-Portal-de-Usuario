// src/types/express.d.ts
import { TokenPayload } from '../../utils/jwt.utils';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    employeeID: string;
    id?: string;
  };
  body: {
    newEmail?: string;
    code?: string;
    // Agrega otras propiedades del body que uses
    email?: string;
    userName?: string;
    daysLeft?: number;
    grupos?: string[];
  };
}

export {};