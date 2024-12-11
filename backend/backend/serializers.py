from rest_framework import serializers
from .models import User, ChessEngine, Game, Move, Tournament, TournamentGame, TournamentParticipant

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'

class ChessEngineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChessEngine
        fields = '__all__'

class ShortUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['user_id', 'username', 'nationality', 'elo']

class ShortChessEngineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChessEngine
        fields = ['name', 'url', 'elo']

class GameSerializer(serializers.ModelSerializer):
    player_white = ShortUserSerializer(read_only=True)
    player_black = ShortUserSerializer(read_only=True)
    player_white_substitute = ShortChessEngineSerializer(read_only=True)
    player_black_substitute = ShortChessEngineSerializer(read_only=True)

    player_white_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='player_white',
        write_only=True,
        allow_null=True,
        required=False
    )
    player_black_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='player_black',
        write_only=True,
        allow_null=True,
        required=False
    )
    player_white_substitute_id = serializers.PrimaryKeyRelatedField(
        queryset=ChessEngine.objects.all(),
        source='player_white_substitute',
        write_only=True,
        allow_null=True,
        required=False
    )
    player_black_substitute_id = serializers.PrimaryKeyRelatedField(
        queryset=ChessEngine.objects.all(),
        source='player_black_substitute',
        write_only=True,
        allow_null=True,
        required=False
    )

    class Meta:
        model = Game
        fields = [
            'game_id',
            'player_white',  # Read-only
            'player_black',  # Read-only
            'player_white_substitute',  # Read-only
            'player_black_substitute',  # Read-only
            'player_white_id',  # Write-only
            'player_black_id',  # Write-only
            'player_white_substitute_id',  # Write-only
            'player_black_substitute_id',  # Write-only
            'start_time',
            'end_time',
            'is_ranked',
            'format_data',
            'restrictions_data',
            'description',
            'result',
        ]

class GameDetailsSerializer(serializers.ModelSerializer):
    player_white = ShortUserSerializer()
    player_black = ShortUserSerializer()
    player_white_substitute = ShortChessEngineSerializer(allow_null=True)
    player_black_substitute = ShortChessEngineSerializer(allow_null=True)

    class Meta:
        model = Game
        fields = [
            'game_id',
            'player_white',
            'player_black',
            'player_white_substitute',
            'player_black_substitute',
            'start_time',
            'end_time',
            'is_ranked',
            'format_data',
            'description',
            'chat',
            'result',
        ]

class MoveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Move
        fields = '__all__'

class TournamentParticipantSerializer(serializers.ModelSerializer):
    player = ShortUserSerializer()
    player_substitute = ShortChessEngineSerializer(allow_null=True)

    class Meta:
        model = TournamentParticipant
        fields = ['player', 'player_substitute', 'score']

class TournamentSerializer(serializers.ModelSerializer):
    created_by = ShortUserSerializer(read_only=True)
    created_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='created_by',
        write_only=True
    )

    current_player_count = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = [
            'tournament_id',
            'name',
            'created_by',  # Read-only
            'created_by_id',  # Write-only
            'start_time',
            'end_time',
            'format_data',
            'restrictions_data',
            'description',
            'winner_name',
            'player_count',
            'current_player_count',  # Read-only
        ]

    def get_current_player_count(self, obj):
        return obj.participants.count()

class TournamentDetailsSerializer(serializers.ModelSerializer):
    created_by = ShortUserSerializer()
    participants = TournamentParticipantSerializer(many=True, read_only=True)
    current_player_count = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = [
            'tournament_id',
            'name',
            'created_by',
            'start_time',
            'end_time',
            'participants',
            'format_data',
            'restrictions_data',
            'description',
            'chat',
            'winner_name',
            'player_count',
            'current_player_count',
        ]
        depth = 1

    def get_current_player_count(self, obj):
        return obj.participants.count()
    
class TournamentGameSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentGame
        fields = '__all__'