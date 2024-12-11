public void ProcessMoveResult(int gameId, MoveInfo moveInfo, string fenNotationMove) 
{
    NotationInfo notationInfo = new NotationInfo();
    Retrieve_Notation_Information(ref notationInfo, moveInfo, fenNotationMove);

    string fenNotation = WriteFenNotation(notationInfo);
    string algebraicNotation = WriteAlgebraicNotation(notationInfo, moveInfo);

    //Writing info to database
}

public string WriteFenNotation(NotationInfo notationInfo)
{
    // 1. Board state
    StringBuilder fenBuilder = new StringBuilder();
    for (int y = 7; y >= 0; y--)
    {
        int emptySquares = 0;
        for (int x = 0; x < 8; x++)
        {
            ChessFigure piece = notationInfo.chessBoard[x, y];
            if (piece == null)
            {
                emptySquares++;
            }
            else
            {
                if (emptySquares > 0)
                {
                    fenBuilder.Append(emptySquares);
                    emptySquares = 0;
                }
                char pieceChar = GetPieceSymbol(piece);
                fenBuilder.Append(pieceChar);
            }
        }
        if (emptySquares > 0) fenBuilder.Append(emptySquares);
        if (y > 0) fenBuilder.Append('/');
    }

    // 2. Turn
    fenBuilder.Append(' ').Append(notationInfo.whiteTurn ? 'w' : 'b');

    // 3. Castling
    string castlingRights = "";
    if (notationInfo.canWhiteSCastle) castlingRights += "K";
    if (notationInfo.canWhiteLCastle) castlingRights += "Q";
    if (notationInfo.canBlackSCastle) castlingRights += "k";
    if (notationInfo.canBlackLCastle) castlingRights += "q";
    if (castlingRights == "") castlingRights = "-";
    fenBuilder.Append(' ').Append(castlingRights);

    // 4. En passant
    if (notationInfo.enPassantTarget.x.HasValue && notationInfo.enPassantTarget.y.HasValue)
    {
        fenBuilder.Append(' ').Append(ConvertToAlgebraic(notationInfo.enPassantTarget.x.Value, notationInfo.enPassantTarget.y.Value));
    }
    else
    {
        fenBuilder.Append(" -");
    }

    // 5. Half-moves and move number
    fenBuilder.Append(' ').Append(notationInfo.halfMoveClock);
    fenBuilder.Append(' ').Append(notationInfo.moveNumber);

    return fenBuilder.ToString();
}

private char GetPieceSymbol(ChessFigure piece)
{
    switch (piece.type)
    {
        case ChessPiece.Pawn: return piece.isWhite ? 'P' : 'p';
        case ChessPiece.Rook: return piece.isWhite ? 'R' : 'r';
        case ChessPiece.Knight: return piece.isWhite ? 'N' : 'n';
        case ChessPiece.Bishop: return piece.isWhite ? 'B' : 'b';
        case ChessPiece.Queen: return piece.isWhite ? 'Q' : 'q';
        case ChessPiece.King: return piece.isWhite ? 'K' : 'k';
    }
}

private string ConvertToAlgebraic(int x, int y)
{
    return $"{(char)('a' + x)}{(y + 1)}";
}

public string WriteAlgebraicNotation(NotationInfo notationInfo, MoveInfo moveInfo)
{
    StringBuilder sanBuilder = new StringBuilder();

    // 1. Castling
    if (notationInfo.isLCastling)
        return "O-O-O";
    if (notationInfo.isSCastling)
        return "O-O";

    // 2. Figure type
    if (notationInfo.pieceType != ChessPiece.Pawn)
        sanBuilder.Append(GetAlgebraicPieceSymbol(notationInfo.pieceType));

    // 3. Optional source square disambiguation
    sanBuilder.Append(GetMoveDisambiguation(moveInfo));

    // 4. Takes sign
    if (notationInfo.isCapture)
    {
        sanBuilder.Append('x');
    }

    // 5. Target square
    sanBuilder.Append(ConvertToAlgebraic(notationInfo.targetX, notationInfo.targetY));

    // 6. Pawn promotion
    if (notationInfo.promotedTo != null)
    {
        sanBuilder.Append("=").Append(GetAlgebraicPieceSymbol(notationInfo.promotedTo));
    }

    // 7. Check or mate
    if (notationInfo.isCheckmate)
    {
        sanBuilder.Append('#'); // Mate
    }
    else if (notationInfo.isCheck)
    {
        sanBuilder.Append('+'); // Check
    }

    return sanBuilder.ToString();
}

private char GetAlgebraicPieceSymbol(ChessPiece pieceType)
{
    switch (pieceType)
    {
        case ChessPiece.Pawn: return ' ';
        case ChessPiece.Rook: return 'R';
        case ChessPiece.Knight: return 'N';
        case ChessPiece.Bishop: return 'B';
        case ChessPiece.Queen: return 'Q';
        case ChessPiece.King: return 'K';
        default: throw new ArgumentException("Invalid piece type");
    }
}

public string GetMoveDisambiguation(MoveInfo moveInfo)
{
    List<(int, int)> ambiguousPieces = GetPiecesThatCanGoToSquare(moveInfo.targetX, moveInfo.targetY, moveInfo, moveInfo.whiteTurn);

    ambiguousPieces.RemoveAll(p => moveInfo.chessBoard[p.Item1, p.Item2].type != moveInfo.sourcePiece.type);

    if (ambiguousPieces.Count == 1)
        return string.Empty;

    bool isColumnAmbiguous = ambiguousPieces.Any(p => p.Item1 != moveInfo.sourceX);
    bool isRowAmbiguous = ambiguousPieces.Any(p => p.Item2 != moveInfo.sourceY);

    if (isColumnAmbiguous && isRowAmbiguous)
    {
        return ConvertToAlgebraic(moveInfo.sourceX, moveInfo.sourceY);
    }
    else if (isColumnAmbiguous)
    {
        return ConvertToAlgebraic(moveInfo.sourceX, null);
    }
    else
    {
        return ConvertToAlgebraic(null, moveInfo.sourceY);
    }
}