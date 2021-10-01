import { URL } from 'url';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { codeFrameColumns } from '@babel/code-frame';
import { SourceMapConsumer } from 'source-map';
import { FastifyDevServer } from './types';

const readFileAsync = promisify(fs.readFile);

/**
 * Raw React Native stack frame.
 */
export interface ReactNativeStackFrame {
  lineNumber: number | null;
  column: number | null;
  file: string | null;
  methodName: string;
}

/**
 * React Native stack frame used as input when processing by {@link Symbolicator}.
 */
export interface InputStackFrame extends ReactNativeStackFrame {
  file: string;
}

/**
 * Final symbolicated stack frame.
 */
export interface StackFrame extends InputStackFrame {
  collapse: boolean;
}

/**
 * Represents [@babel/core-frame](https://babeljs.io/docs/en/babel-code-frame).
 */
export interface CodeFrame {
  content: string;
  location: {
    row: number;
    column: number;
  };
  fileName: string;
}

/**
 * Represents results of running {@link process} method on {@link Symbolicator} instance.
 */
export interface SymbolicatorResults {
  codeFrame: CodeFrame | null;
  stack: StackFrame[];
}

/**
 * Class for transforming stack traces from React Native application with using Source Map.
 * Raw stack frames produced by React Native, points to some location from the bundle
 * eg `index.bundle?platform=ios:567:1234`. By using Source Map for that bundle `Symbolicator`
 * produces frames that point to source code inside your project eg `Hello.tsx:10:9`.
 */
export class Symbolicator {
  /**
   * Infer platform from stack frames.
   * Usually at least one frame has `file` field with the bundle URL eg:
   * `http://localhost:8081/index.bundle?platform=ios&...`, which can be used to infer platform.
   *
   * @param stack Array of stack frames.
   * @returns Inferred platform or `undefined` if cannot infer.
   */
  static inferPlatformFromStack(stack: ReactNativeStackFrame[]) {
    for (const frame of stack) {
      if (!frame.file) {
        return;
      }

      const { searchParams, pathname } = new URL(frame.file, 'file://');
      const platform = searchParams.get('platform');
      if (platform) {
        return platform;
      } else {
        const [bundleFilename] = pathname.split('/').reverse();
        const [, platformOrExtension, extension] = bundleFilename.split('.');
        if (extension) {
          return platformOrExtension;
        }
      }
    }
  }

  /**
   * Cache with initialized `SourceMapConsumer` to improve symbolication performance.
   */
  sourceMapConsumerCache: Record<string, SourceMapConsumer> = {};

  /**
   * Constructs new `Symbolicator` instance.
   *
   * @param projectRoot Absolute path to root directory of the project.
   * @param logger Fastify logger instance.
   * @param readFileFromWdm Function to read arbitrary file from webpack-dev-middleware.
   * @param readSourceMapFromWdm Function to read Source Map file from webpack-dev-middleware.
   */
  constructor(
    private projectRoot: string,
    private logger: FastifyDevServer['log'],
    private readFileFromWdm: (fileUrl: string) => Promise<string>,
    private readSourceMapFromWdm: (fileUrl: string) => Promise<string>
  ) {}

  /**
   * Process raw React Native stack frames and transform them using Source Maps.
   * Method will try to symbolicate as much data as possible, but if the Source Maps
   * are not available, invalid or the original positions/data is not found in Source Maps,
   * the method will return raw values - the same as supplied with `stack` parameter.
   * For example out of 10 frames, it's possible that only first 7 will be symbolicated and the
   * remaining 3 will be unchanged.
   *
   * @param stack Raw stack frames.
   * @returns Symbolicated stack frames.
   */
  async process(stack: ReactNativeStackFrame[]): Promise<SymbolicatorResults> {
    // TODO: add debug logging
    const frames: InputStackFrame[] = [];
    for (const frame of stack) {
      const { file } = frame;
      if (file?.startsWith('http') && !file.includes('debuggerWorker')) {
        frames.push(frame as InputStackFrame);
      }
    }

    try {
      const processedFrames: StackFrame[] = [];
      for (const frame of frames) {
        if (!this.sourceMapConsumerCache[frame.file]) {
          const rawSourceMap = await this.readSourceMapFromWdm(frame.file);
          const sourceMapConsumer = await new SourceMapConsumer(rawSourceMap);
          this.sourceMapConsumerCache[frame.file] = sourceMapConsumer;
        }
        const processedFrame = this.processFrame(frame);
        processedFrames.push(processedFrame);
      }

      return {
        stack: processedFrames,
        codeFrame: (await this.getCodeFrame(processedFrames)) ?? null,
      };
    } finally {
      for (const key in this.sourceMapConsumerCache) {
        this.sourceMapConsumerCache[key].destroy();
        delete this.sourceMapConsumerCache[key];
      }
    }
  }

  private processFrame(frame: InputStackFrame): StackFrame {
    if (!frame.lineNumber || !frame.column) {
      return {
        ...frame,
        collapse: false,
      };
    }

    const consumer = this.sourceMapConsumerCache[frame.file];
    if (!consumer) {
      return {
        ...frame,
        collapse: false,
      };
    }

    const lookup = consumer.originalPositionFor({
      line: frame.lineNumber,
      column: frame.column,
    });

    // If lookup fails, we get the same shape object, but with
    // all values set to null
    if (!lookup.source) {
      // It is better to gracefully return the original frame
      // than to throw an exception
      return {
        ...frame,
        collapse: false,
      };
    }

    return {
      lineNumber: lookup.line || frame.lineNumber,
      column: lookup.column || frame.column,
      file: lookup.source,
      methodName: lookup.name || frame.methodName,
      collapse: false,
    };
  }

  private async getCodeFrame(
    processedFrames: StackFrame[]
  ): Promise<CodeFrame | undefined> {
    for (const frame of processedFrames) {
      if (frame.collapse || !frame.lineNumber || !frame.column) {
        continue;
      }

      // If the frame points to internal bootstrap/module system logic, skip the code frame.
      if (/webpack[/\\]runtime[/\\].+\s/.test(frame.file)) {
        return undefined;
      }

      try {
        let filename;
        let source;
        if (
          frame.file.startsWith('http') &&
          frame.file.includes('index.bundle')
        ) {
          // Frame points to the bundle so we need to read bundle from WDM's FS.
          filename = frame.file;
          source = await this.readFileFromWdm('/index.bundle');
        } else {
          filename = path.join(
            this.projectRoot,
            frame.file.replace('webpack://', '')
          );
          source = await readFileAsync(filename, 'utf8');
        }

        return {
          content: codeFrameColumns(
            source,
            {
              start: { column: frame.column, line: frame.lineNumber },
            },
            { forceColor: true }
          ),
          location: {
            row: frame.lineNumber,
            column: frame.column,
          },
          fileName: filename,
        };
      } catch (error) {
        this.logger.error({
          msg: 'Failed to create code frame',
          error: (error as Error).message,
        });
      }

      return undefined;
    }
  }
}
