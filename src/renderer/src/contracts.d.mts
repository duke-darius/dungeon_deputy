export type PublicPresentation = {
  mode: 'black' | 'scene' | 'map';
  sceneId: string | null;
  title: string | null;
  description: string | null;
  id?: string;
  imageData?: string;
  tokens?: Array<{id:string;name:string;kind:string;color:string;x:number;y:number;artwork:string}>;
};
export type Scene = { id: string; title: string; description: string; image: string };
export const SCENES: Scene[];
export function publicView(value: unknown): PublicPresentation;
export function sceneById(id: string | null | undefined): Scene | undefined;
