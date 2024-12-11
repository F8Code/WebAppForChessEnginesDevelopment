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
    if(moveInfo.chessBoard[moveInfo.sourceX, moveInfo.sourceY].type == ChessPiece.King) 
    {
        //If king has moved, check if he can be attacked
        return GetPiecesThatCanGoToSquare(moveInfo.targetX, moveInfo.targetY, moveInfo, !moveInfo.whiteTurn).Count != 0;
    }
    else 
    {
        //If other piece has moved, check if it exposed the king
        MoveInfo simulatedMoveInfo = moveInfo; //During python conversion this must be a deep copy!
        simulatedMoveInfo.chessBoard[moveInfo.targetX, moveInfo.targetY] = moveInfo.chessBoard[moveInfo.sourceX, moveInfo.sourceY];
        simulatedMoveInfo.chessBoard[moveInfo.sourceX, moveInfo.sourceY] = null;

        (int, int) kingPosition = GetKingPosition(simulatedMoveInfo, moveInfo.whiteTurn); 

        return GetPiecesThatCanGoToSquare(kingPosition.Item1, kingPosition.Item2, simulatedMoveInfo, !moveInfo.whiteTurn) != 0;
    }
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

public bool DoesFollowPawnMovementRules(moveInfo) 
{
    //Is path clear
    if(!IsPathClear(moveInfo))
        return false;

    if(moveInfo.distanceX == 0) //Forward move
    {
        if(moveInfo.whiteTurn) {
            //One square and two square move as white
            if(moveInfo.distanceY == 1 || moveInfo.distanceY == 2 && moveInfo.sourceY == 1)
                return true;
        }
        else {
            //One square and two square move as black
            if(moveInfo.distanceY == -1 || moveInfo.distanceY == -2 && moveInfo.sourceY == 6)
                return true;
        }  
    }
    else //Diagonal takes move
    {
        //Standard takes
        if(Math.Abs(moveInfo.distanceX) == 1 && moveInfo.whiteTurn ? moveInfo.distanceY == 1 : moveInfo.distanceY == -1)
            return true;

        //En passant
        if(moveInfo.targetPiece == null && moveInfo.enPassantTarget == ((int?)moveInfo.targetX, (int?)moveInfo.targetY))
            return true;
    }    

    return false;
}

public bool DoesFollowKnightMovementRules(moveInfo) 
{
    //Is target square occupied by friendly piece
    if(moveInfo.targetPiece != null && moveInfo.sourcePiece.isWhite == moveInfo.targetPiece.isWhite)
        return false;

    //Standard movement
    if(((Math.Abs(moveInfo.distanceX) == 2 && Math.Abs(moveInfo.distanceY) == 1) || (Math.Abs(moveInfo.distanceX) == 1 && Math.Abs(moveInfo.distanceY) == 2)))
        return true;

    return false;
}

public bool DoesFollowRookMovementRules(moveInfo) 
{
    //Is path clear
    if(!IsPathClear(moveInfo))
        return false;

    //Standard movement  
    if(moveInfo.distanceX == 0 || moveInfo.distanceY == 0)
        return true;

    return false;
}

public bool DoesFollowBishopMovementRules(moveInfo) 
{
    //Is path clear
    if(!IsPathClear(moveInfo))
        return false;
    
    //Standard movement  
    if(Math.Abs(moveInfo.distanceX) == Math.Abs(moveInfo.distanceY))
        return true;

    return false;
}

public bool DoesFollowQueenMovementRules(moveInfo) 
{
    //Standard movement
    if(DoesFollowRookMovementRules(moveInfo) || DoesFollowBishopMovementRules(moveInfo))
        return true;

    return false;
}

public bool DoesFollowKingMovementRules(moveInfo) 
{
    //Is path clear
    if(!IsPathClear(moveInfo))
        return false;

    //Castling
    if(Math.Abs(moveInfo.distanceX) == 2 && moveInfo.distanceY == 0 && IsCastlingValid(moveInfo))
        return true;

    //Standard movement
    if(Math.Max(Math.Abs(moveInfo.distanceX), Math.Abs(moveInfo.distanceY)) <= 1)
        return true;

    return false;
}

public void Retrieve_Notation_Information(ref NotationInfo notationInfo, MoveInfo moveInfo, string fenNotationMove) 
{
    // Kopiowanie podstawowych informacji o ruchu (współrzędne, promocja, itd.)
    notationInfo.sourceX = moveInfo.sourceX;
    notationInfo.sourceY = moveInfo.sourceY;
    notationInfo.targetX = moveInfo.targetX;
    notationInfo.targetY = moveInfo.targetY;
    notationInfo.promotedTo = moveInfo.promotedTo;

    // Informacje o typie figury
    notationInfo.pieceType = moveInfo.sourcePiece.type;

    // Sprawdzenie, czy jest bicie
    notationInfo.isCapture = moveInfo.targetPiece != null;

    // Przepisanie informacji o stanie planszy FEN
    notationInfo.whiteTurn = !moveInfo.whiteTurn;

    // Zwiększenie wartości halfMoveClock, jeśli ruch nie był ruchem pionka ani biciem
    if (moveInfo.sourcePiece.type == ChessPiece.Pawn || notationInfo.isCapture)
        notationInfo.halfMoveClock = 0;
    else
        notationInfo.halfMoveClock = moveInfo.halfMoveClock + 1;

    // Zwiększenie liczby ruchów, jeśli ruch wykonały czarne
    if (!moveInfo.whiteTurn)
        notationInfo.moveNumber = moveInfo.moveNumber + 1;
    else
        notationInfo.moveNumber = moveInfo.moveNumber;

    // Informacje o en passant - jeśli pionek poruszył się o dwa pola, ustaw en passant target
    if (moveInfo.sourcePiece.type == ChessPiece.Pawn && Math.Abs(moveInfo.distanceY) == 2)
        notationInfo.enPassantTarget = (moveInfo.sourceX, moveInfo.sourceY + moveInfo.directionY);
    else
        notationInfo.enPassantTarget = (null, null);

    Retrieve_Castling_Notation_Information(ref notationInfo, moveInfo);

    // Skopiowanie stanu planszy po ruchu do NotationInfo
    notationInfo.chessBoard = simulatedMoveInfo.chessBoard;

    Retrieve_Complex_Notation_Information(ref notationInfo, moveInfo, fenNotationMove);
}

public void Retrieve_Castling_Notation_Information(ref NotationInfo notationInfo, MoveInfo moveInfo)
{
    // Informacje o roszadzie - sprawdzamy, czy roszada nadal możliwa
    notationInfo.canWhiteLCastle = moveInfo.canWhiteLCastle;
    notationInfo.canWhiteSCastle = moveInfo.canWhiteSCastle;
    notationInfo.canBlackLCastle = moveInfo.canBlackLCastle;
    notationInfo.canBlackSCastle = moveInfo.canBlackSCastle;

    // Roszada przestaje być możliwa, jeśli król lub wieża zostały ruszone
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

    // Jeśli wieża się ruszyła, odpowiednia roszada staje się niemożliwa
    if (moveInfo.sourcePiece.type == ChessPiece.Rook)
    {
        if (moveInfo.sourcePiece.isWhite && moveInfo.sourceX == 0 && moveInfo.sourceY == 0) // Wieża na a1
        {
            notationInfo.canWhiteLCastle = false;
        }
        if (moveInfo.sourcePiece.isWhite && moveInfo.sourceX == 7 && moveInfo.sourceY == 0) // Wieża na h1
        {
            notationInfo.canWhiteSCastle = false;
        }
        if (!moveInfo.sourcePiece.isWhite && moveInfo.sourceX == 0 && moveInfo.sourceY == 7) // Wieża na a8
        {
            notationInfo.canBlackLCastle = false;
        }
        if (!moveInfo.sourcePiece.isWhite && moveInfo.sourceX == 7 && moveInfo.sourceY == 7) // Wieża na h8
        {
            notationInfo.canBlackSCastle = false;
        }
    }

    // Sprawdzenie, czy ruch był roszadą
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
    //Check if the king is under attack
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

    // Sprawdzenie, czy dowolna figura może wykonać ruch
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

    // Extracting board state from FEN notation
    List<string> boardStateList = fenList.Select(fen => fen.Split(' ')[0]).ToList();

    // Counting occurrences of each board state
    var boardCount = boardStateList.GroupBy(fen => fen).ToDictionary(g => g.Key, g => g.Count());

    // Checking if any FEN notation occurred 3 times
    foreach (var entry in boardCount)
        if (entry.Value >= 3)
        {
            notationInfo.drawType = DrawType.ThreefoldRepetition;
            return;
        }
}

public void ProcessMoveResult(int gameId, MoveInfo moveInfo, string fenNotationMove) 
{
    NotationInfo notationInfo = new NotationInfo();
    Retrieve_Notation_Information(ref notationInfo, moveInfo, fenNotationMove);

    string fenNotation = WriteFenNotation(notationInfo);
    string algebraicNotation = WriteAlgebraicNotation(notationInfo, moveInfo);
}

public string WriteFenNotation(NotationInfo notationInfo )
{
    // 1. Saving the board state
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

    // 2. Information about the turn
    fenBuilder.Append(' ').Append(notationInfo.whiteTurn ? 'w' : 'b');

    // 3. Information about castling
    string castlingRights = "";
    if (notationInfo.canWhiteSCastle) castlingRights += "K";
    if (notationInfo.canWhiteLCastle) castlingRights += "Q";
    if (notationInfo.canBlackSCastle) castlingRights += "k";
    if (notationInfo.canBlackLCastle) castlingRights += "q";
    if (castlingRights == "") castlingRights = "-";
    fenBuilder.Append(' ').Append(castlingRights);

    // 4. Information about en passant
    if (notationInfo.enPassantTarget.x.HasValue && notationInfo.enPassantTarget.y.HasValue)
    {
        fenBuilder.Append(' ').Append(ConvertToAlgebraic(notationInfo.enPassantTarget.x.Value, notationInfo.enPassantTarget.y.Value));
    }
    else
    {
        fenBuilder.Append(" -");
    }

    // 5. Half-move clock and move number
    fenBuilder.Append(' ').Append(notationInfo.halfMoveClock);
    fenBuilder.Append(' ').Append(notationInfo.moveNumber);

    return fenBuilder.ToString();
}

// Helper function - returns the symbol of a piece depending on its color
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

// Helper function to convert position to algebraic notation (e.g., from 0,0 -> a1)
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

    // 2. Piece type (pawns are omitted by default)
    if (notationInfo.pieceType != ChessPiece.Pawn)
        sanBuilder.Append(GetAlgebraicPieceSymbol(notationInfo.pieceType));

    // 3. Optionally starting coordinates if needed for disambiguation
    sanBuilder.Append(GetMoveDisambiguation(moveInfo));

    // 4. Capture symbol (if it is a capture)
    if (notationInfo.isCapture)
    {
        sanBuilder.Append('x');
    }

    // 5. Target position
    sanBuilder.Append(ConvertToAlgebraic(notationInfo.targetX, notationInfo.targetY));

    // 6. Promotion, if applicable
    if (notationInfo.promotedTo != null)
    {
        sanBuilder.Append("=").Append(GetAlgebraicPieceSymbol(notationInfo.promotedTo));
    }

    // 7. Check or checkmate, if applicable
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

// Helper function - returns the symbol of a piece for algebraic notation
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
    // Getting pieces that can move to the same square
    List<(int, int)> ambiguousPieces = GetPiecesThatCanGoToSquare(moveInfo.targetX, moveInfo.targetY, moveInfo, moveInfo.whiteTurn);

    // Removing pieces other than the one at sourceX, sourceY
    ambiguousPieces.RemoveAll(p => moveInfo.chessBoard[p.Item1, p.Item2].type != moveInfo.sourcePiece.type);

    // If no other pieces can make the move, disambiguation is not needed
    if (ambiguousPieces.Count == 1)
        return string.Empty;

    // Checking if column or row coordinates are ambiguous
    bool isColumnAmbiguous = ambiguousPieces.Any(p => p.Item1 != moveInfo.sourceX);
    bool isRowAmbiguous = ambiguousPieces.Any(p => p.Item2 != moveInfo.sourceY);

    if (isColumnAmbiguous && isRowAmbiguous)
    {
        // Returning full coordinates if both column and row are ambiguous
        return ConvertToAlgebraic(moveInfo.sourceX, moveInfo.sourceY);
    }
    else if (isColumnAmbiguous)
    {
        // Returning only the column if the column is ambiguous
        return ConvertToAlgebraic(moveInfo.sourceX, null);
    }
    else
    {
        // Returning only the row if the row is ambiguous
        return ConvertToAlgebraic(null, moveInfo.sourceY);
    }
}