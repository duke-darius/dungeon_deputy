import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    extraResource: [
      `artifacts/backend-${process.platform === 'win32' ? 'win-x64' : `osx-${process.arch}`}`,
      'src/renderer/dist',
    ],
    ignore: [/^\/src\//, /^\/artifacts\//],
  },
  makers: [new MakerSquirrel({}), new MakerZIP({}, ['darwin'])],
  hooks: {
    prePackage: async () => {
      const rid = process.platform === 'win32' ? 'win-x64' : `osx-${process.arch}`;
      const { existsSync } = await import('node:fs');
      if (!existsSync(`artifacts/backend-${rid}`)) throw new Error(`Missing self-contained backend for ${rid}; run npm run package:backend -- ${rid}`);
    },
  },
};
export default config;
