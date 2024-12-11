import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

export class ChessPiece {
  constructor(
    public type: string,
    public color: string
  ) {}
}

@Component({
  selector: 'app-chess-board',
  templateUrl: './chess-board.component.html',
  styleUrls: ['./chess-board.component.css']
})
export class ChessBoardComponent implements OnChanges {
  @Input() isGameLoaded: boolean;
  @Input() isGameActive: boolean = true;
  @Input() isSpectator: boolean = true;
  @Input() isPlayerTurn: boolean = false;
  @Input() isLookingAtLastMove: boolean = true;
  @Input() playingAsWhite: boolean = false;
  @Input() playingAsEngine: boolean = false;
  @Input() currentMove: { coordinateMove: string; sanMove: string };
  
  @Output() playerMove = new EventEmitter<{ coordinateMove: string}>();

  board: (ChessPiece | null)[][] = [];
  draggingPiece: { fromRow: number; fromCol: number } | null = null;

  isPromotionVisible: boolean = false;
  promotionSquare: { toRow: number; toCol: number } | null = null;
  promotionColor: string | null = null;

  rows = Array(8).fill(0);
  columns = Array(8).fill(0);

  highlightedSquares: { row: number; col: number; type: 'valid' | 'invalid' }[] = [];
  @Input() invalidMoveButton: boolean = false; //yeah I know it's not a button, but it actually is lmao
  invalidMoveHighlight: { fromRow: number; fromCol: number; toRow: number; toCol: number } | null = null;

  isHighlighted(row: number, col: number, type: 'valid' | 'invalid'): boolean {
    return this.highlightedSquares.some(
      (square) => square.row === row && square.col === col && square.type === type
    );
  }

  highlightInvalidMove(): void {
    if(!this.invalidMoveHighlight)
      return;

    const { fromRow, fromCol, toRow, toCol } = this.invalidMoveHighlight;

    if(!this.playingAsWhite) {
      this.highlightedSquares.push({ row: 7 - fromRow, col: 7 - fromCol, type: 'invalid' });
      this.highlightedSquares.push({ row: toRow, col: toCol, type: 'invalid' });
    } else {
      this.highlightedSquares.push({ row: fromRow, col: fromCol, type: 'invalid' });
      this.highlightedSquares.push({ row: toRow, col: toCol, type: 'invalid' });
    }

    const audio = new Audio('/assets/sounds/chess-sounds/incorrect.mp3');
    audio.play().catch((error) => {console.log('Error playing sound:', error);});

    setTimeout(() => {
      this.highlightedSquares = this.highlightedSquares.filter(square => square.type !== 'invalid');
    }, 250);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentMove'] && changes['currentMove'].currentValue && this.currentMove.coordinateMove && this.currentMove.sanMove && this.isLookingAtLastMove) {
      this.animateMove(
        this.currentMove.coordinateMove,
        this.currentMove.sanMove
      );

      this.highlightedSquares = [];
      const { fromRow, fromCol, toRow, toCol } = this.parseCoordinateMove(this.currentMove.coordinateMove);
      if(!this.playingAsWhite) {
        this.highlightedSquares.push({ row: 7 - fromCol, col: 7 - fromRow, type: 'valid' });
        this.highlightedSquares.push({ row: 7 - toCol, col: 7 - toRow, type: 'valid' });
      } else {
        this.highlightedSquares.push({ row: fromCol, col: fromRow, type: 'valid' });
        this.highlightedSquares.push({ row: toCol, col: toRow, type: 'valid' });
      }
    }

    if (changes['invalidMoveButton']) {
      this.highlightInvalidMove();
    }
  }

  updateBoardFromFen(fen: string): void {
    this.highlightedSquares = [];
    let rows = fen.split(" ")[0].split("/");
    if (!this.playingAsWhite) {
      rows = rows.reverse();
    }

    this.board = Array(8).fill(null).map(() => Array(8).fill(null));

    for (let row = 0; row < 8; row++) {
      let col = 0;
      for (const char of rows[row]) {
        if (isNaN(parseInt(char))) {
          const color = char === char.toUpperCase() ? 'white' : 'black';
          const type = this.getPieceTypeFromFen(char.toLowerCase());
          this.board[col][row] = new ChessPiece(type, color);
          col++;
        } else {
          col += parseInt(char, 10);
        }
      }
    }

    if (!this.playingAsWhite) {
      this.reverseBoard();
    }
  }

  onDragStart(event: DragEvent, row: number, col: number): void {
    this.draggingPiece = { fromRow: this.playingAsWhite ? row : 7 - row, fromCol: this.playingAsWhite ? col : 7 - col };
    this.isPromotionVisible = false;
    this.promotionSquare = null;
    this.promotionColor = null;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, toRow: number, toCol: number): void {
    event.preventDefault();

    console.log(!this.isGameActive, this.isSpectator , this.playingAsEngine , !this.isPlayerTurn ,!this.draggingPiece ,!this.isLookingAtLastMove);
    if (!this.isGameActive || this.isSpectator || this.playingAsEngine || !this.isPlayerTurn || !this.draggingPiece || !this.isLookingAtLastMove)
      return;

    const { fromRow, fromCol } = this.draggingPiece;
    const actualToRow = this.playingAsWhite ? toRow : 7 - toRow;
    const actualToCol = this.playingAsWhite ? toCol : 7 - toCol;

    const movingPiece = this.board[fromRow][fromCol];
    if (movingPiece?.type === 'pawn' && (actualToCol === 0 || actualToCol === 7)) {
      this.showPromotionOptions(actualToRow, actualToCol, movingPiece.color);
      return;
    }

    const coordinateMove = `${fromRow}${fromCol}${actualToRow}${actualToCol}`;
    this.playerMove.emit({ coordinateMove });

    this.invalidMoveHighlight = { fromRow, fromCol, toRow, toCol };

    this.draggingPiece = null;
  }

  showPromotionOptions(toRow: number, toCol: number, color: string): void {
    this.isPromotionVisible = true;
    this.promotionSquare = { toRow, toCol };
    this.promotionColor = color;
  }

  promotePiece(pieceType: string): void {
    if (!this.promotionSquare || !this.promotionColor || !this.draggingPiece)
      return;

    const { toRow, toCol } = this.promotionSquare;
    const fromRow = this.draggingPiece.fromRow;
    const fromCol = this.draggingPiece.fromCol;

    const coordinateMove = `${fromRow}${fromCol}${toRow}${toCol}${pieceType[0] == 'k' ? 'n' : pieceType[0]}`;
    this.playerMove.emit({ coordinateMove });

    this.isPromotionVisible = false;
    this.promotionSquare = null;
    this.promotionColor = null;
    this.draggingPiece = null;
  }

  animateMove(coordinateMove: string, sanMove: string): void {
    const parsedMove = this.parseCoordinateMove(coordinateMove);

    let soundPlayed = false;

    if (this.isCastling(sanMove)) {
      this.handleCastleMove(sanMove, parsedMove.fromRow, parsedMove.fromCol);
    } else if (this.isEnPassant(parsedMove)) {
      this.handleEnPassant(parsedMove);
    } else {
      soundPlayed = true;
      this.movePiece(parsedMove.fromRow, parsedMove.fromCol, parsedMove.toRow, parsedMove.toCol);
      if(this.isPromotion(sanMove))
        this.handlePromotion(sanMove, parsedMove);
    }

    if(soundPlayed)
      return;

    const audio = new Audio('/assets/sounds/chess-sounds/move.mp3');
    audio.play().catch((error) => {console.log('Error playing sound:', error);});
  }

  parseCoordinateMove(coordinateMove: string): { fromRow: number; fromCol: number; toRow: number; toCol: number } {
    const fromRow = parseInt(coordinateMove[1], 10);
    const fromCol = parseInt(coordinateMove[0], 10);
    const toRow = parseInt(coordinateMove[3], 10);
    const toCol = parseInt(coordinateMove[2], 10);
    return { fromRow, fromCol, toRow, toCol };
  }

  isCastling(algebraicMove: string): boolean {
    return algebraicMove === 'O-O' || algebraicMove === 'O-O-O';
  }

  handleCastleMove(sanMove: string, kingRow: number, kingCol: number): void {
    const isShortCastle = sanMove === 'O-O';
    const rookFromCol = isShortCastle ? 7 : 0;
    const rookToCol = isShortCastle ? 5 : 3;

    this.movePiece(kingRow, kingCol, kingRow, isShortCastle ? 6 : 2);
    this.movePiece(kingRow, rookFromCol, kingRow, rookToCol);
  }

  isEnPassant(parsedMove: { fromRow: number; fromCol: number; toRow: number; toCol: number }): boolean {
    const movingPiece = this.board[parsedMove.fromCol][parsedMove.fromRow];
    return movingPiece?.type === 'pawn' && Math.abs(parsedMove.fromCol - parsedMove.toCol) === 1 && !this.board[parsedMove.toCol][parsedMove.toRow];
  }

  handleEnPassant(parsedMove: { fromRow: number; fromCol: number; toRow: number; toCol: number }): void {
    this.board[parsedMove.toCol][parsedMove.fromRow] = null;
    this.movePiece(parsedMove.fromRow, parsedMove.fromCol, parsedMove.toRow, parsedMove.toCol);
  }

  movePiece(fromRow: number, fromCol: number, toRow: number, toCol: number): void {
    const piece = this.board[fromCol][fromRow];
    if (piece) {
      this.board[fromCol][fromRow] = null;
      
      if(this.board[toCol][toRow]) {
        const audio = new Audio('/assets/sounds/chess-sounds/capture.mp3');
        audio.play().catch((error) => {console.log('Error playing sound:', error);});
      } else {
        const audio = new Audio('/assets/sounds/chess-sounds/move.mp3');
        audio.play().catch((error) => {console.log('Error playing sound:', error);});
      }
      
      this.board[toCol][toRow] = piece;
    }
  }

  isPromotion(sanMove: string): boolean {
    return sanMove.includes('=');
  }

  handlePromotion(sanMove: string, parsedMove: { fromRow: number; fromCol: number; toRow: number; toCol: number }): void {
    const promotedPiece = this.getPieceTypeFromFen(sanMove[sanMove.indexOf('=') + 1].toLowerCase());
    this.board[parsedMove.toCol][parsedMove.toRow] = new ChessPiece(promotedPiece, this.board[parsedMove.toCol][parsedMove.toRow].color);
  }

  getPieceTypeFromFen(fenChar: string): string {
    const pieceMap: { [key: string]: string } = { p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', q: 'queen', k: 'king' };
    return pieceMap[fenChar] || '';
  }

  reverseBoard(): void {
    this.board.forEach(row => row.reverse());
  }

  getPieceImage(sourcePiece: ChessPiece): string {
    const basePath = '/assets/icons/chess-pieces/';
    return `${basePath}${sourcePiece.color}-${sourcePiece.type}.svg`;
  }

}
