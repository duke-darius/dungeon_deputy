export type MapToken = { id:string; name:string; kind:string; color:string; x:number; y:number; artwork:string; visible?:boolean };
export type FogStamp = { x:number; y:number; radius:number };
export type FogStroke = { mode:'reveal'|'hide'; stamps:FogStamp[] };
export type MapDocument = { campaignId:string; sessionId:string; id:string; name:string; image:string; gridVisible:boolean; scale:number; tokens:MapToken[]; fogEnabled?:boolean; fogStrokes?:FogStroke[] };
export type MapState = { draft:MapDocument; approved:MapDocument|null };
