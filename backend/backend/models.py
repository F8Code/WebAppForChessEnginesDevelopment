from django.contrib.auth.models import User as AuthUser
from django.db import models

class User(models.Model):
    user_id = models.AutoField(primary_key=True)
    created_at = models.DateTimeField()
    username = models.OneToOneField(AuthUser, to_field='username', on_delete=models.CASCADE)
    is_online = models.BooleanField(default=True)
    name = models.CharField(max_length=20, null=True)
    surname = models.CharField(max_length=20, null=True)
    nationality = models.CharField(max_length=30, null=True)
    elo = models.IntegerField(default=1000)
    description = models.CharField(max_length=2500, null=True)

    class Meta:
        db_table = 'users'

class ChessEngine(models.Model):
    engine_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='engines')
    created_at = models.DateTimeField()
    url = models.CharField(max_length=1000, unique=True)
    name = models.CharField(max_length=20)
    description = models.CharField(max_length=2500, null=True)
    elo = models.IntegerField(default=1000)

    class Meta:
        db_table = 'chessengines'

class Game(models.Model):
    def default_format_data():
        return {
            "player_mode": "Human-Human",
            "chess_variant": "Standard",
            "time_format": "10+15"
        }
    game_id = models.AutoField(primary_key=True)
    player_white = models.ForeignKey(User, on_delete=models.CASCADE, related_name='games_as_white', null=True)
    player_black = models.ForeignKey(User, on_delete=models.CASCADE, related_name='games_as_black', null=True)
    player_white_substitute = models.ForeignKey(ChessEngine, on_delete=models.CASCADE, related_name='games_as_white_substitute', null=True, blank=True)
    player_black_substitute = models.ForeignKey(ChessEngine, on_delete=models.CASCADE, related_name='games_as_black_substitute', null=True, blank=True)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    is_ranked = models.BooleanField(default=True)
    format_data = models.JSONField(default=default_format_data,null=True, blank=True)
    restrictions_data = models.JSONField(null=True, blank=True)
    description = models.CharField(max_length=500, null=True, blank=True)
    chat = models.CharField(max_length=10000, null=True, blank=True)
    result = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = 'games'

class Move(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='moves', primary_key=True)
    move_number = models.IntegerField()
    move_time = models.DateTimeField()
    coordinate_move = models.CharField(max_length=5)
    san_move = models.CharField(max_length=20)
    fen_position = models.CharField(max_length=100)

    class Meta:
        db_table = 'moves'
        unique_together = (('game', 'move_number'),)

class Tournament(models.Model):
    def default_format_data():
        return {
            "player_mode": "Human-Human",
            "chess_variant": "Standard",
            "time_format": "10+15"
        }
    tournament_id = models.AutoField(primary_key=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tournaments')
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    player_count = models.IntegerField(default=8)
    is_ranked = models.BooleanField(default=True)
    name = models.CharField(max_length=30)
    format_data = models.JSONField(default=default_format_data,null=True, blank=True)
    restrictions_data = models.JSONField(null=True, blank=True)
    description = models.CharField(max_length=2500, null=True, blank=True)
    chat = models.CharField(max_length=10000, null=True, blank=True)
    winner_name = models.CharField(max_length=30, null=True, blank=True)

    class Meta:
        db_table = 'tournaments'

class TournamentGame(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='games', primary_key=True)
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='tournament_games')

    class Meta:
        db_table = 'tournamentgames'
        unique_together = (('tournament', 'game'),)

class TournamentParticipant(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='participants', primary_key=True)
    player = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tournament_participations')
    player_substitute = models.ForeignKey(ChessEngine, on_delete=models.CASCADE, related_name='tournament_substitutions', null=True)
    score = models.FloatField(default=0.0)

    class Meta:
        db_table = 'tournamentparticipants'
        unique_together = (('tournament', 'player'),)
