import { Component, OnInit } from '@angular/core';
import { EngineCRUDService } from '../../services/engine-crud/engine-crud.service';

interface ChessEngine {
  url: string;
  name: string;
  status: boolean;
  isTesting: boolean;
  description: string;
  elo: number;
  chatMessages: { message: string; sender: 'user' | 'engine' | 'system' }[];
  originalUrl?: string;
  isInDatabase: boolean;
}

@Component({
  selector: 'app-chess-engine-management',
  templateUrl: './chess-engine-management.component.html',
  styleUrls: ['./chess-engine-management.component.css']
})
export class ChessEngineManagementComponent implements OnInit {
  engines: ChessEngine[] = [];

  constructor(private engineCRUDService: EngineCRUDService) {}

  ngOnInit() {
    this.loadEnginesFromDatabase();
  }

  addEngine() {
    if (this.engines.length < 3) {
      this.engines.push({
        url: '',
        name: '',
        status: false,
        isTesting: false,
        description: '',
        elo: 1000,
        chatMessages: [],
        isInDatabase: false
      });
    }
  }

  removeEngine(index: number) {
    const engine = this.engines[index];

    if (engine.url) {
      this.engineCRUDService.deleteChessEngine(engine.url).subscribe({
        next: () => {
          this.engines.splice(index, 1);
        },
        error: (err) => console.log('Error during engine removal:', err)
      });
    } else {
      this.engines.splice(index, 1);
    }
  }

  toggleEngineStatus(index: number) {
    const engine = this.engines[index];

    if (engine.status) {
      engine.isTesting = true;
      this.testEngine(engine).then((success) => {
        engine.status = success;
        engine.isTesting = false;

        if (success) {
          this.saveEnginesToDatabase();
        }
      });
    } else {
      engine.status = false;
      this.saveEnginesToDatabase();
    }
  }

  testEngine(engine: ChessEngine): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const testSuccess = engine.url !== '';
        resolve(testSuccess);
      }, 2000);
    });
  }

  saveEnginesToDatabase() {
    console.log('Engines saved:', this.engines);
  }

  loadEnginesFromDatabase() {
    this.engineCRUDService.getChessEngines().subscribe({
      next: (data: ChessEngine[]) => {
        this.engines = data.map(engine => ({
          ...engine,
          chatMessages: engine.chatMessages || [],
        originalUrl: engine.url,
        originalName: engine.name,
        originalDescription: engine.description,
        isInDatabase: true
        }));
        console.log('Loaded engines:', this.engines);
      },
      error: (error) => {
        console.log('Error while loading the engines:', error);
      }
    });
  }
}
