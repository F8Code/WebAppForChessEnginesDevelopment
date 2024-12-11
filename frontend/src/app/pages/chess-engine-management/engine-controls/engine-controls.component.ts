import { Component, Input, Output, EventEmitter, OnInit, } from '@angular/core';
import { EngineCRUDService } from '../../../services/engine-crud/engine-crud.service';
import { EngineCommunicationService } from '../../../services/engine-communication/engine-communication.service';
import { EngineManagerService } from '../../../services/engine-manager/engine-manager.service';

interface ChessEngine {
  url: string;
  name: string;
  status: boolean;
  isTesting: boolean;
  description: string;
  chatMessages: { message: string; sender: 'user' | 'engine' | 'system' }[];
  originalUrl?: string;
  originalName?: string;
  originalDescription?: string;
  isInDatabase?: boolean;
  elo: number;
}

@Component({
  selector: 'app-engine-controls',
  templateUrl: './engine-controls.component.html',
  styleUrls: ['./engine-controls.component.css']
})
export class EngineControlsComponent implements OnInit {
  @Input() engine!: ChessEngine;
  @Output() removeEngine = new EventEmitter<void>();
  @Output() toggleEngine = new EventEmitter<void>();

  newMessage: string = '';
  canSaveEngine: boolean = false;

  constructor(
    private engineCRUDService: EngineCRUDService,
    private engineManagerService: EngineManagerService,
    private engineCommunicationService: EngineCommunicationService
  ) {}

  ngOnInit(): void {
    this.engine.status = this.engineManagerService
      .getAcceptedEngines()
      .some(e => e.url === this.engine.url);
    this.checkIfEngineCanBeSaved();
  }

  checkIfEngineCanBeSaved(): void {
    this.canSaveEngine = this.engine.url.trim() !== '' && this.engine.name.trim() !== '';
  }

  hasChanges(): boolean {
    return (
      this.engine.url !== this.engine.originalUrl ||
      this.engine.name !== this.engine.originalName ||
      this.engine.description !== this.engine.originalDescription
    );
  }

  async saveEngine(): Promise<void> {
    try {
      const saveAction = this.engine.isInDatabase
        ? this.engineCRUDService.updateChessEngine(this.engine.originalUrl!, this.engine)
        : this.engineCRUDService.createChessEngine(this.engine);

      await saveAction.toPromise();
      this.updateOriginalValues();
      this.engine.isInDatabase = true;
    } catch (error) {
      console.log('Failed to save engine:', error);
    }
  }

  updateOriginalValues(): void {
    this.engine.originalUrl = this.engine.url;
    this.engine.originalName = this.engine.name;
    this.engine.originalDescription = this.engine.description;
  }

  async onToggleEngine(): Promise<void> {
    if (this.engine.status) {
      await this.startEngineTest();
    } else {
      this.engineManagerService.removeAcceptedEngine(this.engine.url);
      this.toggleEngine.emit();
    }
  }

  sendMessage(): void {
    if (this.newMessage.trim() !== '') {
      this.engine.chatMessages.push({ message: this.newMessage, sender: 'user' });

      this.engineCommunicationService.chat(this.engine.url, this.newMessage).then((response) => {
          this.engine.chatMessages.push({ message: response || 'Brak odpowiedzi od silnika.', sender: 'engine' });
        })
        .catch((error) => {
          console.log('Error sending engine message:', error);
          this.engine.chatMessages.push({ message: 'Błąd komunikacji z silnikiem.', sender: 'system' });
        });

      this.newMessage = '';
    }
  }  

  private async startEngineTest(): Promise<void> {
    this.engine.isTesting = true;
    this.engine.chatMessages.push({ message: 'Rozpoczynanie testów...', sender: 'system' });

    try {
      const response = await this.engineManagerService.getRandomMoves().toPromise();
      const moves = response.moves;

      if (moves.length >= 3) {
        await this.executeMovesSequentially(this.engine.url, moves);
      } else {
        this.finishEngineTest(false);
      }
    } catch (error) {
      console.log('Failed to start engine test:', error);
      this.engine.chatMessages.push({ message: 'Wystąpił błąd rozpoczęcia testu. Sprwadź log konsoli po więcej informacji.', sender: 'system' });
      this.finishEngineTest(false);
    }
  }

  private async executeMovesSequentially(apiUrl: string, moves: any[]): Promise<void> {
    for (const move of moves) {
      this.engine.chatMessages.push({message: `Testowana pozycja: ${move.fen_position}`,sender: 'system'});

      const isSuccessful = await this.testEngineMove(apiUrl, move);
      if (!isSuccessful) {
        this.finishEngineTest(false);
        return;
      }
    }
    this.finishEngineTest(true);
  }

  private async testEngineMove(apiUrl: string, move: any): Promise<boolean> {
    try {
      const engineMove = await this.engineCommunicationService.tryGo(apiUrl, 0, move.fen_position, 3, false);
      if (engineMove) {
        this.engine.chatMessages.push({message: `Proponowany ruch: ${this.formatCoordinateMove(engineMove.coordinate_move)} - zatwierdzony!`, sender: 'engine'});
        return true;
      } else {
        this.engine.chatMessages.push({ message: 'Test nieudany. Sprawdź log konsoli po więcej informacji.', sender: 'system' });
        return false;
      }
    } catch (error) {
      console.log('Error during engine test:', error);
      this.engine.chatMessages.push({ message: 'Wystąpił błąd podczas testu silnika. Sprwadź log konsoli po więcej informacji.', sender: 'system' });
      return false;
    }
  }

  private formatCoordinateMove(coordinateMove: string): string {
    return `{${coordinateMove[0]}, ${coordinateMove[1]}} -> {${coordinateMove[2]}, ${coordinateMove[3]}}`
  }

  private finishEngineTest(isSuccessful: boolean): void {
    this.engine.isTesting = false;
    this.engine.status = isSuccessful;

    if (isSuccessful) {
      this.engine.chatMessages.push({ message: 'Test zakończony pomyślnie!', sender: 'system' });
      this.engineManagerService.addAcceptedEngine(this.engine.url, this.engine.name, this.engine.elo);
    }
  }
}
