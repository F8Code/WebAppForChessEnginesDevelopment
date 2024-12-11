public void Retrieve_FEN_Notation_Information(ref MoveInfo moveInfo, string fenNotationMove)
{
    // Split the FEN notation into its 6 parts
    string[] fenParts = fenNotationMove.Split(' ');

    // Parse board state
    string boardState = fenParts[0];
    string[] rows = boardState.Split('/');
    for (int y = 0; y < 8; y++)
    {
        int x = 0;
        foreach (char symbol in rows[y])
        {
            if (char.IsDigit(symbol))
            {
                x += (int)char.GetNumericValue(symbol); // Empty squares
            }
            else
            {
                bool isWhite = char.IsUpper(symbol);
                ChessPiece pieceType;
                switch (char.ToLower(symbol))
                {
                    case 'p': pieceType = ChessPiece.Pawn; break;
                    case 'r': pieceType = ChessPiece.Rook; break;
                    case 'n': pieceType = ChessPiece.Knight; break;
                    case 'b': pieceType = ChessPiece.Bishop; break;
                    case 'q': pieceType = ChessPiece.Queen; break;
                    case 'k': pieceType = ChessPiece.King; break;
                    default: throw new Exception("Invalid piece type in FEN.");
                }
                moveInfo.chessBoard[x, 7 - y] = new ChessFigure(pieceType, isWhite);
                x++;
            }
        }
    }

    // Parse active color
    moveInfo.whiteTurn = (fenParts[1] == "w");

    // Parse castling rights
    moveInfo.canWhiteSCastle = fenParts[2].Contains("K");
    moveInfo.canWhiteLCastle = fenParts[2].Contains("Q");
    moveInfo.canBlackSCastle = fenParts[2].Contains("k");
    moveInfo.canBlackLCastle = fenParts[2].Contains("q");

    // Parse en passant target square
    if (fenParts[3] == "-")
    {
        moveInfo.enPassantTarget = (null, null);
    }
    else
    {
        int enPassantX = fenParts[3][0] - 'a';
        int enPassantY = fenParts[3][1] - '1';
        moveInfo.enPassantTarget = (enPassantX, enPassantY);
    }

    // Parse half-move clock and full-move number
    moveInfo.halfMoveClock = int.Parse(fenParts[4]);
    moveInfo.moveNumber = int.Parse(fenParts[5]);
}


public void Retrieve_Coordinate_Notation_Information(ref MoveInfo moveInfo, string coordinateNotationMove)
{
    // Extract source and target positions from the notation (e.g., "b5-c6" or "e7-e8-Q")
    string[] moveParts = coordinateNotationMove.Split('-');
    
    // Parse source position
    moveInfo.sourceX = moveParts[0][0] - 'a'; // 'a' is 0, 'b' is 1, etc.
    moveInfo.sourceY = moveParts[0][1] - '1'; // '1' is 0, '2' is 1, etc.

    // Parse target position
    moveInfo.targetX = moveParts[1][0] - 'a';
    moveInfo.targetY = moveParts[1][1] - '1';

    // If the move contains a promotion (e.g., "e7-e8-Q"), parse the promotion source
    if (moveParts[1].Length == 3)
    {
        char promotionChar = moveParts[1][2];
        switch (promotionChar)
        {
            case 'Q': moveInfo.promotedTo = ChessPiece.Queen; break;
            case 'R': moveInfo.promotedTo = ChessPiece.Rook; break;
            case 'B': moveInfo.promotedTo = ChessPiece.Bishop; break;
            case 'N': moveInfo.promotedTo = ChessPiece.Knight; break;
            default: throw new Exception("Invalid promotion sourcePiece in coordinate notation.");
        }
    }

    // Determine the piece type from the source position and FEN board
    moveInfo.pieceType = moveInfo.chessBoard[moveInfo.sourceX, moveInfo.sourceY].type;
}

public void Retrieve_Aditional_Move_Information(ref MoveInfo moveInfo)
{
    moveInfo.sourcePiece = moveInfo.chessBoard[moveInfo.sourceX, moveInfo.sourceY];
    moveInfo.targetPiece = moveInfo.chessBoard[moveInfo.targetX, moveInfo.targetY];
    moveInfo.distanceX = moveInfo.targetX - moveInfo.targetX;
    moveInfo.distanceY = moveInfo.targetY - moveInfo.targetY;
    moveInfo.directionX = Math.Sign(moveInfo.distanceX);
    moveInfo.directionY = Math.Sign(moveInfo.distanceY);
}