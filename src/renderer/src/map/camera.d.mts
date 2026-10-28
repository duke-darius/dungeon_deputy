export type Camera = { x:number; y:number; zoom:number };
export const ZOOM_MIN:number;
export const ZOOM_MAX:number;
export function screenToMap(point:{x:number;y:number},camera:Camera):{x:number;y:number};
export function mapToScreen(point:{x:number;y:number},camera:Camera):{x:number;y:number};
export function zoomAt(camera:Camera,point:{x:number;y:number},factor:number):Camera;
