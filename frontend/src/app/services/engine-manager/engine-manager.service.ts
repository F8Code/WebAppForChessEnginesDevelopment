import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface AcceptedEngine {
  url: string;
  name: string;
  elo: number;
}

@Injectable({
  providedIn: 'root'
})
export class EngineManagerService {
  private apiUrl = 'http://localhost:8000/api/';

  private acceptedEngines: AcceptedEngine[] = [];

  constructor(private http: HttpClient) {
    this.loadAcceptedEngines();
  }

  addAcceptedEngine(engineUrl: string, engineName: string, engineElo: number) {
    const engine = { url: engineUrl, name: engineName, elo: engineElo };
    this.acceptedEngines.push(engine);
    this.saveAcceptedEngines();
  }

  removeAcceptedEngine(engineUrl: string) {
    this.acceptedEngines = this.acceptedEngines.filter(engine => engine.url !== engineUrl);
    this.saveAcceptedEngines();
  }

  getAcceptedEngines(): AcceptedEngine[] {
    return this.acceptedEngines;
  }

  private saveAcceptedEngines() {
    sessionStorage.setItem('acceptedEngines', JSON.stringify(this.acceptedEngines));
  }

  loadAcceptedEngines() {
    const storedEngines = sessionStorage.getItem('acceptedEngines');
    if (storedEngines) {
      this.acceptedEngines = JSON.parse(storedEngines);
    }
  }

  getRandomMoves() {
    return this.http.get<{ moves: any[] }>(`${this.apiUrl}moves/get_random_moves/`);
  }
}
