from django.utils import timezone
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from ..models import Move, Game
from ..serializers import MoveSerializer
import random
from django.db.models import Count

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_move(request, game_id, move_number):
    data = request.data

    try:
        game_instance = Game.objects.get(game_id=game_id)
    except Game.DoesNotExist:
        return Response({'error': 'Gra nie istnieje.'}, status=status.HTTP_400_BAD_REQUEST)

    move = Move.objects.create(
        game=game_instance,
        move_number=move_number,
        move_time=timezone.now(),
        coordinate_move=data.get('coordinate_move'),
        san_move=data.get('san_move'),
        fen_position=data.get('fen_position')
    )

    serializer = MoveSerializer(move)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
def get_moves(request, game_id):
    try:
        game = Game.objects.get(game_id=game_id)
    except Game.DoesNotExist:
        return Response({'error': 'Gra nie istnieje.'}, status=status.HTTP_400_BAD_REQUEST)

    moves = Move.objects.filter(game=game)
    serializer = MoveSerializer(moves, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
def get_last_move(request, game_id):
    try:
        game = Game.objects.get(game_id=game_id)
    except Game.DoesNotExist:
        return Response({'error': 'Gra nie istnieje.'}, status=status.HTTP_400_BAD_REQUEST)

    last_move = Move.objects.filter(game=game).order_by('-move_number').first()

    if last_move:
        serializer = MoveSerializer(last_move)
        return Response(serializer.data, status=status.HTTP_200_OK)
    else:
        return Response({'message': 'Brak ruchów dla tej gry.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_random_moves(request):
    # Only games with at least 3 moves are used
    valid_games = Game.objects.annotate(move_count=Count('moves')).filter(move_count__gt=2).distinct()

    if not valid_games.exists():
        return JsonResponse({'error': 'Brak gier z wystarczającą liczbą ruchów do losowania'}, status=400)

    # Selecting a random game from the pool
    selected_game = None
    while not selected_game:
        random_game = random.choice(valid_games)
        moves = list(Move.objects.filter(game=random_game).order_by('move_number'))
        if len(moves) > 2:
            selected_game = random_game

    # Removing first and last move
    valid_moves = moves[1:-1]

    # Three random moves
    random_moves = random.sample(valid_moves, min(3, len(valid_moves)))

    serialized_moves = [{'move_number': move.move_number, 'fen_position': move.fen_position} for move in random_moves]
    
    return JsonResponse({'moves': serialized_moves})

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_move(request, game_id, move_number):
    try:
        game_instance = Game.objects.get(game_id=game_id)
    except Game.DoesNotExist:
        return Response({'error': 'Gra nie istnieje.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        move = Move.objects.get(game=game_instance, move_number=move_number)

        move.coordinate_move = request.data.get('coordinate_move', move.coordinate_move)
        move.san_move = request.data.get('san_move', move.san_move)
        move.fen_position = request.data.get('fen_position', move.fen_position)
        move.save()
        status_code = status.HTTP_200_OK
    except Move.DoesNotExist:
        move = Move.objects.create(
            game=game_instance,
            move_number=move_number,
            move_time=timezone.now(),
            coordinate_move=request.data.get('coordinate_move'),
            san_move=request.data.get('san_move'),
            fen_position=request.data.get('fen_position')
        )
        status_code = status.HTTP_201_CREATED

    serializer = MoveSerializer(move)
    return Response(serializer.data, status=status_code)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_last_move(request, game_id):
    try:
        game = Game.objects.get(game_id=game_id)
        last_move = Move.objects.filter(game=game).order_by('-move_number').first()
        if not last_move:
            return Response({'error': 'Brak ruchów w tej grze.'}, status=status.HTTP_404_NOT_FOUND)
        
        remaining_moves = Move.objects.filter(game=game)

        Move.objects.filter(game=game, move_number=last_move.move_number).delete()

        remaining_moves = Move.objects.filter(game=game)
        return Response({'message': 'Ostatni ruch został usunięty.'}, status=status.HTTP_200_OK)
    
    except Game.DoesNotExist:
        return Response({'error': 'Gra nie istnieje.'}, status=status.HTTP_404_NOT_FOUND)
