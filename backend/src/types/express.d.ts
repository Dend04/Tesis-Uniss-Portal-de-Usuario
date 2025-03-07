// src/types/express/index.d.ts
import { TokenPayload } from '../../utils/jwt.utils';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}