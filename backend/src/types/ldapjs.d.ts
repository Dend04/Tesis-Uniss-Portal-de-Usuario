
  import { EventEmitter } from "events";

  export interface ClientOptions {
    url: string;
    timeout?: number;
    connectTimeout?: number;
    tlsOptions?: object;
  }

  export class Client extends EventEmitter {
    constructor(options?: ClientOptions);
    bind(
      dn: string,
      password: string,
      callback: (err: Error | null) => void
    ): void;
    unbind(callback?: (err: Error | null) => void): void;
    search(
      base: string,
      options: SearchOptions,
      callback: (err: Error | null, res: SearchResponse) => void
    ): void;
    modify(
      dn: string,
      change: Change,
      callback: (err: Error | null) => void
    ): void;
    add(dn: string, entry: object, callback: (err: Error | null) => void): void;
  }

  export interface SearchOptions {
    filter: string;
    scope: "base" | "one" | "sub";
    attributes?: string[];
  }

  export interface SearchResponse extends EventEmitter {
    on(event: "searchEntry", listener: (entry: SearchEntry) => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "end", listener: (result: any) => void): this;
  }

  export interface SearchEntry {
    dn: string;
    attributes: Attribute[];
  }

  export class Change {
    constructor(options: { operation: "replace"; modification: Attribute });
  }

  export class Attribute {
    type: string;
    vals: string[] | Buffer[];
    json: Record<string, any>;
    values?: string;

    constructor(options: {
      type: string;
      vals?: string[] | Buffer[];
      buffers?: Buffer[];
      values?: string[];
    });
  }

  interface Client {
    add(dn: string, entry: object, callback: (err: Error | null) => void): void;
    modify(
      dn: string,
      change: object,
      callback: (err: Error | null) => void
    ): void;
  }

  interface AttributeOptions {
    type: string;
    values?: string[];
    buffers?: Buffer[];
  }

  class Attribute {
    constructor(options: AttributeOptions);
  }

  interface SearchEntry {
    attributes: Attribute[];
  }

  export interface Attribute {
    type: string;
    values: any[];
    json: Record<string, any>;
    vals?: string[] | Buffer[];
    buffers?: Buffer[];
  }

  interface SearchEntry {
    dn: string;
    attributes: Record<string, any>;
  }

  interface SearchEntry {
    dn: string;
    attributes: Attribute[];
  }

  export function createClient(options: ClientOptions): Client;
