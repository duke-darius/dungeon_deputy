export type MapToken = { id:string; name:string; kind:string; color:string; x:number; y:number; artwork:string };
export type MapDocument = { campaignId:string; sessionId:string; id:string; name:string; image:string; gridVisible:boolean; scale:number; tokens:MapToken[] };
export type MapState = { draft:MapDocument; approved:MapDocument|null };
