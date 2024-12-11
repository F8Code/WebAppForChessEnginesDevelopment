from .models import Move, User, Game, Tournament, TournamentGame, TournamentParticipant, ChessEngine, Relationship, Notification, Message
from django.utils import timezone

from .serializers import UserSerializer
from rest_framework.exceptions import ValidationError

def create_user(username, password, elo, name=None, surname=None, privacy='public', nationality=None, description=None):
    serializer = UserSerializer(data={
        'username': username,
        'password': password,
        'elo': elo,
        'name': name,
        'surname': surname,
        'privacy': privacy,
        'nationality': nationality,
        'description': description
    })
    
    if serializer.is_valid():
        return serializer.save()
    else:
        raise ValidationError(serializer.errors)


def create_game(created_by_id, player_white_id, player_black_id, privacy='public', format='classic', last_fen=None, result=None):
    created_by = User.objects.get(pk=created_by_id)
    player_white = User.objects.get(pk=player_white_id)
    player_black = User.objects.get(pk=player_black_id)

    game = Game.objects.create(
        created_by=created_by,
        player_white=player_white,
        player_black=player_black,
        privacy=privacy,
        format=format,
        lastFEN=last_fen,
        result=result
    )
    return game

def create_move(game, move_number, coordinate_move, san_move, fen_position):
    move = Move(
        game=game,
        move_number=move_number,
        coordinate_move=coordinate_move,
        san_move=san_move,
        fen_position=fen_position,
        move_time=timezone.now()
    )
    move.save()
    return move


def create_tournament(created_by_user_id, start_time, name, format, privacy, description=None, restrictions=None, end_time=None):
    created_by = User.objects.get(pk=created_by_user_id)
    tournament = Tournament.objects.create(
        created_by=created_by,
        start_time=start_time,
        end_time=end_time,
        name=name,
        description=description,
        restrictions=restrictions,
        format=format,
        privacy=privacy
    )
    return tournament

def create_tournament_game(tournament_id, game_id):
    tournament = Tournament.objects.get(pk=tournament_id)
    game = Game.objects.get(pk=game_id)
    tournament_game = TournamentGame.objects.create(
        tournament=tournament,
        game=game
    )
    return tournament_game

def create_tournament_participant(tournament_id, user_id):
    tournament = Tournament.objects.get(pk=tournament_id)
    user = User.objects.get(pk=user_id)
    participant = TournamentParticipant.objects.create(
        tournament=tournament,
        user=user,
        created_at=timezone.now()
    )
    return participant

def create_chess_engine(user_id, url, name, elo, description=None):
    user = User.objects.get(pk=user_id)
    engine = ChessEngine.objects.create(
        user=user,
        created_at=timezone.now(),
        url=url,
        name=name,
        description=description,
        elo=elo
    )
    return engine