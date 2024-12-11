public enum ChessPiece {
    Pawn,
    Rook,
    Knight,
    Bishop,
    Queen,
    King
}

public enum DrawType {
    Stalemate,
    InsufficientMaterial,
    ThreefoldRepetition,
    FiftyMoveRule,
}

public class ChessFigure
{
    public ChessPiece type { get; set; }
    public bool isWhite { get; }

    public ChessFigure(ChessPiece type, bool isWhite)
    {
        this.type = type;
        this.isWhite = isWhite;
    }
    public ChessFigure(ChessFigure copy)
    {
        type = copy.type;
        isWhite = copy.isWhite;
    }
}

public struct moveInfo {
    //Coordinate notation retrieved information (ex. b5-c6, c4-c8, e7-e8-Q) <- Q means promoted to Queen
    public int sourceX { get; set; }
    public int sourceY { get; set; }
    public int targetX { get; set; }
    public int targetY { get; set; }
    public ChessPiece promotedTo { get; set; }

    //FEN retrieved information (ex. rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2)
    ChessFigure[,] chessBoard = new ChessFigure[8, 8];
    public bool whiteTurn { get; set; }
    public bool canWhiteSCastle { get; set; }
    public bool canWhiteLCastle { get; set; }
    public bool canBlackSCastle { get; set; }
    public bool canBlackLCastle { get; set; }
    public (int? x, int? y) enPassantTarget { get; set; }
    public int halfMoveClock { get; set; }
    public int moveNumber { get; set; }

    //Other retrieved information and useful data
    public ChessFigure sourcePiece { get; set; } //Retrieved by combining Coordinate + FEN board
    public ChessFigure targetPiece { get; set; } //Retrieved by combining Coordinate + FEN board
    public int distanceX { get; set; }
    public int distanceY { get; set; }
    public int directionX { get; set; }
    public int directionY { get; set; }
}

public struct NotationInfo {
    //Algebraic notation writing information
    public int sourceX { get; set; }
    public int sourceY { get; set; }
    public int targetX { get; set; }
    public int targetY { get; set; }
    public ChessPiece promotedTo { get; set; }
    public bool isLCastling { get; set; }
    public bool isSCastling { get; set; }
    public ChessPiece pieceType { get; set; }

    public bool isCapture { get; set; }
    public bool isCheck { get; set; }

    //FEN notation writing information
    ChessFigure[,] chessBoard = new ChessFigure[8, 8];
    public bool whiteTurn { get; set; }
    public bool canWhiteLCastle { get; set; }
    public bool canWhiteSCastle { get; set; }
    public bool canBlackLCastle { get; set; }
    public bool canBlackSCastle { get; set; }
    public (int? x, int? y) enPassantTarget { get; set; }
    public int halfMoveClock { get; set; }
    public int moveNumber { get; set; }

    //Game writing information (Also used for Algebraic notation)
    public bool isCheckmate { get; set; }
    public DrawType drawType { get; set; }
}