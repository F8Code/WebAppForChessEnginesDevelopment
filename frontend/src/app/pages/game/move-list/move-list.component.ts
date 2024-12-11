import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { Move } from '../../../interfaces/move.interface';

@Component({
  selector: 'app-move-list',
  templateUrl: './move-list.component.html',
  styleUrls: ['./move-list.component.css']
})
export class MoveListComponent implements OnChanges {
  @Input() moves: Move[] = [];
  @Input() currentMoveIndex: number = 0;

  @Output() moveSelected = new EventEmitter<number>();

  sanPairs: { moveNumber: number; white: string; black?: string; whiteIndex: number; blackIndex?: number }[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.moves) {
      this.updateSanPairs();
      this.cdr.detectChanges();
    }
      
  }

  private updateSanPairs(): void {
    this.sanPairs = [];
    for (let i = 1; i < this.moves.length; i += 2) {
      this.sanPairs.push({
        moveNumber: Math.floor((i - 1) / 2) + 1,
        white: this.moves[i]?.san || '',
        black: this.moves[i + 1]?.san || '',
        whiteIndex: i,
        blackIndex: i + 1 < this.moves.length ? i + 1 : undefined,
      });
    }
  }

  selectMove(index: number): void {
    if (index >= 0 && index < this.moves.length) {
      this.moveSelected.emit(index);
    }
  }

  copyFenToClipboard(): void {
    const fen = this.moves[this.currentMoveIndex]?.fen || '';
    if (!fen) {
      console.warn('No FEN notation to copy.');
      return;
    }
  
    const textarea = document.createElement('textarea');
    textarea.value = fen;
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
  
    try {
      document.execCommand('copy');
    } catch (err) {
      console.log('Failed to copy the FEN notation:', err);
    }
  
    document.body.removeChild(textarea);
  }

  selectFenText(event: MouseEvent): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.select();
  }
}
