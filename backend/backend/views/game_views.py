import random

from ..models import User, Game, ChessEngine
from ..serializers import GameSerializer, GameDetailsSerializer

from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from django.utils import timezone

from django.http import QueryDict

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_game(request):
    if isinstance(request.data, QueryDict):
        data = request.data.copy()
    else:
        data = request.data

    user_id = data.get('user_id')
    try:
        game_creator = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        error_message = f"Użytkownik o ID {user_id} nie istnieje."
        return Response({'error': error_message}, status=status.HTTP_400_BAD_REQUEST)

    engine_url = data.get('engine_url')
    engine_substitute = None
    if engine_url:
        try:
            engine_substitute = ChessEngine.objects.get(url=engine_url)
        except ChessEngine.DoesNotExist:
            error_message = f"Silnik szachowy o URL {engine_url} nie istnieje."
            return Response({'error': error_message}, status=status.HTTP_400_BAD_REQUEST)

    # Assigning the player to the random color
    try:
        if random.choice([True, False]):
            data['player_white_id'] = game_creator.pk
            data['player_white_substitute_id'] = engine_substitute.pk if engine_substitute else None
            data['player_black_id'] = None
        else:
            data['player_black_id'] = game_creator.pk
            data['player_black_substitute_id'] = engine_substitute.pk if engine_substitute else None
            data['player_white_id'] = None
    except Exception as e:
        error_message = f"Błąd podczas przypisywania graczy: {str(e)}"
        return Response({'error': error_message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    serializer = GameSerializer(data=data)
    if serializer.is_valid():
        try:
            game = serializer.save()
            return Response({"game_id": game.game_id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            error_message = f"Błąd podczas zapisywania gry: {str(e)}"
            return Response({'error': error_message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
        error_message = f"Nieprawidłowe dane wejściowe: {serializer.errors}"
        return Response({"errors": serializer.errors, "data": data}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def get_game(request, game_id):
    try:
        game = Game.objects.get(game_id=game_id)
        data = GameDetailsSerializer(game).data
        return Response(data)
    except Game.DoesNotExist:
        return Response({'error': 'Game not found'}, status=404)

@api_view(['GET'])
def get_all_game_chat_messages(request, game_id):
    try:
        game = Game.objects.get(game_id=game_id)
        chat = game.chat or ""
        chat_messages = chat.split('~') if chat else []
        return Response({"chat_messages": chat_messages})
    except Game.DoesNotExist:
        return Response({"error": "Game not found"}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_game_message(request, game_id):
    message = request.data.get('message', '').strip()

    if not message:
        return Response({"error": "Message cannot be empty"}, status=400)

    try:
        sender, content = message.split('|', 1)
    except ValueError:
        return Response({"error": "Invalid message format. Expected '<sender>|<content>'"}, status=400)

    if not content.strip():
        return Response({"error": "Message content cannot be empty"}, status=400)

    try:
        game = Game.objects.get(game_id=game_id)
        new_message = f"{sender}: {content.strip()}"
        game.chat = f"{game.chat}~{new_message}" if game.chat else new_message
        game.save()
        return Response({"success": "Message added"})
    except Game.DoesNotExist:
        return Response({"error": "Game not found"}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_game(request, game_id):
    try:
        game = Game.objects.get(game_id=game_id)
    except Game.DoesNotExist:
        return Response({'error': 'Gra nie istnieje.'}, status=status.HTTP_404_NOT_FOUND)
    
    user_id = request.data.get('user_id')
    engine_url = request.data.get('engine_url')

    try:
        player = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Użytkownik nie istnieje.'}, status=status.HTTP_400_BAD_REQUEST)

    engine_substitute = None
    if engine_url:
        try:
            engine_substitute = ChessEngine.objects.get(url=engine_url)
        except ChessEngine.DoesNotExist:
            return Response({'error': 'Silnik szachowy nie istnieje.'}, status=status.HTTP_400_BAD_REQUEST)

    if game.player_white is None:
        game.player_white = player
        if engine_substitute and game.player_white_substitute is None:
            game.player_white_substitute = engine_substitute
    elif game.player_black is None:
        game.player_black = player
        if engine_substitute and game.player_black_substitute is None:
            game.player_black_substitute = engine_substitute
    else:
        return Response({'error': 'Gra jest już pełna.'}, status=status.HTTP_400_BAD_REQUEST)
    
    game.start_time = timezone.now()

    game.save()
    serializer = GameSerializer(game)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_game(request, game_id):
    try:
        game = Game.objects.get(game_id=game_id)
    except Game.DoesNotExist:
        return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = GameSerializer(game, data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_game(request, game_id):
    try:
        game = Game.objects.get(game_id=game_id)
        game.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Game.DoesNotExist:
        return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)