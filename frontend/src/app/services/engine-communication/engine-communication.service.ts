import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GameManagerService } from '../game-manager/game-manager.service';

@Injectable({
  providedIn: 'root'
})
export class EngineCommunicationService {
  constructor(private http: HttpClient, private gameManagerService: GameManagerService) {}

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async ucinewgame(apiUrl: string): Promise<void> {
    await this.sleep(100);
    try {
      await this.http.post(`${apiUrl}ucinewgame/`, {}, { responseType: 'text' }).toPromise();
    } catch (error) {
      console.log("Error sending UCINEWGAME command:", error);
    }
  }

  async isready(apiUrl: string): Promise<boolean> {
    await this.sleep(100)
    try {
      const response = await this.http.get(`${apiUrl}isready/`, { responseType: 'text' }).toPromise();
      return response.indexOf('readyok') >= 0;
    } catch (error) {
      console.log("Error checking readiness:", error);
      return false;
    }
  }

  async position(apiUrl: string, position: string): Promise<boolean> {
    await this.sleep(100);
    try {
      await this.http.post(`${apiUrl}position/`, { position }, { responseType: 'text' }).toPromise();
      return true;
    } catch (error) {
      console.log("Error setting position:", error);
      return false;
    }
  }

  async tryGo(
    apiUrl: string,
    gameId: number,
    fen: string,
    triesCount: number,
    calculateMoveResult: boolean | undefined,
    wTime: number = 0,
    bTime: number = 0,
    wIncrement: number = 0,
    bIncrement: number = 0
  ): Promise<{ coordinate_move?: string; san_move?: string; fen_position?: string; end_type?: string } | null> {
    let goParams = 'depth 1';
    let timeoutModifier = 10;

    if(wTime != 0 && bTime != 0) {
      goParams = `wtime ${Math.ceil(wTime)} btime ${Math.ceil(bTime)} winc ${wIncrement} binc ${bIncrement}`;
      const timeLeft = fen.split(' ')[1] == 'w' ? Math.ceil(wTime) : Math.ceil(bTime);
      timeoutModifier = Math.max(Math.ceil(wTime), Math.ceil(bTime)) / 3000;
    }

    for (let attempt = 0; attempt < triesCount; attempt++) {
      await this.isready(apiUrl);
                
      const positionSet = await this.position(apiUrl, fen);
      if (!positionSet) {
        console.error("Nie udało się ustawić pozycji.");
        continue;
      }

      let bestMove;
      try {
        bestMove = await this.go(apiUrl, goParams, timeoutModifier * 1000);
      } catch (error) {
          console.error("Błąd podczas wywołania go:", error);
          try {
              bestMove = await this.stop(apiUrl);
          } catch (stopError) {
              console.error("Błąd podczas wywołania stop:", stopError);
              continue;
          }
      }

      if (!bestMove) {
        console.error("Go i stop nie znalazły ruchu");
        continue;
      }

      console.log("Silnik zasugerował ruch:", bestMove);
      const parsedMove = this.parseMove(bestMove);
      const response = await this.gameManagerService.validateMove(gameId, fen, parsedMove, calculateMoveResult);
      if (response.is_move_valid)
        return response;
    }

    console.log("Wszystkie próby ustawienia ruchu zakończone niepowodzeniem.");
    return null;
  }  

  async go(apiUrl: string, parameters: string, timeoutMs: number): Promise<string | null> {
    await this.sleep(100);

    return new Promise<string | null>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout przekroczony dla wywołania go."));
      }, timeoutMs);
  
      this.http.post(`${apiUrl}go/`, { parameters }, { responseType: 'text' }).toPromise().then((response) => {
          clearTimeout(timeout);
          const match = (response as string).match(/bestmove\s([a-h][1-8][a-h][1-8][nbrqk]?)/);
          resolve(match ? match[1] : null);
        }).catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }
  
  parseMove(engineMove: string): string {
    const files = 'abcdefgh';

    const startFile = files.indexOf(engineMove[0]);
    const startRank = 8 - parseInt(engineMove[1]);
    const endFile = files.indexOf(engineMove[2]);
    const endRank = 8 - parseInt(engineMove[3]);

    const promotionPiece = engineMove.length === 5 ? engineMove[4].toUpperCase() : '';

    return `${startFile}${startRank}${endFile}${endRank}${promotionPiece}`;
  }

  async stop(apiUrl: string, timeoutMs: number = null): Promise<string | null> {
    await this.sleep(100);

    if(!timeoutMs) {
      const requestPromise = await this.http.post(`${apiUrl}stop/`, {}, { responseType: 'text' }).toPromise();
      const match = (requestPromise as string).match(/bestmove\s([a-h][1-8][a-h][1-8][nbrqk]?)/);
      return match ? match[1] : null;
    }

    return new Promise<string | null>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("Timeout przekroczony dla wywołania stop."));
        }, timeoutMs);

        this.http.post(`${apiUrl}stop/`, {}, { responseType: 'text' }).toPromise().then((response) => {
            clearTimeout(timeout);
            const match = (response as string).match(/bestmove\s([a-h][1-8][a-h][1-8][nbrqk]?)/);
            resolve(match ? match[1] : null);
        }).catch((error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
  }

  async chat(apiUrl: string, parameters: string): Promise<string> {
    await this.sleep(100);
    try {
      const response = await this.http.post(`${apiUrl}chat/`, { chat: parameters }, { responseType: 'text' }).toPromise();
      return response;
    } catch (error) {
      console.log('Error during chat request:', error);
    }
  }  
}
