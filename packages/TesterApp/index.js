import { AppRegistry } from 'react-native';
import { ScriptManager, Script } from '@callstack/repack/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './src/App';
import { name as appName } from './app.json';

new ScriptManager({
  storage: AsyncStorage,
  resolve: async (scriptId, caller) => {
    if (__DEV__) {
      return {
        url: Script.getDevServerURL(scriptId),
        cache: false,
      };
    }

    return {
      url: Script.getRemoteURL(`http://localhost:5000/${scriptId}`),
    };
  },
});

ScriptManager.shared.on('resolving', (...args) => {
  console.log('DEBUG/resolving', ...args);
});

ScriptManager.shared.on('resolved', (...args) => {
  console.log('DEBUG/resolved', ...args);
});

ScriptManager.shared.on('prefetching', (...args) => {
  console.log('DEBUG/prefetching', ...args);
});

ScriptManager.shared.on('loading', (...args) => {
  console.log('DEBUG/loading', ...args);
});

ScriptManager.shared.on('loaded', (...args) => {
  console.log('DEBUG/loaded', ...args);
});

ScriptManager.shared.on('error', (...args) => {
  console.log('DEBUG/error', ...args);
});

AppRegistry.registerComponent(appName, () => App);
