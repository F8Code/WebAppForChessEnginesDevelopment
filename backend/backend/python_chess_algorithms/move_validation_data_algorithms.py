from .data_structures import ChessPiece, ChessFigure, MoveInfo
import math

def retrieve_fen_notation_information(move_info, fen_notation_move):
    fen_parts = fen_notation_move.split(' ')

    board_state = fen_parts[0]
    rows = board_state.split('/')
    for y in range(8):
        x = 0
        for symbol in rows[y]:
            if symbol.isdigit():
                x += int(symbol)
            else:
                is_white = symbol.isupper()
                symbol = symbol.lower()
                if symbol == 'p':
                    piece_type = ChessPiece.Pawn
                elif symbol == 'r':
                    piece_type = ChessPiece.Rook
                elif symbol == 'n':
                    piece_type = ChessPiece.Knight
                elif symbol == 'b':
                    piece_type = ChessPiece.Bishop
                elif symbol == 'q':
                    piece_type = ChessPiece.Queen
                elif symbol == 'k':
                    piece_type = ChessPiece.King
                else:
                    raise ValueError("Invalid piece type in FEN.")
                
                move_info.chess_board[x][y] = ChessFigure(piece_type, is_white)
                x += 1

    move_info.white_turn = (fen_parts[1] == 'w')

    move_info.can_white_s_castle = 'K' in fen_parts[2]
    move_info.can_white_l_castle = 'Q' in fen_parts[2]
    move_info.can_black_s_castle = 'k' in fen_parts[2]
    move_info.can_black_l_castle = 'q' in fen_parts[2]

    if fen_parts[3] == '-':
        move_info.en_passant_target = (None, None)
    else:
        en_passant_x = ord(fen_parts[3][0]) - ord('a')
        en_passant_y = 8 - int(fen_parts[3][1])
        move_info.en_passant_target = (en_passant_x, en_passant_y)

    move_info.half_move_clock = int(fen_parts[4])
    move_info.move_number = int(fen_parts[5])


def retrieve_coordinate_notation_information(move_info, coordinate_notation_move):
    move_info.source_x = int(coordinate_notation_move[0])
    move_info.source_y = int(coordinate_notation_move[1])

    move_info.target_x = int(coordinate_notation_move[2])
    move_info.target_y = int(coordinate_notation_move[3])

    move_info.piece_type = move_info.chess_board[move_info.source_x][move_info.source_y].type

    if len(coordinate_notation_move) == 5:
        promotion_char = coordinate_notation_move[4]
        if promotion_char == 'q':
            move_info.promoted_to = ChessPiece.Queen
        elif promotion_char == 'r':
            move_info.promoted_to = ChessPiece.Rook
        elif promotion_char == 'b':
            move_info.promoted_to = ChessPiece.Bishop
        elif promotion_char == 'n':
            move_info.promoted_to = ChessPiece.Knight
        else:
            raise ValueError("Invalid promotion piece in coordinate notation.")
    elif move_info.piece_type is ChessPiece.Pawn and (move_info.target_y == 0 or move_info.target_y == 7):
        move_info.promoted_to = ChessPiece.Queen

def retrieve_additional_move_information(move_info):
    move_info.source_piece = move_info.chess_board[move_info.source_x][move_info.source_y]
    move_info.target_piece = move_info.chess_board[move_info.target_x][move_info.target_y]
    move_info.distance_x = move_info.target_x - move_info.source_x
    move_info.distance_y = move_info.target_y - move_info.source_y
    move_info.direction_x = 1 if move_info.distance_x > 0 else -1 if move_info.distance_x < 0 else 0
    move_info.direction_y = 1 if move_info.distance_y > 0 else -1 if move_info.distance_y < 0 else 0

    if(move_info.distance_x != 0 and move_info.source_piece is not None and move_info.source_piece.type == ChessPiece.Pawn and move_info.target_piece == None):
        if(move_info.en_passant_target == (move_info.target_x, move_info.target_y)):
            move_info.is_enpassant = True
            move_info.chess_board[move_info.target_x][move_info.source_y] = None #!Remove the captured pawn for proper validation!

    #!Castling is to be performed after validation!

