
export interface PlayerInfo {
  user_id: number;
  username: string;
  nationality: string;
  elo: number;
  engine: EngineInfo;
}
  
export interface EngineInfo {
  name: string;
  elo: number;
  url: string;
}
  