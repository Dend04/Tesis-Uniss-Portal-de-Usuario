// src/types/express.d.ts
import { Request } from 'express';
import { TokenPayload } from "../../utils/jwt.utils";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & {
        sAMAccountName: string;
        employeeID: string;
        id?: string;
        displayName?: string;
        userPrincipalName?: string;
      };
    }
  }
}

// Elimina AuthenticatedRequest o simplifícalo así:
export type AuthenticatedRequest = Request;