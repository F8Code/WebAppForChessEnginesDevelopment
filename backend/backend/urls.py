from django.urls import path

from .views.authorization_views import register, get_user_id

from .views.any_views import get_games, get_tournaments
from .views.user_views import get_user_profile, update_user_profile, get_user_engines, get_user_games, get_user_tournaments
from .views.game_views import create_game, get_game, get_all_game_chat_messages, add_game_message, join_game, update_game, delete_game
from .views.tournament_views import create_tournament, get_tournament, update_tournament_slots, get_all_tournament_chat_messages, add_tournament_message, get_tournament_games, update_tournament, delete_tournament
from .views.engine_views import create_engine, update_engine, delete_engine
from .views.tournamentparticipants_views import list_tournament_participants, create_tournament_participant, update_tournament_participant, delete_tournament_participant
from .views.move_views import create_move, get_moves, get_last_move, get_random_moves, update_move, delete_last_move
from .views.chess_algorithm_views import validate_move_view

urlpatterns = [
    # Auth
    path('token/register/', register, name='register'),
    path('token/get-user-id/<str:username>/', get_user_id, name='get-user-id'),

    # Users
    path('user/<int:user_id>/profile/get/', get_user_profile, name='get-user-profile'),
    path('user/<int:user_id>/profile/update/', update_user_profile, name='update-user-profile'),
    path('user/<int:user_id>/engines/get/', get_user_engines, name='get-engines'),
    path('user/<int:user_id>/games/get/', get_user_games, name='get-user-games'),
    path('user/<int:user_id>/tournaments/get/', get_user_tournaments, name='get-user-tournaments'),

    # Games
    path('game/create/', create_game, name='create-game'),
    path('game/<int:game_id>/get/', get_game, name='get-game'),
    path('game/<int:game_id>/chat/get/', get_all_game_chat_messages, name='get_game_message_by_index'),
    path('game/<int:game_id>/chat/last/create/', add_game_message, name='add-game-message'),
    path('game/<int:game_id>/join/', join_game, name='join-game'),
    path('game/<int:game_id>/update/', update_game, name='update-game'),
    path('game/<int:game_id>/delete/', delete_game, name='delete-game'),
    path('games/get/', get_games, name='get-games'),

    # Tournaments
    path('tournament/create/', create_tournament, name='create-tournament'),
    path('tournament/<int:tournament_id>/get/', get_tournament, name='get-tournament'),
    path('tournament/<int:tournament_id>/slots/update/', update_tournament_slots, name='update-tournament-slots'),
    path('tournament/<int:tournament_id>/chat/get/', get_all_tournament_chat_messages, name='get-tournament-last-message'),
    path('tournament/<int:tournament_id>/chat/last/create/', add_tournament_message, name='add-tournament-message'),
    path('tournament/<int:tournament_id>/games/get/', get_tournament_games, name='get_tournament'),
    path('tournament/<int:tournament_id>/update/', update_tournament, name='update-tournament'),
    path('tournament/<int:tournament_id>/delete/', delete_tournament, name='delete-tournament'),
    path('tournaments/get/', get_tournaments, name='get-tournaments'),

    # ChessEngines
    path('engine/create/', create_engine, name='create-engine'),
    path('engine/<path:url>/update/', update_engine, name='update-engine'),
    path('engine/<path:url>/delete/', delete_engine, name='delete-engine'),

    # Tournament participants
    path('tournament/<int:tournament_id>/participants/get/', list_tournament_participants, name='list-tournament-participants'),
    path('tournament/<int:tournament_id>/participant/<int:participant_id>/create/', create_tournament_participant, name='create-tournament-participant'),
    path('tournament/<int:tournament_id>/participant/<int:participant_id>/update/', update_tournament_participant, name='update-tournament-participant'),
    path('tournament/<int:tournament_id>/participant/<int:participant_id>/delete/', delete_tournament_participant, name='delete-tournament-participant'),

    # Moves
    path('game/<int:game_id>/move/<int:move_number>/create/', create_move, name='create_move'),
    path('game/<int:game_id>/moves/get', get_moves, name='retrieve_moves'),
    path('game/<int:game_id>/move/<int:move_number>/update-or-create/', update_move, name='update_move'),
    path('game/<int:game_id>/move/last/delete/', delete_last_move, name='delete_move'),
    path('game/<int:game_id>/move/last/', get_last_move, name='get_last_move'),

    # Game management
    path('game/<int:game_id>/validate-move/', validate_move_view, name='validate-move'),
    path('moves/get_random_moves/', get_random_moves, name='get_random_moves'),
]
