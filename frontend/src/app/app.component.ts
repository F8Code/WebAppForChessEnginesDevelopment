import { Component } from '@angular/core';
import { EngineManagerService } from './services/engine-manager/engine-manager.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  constructor(private engineManagerService: EngineManagerService) {
    this.engineManagerService.loadAcceptedEngines();
  }
  title = 'chessWebApp';
}
