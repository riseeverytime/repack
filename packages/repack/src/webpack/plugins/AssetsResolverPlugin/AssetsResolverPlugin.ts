import webpack from 'webpack';
import { WebpackPlugin } from '../../../types';
import { ASSET_EXTENSIONS, SCALABLE_ASSETS } from '../../utils/assetExtensions';
import { AssetResolver, AssetResolverConfig } from './AssetResolver';

/**
 * {@link AssetsResolverPlugin} configuration options.
 */
export interface AssetsResolverPluginConfig extends AssetResolverConfig {}

/**
 * Plugin for resolving assets (images, audio, video etc) for React Native applications.
 *
 * Assets processing in React Native differs from Web, Node.js or other targets.
 * This plugin in combination with `@callstack/repack/assets-loader` allows
 * you to use assets in the same way as you would do when using Metro.
 *
 * @category Webpack Plugin
 */
export class AssetsResolverPlugin implements WebpackPlugin {
  /**
   * Constructs new `AssetsResolverPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config: AssetsResolverPluginConfig) {
    this.config.extensions = this.config.extensions ?? ASSET_EXTENSIONS;
    this.config.scalableExtensions =
      this.config.scalableExtensions ?? SCALABLE_ASSETS;
  }

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    const assetResolver = new AssetResolver(this.config, compiler);

    compiler.options.resolve.plugins = (
      compiler.options.resolve.plugins || []
    ).concat(assetResolver);
  }
}
