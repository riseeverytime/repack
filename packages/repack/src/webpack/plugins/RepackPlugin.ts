import path from 'path';
import webpack from 'webpack';
import type { DevServerOptions, WebpackPlugin } from '../../types';
import { AssetsResolverPlugin } from './AssetsResolverPlugin';
import { DevelopmentPlugin } from './DevelopmentPlugin';
import { LoggerPlugin, LoggerPluginConfig } from './LoggerPlugin';
import { OutputPlugin, OutputPluginConfig } from './OutputPlugin';
import { RepackTargetPlugin } from './RepackTargetPlugin';

/**
 * {@link RepackPlugin} configuration options.
 */
export interface RepackPluginConfig {
  /** Compilation mode. */
  mode: 'development' | 'production';

  /** Target application platform. */
  platform: string;

  /**
   * Development server configuration options.
   * Used to configure `@callstack/repack-dev-server`.
   *
   * If `undefined`, then development server will not be used.
   */
  devServer?: DevServerOptions;

  /**
   * Whether source maps should be generated. Defaults to `true`.
   *
   * Setting this to `false`, disables any source map generation.
   */
  sourceMaps?: boolean;

  /**
   * Options to configure {@link OutputPlugin}'s `localChunks`, `remoteChunksOutput` and `entry`.
   */
  output?: Pick<
    OutputPluginConfig,
    'localChunks' | 'remoteChunksOutput' | 'entry'
  >;

  /**
   * Options to configure {@link LoggerPlugin}'s `output`.
   *
   * Setting this to `false` disables {@link LoggerPlugin}.
   */
  logger?: LoggerPluginConfig['output'] | boolean;
}

/**
 * Webpack plugin, which abstracts configuration of other Re.Pack's plugin
 * to make Webpack config more readable.
 *
 * @example Usage in Webpack config (ESM):
 * ```ts
 * import * as Repack from '@callstack/repack';
 *
 * export default (env) => {
 *   const {
 *     mode = 'development',
 *     platform,
 *     devServer = undefined,
 *   } = env;
 *
 *   return {
 *     plugins: [
 *       new Repack.RepackPlugin({
 *         mode,
 *         platform,
 *         devServer,
 *       }),
 *     ],
 *   };
 * };
 * ```
 *
 * Internally, `RepackPlugin` configures the following plugins:
 * - `webpack.DefinePlugin` with `__DEV__` global
 * - {@link AssetsResolverPlugin}
 * - {@link OutputPlugin}
 * - {@link DevelopmentPlugin}
 * - {@link RepackTargetPlugin}
 * - `webpack.SourceMapDevToolPlugin`
 * - {@link LoggerPlugin}
 *
 * `RepackPlugin` provides a sensible defaults, but can be customized to some extent.
 * If you need more control, it's recommended to remove `RepackPlugin` and use other plugins
 * directly, eg:
 * ```ts
 * import React from '@callstack/repack';
 *
 * new Repact.plugins.AssetsResolverPlugin();
 * ```
 *
 * @category Webpack Plugin
 */
export class RepackPlugin implements WebpackPlugin {
  /**
   * Constructs new `RepackPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config: RepackPluginConfig) {
    this.config.sourceMaps = this.config.sourceMaps ?? true;
    this.config.logger = this.config.logger ?? true;
  }

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(this.config.mode === 'development'),
    }).apply(compiler);

    new AssetsResolverPlugin({
      platform: this.config.platform,
    }).apply(compiler);

    new OutputPlugin({
      platform: this.config.platform,
      devServerEnabled: Boolean(this.config.devServer),
      localChunks: [/Async/],
      remoteChunksOutput: path.join(
        __dirname,
        'build',
        this.config.platform,
        'remote'
      ),
      ...this.config.output,
    }).apply(compiler);

    new DevelopmentPlugin({
      platform: this.config.platform,
      devServer: this.config.devServer,
    }).apply(compiler);

    new RepackTargetPlugin().apply(compiler);

    if (this.config.sourceMaps) {
      new webpack.SourceMapDevToolPlugin({
        test: /\.(js)?bundle$/,
        exclude: /\.chunk\.(js)?bundle$/,
        filename: '[file].map',
        append: `//# sourceMappingURL=[url]?platform=${this.config.platform}`,
      }).apply(compiler);

      new webpack.SourceMapDevToolPlugin({
        test: /\.(js)?bundle$/,
        include: /\.chunk\.(js)?bundle$/,
        filename: '[file].map',
        append: `//# sourceMappingURL=[url]?platform=${this.config.platform}`,
      }).apply(compiler);
    }

    if (this.config.logger) {
      new LoggerPlugin({
        platform: this.config.platform,
        devServerEnabled: Boolean(this.config.devServer),
        output: {
          console: true,
          ...(typeof this.config.logger === 'object' ? this.config.logger : {}),
        },
      }).apply(compiler);
    }
  }
}
