from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from ..models import User, Game, Tournament, ChessEngine
from ..serializers import UserSerializer, GameSerializer, TournamentDetailsSerializer, ChessEngineSerializer

@api_view(['GET'])
def get_user_profile(request, user_id):
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    serializer = UserSerializer(user)
    return Response(serializer.data, status=200)

@api_view(['PUT'])
def update_user_profile(request, user_id):
    try:
        user = User.objects.get(user_id=user_id)

        user.name = request.data.get('name', user.name)
        user.surname = request.data.get('surname', user.surname)
        user.nationality = request.data.get('nationality', user.nationality)
        user.description = request.data.get('description', user.description)
        user.save()

        return Response({'message': 'Profil użytkownika został zaktualizowany.'}, status=200)
    except User.DoesNotExist:
        return Response({'error': 'Użytkownik nie istnieje.'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

@api_view(['GET'])
def get_user_games(request, user_id):
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    games = Game.objects.filter(player_white=user) | Game.objects.filter(player_black=user).order_by('-end_time')
    paginator = StandardResultsSetPagination()
    paginated_games = paginator.paginate_queryset(games, request)
    serializer = GameSerializer(paginated_games, many=True)
    return paginator.get_paginated_response(serializer.data)

@api_view(['GET'])
def get_user_tournaments(request, user_id):
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    tournaments = Tournament.objects.filter(participants__player=user).order_by('-end_time')
    paginator = StandardResultsSetPagination()
    paginated_tournaments = paginator.paginate_queryset(tournaments, request)
    serializer = TournamentDetailsSerializer(paginated_tournaments, many=True)
    return paginator.get_paginated_response(serializer.data)

@api_view(['GET'])
def get_user_engines(request, user_id):
    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Użytkownik nie istnieje.'}, status=400)

    engines = ChessEngine.objects.filter(user=user)
    serializer = ChessEngineSerializer(engines, many=True)

    return Response(serializer.data, status=200)
