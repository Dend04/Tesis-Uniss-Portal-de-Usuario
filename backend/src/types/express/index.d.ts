// src/types/express/index.d.ts
import { Request } from 'express';

declare global {
    namespace Express {
        interface Request {
            user?: {
                employeeID: string;
                id?: string;
            };
        }
    }
}

// This exports the enhanced Request type for explicit use, if needed
export interface AuthenticatedRequest extends Request {}