export interface Ethereum {
  send: unknown;
  enable: () => Promise<string[]>;
  on?: (method: string, listener: (...args: any[]) => void) => void;
  removeListener?: (method: string, listener: (...args: any[]) => void) => void;
}

export declare interface Window {
  ethereum?: Ethereum;
}

export declare const __DEV__: boolean;
