from .data_structures import ChessPiece, ChessFigure, NotationInfo, MoveInfo
from .post_validation_notation_data_algorithms import retrieve_basic_notation_information, retrieve_complex_notation_information, get_pieces_that_can_valid_go_to_square

async def process_move_result(game_id, move_info):
    notation_info = NotationInfo()

    retrieve_basic_notation_information(notation_info, move_info)

    fen_notation = write_fen_notation(notation_info)

    await retrieve_complex_notation_information(game_id, notation_info, move_info, fen_notation)

    algebraic_notation = write_algebraic_notation(notation_info, move_info)

    end_type = notation_info.draw_type.name if notation_info.draw_type else "Checkmate" if notation_info.is_checkmate else ""

    return fen_notation, algebraic_notation, end_type


def write_fen_notation(notation_info):
    #1. Board state
    fen_builder = []
    for y in range(8):
        empty_squares = 0
        for x in range(8):
            piece = notation_info.chess_board[x][y]
            if piece is None:
                empty_squares += 1
            else:
                if empty_squares > 0:
                    fen_builder.append(str(empty_squares))
                    empty_squares = 0
                if notation_info.target_x is x and notation_info.target_y is y and notation_info.promoted_to is not None:
                    piece_char = get_piece_symbol(notation_info.promoted_to) if piece.is_white else get_piece_symbol(notation_info.promoted_to).lower()
                else:
                    piece_char = get_piece_symbol(piece.type) if piece.is_white else get_piece_symbol(piece.type).lower()
                fen_builder.append(piece_char)
        if empty_squares > 0:
            fen_builder.append(str(empty_squares))
        if y < 7:
            fen_builder.append('/')

    #2. White/black turn
    fen_builder.append(' ')
    fen_builder.append('w' if notation_info.white_turn else 'b')

    #3. Castling privilages
    castling_rights = ''
    if notation_info.can_white_s_castle:
        castling_rights += 'K'
    if notation_info.can_white_l_castle:
        castling_rights += 'Q'
    if notation_info.can_black_s_castle:
        castling_rights += 'k'
    if notation_info.can_black_l_castle:
        castling_rights += 'q'
    if castling_rights == '':
        castling_rights = '-'
    fen_builder.append(' ')
    fen_builder.append(castling_rights)

    #4. En passant target square
    if notation_info.en_passant_target[0] is not None and notation_info.en_passant_target[1] is not None:
        fen_builder.append(' ')
        fen_builder.append(convert_to_algebraic(notation_info.en_passant_target[0], notation_info.en_passant_target[1]))
    else:
        fen_builder.append(' -')

    #5. Half moves and move number
    fen_builder.append(f' {notation_info.half_move_clock}')
    fen_builder.append(f' {notation_info.move_number}')

    return ''.join(fen_builder)


def get_piece_symbol(piece):
    if piece == ChessPiece.Pawn:
        return 'P'
    elif piece == ChessPiece.Rook:
        return 'R'
    elif piece == ChessPiece.Knight:
        return 'N'
    elif piece == ChessPiece.Bishop:
        return 'B'
    elif piece == ChessPiece.Queen:
        return 'Q'
    elif piece == ChessPiece.King:
        return 'K'


def convert_to_algebraic(x, y):
    algebraic_col = chr(ord('a') + x) if x is not None else ''
    algebraic_row = str(8 - y) if y is not None else ''
    return algebraic_col + algebraic_row


def write_algebraic_notation(notation_info, move_info):
    san_builder = []

    # 1. Castling
    if notation_info.is_l_castling:
        return "O-O-O"
    if notation_info.is_s_castling:
        return "O-O"

    # 2. Figure type
    # 3. Optional source piece disambiguation if needed
    if notation_info.piece_type != ChessPiece.Pawn:
        san_builder.append(get_piece_symbol(notation_info.piece_type))
        san_builder.append(get_move_disambiguation(move_info))   

    # 4. Capture sign
    if notation_info.is_capture or notation_info.is_enpassant:
        if notation_info.piece_type == ChessPiece.Pawn:
            san_builder.append(convert_to_algebraic(move_info.source_x, None))
        san_builder.append('x')

    # 5. Target square
    san_builder.append(convert_to_algebraic(notation_info.target_x, notation_info.target_y))

    # 6. Optional pawn promotion
    if notation_info.promoted_to:
        san_builder.append("=")
        san_builder.append(get_piece_symbol(notation_info.promoted_to))

    # 7. Optional check or mate
    if notation_info.is_checkmate:
        san_builder.append('#')  # Mate
    elif notation_info.is_check:
        san_builder.append('+')  # Check

    if notation_info.is_checkmate:
        san_builder.append(' 1-0') if not notation_info.white_turn else san_builder.append(' 0-1')
    elif notation_info.draw_type:
        san_builder.append(' 1/2-1/2')

    return ''.join(san_builder)


def get_move_disambiguation(move_info):
    ambiguous_pieces = get_pieces_that_can_valid_go_to_square(move_info.target_x, move_info.target_y, move_info, move_info.white_turn)

    ambiguous_pieces = [
        p for p in ambiguous_pieces 
        if move_info.chess_board[p[0]][p[1]].type == move_info.source_piece.type 
        and (p[0], p[1]) != (move_info.source_x, move_info.source_y)
    ]

    if len(ambiguous_pieces) == 0:
        return ''

    is_column_ambiguous = any(p[0] == move_info.source_x for p in ambiguous_pieces)
    is_row_ambiguous = any(p[1] == move_info.source_y for p in ambiguous_pieces)

    if is_column_ambiguous and is_row_ambiguous:
        return convert_to_algebraic(move_info.source_x, move_info.source_y)
    elif is_column_ambiguous:
        return convert_to_algebraic(None, move_info.source_y)
    else:
        return convert_to_algebraic(move_info.source_x, None)