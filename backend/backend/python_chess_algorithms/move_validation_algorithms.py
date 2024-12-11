from .data_structures import ChessPiece, ChessFigure, MoveInfo
from .move_validation_data_algorithms import retrieve_fen_notation_information, retrieve_coordinate_notation_information, retrieve_additional_move_information
from .piece_movement_validation import does_follow_pawn_movement_rules, does_follow_knight_movement_rules, does_follow_rook_movement_rules, does_follow_bishop_movement_rules, does_follow_queen_movement_rules, does_follow_king_movement_rules
from .post_validation_notation_algorithms import process_move_result

import copy

async def validate_move(game_id, fen_notation_move, coordinate_notation_move, calculate_move_result):
    move_info = MoveInfo()
    new_fen, san_move, end_type = None, None, None

    retrieve_fen_notation_information(move_info, fen_notation_move)
    if(move_info.chess_board[int(coordinate_notation_move[0])][int(coordinate_notation_move[1])] is None):
        return False, new_fen, san_move, end_type
    retrieve_coordinate_notation_information(move_info, coordinate_notation_move) 

    is_move_valid = is_move_valid_function(move_info, True, True, True)
    if is_move_valid and calculate_move_result:
        new_fen, san_move, end_type = await process_move_result(game_id, move_info)

    return is_move_valid, new_fen, san_move, end_type


def is_move_valid_function(move_info, validate_king_safety, validate_piece_color, validate_promotion):
    if not is_move_within_bounds(move_info.target_x, move_info.target_y):
        return False
    
    retrieve_additional_move_information(move_info)

    if validate_promotion and (move_info.promoted_to is not None) != (move_info.source_piece.type is ChessPiece.Pawn and move_info.target_y in {0, 7}):
        return False

    if validate_piece_color and move_info.source_piece.is_white != move_info.white_turn:
        return False

    if not does_follow_movement_rules(move_info):
        return False

    if validate_king_safety and does_move_expose_king(move_info):
        return False

    return True


def is_move_within_bounds(square_x, square_y):
    return 0 <= square_x < 8 and 0 <= square_y < 8


def does_follow_movement_rules(move_info):
    if abs(move_info.direction_x) + abs(move_info.direction_y) == 0:
        return False

    piece_type = move_info.source_piece.type

    if piece_type == ChessPiece.Pawn:
        return does_follow_pawn_movement_rules(move_info)
    elif piece_type == ChessPiece.Knight:
        return does_follow_knight_movement_rules(move_info)
    elif piece_type == ChessPiece.Rook:
        return does_follow_rook_movement_rules(move_info)
    elif piece_type == ChessPiece.Bishop:
        return does_follow_bishop_movement_rules(move_info)
    elif piece_type == ChessPiece.Queen:
        return does_follow_queen_movement_rules(move_info)
    elif piece_type == ChessPiece.King:
        return does_follow_king_movement_rules(move_info)

    return False


def does_move_expose_king(move_info):
    simulated_move_info = copy.deepcopy(move_info)
    simulated_move_info.chess_board[move_info.target_x][move_info.target_y] = move_info.chess_board[move_info.source_x][move_info.source_y]
    simulated_move_info.chess_board[move_info.source_x][move_info.source_y] = None

    if move_info.source_piece.type == ChessPiece.King:
        return len(get_pieces_that_can_go_to_square(move_info.target_x, move_info.target_y, simulated_move_info, not move_info.white_turn)) != 0

    # If another piece has moved, check if it exposed the king
    king_position = get_king_position(simulated_move_info, move_info.white_turn)
    return len(get_pieces_that_can_go_to_square(king_position[0], king_position[1], simulated_move_info, not move_info.white_turn)) != 0
        

def get_pieces_that_can_go_to_square(target_x, target_y, move_info, for_white):
    pieces_positions = []

    for x in range(8):
        for y in range(8):
            piece = move_info.chess_board[x][y]
            if piece is not None and piece.is_white == for_white:
                simulated_move_info = copy.deepcopy(move_info)
                simulated_move_info.source_x = x
                simulated_move_info.source_y = y
                simulated_move_info.target_x = target_x
                simulated_move_info.target_y = target_y

                if is_move_valid_function(simulated_move_info, False, False, False):
                    pieces_positions.append((x, y))

    return pieces_positions


def get_king_position(move_info, for_white):
    for x in range(8):
        for y in range(8):
            if move_info.chess_board[x][y] is not None and move_info.chess_board[x][y].type == ChessPiece.King and move_info.chess_board[x][y].is_white == for_white:
                return (x, y)


def is_castling_valid(move_info):
    if move_info.white_turn:
        if (move_info.direction_x < 0 and not move_info.can_white_l_castle) or (move_info.direction_x > 0 and not move_info.can_white_s_castle):
            return False
    else:
        if (move_info.direction_x < 0 and not move_info.can_black_l_castle) or (move_info.direction_x > 0 and not move_info.can_black_s_castle):
            return False

    # Scan castling squares for attacks. The last castling square is scanned by the DoesMoveExposeKing function that's nested inside the validation function.
    if len(get_pieces_that_can_go_to_square(move_info.source_x, move_info.source_y, move_info, not move_info.white_turn)) == 0 and \
       len(get_pieces_that_can_go_to_square(move_info.source_x + move_info.direction_x, move_info.source_y, move_info, not move_info.white_turn)) == 0:
        return True

    return False


