/// <reference lib="DOM" />

declare var __DEV__: boolean;
declare var __webpack_public_path__: string;
declare var __webpack_get_script_filename__: (script: string) => string;

interface HMRInfo {
  type: string;
  chain: Array<string | number>;
  error?: Error;
  moduleId: string | number;
}

interface HotApi {
  status():
    | 'idle'
    | 'check'
    | 'prepare'
    | 'ready'
    | 'dispose'
    | 'apply'
    | 'abort'
    | 'fail';
  check(autoPlay: boolean): Promise<Array<string | number>>;
  apply(options: {
    ignoreUnaccepted?: boolean;
    ignoreDeclined?: boolean;
    ignoreErrored?: boolean;
    onDeclined?: (info: HMRInfo) => void;
    onUnaccepted?: (info: HMRInfo) => void;
    onAccepted?: (info: HMRInfo) => void;
    onDisposed?: (info: HMRInfo) => void;
    onErrored?: (info: HMRInfo) => void;
  }): Promise<Array<string | number>>;
}

interface NodeModule {
  hot?: HotApi;
}

declare var __webpack_hash__: string;
declare var __webpack_require__: { l: Function };
