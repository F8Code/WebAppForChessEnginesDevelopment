public bool ValidateMove(int gameId, string fenNotationMove, string coordinateNotationMove, bool writeMoveToDatabase) 
{
    MoveInfo moveInfo = new MoveInfo();
    Retrieve_FEN_Notation_Information(ref moveInfo, fenNotationMove);
    Retrieve_Coordinate_Notation_Information(ref moveInfo, coordinateNotationMove);

    bool isMoveValid = isMoveValid(moveInfo);

    if(isMoveValid && writeMoveToDatabase)
        ProcessMoveResult(gameId, moveInfo, fenNotationMove);

    return isMoveValid;
}

public bool isMoveValid(MoveInfo moveInfo) 
{
    if(!IsMoveWithinBounds(moveInfo.targetX, moveInfo.targetY))
        return false;

    if(DoesMoveExposeKing(moveInfo))
        return false;

    if(DoesFollowMovementRules(moveInfo))
        return true;

    return false;
}

public bool IsMoveWithinBounds(int squareX, int squareY)
{
    return squareX >= 0 && squareX < 8 && squareY >= 0 && squareY < 8;
}

public bool DoesMoveExposeKing(MoveInfo moveInfo) 
{
    //If king has moved, check if he can be attacked
    if(moveInfo.chessBoard[moveInfo.sourceX, moveInfo.sourceY].type == ChessPiece.King) 
        return GetPiecesThatCanGoToSquare(moveInfo.targetX, moveInfo.targetY, moveInfo, !moveInfo.whiteTurn).Count != 0;
    
    //If other piece has moved, check if it exposed the king
    MoveInfo simulatedMoveInfo = moveInfo; //During python conversion this must be a deep copy!
    simulatedMoveInfo.chessBoard[moveInfo.targetX, moveInfo.targetY] = moveInfo.chessBoard[moveInfo.sourceX, moveInfo.sourceY];
    simulatedMoveInfo.chessBoard[moveInfo.sourceX, moveInfo.sourceY] = null;

    (int, int) kingPosition = GetKingPosition(simulatedMoveInfo, moveInfo.whiteTurn); 

    return GetPiecesThatCanGoToSquare(kingPosition.Item1, kingPosition.Item2, simulatedMoveInfo, !moveInfo.whiteTurn) != 0;
}

public List<(int, int)> GetPiecesThatCanGoToSquare(int targetX, int targetY, MoveInfo moveInfo, bool forWhite) //Note that this function doesnt check if the found pieces expose their's king!
{
    List<(int, int)> piecesPositions = new List<(int, int)>();

    for (int x = 0; x < 8; x++)
    {
        for (int y = 0; y < 8; y++)
        {
            ChessFigure piece = moveInfo.chessBoard[x, y];
            if (piece != null && piece.isWhite == forWhite)
            {
                MoveInfo simulatedMoveInfo = new MoveInfo
                {
                    chessBoard = moveInfo.chessBoard,
                    sourceX = x,
                    sourceY = y,
                    sourcePiece = piece,
                    targetX = targetX,
                    targetY = targetY,
                    targetPiece = moveInfo.chessBoard[targetX, targetY],
                    enPassantTarget = moveInfo.enPassantTarget
                };
                Retrieve_Aditional_Move_Information(ref simulatedMoveInfo);

                if (DoesFollowMovementRules(simulatedMoveInfo))
                    piecesPositions.Add((x, y));
            }
        }
    }

    return piecesPositions;
}

public (int, int) GetKingPosition(MoveInfo moveInfo, bool forWhite) 
{
    for (int x = 0; x < 8; x++)
        for (int y = 0; y < 8; y++)
            if(moveInfo.chessBoard[x, y] != null && moveInfo.chessBoard[x, y].type == ChessPiece.King)
                if(moveInfo.chessBoard[x, y].isWhite == forWhite)
                    return (x, y);
}


public bool DoesFollowMovementRules(moveInfo) 
{
    Retrieve_Aditional_Move_Information(ref moveInfo);
    //If the piece tried to move to the square it's already in
    if(moveInfo.dirX + moveInfo.dirY == 0)
        return false;

    switch (moveInfo.sourcePiece.type)
    {
        case ChessPiece.Pawn:
            if(DoesFollowPawnMovementRules(moveInfo))
                return true;
            break;
        case ChessPiece.Knight:
            if(DoesFollowKnightMovementRules(moveInfo))
                return true;
            break;
        case ChessPiece.Rook:
            if(DoesFollowRookMovementRules(moveInfo))
                return true;
            break;
        case ChessPiece.Bishop:
            if(DoesFollowBishopMovementRules(moveInfo))
                return true;
            break;
        case ChessPiece.Queen:
            if(DoesFollowQueenMovementRules(moveInfo))
                return true;
            break;
        case ChessPiece.King:
            if(DoesFollowKingMovementRules(moveInfo))
                return true;
            break;
    }

    return false;
}

public bool IsPathClear(MoveInfo moveInfo)
{
    //Checking pawn forward movent collison
    if (moveInfo.sourcePiece.type == ChessPiece.Pawn && moveInfo.targetPiece != null)
        return false;

    //Checking for a friendly piece on the final square
    if (moveInfo.targetPiece != null && moveInfo.targetPiece.isWhite == moveInfo.whiteTurn)
        return false;

    //Checking all in-between squares occupancy
    for (int i = 1; i < Math.Max(Math.Abs(moveInfo.distanceX), Math.Abs(moveInfo.distanceY)); i++)
        if (moveInfo.chessBoard[moveInfo.sourcePiece.sourceX + i * moveInfo.directionX, moveInfo.sourcePiece.sourceY + i * moveInfo.directionY] != null)
            return false;

    return true;
}

public bool IsCastlingValid(MoveInfo moveInfo)
{
    if(moveInfo.whiteTurn) {
        if((moveInfo.directionX < 0) ? !moveInfo.canWhiteLCastle : !moveInfo.canWhiteSCastle)
            return false;
    }
    else {
        if((moveInfo.directionX < 0) ? !moveInfo.canBlackLCastle : !moveInfo.canBlackSCastle)
            return false;
    }

    //Scan castling squares for attacks. The last castling square is scanned by the DoesMoveExposeKing function that's nested inside the validation function.
    if (GetPiecesThatCanGoToSquare(moveInfo.sourceX, moveInfo.sourceY, moveInfo, !moveInfo.whiteTurn).Count == 0 && //Scan current king's square for attacks
        GetPiecesThatCanGoToSquare(moveInfo.sourceX + moveInfo.directionX, moveInfo.sourceY, moveInfo, !moveInfo.whiteTurn).Count == 0) //Scan first castling square for attacks
        return true;

    return false;
}