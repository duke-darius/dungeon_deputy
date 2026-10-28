export const ZOOM_MIN=.25, ZOOM_MAX=3;
export const screenToMap=(point,camera)=>({x:(point.x-camera.x)/camera.zoom,y:(point.y-camera.y)/camera.zoom});
export const mapToScreen=(point,camera)=>({x:point.x*camera.zoom+camera.x,y:point.y*camera.zoom+camera.y});
export function zoomAt(camera,point,factor){const before=screenToMap(point,camera),zoom=Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,camera.zoom*factor));return{zoom,x:point.x-before.x*zoom,y:point.y-before.y*zoom};}
