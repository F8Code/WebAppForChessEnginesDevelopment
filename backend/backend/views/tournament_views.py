from ..models import User, Tournament, TournamentParticipant, TournamentGame
from ..serializers import TournamentSerializer, TournamentDetailsSerializer, TournamentParticipantSerializer, GameSerializer

from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view

from django.core.paginator import Paginator
from django.db.models import F, Q

@api_view(['POST'])
def create_tournament(request):
    if request.method == 'POST':
        data = request.data
        user_id = data.get('user_id')

        try:
            tournament_creator = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Użytkownik nie istnieje.'}, status=400)
        
        data['created_by_id'] = tournament_creator.pk

        serializer = TournamentSerializer(data=data)
        if serializer.is_valid():
            tournament = serializer.save()
            return Response({"tournament_id": tournament.tournament_id}, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
@api_view(['GET'])
def get_tournament(request, tournament_id):
    try:
        tournament = Tournament.objects.prefetch_related(
            'participants__player', 'participants__player_substitute'
        ).get(tournament_id=tournament_id)
        serializer = TournamentDetailsSerializer(tournament)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Tournament.DoesNotExist:
        return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)
    
@api_view(['PATCH'])
def update_tournament_slots(request, tournament_id):
    try:
        tournament = Tournament.objects.get(tournament_id=tournament_id)

        player_count = request.data.get('player_count', tournament.player_count)
        if 3 <= player_count <= 8:
            tournament.player_count = player_count
            tournament.save()
            return Response({'message': 'Slots updated successfully'}, status=200)
        else:
            return Response({'error': 'Player count must be between 3 and 8'}, status=400)
    except Tournament.DoesNotExist:
        return Response({'error': 'Tournament not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def get_all_tournament_chat_messages(request, tournament_id):
    try:
        tournament = Tournament.objects.get(tournament_id=tournament_id)
        chat = tournament.chat or ""
        chat_messages = chat.split('~') if chat else []
        return Response({"chat_messages": chat_messages})
    except Tournament.DoesNotExist:
        return Response({"error": "Tournament not found"}, status=404)

@api_view(['POST'])
def add_tournament_message(request, tournament_id):
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
        tournament = Tournament.objects.get(tournament_id=tournament_id)
        new_message = f"{sender}: {content.strip()}"
        tournament.chat = f"{tournament.chat}~{new_message}" if tournament.chat else new_message
        tournament.save()
        return Response({"success": "Message added"})
    except Tournament.DoesNotExist:
        return Response({"error": "Tournament not found"}, status=404)
    
@api_view(['GET'])
def get_tournament_games(request, tournament_id):
    try:
        tournament = Tournament.objects.get(tournament_id=tournament_id)
    except Tournament.DoesNotExist:
        return Response({"error": "Tournament not found"}, status=404)

    tournament_games = TournamentGame.objects.filter(tournament=tournament).select_related('game')
    games = [tg.game for tg in tournament_games]

    serializer = GameSerializer(games, many=True)
    return Response(serializer.data)

@api_view(['PUT'])
def update_tournament(request, tournament_id):
    try:
        tournament = Tournament.objects.get(tournament_id=tournament_id)
    except Tournament.DoesNotExist:
        return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = TournamentSerializer(tournament, data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def delete_tournament(request, tournament_id):
    try:
        tournament = Tournament.objects.get(tournament_id=tournament_id)
        tournament.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Tournament.DoesNotExist:
        return Response({'error': 'Tournament not found'}, status=status.HTTP_404_NOT_FOUND)

