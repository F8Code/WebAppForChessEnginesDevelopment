import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-game-actions',
  templateUrl: './game-actions.component.html',
  styleUrls: ['./game-actions.component.css']
})
export class GameActionsComponent {
  @Input() isGameActive: boolean = false;
  @Input() isSpectator: boolean = true;

  @Output() resign = new EventEmitter<void>();
  @Output() offerDraw = new EventEmitter<void>();
  @Output() acceptDraw = new EventEmitter<void>();
  @Output() offerUndo = new EventEmitter<void>();
  @Output() acceptUndo = new EventEmitter<void>();

  isResignHighlighted: boolean = false;
  isDrawHighlighted: boolean = false;
  isDrawHighlightedByParent: boolean = false;
  isUndoHighlighted: boolean = false;
  isUndoHighlightedByParent: boolean = false;

  private resignTimeout: any;
  private drawTimeout: any;
  private undoTimeout: any;

  handleResignClick(): void {
    if(!this.isGameActive || this.isSpectator)
      return;

    if (this.isResignHighlighted) {
      this.resign.emit();
      this.clearResignHighlight();
    } else {
      this.highlightResign();
    }
  }

  handleDrawClick(): void {
    if(!this.isGameActive || this.isSpectator)
      return;

    if (this.isDrawHighlightedByParent) {
      this.acceptDraw.emit();
      this.clearDrawHighlight();
    } else if (!this.isDrawHighlighted) {
      this.highlightDraw();
      this.offerDraw.emit();
    }
  }

  handleUndoClick(): void {
    if(!this.isGameActive || this.isSpectator)
      return;
    
    if (this.isUndoHighlightedByParent) {
      this.acceptUndo.emit();
      this.clearUndoHighlight();
    } else if (!this.isUndoHighlighted) {
      this.highlightUndo();
      this.offerUndo.emit();
    }
  }

  highlightDrawFromParent(): void {
    this.isDrawHighlightedByParent = true;
    this.isDrawHighlighted = false;
    this.drawTimeout = setTimeout(() => this.clearDrawHighlight(), 10000);
  }

  highlightUndoFromParent(): void {
    this.isUndoHighlightedByParent = true;
    this.isUndoHighlighted = false;
    this.undoTimeout = setTimeout(() => this.clearUndoHighlight(), 10000);
  }

  private highlightResign(): void {
    this.isResignHighlighted = true;
    this.resignTimeout = setTimeout(() => this.clearResignHighlight(), 10000);
  }

  private highlightDraw(): void {
    this.isDrawHighlighted = true;
    this.isDrawHighlightedByParent = false;
    this.drawTimeout = setTimeout(() => this.clearDrawHighlight(), 10000);
  }

  private highlightUndo(): void {
    this.isUndoHighlighted = true;
    this.isUndoHighlightedByParent = false;
    this.undoTimeout = setTimeout(() => this.clearUndoHighlight(), 10000);
  }

  clearResignHighlight(): void {
    this.isResignHighlighted = false;
    clearTimeout(this.resignTimeout);
  }

  clearDrawHighlight(): void {
    this.isDrawHighlighted = false;
    this.isDrawHighlightedByParent = false;
    clearTimeout(this.drawTimeout);
  }

  clearUndoHighlight(): void {
    this.isUndoHighlighted = false;
    this.isUndoHighlightedByParent = false;
    clearTimeout(this.undoTimeout);
  }

  clearAllHighlights(): void {
    this.clearResignHighlight();
    this.clearDrawHighlight();
    this.clearUndoHighlight();
  }
}
