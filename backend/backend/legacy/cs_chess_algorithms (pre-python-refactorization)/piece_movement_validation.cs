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