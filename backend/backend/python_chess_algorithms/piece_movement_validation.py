from .data_structures import ChessPiece, ChessFigure, MoveInfo

def is_path_clear(move_info):
    # Checking pawn forward movement collision
    if move_info.source_piece.type == ChessPiece.Pawn and move_info.direction_x == 0 and move_info.target_piece is not None:
        return False

    # Checking for a friendly piece on the final square
    if move_info.target_piece is not None and move_info.target_piece.is_white == move_info.source_piece.is_white:
        return False

    # Checking all in-between squares occupancy
    for i in range(1, max(abs(move_info.distance_x), abs(move_info.distance_y))):
        if move_info.chess_board[move_info.source_x + i * move_info.direction_x][move_info.source_y + i * move_info.direction_y] is not None:
            return False
        
    return True


def does_follow_pawn_movement_rules(move_info):
    if move_info.direction_x == 0:
        if move_info.source_piece.is_white:
            # One or two steps forward for white pawns
            if move_info.distance_y == -1 or (move_info.distance_y == -2 and move_info.source_y == 6):
                return is_path_clear(move_info)
        else:
            # One or two steps forward for black pawns
            if move_info.distance_y == 1 or (move_info.distance_y == 2 and move_info.source_y == 1):
                return is_path_clear(move_info)
    else:
        # Standard capture
        if move_info.target_piece is not None:
            if abs(move_info.distance_x) == 1 and (move_info.source_piece.is_white and move_info.distance_y == -1 or not move_info.source_piece.is_white and move_info.distance_y == 1):
                return is_path_clear(move_info)
        else:
        # En passant
            if move_info.en_passant_target == (move_info.target_x, move_info.target_y):
                return True

    return False


def does_follow_knight_movement_rules(move_info):
    # Checking if the target square is not occupied by a friendly piece
    if move_info.target_piece is not None and move_info.source_piece.is_white == move_info.target_piece.is_white:
        return False

    # Standard knight movement
    if (abs(move_info.distance_x) == 2 and abs(move_info.distance_y) == 1) or (abs(move_info.distance_x) == 1 and abs(move_info.distance_y) == 2):
        return True

    return False


def does_follow_rook_movement_rules(move_info):
    # Standard rook movement (along straight lines)
    if move_info.distance_x == 0 or move_info.distance_y == 0:
        return is_path_clear(move_info)

    return False


def does_follow_bishop_movement_rules(move_info):
    # Standard bishop movement (along diagonals)
    if abs(move_info.distance_x) == abs(move_info.distance_y):
        return is_path_clear(move_info)

    return False


def does_follow_queen_movement_rules(move_info):
    # Queen moves like a rook or bishop
    if does_follow_rook_movement_rules(move_info) or does_follow_bishop_movement_rules(move_info):
        return True

    return False


def does_follow_king_movement_rules(move_info):
    # Castling
    from .move_validation_algorithms import is_castling_valid
    if abs(move_info.distance_x) == 2 and move_info.distance_y == 0 and is_castling_valid(move_info):
        return is_path_clear(move_info)

    # Standard king movement (to adjacent square)
    if max(abs(move_info.distance_x), abs(move_info.distance_y)) <= 1:
        return is_path_clear(move_info)

    return False