export type PublicPresentation = {
  mode: 'black' | 'scene';
  sceneId: string | null;
  title: string | null;
  description: string | null;
};
export type Scene = { id: string; title: string; description: string; image: string };
export const SCENES: Scene[];
export function publicView(value: unknown): PublicPresentation;
export function sceneById(id: string | null | undefined): Scene | undefined;
