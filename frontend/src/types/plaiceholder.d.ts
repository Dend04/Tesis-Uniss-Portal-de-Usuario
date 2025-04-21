declare module 'plaiceholder' {
    export function getPlaiceholder(
      input: Buffer | string
    ): Promise<{
      base64: string;
      img: { src: string; width: number; height: number };
    }>;
  }