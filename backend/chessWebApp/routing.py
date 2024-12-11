from django.urls import path
from backend.consumers import GameConsumer, TournamentConsumer

websocket_urlpatterns = [
    path("ws/game/<str:game_id>/<str:username>/", GameConsumer.as_asgi()),
    path("ws/tournament/<str:tournament_id>/<str:username>/", TournamentConsumer.as_asgi()),
]
