// src/utils/cache.utils.ts
import NodeCache from "node-cache";

export const userDnCache = new NodeCache({ stdTTL: 3600 });
