from rest_framework.response import Response
from rest_framework import status

from ..python_chess_algorithms.move_validation_algorithms import validate_move

from adrf.decorators import api_view

@api_view(['POST'])
async def validate_move_view(request, game_id):
    try:
        fen_notation_position = request.data.get('fen_notation_position')
        coordinate_notation_move = request.data.get('coordinate_notation_move')
        calculate_move_result = request.data.get('calculate_move_result', False)

        if not all([fen_notation_position, coordinate_notation_move]):
            return Response({'error': 'Brakuje wymaganych danych'}, status=status.HTTP_400_BAD_REQUEST)

        is_move_valid, new_fen, san_move, end_type = await validate_move(game_id, fen_notation_position, coordinate_notation_move, calculate_move_result)

        if is_move_valid:
            return Response({
                'is_move_valid': True,
                'coordinate_move': coordinate_notation_move,
                'fen_position': new_fen,
                'san_move': san_move,
                'end_type': end_type
            }, status=status.HTTP_200_OK)
        else:
            return Response({'is_move_valid': False}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

