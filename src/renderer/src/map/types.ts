export type MapToken = { Id:string; Name:string; Kind:string; Color:string; X:number; Y:number };
export type MapDocument = { CampaignId:string; SessionId:string; Id:string; Name:string; Image:string; GridVisible:boolean; Scale:number; Tokens:MapToken[] };
export type MapState = { Draft:MapDocument; Approved:MapDocument|null };
