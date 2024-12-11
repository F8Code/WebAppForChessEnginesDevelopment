from .data_structures import NotationInfo, DrawType, ChessPiece, ChessFigure, MoveInfo
import copy, math

def retrieve_basic_notation_information(notation_info, move_info):
    # Copying basic move information (coordinates, promotion, etc.)
    notation_info.source_x = move_info.source_x
    notation_info.source_y = move_info.source_y
    notation_info.target_x = move_info.target_x
    notation_info.target_y = move_info.target_y
    notation_info.promoted_to = move_info.promoted_to

    # Information about the type of piece
    notation_info.piece_type = move_info.source_piece.type

    # Checking if it is a capture
    notation_info.is_capture = move_info.target_piece is not None
    notation_info.is_enpassant = move_info.is_enpassant

    # Transferring FEN board state information
    notation_info.white_turn = not move_info.white_turn

    # Incrementing halfMoveClock if the move was not a pawn move or a capture
    if move_info.source_piece.type == ChessPiece.Pawn or notation_info.is_capture:
        notation_info.half_move_clock = 0
    else:
        notation_info.half_move_clock = move_info.half_move_clock + 1

    # Incrementing move number if the move was made by black
    if not move_info.white_turn:
        notation_info.move_number = move_info.move_number + 1
    else:
        notation_info.move_number = move_info.move_number

    # Information about en passant - if a pawn moved two squares, set the en passant target
    if move_info.source_piece.type == ChessPiece.Pawn and abs(move_info.distance_y) == 2:
        notation_info.en_passant_target = (move_info.source_x, move_info.source_y + move_info.direction_y)
    else:
        notation_info.en_passant_target = (None, None)

    retrieve_castling_notation_information(notation_info, move_info)

    # Copying the board state after the move into NotationInfo
    notation_info.chess_board = copy.deepcopy(move_info.chess_board)
    notation_info.chess_board[notation_info.target_x][notation_info.target_y] = notation_info.chess_board[notation_info.source_x][notation_info.source_y]
    notation_info.chess_board[notation_info.source_x][notation_info.source_y] = None

    if notation_info.is_l_castling:
        # Long castling
        if move_info.source_piece.is_white:
            notation_info.chess_board[3][7] = notation_info.chess_board[0][7]
            notation_info.chess_board[0][7] = None
        else:
            notation_info.chess_board[3][0] = notation_info.chess_board[0][0]
            notation_info.chess_board[0][0] = None
    elif notation_info.is_s_castling:
        # Short castling
        if move_info.source_piece.is_white:
            notation_info.chess_board[5][7] = notation_info.chess_board[7][7]
            notation_info.chess_board[7][7] = None
        else:
            notation_info.chess_board[5][0] = notation_info.chess_board[7][0]
            notation_info.chess_board[7][0] = None


def retrieve_castling_notation_information(notation_info, move_info):
    # Castling information - checking if castling is still possible
    notation_info.can_white_l_castle = move_info.can_white_l_castle
    notation_info.can_white_s_castle = move_info.can_white_s_castle
    notation_info.can_black_l_castle = move_info.can_black_l_castle
    notation_info.can_black_s_castle = move_info.can_black_s_castle

    # Castling becomes impossible if the king or rook has been moved
    if move_info.source_piece.type == ChessPiece.King:
        if move_info.source_piece.is_white:
            notation_info.can_white_l_castle = False
            notation_info.can_white_s_castle = False
        else:
            notation_info.can_black_l_castle = False
            notation_info.can_black_s_castle = False

    # If a rook moves, the corresponding castling becomes impossible
    if move_info.source_piece.type == ChessPiece.Rook:
        if move_info.source_piece.is_white and move_info.source_x == 0 and move_info.source_y == 7:
            notation_info.can_white_l_castle = False
        if move_info.source_piece.is_white and move_info.source_x == 7 and move_info.source_y == 7:
            notation_info.can_white_s_castle = False
        if not move_info.source_piece.is_white and move_info.source_x == 0 and move_info.source_y == 0:
            notation_info.can_black_l_castle = False
        if not move_info.source_piece.is_white and move_info.source_x == 7 and move_info.source_y == 0:
            notation_info.can_black_s_castle = False

    # Checking if the move was castling
    if move_info.source_piece.type == ChessPiece.King and abs(move_info.distance_x) == 2:
        if move_info.direction_x == -1:
            notation_info.is_l_castling = True
        else:
            notation_info.is_s_castling = True


async def retrieve_complex_notation_information(game_id, notation_info, move_info, fen_notation_move):
    simulated_move_info = copy.deepcopy(move_info)  # Simulating the move for retrieving additional information
    simulated_move_info.chess_board[move_info.target_x][move_info.target_y] = move_info.chess_board[move_info.source_x][move_info.source_y]
    simulated_move_info.chess_board[move_info.source_x][move_info.source_y] = None
    if(simulated_move_info.promoted_to is not None):
        simulated_move_info.chess_board[move_info.target_x][move_info.target_y].type = simulated_move_info.promoted_to
    simulated_move_info.white_turn = not move_info.white_turn

    retrieve_checkmate_information(notation_info, simulated_move_info)
    if not notation_info.is_checkmate:
        await retrieve_draw_information(game_id, notation_info, simulated_move_info, fen_notation_move)


def retrieve_checkmate_information(notation_info, move_info):
    from .move_validation_algorithms import is_move_valid_function, get_king_position, get_pieces_that_can_go_to_square
    # Checking how many opponents attack the king

    king_position = get_king_position(move_info, move_info.white_turn)
    attackers = get_pieces_that_can_go_to_square(king_position[0], king_position[1], move_info, not move_info.white_turn)

    if len(attackers) == 0:
        return

    notation_info.is_check = True

    directions_x = [-1, -1, 1, 1, -1, 1, 0, 0]
    directions_y = [-1, 1, -1, 1, 0, 0, -1, 1]

    # Checking if the king can escape to an adjacent square
    move_info.source_x = king_position[0]
    move_info.source_y = king_position[1]
    for i in range(8):
        move_info.target_x = king_position[0] + directions_x[i]
        move_info.target_y = king_position[1] + directions_y[i]
        if is_move_valid_function(move_info, True, True, False):
            return

    # If the king is under double attack and cannot escape, it is checkmate
    if len(attackers) == 2:
        notation_info.is_checkmate = True
        return

    attacker = move_info.chess_board[attackers[0][0]][attackers[0][1]]
    
    if attacker.type == ChessPiece.Knight:
        # If the attacker is a knight, check if it can be captured
        if len(get_pieces_that_can_valid_go_to_square(attackers[0][0], attackers[0][1], move_info, move_info.white_turn)) > 0:
            return
    else:
        # Checking if the attacking piece can be captured or blocked
        attack_distance_x = attackers[0][0] - king_position[0]
        attack_distance_y = attackers[0][1] - king_position[1]
        for i in range(1, max(abs(attack_distance_x), abs(attack_distance_y)) + 1):
            target_x = king_position[0] + i * (1 if attack_distance_x > 0 else -1 if attack_distance_x < 0 else 0)
            target_y = king_position[1] + i * (1 if attack_distance_y > 0 else -1 if attack_distance_y < 0 else 0)
            if len(get_pieces_that_can_valid_go_to_square(target_x, target_y, move_info, move_info.white_turn)) > 0:
                return

    notation_info.is_checkmate = True


def get_pieces_that_can_valid_go_to_square(target_x, target_y, move_info, for_white):
    from .move_validation_algorithms import is_move_valid_function
    pieces_that_can_move = []
    
    for x in range(8):
        for y in range(8):
            piece = move_info.chess_board[x][y]
            if piece and piece.is_white == for_white:
                simulated_move_info = copy.deepcopy(move_info)
                simulated_move_info.source_x = x
                simulated_move_info.source_y = y
                simulated_move_info.target_x = target_x
                simulated_move_info.target_y = target_y
                if is_move_valid_function(simulated_move_info, True, False, False):
                    pieces_that_can_move.append((x, y))

    return pieces_that_can_move


async def retrieve_draw_information(game_id, notation_info, move_info, fen_notation_move):
    retrieve_fifty_move_rule_information(notation_info, move_info)
    if notation_info.draw_type:
        return

    retrieve_stalemate_information(notation_info, move_info)
    if notation_info.draw_type:
        return

    retrieve_insufficient_material_information(notation_info, move_info)
    if notation_info.draw_type:
        return

    await retrieve_threefold_repetition_information(game_id, notation_info, fen_notation_move)


def retrieve_fifty_move_rule_information(notation_info, move_info):
    if move_info.half_move_clock >= 100:
        notation_info.draw_type = DrawType.FiftyMoveRule


def retrieve_stalemate_information(notation_info, move_info):
    from .move_validation_algorithms import is_move_valid_function, get_king_position, get_pieces_that_can_go_to_square

    # Checking if the king is under attack
    king_position = get_king_position(move_info, move_info.white_turn)
    if len(get_pieces_that_can_go_to_square(king_position[0], king_position[1], move_info, not move_info.white_turn)) > 0:
        return
    
    move_directions = {
        ChessPiece.Pawn: [(0, 1), (0, 2), (0, -1), (0, -2), (1, 1), (-1, 1), (1, -1), (-1, -1)],
        ChessPiece.Queen: [(-1, 1), (1, 1), (-1, -1), (1, -1), (0, 1), (0, -1), (1, 0), (-1, 0)],
        ChessPiece.King: [(-1, 1), (1, 1), (-1, -1), (1, -1), (0, 1), (0, -1), (1, 0), (-1, 0)],
        ChessPiece.Knight: [(2, 1), (1, 2), (-1, 2), (-2, 1), (-2, -1), (-1, -2), (1, -2), (2, -1)],
        ChessPiece.Bishop: [(-1, 1), (1, 1), (-1, -1), (1, -1)],
        ChessPiece.Rook: [(0, 1), (0, -1), (1, 0), (-1, 0)]
    }

    # Checking if any piece can make a move
    for i in range(8):
        for j in range(8):
            piece = move_info.chess_board[i][j]
            if piece and piece.is_white == move_info.white_turn:
                directions = move_directions[piece.type]
                for direction_x, direction_y in directions:
                    move_info.source_x = i
                    move_info.source_y = j
                    move_info.target_x = i + direction_x
                    move_info.target_y = j + direction_y
                    if is_move_valid_function(move_info, True, False, False):
                        return
                      
    notation_info.draw_type = DrawType.Stalemate


def retrieve_insufficient_material_information(notation_info, move_info):
    white_pieces = []
    black_pieces = []

    for i in range(8):
        for j in range(8):
            piece = move_info.chess_board[i][j]
            if piece and piece.type != ChessPiece.King:
                if piece.is_white:
                    white_pieces.append(piece)
                else:
                    black_pieces.append(piece)

    if len(white_pieces) >= 2 or len(black_pieces) >= 2:
        return

    # Checking for king + king scenario
    if len(white_pieces) == 0 and len(black_pieces) == 0:
        notation_info.draw_type = DrawType.InsufficientMaterial
        return

    # Checking for king + knight/bishop + king scenario
    if len(white_pieces) == 1 and (white_pieces[0].type == ChessPiece.Knight or white_pieces[0].type == ChessPiece.Bishop):
        notation_info.draw_type = DrawType.InsufficientMaterial
        return

    if len(black_pieces) == 1 and (black_pieces[0].type == ChessPiece.Knight or black_pieces[0].type == ChessPiece.Bishop):
        notation_info.draw_type = DrawType.InsufficientMaterial
        return

    # Checking for king + king + opposite color bishops scenario
    if len(white_pieces) == 1 and len(black_pieces) == 1 and white_pieces[0].type == ChessPiece.Bishop and black_pieces[0].type == ChessPiece.Bishop:
        white_bishop_square_color = (white_pieces[0].square[0] + white_pieces[0].square[1]) % 2
        black_bishop_square_color = (black_pieces[0].square[0] + black_pieces[0].square[1]) % 2
        if white_bishop_square_color == black_bishop_square_color:
            notation_info.draw_type = DrawType.InsufficientMaterial


async def retrieve_threefold_repetition_information(game_id, notation_info, fen_notation_move):
    from ..models import Move

    fen_list = []
    async for fen in Move.objects.filter(game_id=game_id).values_list('fen_position', flat=True):
        fen_list.append(fen)

    fen_list.append(fen_notation_move)

    board_state_list = [fen.split(' ')[0] for fen in fen_list]

    # Counting the number of occurences of each FEN position in the game
    board_count = {state: board_state_list.count(state) for state in board_state_list}

    # Checking if a position occurred three times to invoke the threefold repetition rule
    for state, count in board_count.items():
        if count >= 3:
            notation_info.draw_type = DrawType.ThreefoldRepetition
            return


