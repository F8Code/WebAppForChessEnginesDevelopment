public void Retrieve_Notation_Information(ref NotationInfo notationInfo, MoveInfo moveInfo, string fenNotationMove) 
{
    notationInfo.sourceX = moveInfo.sourceX;
    notationInfo.sourceY = moveInfo.sourceY;
    notationInfo.targetX = moveInfo.targetX;
    notationInfo.targetY = moveInfo.targetY;
    notationInfo.promotedTo = moveInfo.promotedTo;

    notationInfo.pieceType = moveInfo.sourcePiece.type;

    notationInfo.isCapture = moveInfo.targetPiece != null;

    notationInfo.whiteTurn = !moveInfo.whiteTurn;

    if (moveInfo.sourcePiece.type == ChessPiece.Pawn || notationInfo.isCapture)
        notationInfo.halfMoveClock = 0;
    else
        notationInfo.halfMoveClock = moveInfo.halfMoveClock + 1;

    if (!moveInfo.whiteTurn)
        notationInfo.moveNumber = moveInfo.moveNumber + 1;
    else
        notationInfo.moveNumber = moveInfo.moveNumber;

    if (moveInfo.sourcePiece.type == ChessPiece.Pawn && Math.Abs(moveInfo.distanceY) == 2)
        notationInfo.enPassantTarget = (moveInfo.sourceX, moveInfo.sourceY + moveInfo.directionY);
    else
        notationInfo.enPassantTarget = (null, null);

    Retrieve_Castling_Notation_Information(ref notationInfo, moveInfo);

    notationInfo.chessBoard = simulatedMoveInfo.chessBoard;

    Retrieve_Complex_Notation_Information(ref notationInfo, moveInfo, fenNotationMove);
}

public void Retrieve_Castling_Notation_Information(ref NotationInfo notationInfo, MoveInfo moveInfo)
{
    notationInfo.canWhiteLCastle = moveInfo.canWhiteLCastle;
    notationInfo.canWhiteSCastle = moveInfo.canWhiteSCastle;
    notationInfo.canBlackLCastle = moveInfo.canBlackLCastle;
    notationInfo.canBlackSCastle = moveInfo.canBlackSCastle;

    if (moveInfo.sourcePiece.type == ChessPiece.King)
    {
        if (moveInfo.sourcePiece.isWhite)
        {
            notationInfo.canWhiteLCastle = false;
            notationInfo.canWhiteSCastle = false;
        }
        else
        {
            notationInfo.canBlackLCastle = false;
            notationInfo.canBlackSCastle = false;
        }
    }

    if (moveInfo.sourcePiece.type == ChessPiece.Rook)
    {
        if (moveInfo.sourcePiece.isWhite && moveInfo.sourceX == 0 && moveInfo.sourceY == 0)
        {
            notationInfo.canWhiteLCastle = false;
        }
        if (moveInfo.sourcePiece.isWhite && moveInfo.sourceX == 7 && moveInfo.sourceY == 0)
        {
            notationInfo.canWhiteSCastle = false;
        }
        if (!moveInfo.sourcePiece.isWhite && moveInfo.sourceX == 0 && moveInfo.sourceY == 7)
        {
            notationInfo.canBlackLCastle = false;
        }
        if (!moveInfo.sourcePiece.isWhite && moveInfo.sourceX == 7 && moveInfo.sourceY == 7)
        {
            notationInfo.canBlackSCastle = false;
        }
    }

    if(moveInfo.sourcePiece.type == ChessPiece.King && Math.Abs(moveInfo.distanceX) == 2) 
    {
        if(moveInfo.directionX == -1)
            notationInfo.isLCastling = true;
        else
            notationInfo.isSCastling = true;
    }
}

public void Retrieve_Complex_Notation_Information(ref NotationInfo notationInfo, MoveInfo moveInfo, string fenNotationMove) 
{
    MoveInfo simulatedMoveInfo = moveInfo; //During python conversion this must be a deep copy!
    simulatedMoveInfo.chessBoard[moveInfo.targetX, moveInfo.targetY] = moveInfo.chessBoard[moveInfo.sourceX, moveInfo.sourceY];
    simulatedMoveInfo.chessBoard[moveInfo.sourceX, moveInfo.sourceY] = null;
    simulatedMoveInfo.whiteTurn = !moveInfo.whiteTurn;

    RetrieveCheckmateInformation(ref notationInfo, simulatedMoveInfo);
    if(!chessNotation.isCheckmate)
        RetrieveDrawInformation(ref notationInfo, simulatedMoveInfo, fenNotationMove, gameId);
}

public void RetrieveCheckmateInformation(ref NotationInfo notationInfo, MoveInfo moveInfo) 
{
    //Check how many pieces are attacking the king
    (int, int) kingPosition = GetKingPosition(moveInfo, moveInfo.sourceSquare.whiteTurn); 
    List<(int, int)> attackers = GetPiecesThatCanGoToSquare(kingPosition.Item1, kingPosition.Item2, moveInfo, !moveInfo.whiteTurn);

    if(attackers.Count == 0)
        return;

    notationInfo.isCheck = true;

    int[] directionsX = { -1, -1, 1, 1, -1, 1, 0, 0 };
    int[] directionsY = { -1, 1, -1, 1, 0, 0, -1, 1 };
    moveInfo.sourceX = kingPosition.Item1;
    moveInfo.sourceY = kingPosition.Item2;
    //Check if the king can move to a safe square
    for (int i = 0; i < 8; i++)
    {
        moveInfo.targetX = kingPosition.Item1 + directionsX[i];
        moveInfo.targetY = kingPosition.Item2 + directionsY[i];
        if(IsMoveValid(moveInfo))
            return;
    }

    //If the king is under 2 attacks and he couldnt move away it's checkmate
    if(attackers.Count == 2) 
    {
        notationInfo.isCheckmate = true;
        return;
    }
        
    if (moveInfo.chessBoard[attackers[0].Item1, attackers[0].Item2].type == ChessFigure.Knight)
    {
        //If the attacking piece is a knight check if it can be captured
        if(GetPiecesThatCanValidGoToSquare(attackers[0].Item1, attackers[0].Item2, moveInfo, moveInfo.whiteTurn).Count > 0)
            return;
    }
    else
    {
        int attackDistanceX = attackers[0].Item1 - kingPosition.Item1;
        int attackDistanceY = attackers[0].Item2- kingPosition.Item2;
        //If the attacking piece is of a different type, check if it can be captured or blocked
        for (int i = 1; i <= Math.Max(Math.Abs(attackDistanceX), Math.Abs(attackDistanceY)); i++)
        {
            int targetX = kingPosition.Item1 + i * Math.Sign(attackDistanceX);
            int targetY = kingPosition.Item2 + i * Math.Sign(attackDistanceY);
            if(GetPiecesThatCanValidGoToSquare(targetX, targetY, moveInfo, moveInfo.whiteTurn).Count > 0)
                return;
        }
    }

    notationInfo.isCheckmate = true;
}

public List<(int, int)> GetPiecesThatCanValidGoToSquare(int targetX, int targetY, MoveInfo moveInfo, bool forWhite)
{
    List<(int, int)> piecesThatCanMove = new List<(int, int)>();

    for (int x = 0; x < 8; x++)
    {
        for (int y = 0; y < 8; y++)
        {
            ChessFigure piece = moveInfo.chessBoard[x, y];
            if (piece != null && piece.isWhite == forWhite)
            {
                MoveInfo simulatedMoveInfo = new MoveInfo
                {
                    sourceX = x,
                    sourceY = y,
                    targetX = targetX,
                    targetY = targetY,
                    sourcePiece = piece,
                    targetPiece = moveInfo.chessBoard[targetX, targetY],
                    chessBoard = moveInfo.chessBoard
                };

                if (IsMoveValid(simulatedMoveInfo))
                    piecesThatCanMove.Add((x, y));
            }
        }
    }
    return piecesThatCanMove;
}

public void RetrieveDrawInformation(ref NotationInfo notationInfo, MoveInfo moveInfo, string fenNotationMove)
{
    RetrieveFiftyMoveRuleInformation(ref notationInfo, moveInfo);
    if(notationInfo.DrawType != null)
        return;

    RetrieveStalemateInformation(ref notationInfo, moveInfo);
    if(notationInfo.DrawType != null)
        return;

    RetrieveInsufficientMaterialInformation(ref notationInfo, moveInfo);
    if(notationInfo.DrawType != null)
        return;

    RetrieveThreefoldRepetitionInformation(ref notationInfo, fenNotationMove, gameId);
}

public void RetrieveFiftyMoveRuleInformation(ref NotationInfo notationInfo, MoveInfo moveInfo)
{
    if(moveInfo.halfMoveClock >= 100)
        notationInfo.drawType = DrawType.FiftyMoveRule;
}

public void RetrieveStalemateInformation(ref NotationInfo notationInfo, MoveInfo moveInfo)
{
    (int, int) kingPosition = GetKingPosition(moveInfo, moveInfo.sourceSquare.whiteTurn); 
    if(GetPiecesThatCanGoToSquare(kingPosition.Item1, kingPosition.Item2, moveInfo, !moveInfo.whiteTurn).Count > 0) 
        return;

    Dictionary<ChessPiece, List<(int, int)>> moveDirections = new Dictionary<ChessPiece, List<(int, int)>>()
    {
        { ChessPiece.Pawn, new List<(int, int)> { (0, 1), (0, 2), (0, -1), (0, -2), (1, 1), (-1, 1), (1, -1), (-1, -1) } },
        { ChessPiece.Queen, new List<(int, int)> { (-1, 1), (1, 1), (-1, -1), (1, -1), (0, 1), (0, -1), (1, 0), (-1, 0) } },
        { ChessPiece.King, new List<(int, int)> { (-1, 1), (1, 1), (-1, -1), (1, -1), (0, 1), (0, -1), (1, 0), (-1, 0) } },
        { ChessPiece.Knight, new List<(int, int)> { (2, 1), (1, 2), (-1, 2), (-2, 1), (-2, -1), (-1, -2), (1, -2), (2, -1) } },
        { ChessPiece.Bishop, new List<(int, int)> { (-1, 1), (1, 1), (-1, -1), (1, -1) } },
        { ChessPiece.Rook, new List<(int, int)> { (0, 1), (0, -1), (1, 0), (-1, 0) } }
    };

    for (int i = 0; i < 8; i++)
        for (int j = 0; j < 8; j++)
        {
            ChessFigure piece = moveInfo.chessBoard[i, j];
            if (piece != null && piece.isWhite == moveInfo.whiteTurn)
            {
                List<(int, int)> directions = moveDirections[piece.type];
                foreach (var (directionX, directionY) in directions)
                {
                    moveInfo.sourceX = i;
                    moveInfo.sourceY = j;
                    moveInfo.targetX = i + directionX;
                    moveInfo.targetY = j + directionY;

                    if (IsMoveValid(moveInfo))
                        return;
                }
            }
        }

    notationInfo.drawType = DrawType.Stalemate;
}

public void RetrieveInsufficientMaterialInformation(ref NotationInfo notationInfo, MoveInfo moveInfo)
{
    List<ChessPiece> whitePieces = new List<ChessPiece>();
    List<ChessPiece> blackPieces = new List<ChessPiece>();

    for (int i = 0; i < 8; i++)
        for (int j = 0; j < 8; j++)
            if (moveInfo.chessBoard[i, j] != null && moveInfo.chessBoard[i, j].type != ChessPiece.King)
                (moveInfo.chessBoard[i, j].color ? whitePieces : blackPieces).Add(moveInfo.chessBoard[i, j].type);

    //More then 2 non-king pieces remain
    if(whitePieces.Count >= 2 || blackPieces.Count >= 2)
        return;

    //Only kings are left
    if(whitePieces.Count + blackPieces.Count == 0) 
    {
        notationInfo.drawType = DrawType.InsufficientMaterial;
        return;
    } 

    if(whitePieces.Count + blackPieces.Count == 1) 
    {
        //Only kings and one knight remain
        if(whitePieces[0].type == ChessPiece.Knight || blackPieces[0].type == ChessPiece.Knight) 
        {
            notationInfo.drawType = DrawType.InsufficientMaterial;
            return;
        }
    }

    //Only kings and bishops of opposite color remain
    if(whitePieces[0].type == ChessPiece.Bishop && blackPieces[0].type == ChessPiece.Bishop) 
    {
        //Check bishops are of opposite colors
        bool isWhiteBishopOnWhiteSquare, isBlackBishopOnWhiteSquare;
        for (int i = 0; i < 8; i++)
            for (int j = 0; j < 8; j++)
                if (moveInfo.chessBoard[i, j] != null && moveInfo.chessBoard[i, j].type == ChessPiece.Bishop)
                    if(moveInfo.chessBoard[i, j].isWhite)
                        isWhiteBishopOnWhiteSquare = (i + j) % 2 == 0;
                    else
                        isBlackBishopOnWhiteSquare = (i + j) % 2 == 0;
        
        if(isWhiteBishopOnWhiteSquare == isBlackBishopOnWhiteSquare) 
        {
            notationInfo.drawType = DrawType.InsufficientMaterial;
            return;
        }
    }

    return;
}

public async Task RetrieveThreefoldRepetitionInformation(ref NotationInfo notationInfo, string fenNotationMove, int gameId)
{
    List<string> fenList = await GetFenListFromDatabase(gameId);

    fenList.Add(fenNotationMove);

    List<string> boardStateList = fenList.Select(fen => fen.Split(' ')[0]).ToList();

    var boardCount = boardStateList.GroupBy(fen => fen).ToDictionary(g => g.Key, g => g.Count());

    foreach (var entry in boardCount)
        if (entry.Value >= 3)
        {
            notationInfo.drawType = DrawType.ThreefoldRepetition;
            return;
        }
}