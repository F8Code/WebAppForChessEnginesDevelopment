from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from ..models import TournamentParticipant, Tournament, User, ChessEngine
from ..serializers import TournamentParticipantSerializer

@api_view(['GET'])
def list_tournament_participants(request):
    participants = TournamentParticipant.objects.all()
    serializer = TournamentParticipantSerializer(participants, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_tournament_participant(request, tournament_id, participant_id):
    engine_url = request.data.get('engine_url')

    try:
        tournament = Tournament.objects.get(tournament_id=tournament_id)
    except Tournament.DoesNotExist:
        return Response({'error': 'Turniej nie istnieje.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        player = User.objects.get(user_id=participant_id)
    except User.DoesNotExist:
        return Response({'error': 'Użytkownik nie istnieje.'}, status=status.HTTP_400_BAD_REQUEST)

    player_substitute = None
    if engine_url:
        try:
            player_substitute = ChessEngine.objects.get(url=engine_url)
        except ChessEngine.DoesNotExist:
            return Response({'error': 'Silnik szachowy nie istnieje.'}, status=status.HTTP_400_BAD_REQUEST)
        
    TournamentParticipant.objects.create(
        tournament=tournament,
        player=player,
        player_substitute=player_substitute
    )

    return Response({"participant_created"}, status=status.HTTP_201_CREATED)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_tournament_participant(request, tournament_id, participant_id):
    try:
        participant = TournamentParticipant.objects.get(tournament_id=tournament_id, player_id=participant_id)
    except TournamentParticipant.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    serializer = TournamentParticipantSerializer(participant, data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_tournament_participant(request, tournament_id, participant_id):
    try:
        participant = TournamentParticipant.objects.get(tournament_id=tournament_id, player_id=participant_id)
    except TournamentParticipant.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    participant.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
