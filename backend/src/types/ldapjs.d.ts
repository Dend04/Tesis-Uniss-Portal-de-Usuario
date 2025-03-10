declare module 'ldapjs' {
    import { EventEmitter } from 'events';
  
    export interface ClientOptions {
      url: string;
      timeout?: number;
      connectTimeout?: number;
      tlsOptions?: object;
    }
  
    export class Client extends EventEmitter {
      constructor(options?: ClientOptions);
      bind(dn: string, password: string, callback: (err: Error | null) => void): void;
      unbind(callback?: (err: Error | null) => void): void;
      search(base: string, options: SearchOptions, callback: (err: Error | null, res: SearchResponse) => void): void;
      modify(dn: string, change: Change, callback: (err: Error | null) => void): void;
    }
  
    export interface SearchOptions {
      filter: string;
      scope: 'base' | 'one' | 'sub';
      attributes?: string[];
    }
  
    export interface SearchResponse extends EventEmitter {
      on(event: 'searchEntry', listener: (entry: SearchEntry) => void): this;
      on(event: 'end', listener: (result: any) => void): this;
    }
  
    export interface SearchEntry {
      object: Record<string, any>;
    }
  
    export class Change {
      constructor(options: { operation: 'replace'; modification: Attribute });
    }
  
    export class Attribute {
      constructor(options: { type: string; values: string[] });
    }

    declare module 'ldapjs' {
      interface Client {
        add(dn: string, entry: object, callback: (err: Error | null) => void): void;
        modify(dn: string, change: object, callback: (err: Error | null) => void): void;
      }
    }
    declare module 'ldapjs' {
      interface AttributeOptions {
        type: string;
        values?: string[];
        buffers?: Buffer[];
      }
    
      class Attribute {
        constructor(options: AttributeOptions);
      }
    }

    declare module 'ldapjs' {
      interface SearchEntry {
        attributes: Attribute[];
      }
    
      interface Attribute {
        type: string;
        values: any[];
        json: Record<string, any>;
      }
    }
  
    export function createClient(options: ClientOptions): Client;
  }