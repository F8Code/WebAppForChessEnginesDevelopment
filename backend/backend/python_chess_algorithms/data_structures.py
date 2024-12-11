from enum import Enum
from typing import Optional, Tuple, List

class ChessPiece(Enum):
    Pawn = 1
    Rook = 2
    Knight = 3
    Bishop = 4
    Queen = 5
    King = 6


class DrawType(Enum):
    Stalemate = 1
    InsufficientMaterial = 2
    ThreefoldRepetition = 3
    FiftyMoveRule = 4


class ChessFigure:
    def __init__(self, type: ChessPiece, is_white: bool):
        self.type = type
        self.is_white = is_white

    def __copy__(self):
        return ChessFigure(self.type, self.is_white)


class MoveInfo:
    def __init__(self):
        # Coordinate notation retrieved information (ex. 0543q)
        self.source_x: int = 0
        self.source_y: int = 0
        self.target_x: int = 0
        self.target_y: int = 0
        self.promoted_to: Optional[ChessPiece] = None

        # FEN retrieved information (ex. rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2)
        self.chess_board: List[List[Optional[ChessFigure]]] = [[None for _ in range(8)] for _ in range(8)]
        self.white_turn: bool = True
        self.can_white_s_castle: bool = False
        self.can_white_l_castle: bool = False
        self.can_black_s_castle: bool = False
        self.can_black_l_castle: bool = False
        self.en_passant_target: Optional[Tuple[Optional[int], Optional[int]]] = (None, None)
        self.half_move_clock: int = 0
        self.move_number: int = 1

        # Other retrieved information and useful data
        self.source_piece: Optional[ChessFigure] = None  # Retrieved by combining Coordinate + FEN board
        self.target_piece: Optional[ChessFigure] = None  # Retrieved by combining Coordinate + FEN board
        self.distance_x: int = 0
        self.distance_y: int = 0
        self.direction_x: int = 0
        self.direction_y: int = 0
        self.is_enpassant: bool = False


class NotationInfo:
    def __init__(self):
        # Algebraic and coordinate notation writing information
        self.source_x: int = 0
        self.source_y: int = 0
        self.target_x: int = 0
        self.target_y: int = 0
        self.promoted_to: Optional[ChessPiece] = None
        self.is_l_castling: bool = False
        self.is_s_castling: bool = False
        self.piece_type: Optional[ChessPiece] = None

        self.is_capture: bool = False
        self.is_enpassant: bool = False
        self.is_check: bool = False

        # FEN notation writing information
        self.chess_board: List[List[Optional[ChessFigure]]] = [[None for _ in range(8)] for _ in range(8)]
        self.white_turn: bool = True
        self.can_white_l_castle: bool = False
        self.can_white_s_castle: bool = False
        self.can_black_l_castle: bool = False
        self.can_black_s_castle: bool = False
        self.en_passant_target: Optional[Tuple[Optional[int], Optional[int]]] = (None, None)
        self.half_move_clock: int = 0
        self.move_number: int = 1

        # Game writing information (Also used for Algebraic notation)
        self.is_checkmate: bool = False
        self.draw_type: Optional[DrawType] = None