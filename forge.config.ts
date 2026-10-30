import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { resolve } from 'node:path';

const backendRoot = resolve(process.env.DUNGEON_DEPUTY_BACKEND_ROOT ?? 'artifacts');
const backendRid = process.platform === 'win32' ? 'win-x64' : `osx-${process.arch}`;
const backendPath = resolve(backendRoot, `backend-${backendRid}`);

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    extraResource: [
      backendPath,
      'src/renderer/dist',
      'assets/audio-defaults',
    ],
    ignore: [/^\/src\//, /^\/artifacts\//],
  },
  makers: [new MakerSquirrel({}), new MakerZIP({}, ['darwin'])],
  hooks: {
    prePackage: async () => {
      const rid = process.platform === 'win32' ? 'win-x64' : `osx-${process.arch}`;
      const { existsSync } = await import('node:fs');
      const backendRoot = resolve(process.env.DUNGEON_DEPUTY_BACKEND_ROOT ?? 'artifacts');
      if (!existsSync(resolve(backendRoot, `backend-${rid}`))) throw new Error(`Missing self-contained backend for ${rid}; run npm run package:backend -- ${rid}`);
    },
  },
};
export default config;
