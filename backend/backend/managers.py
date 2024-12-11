from .models import Tournament, TournamentParticipant, TournamentGame, Game, User, ChessEngine
from django.db import transaction
from django.utils import timezone
from asgiref.sync import sync_to_async
from django.test.client import RequestFactory
from channels.layers import get_channel_layer
import time
from django.db.models import Q
import json

import asyncio
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

class GameManager:
    managers = {}

    @classmethod
    async def get_or_create(cls, game_id):
        game = await sync_to_async(Game.objects.get)(game_id=game_id)
        if game.end_time is not None:
                return
        
        if game_id not in cls.managers:
            cls.managers[game_id] = cls(game_id)
            await cls.managers[game_id].initialize()
            
        return cls.managers[game_id]

    def __init__(self, game_id):
        self.game_id = game_id
        self.current_player = "white"
        self.white_time = 0
        self.black_time = 0
        self.increment = 0
        self.last_move_time = None
        self.channel_layer = get_channel_layer()
        self.game_group_name = f"game_{self.game_id}"
        self.has_started = False
        self.stop_event = asyncio.Event()
        self.players = set()

    async def initialize(self):
        game = await sync_to_async(Game.objects.get)(game_id=self.game_id)
        format_data = game.format_data

        time_format = format_data["time_format"]
        base_time, increment = map(int, time_format.split("+"))

        self.white_time = self.black_time = base_time * 60
        self.increment = increment

    @classmethod
    async def cleanup(cls, game_id):
        if game_id in cls.managers:
            manager = cls.managers[game_id]
            manager.stop_event.set()
            del cls.managers[game_id]

    async def handle_player_join(self, username):
        self.players.add(username)

        if len(self.players) == 2 and not self.has_started:
            self.has_started = True
            self.last_move_time = time.time()
            asyncio.create_task(self.monitor_clocks())

            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    "type": "game_started",
                    "game_id": self.game_id,
                },
            )

            await self.log_server_message("game_started")

    async def monitor_clocks(self):
        while not self.stop_event.is_set():
            if not self.has_started:
                await asyncio.sleep(1)
                continue

            await asyncio.sleep(1)
            now = time.time()
            elapsed = now - self.last_move_time

            if self.current_player == "white":
                self.white_time = max(0, self.white_time - elapsed)
            else:
                self.black_time = max(0, self.black_time - elapsed)

            self.last_move_time = now

            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    "type": "clock_update",
                    "game_id": self.game_id,
                    "white_time": self.white_time,
                    "black_time": self.black_time,
                },
            )

            if self.white_time == 0 or self.black_time == 0:
                await self.update_game_status('Timeout')
                self.stop_event.set()
                await self.cleanup(self.game_id)
                return

    def update_clocks_on_move(self):
        if self.current_player == "white":
            self.white_time += self.increment
        else:
            self.black_time += self.increment

        self.current_player = "white" if self.current_player == "black" else "black"

    async def log_server_message(self, message_type=None, result_message=None, username=None):
        from .views.game_views import add_game_message

        message = self.get_server_message(message_type, result_message, username)
        if not message:
            return

        try:
            factory = RequestFactory()
            request = factory.post(
                f'/api/game/{self.game_id}/chat/last/create/',
                {'message': message},
                content_type='application/json',
            )

            response = await sync_to_async(add_game_message)(request, game_id=self.game_id)
            if response.status_code != 200:
                print(f"Error adding chat message: {response.data}")
            else:
                await self.channel_layer.group_send(
                    self.game_group_name,
                    {
                        'type': 'chat_update',
                        'game_id': self.game_id,
                        'sender': '',
                    }
                )
                if(message_type == 'takeback_accept'):
                    self.current_player = "white" if self.current_player == "black" else "black"
        except Exception as e:
            print(f"Error in log_server_message: {e}")

    def get_server_message(self, message_type, result_message, username):
        server_messages = {
            'opponent_joined': f'Serwer|Gracz {username} dołączył do gry.',
            'opponent_disconnected': f'Serwer|Gracz {username} wyszedł z gry.',
            'game_started': 'Serwer|Gra została rozpoczęta.',
            'opponent_resigned': f'Serwer|Gracz {username} poddał się.',
            'opponent_disconnected': f'Serwer|Gracz {username} rozłączył się.',
            'draw_offer': f'Serwer|Gracz {username} proponuje remis.',
            'draw_accept': f'Serwer|Gracz {username} zaakceptował remis.',
            'takeback_offer': f'Serwer|Gracz {username} proponuje cofnięcie ruchu.',
            'takeback_accept': f'Serwer|Gracz {username} zaakceptował cofnięcie ruchu.',
        }

        custom_result_messages = {
            'Checkmate': f"Serwer|Koniec gry - Gracz {username} wygrywa poprzez mat.",
            'Resignation': f"Serwer|Koniec gry - Gracz {username} wygrywa przez poddanie się przeciwnika",
            'Timeout': f"Serwer|Koniec gry - Gracz {username} wygrywa przez upłynięcie czasu przeciwnika",
            'Disconnection': f"Serwer|Koniec gry - Gracz {username} wygrywa przez rozłączenie się przeciwnika",
            'Stalemate': "Serwer|Koniec gry - Remis z powodu braku legalnych ruchów (pat).",
            'Draw Agreement': "Serwer|Koniec gry - Remis przez obopólną zgodę graczy.",
            'Insufficient Material': "Serwer|Koniec gry - Remis przez niewystarczający materiał.",
            'Threefold Repetition': "Serwer|Koniec gry - Remis przez trzykrotne powtórzenie pozycji.",
            'Fifty-Move Rule': "Serwer|Koniec gry - Remis z powodu zasady pięćdziesięciu ruchów.",
        }

        if result_message:
            reason = result_message.split(',')[1].strip() if ',' in result_message else None
            return custom_result_messages.get(reason, "Serwer|Nieznany wynik gry.")
        return server_messages.get(message_type)

    async def update_game_status(self, end_type, fen_position=None, username=None):
        from .models import Game, TournamentGame
        from .views.game_views import update_game

        try:
            game = await sync_to_async(Game.objects.get)(game_id=self.game_id)

            if game.start_time is None:
                await sync_to_async(game.delete)()
                await self.cleanup(self.game_id)
                return

            player_black_username = str(await sync_to_async(lambda: game.player_black.username)())
            player_white_username = str(await sync_to_async(lambda: game.player_white.username)())

            result_message, winner = await self.determine_game_result(
                end_type, fen_position, player_black_username, player_white_username, username
            )
            if not result_message:
                return
            
            await self.log_server_message(None, result_message, winner)
            
            if game.is_ranked:
                result_message += await self.update_players_elo(game, result_message.split(',')[0])

            factory = RequestFactory()
            request = factory.put(
                f'/api/game/{self.game_id}/update/',
                {
                    'result': result_message,
                    'end_time': timezone.now(),
                },
                content_type='application/json'
            )

            response = await sync_to_async(update_game)(request, game_id=self.game_id)
            if response.status_code != 200:
                print(f"Error updating game: {response.data}")

            await self.channel_layer.group_send(
                    self.game_group_name,
                    {
                        'type': 'game_end',
                        'game_id': self.game_id,
                    }
                )

            tournament_game = await sync_to_async(TournamentGame.objects.filter)(game=game)
            tournament_game_exists = await sync_to_async(tournament_game.exists)()

            if tournament_game_exists:
                tournament = await sync_to_async(lambda: tournament_game.first())()
                tournament_id = tournament.tournament_id
                from .managers import TournamentManager
                manager = await TournamentManager.get(str(tournament_id))
                await manager.report_game_result(int(self.game_id), result_message)

            await self.cleanup(self.game_id)
                
        except Exception as e:
            print(f"Error in update_game_status: {e}")

    async def determine_game_result(self, end_type, fen_position, player_black_username, player_white_username, username=None):
        match end_type:
            case 'Stalemate':
                return '1/2-1/2, Stalemate', None
            case 'Checkmate' if fen_position:
                winner = player_black_username if fen_position.split(' ')[1] == 'w' else player_white_username
                return f"{'0-1' if fen_position.split(' ')[1] == 'w' else '1-0'}, Checkmate", winner
            case 'Resignation' | 'Disconnection':
                winner = player_black_username if username == player_white_username else player_white_username
                return f"{'0-1' if username == player_white_username else '1-0'}, {end_type}", winner
            case 'Timeout':
                winner = player_black_username if self.current_player == 'white' else player_white_username
                return f"{'0-1' if self.current_player == 'white' else '1-0'}, Timeout", winner
            case 'Agreement':
                return '1/2-1/2, Draw Agreement', None
            case 'InsufficientMaterial':
                return '1/2-1/2, Insufficient Material', None
            case 'ThreefoldRepetition':
                return '1/2-1/2, Threefold Repetition', None
            case 'FiftyMoveRule':
                return '1/2-1/2, Fifty-Move Rule', None
            case _:
                return None, None
            
    async def update_players_elo(self, game, score):
        try:
            player_white = await sync_to_async(lambda: game.player_white)()
            player_black = await sync_to_async(lambda: game.player_black)()
            player_white_substitute = await sync_to_async(lambda: game.player_white_substitute)()
            player_black_substitute = await sync_to_async(lambda: game.player_black_substitute)()

            if not player_white and not player_white_substitute:
                return
            if not player_black and not player_black_substitute:
                return
            
            white_target = player_white_substitute if player_white_substitute else player_white
            black_target = player_black_substitute if player_black_substitute else player_black

            white_elo = white_target.elo
            black_elo = black_target.elo

            def get_games_played(target):
                if isinstance(target, User):
                    return Game.objects.filter(Q(player_white=target) | Q(player_black=target)).count()
                elif isinstance(target, ChessEngine):
                    return Game.objects.filter(
                        Q(player_white_substitute=target) | Q(player_black_substitute=target)
                    ).count()
                return 0


            white_games_played = await sync_to_async(lambda: get_games_played(white_target))()
            black_games_played = await sync_to_async(lambda: get_games_played(black_target))()

            def calculate_k_factor(games_played, base_k=128, min_k=32):
                return max(min_k, base_k - games_played * 4)

            k_white = calculate_k_factor(white_games_played)
            k_black = calculate_k_factor(black_games_played)

            def calculate_elo_change(player_elo, opponent_elo, score, k_factor):
                expected_score = 1 / (1 + 10 ** ((opponent_elo - player_elo) / 400))
                return round(k_factor * (score - expected_score))

            if score == "1-0":
                white_change = calculate_elo_change(white_elo, black_elo, 1, k_white)
                black_change = calculate_elo_change(black_elo, white_elo, 0, k_black)
            elif score == "0-1":
                white_change = calculate_elo_change(white_elo, black_elo, 0, k_white)
                black_change = calculate_elo_change(black_elo, white_elo, 1, k_black)
            elif score == "1/2-1/2":
                white_change = calculate_elo_change(white_elo, black_elo, 0.5, k_white)
                black_change = calculate_elo_change(black_elo, white_elo, 0.5, k_black)

            white_target.elo += white_change
            black_target.elo += black_change

            await sync_to_async(white_target.save)()
            await sync_to_async(black_target.save)()

            return f" | {white_change:+},{black_change:+}"

        except Exception as e:
            print(f"Error in update_players_elo: {e}")


class TournamentManager:
    managers = {}

    @classmethod
    async def get_or_create(cls, tournament_id):
        if tournament_id not in cls.managers:
            tournament = await sync_to_async(Tournament.objects.get)(tournament_id=tournament_id)

            if tournament.end_time is not None:
                return
            
            manager = cls(tournament_id)
            cls.managers[tournament_id] = manager
            cls.managers[tournament_id].tournament = tournament

        print(f"Number of TournamentManager instances: {len(cls.managers)}")
        return cls.managers[tournament_id]
    
    @classmethod
    async def get(cls, tournament_id):
        print(f"Number of TournamentManager instances: {len(cls.managers)}")
        return cls.managers.get(tournament_id)

    def __init__(self, tournament_id):
        self.tournament_id = tournament_id
        self.tournament = None
        self.participants = []
        self.ready_players = set()
        self.scores = {}
        self.current_games = set()
        self.channel_layer = get_channel_layer()
        self.tournament_group_name = f"tournament_{self.tournament_id}"

    @staticmethod
    async def get_user_id_from_username(username):
        try:
            user = await sync_to_async(User.objects.get)(username=username)
            return user.user_id
        except User.DoesNotExist:
            return None
        
    async def player_join(self, username):
        if self.tournament.start_time:
            print("Tournament has already started. Player cannot join.")
            return None
        
        try:
            user = await sync_to_async(User.objects.select_related('username').get)(username=username)
        except User.DoesNotExist:
            print(f"User {username} does not exist.")
            return None

        if any(p.player.user_id == user.user_id for p in self.participants):
            print(f"Player {username} is already a participant.")
            return None

        participant = await sync_to_async(
        lambda: TournamentParticipant.objects.select_related('player', 'player_substitute').get(
            tournament=self.tournament,
            player=user)
        )()

        if participant is None:
            print(f"Player {username} is a spectator.")
            return

        self.participants.append(participant)
        self.scores[user.user_id] = 0
        print(f"Player {username} added to participants list in tournament {self.tournament_id}")
 
    async def player_ready(self, username):
        user_id = await self.get_user_id_from_username(username)
        if not user_id:
            return None

        result = await sync_to_async(self._handle_player_ready_transaction)(user_id)
        return result

    def _handle_player_ready_transaction(self, user_id):
        from backend.views.game_views import create_game, join_game
        from backend.views.move_views import create_move
        request_factory = RequestFactory()
        
        with transaction.atomic():
            self.ready_players.add(user_id)

            opponent_id = None
            for ready_player in self.ready_players:
                if ready_player != user_id:
                    existing_games = TournamentGame.objects.filter(
                        tournament=self.tournament,
                        game__in=Game.objects.filter(
                            player_white_id=user_id,
                            player_black_id=ready_player
                        ) | Game.objects.filter(
                            player_white_id=ready_player,
                            player_black_id=user_id
                        )
                    )
                    if not existing_games.exists():
                        opponent_id = ready_player
                        break

            if not opponent_id:
                return None

            self.ready_players.remove(user_id)
            self.ready_players.remove(opponent_id)

            player1_participant = next(p for p in self.participants if p.player.user_id == user_id)
            player2_participant = next(p for p in self.participants if p.player.user_id == opponent_id)

            game_data = {
                "user_id": player1_participant.player.user_id,
                "engine_url": player1_participant.player_substitute.url if player1_participant.player_substitute else "",
                "format_data": json.dumps({
                    "time_format": self.tournament.format_data.get('time_format', "10+15")
                }),
                "is_ranked": self.tournament.is_ranked
            }
            if not game_data["engine_url"]:
                del game_data["engine_url"]

            request_mock_create = request_factory.post('/api/game/create/', data=game_data)
            response_create = create_game(request_mock_create)
            if response_create.status_code != 201:
                raise Exception(f"Nie udało się utworzyć gry: {response_create.data}")

            game_id = response_create.data.get("game_id")
            self.current_games.add(game_id)

            game = Game.objects.get(game_id=game_id)
            TournamentGame.objects.create(tournament=self.tournament, game=game)

            join_data = {
                "user_id": player2_participant.player.user_id,
                "engine_url": player2_participant.player_substitute.url if player2_participant.player_substitute else ""
            }
            if not join_data["engine_url"]:
                del join_data["engine_url"]

            request_mock_join = request_factory.post(f'/api/game/{game_id}/join/', data=join_data)
            response_join = join_game(request_mock_join, game_id=game_id)
            if response_join.status_code != 200:
                raise Exception(f"Nie udało się dołączyć gracza do gry: {response_join.data}")
        
            initial_move_data = {
            "move_time": timezone.now().isoformat(),
            "coordinate_move": "",
            "san_move": "",
            "fen_position": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
            }
            request_mock_move = request_factory.post(f'/api/game/{game_id}/move/0/create/', data=initial_move_data)
            response_move = create_move(request_mock_move, game_id=game_id, move_number=0)
            if response_move.status_code != 201:
                raise Exception(f"Nie udało się zapisać ruchu początkowego: {response_move.data}")
            
            return {
                'game_id': game_id,
                'player1': player1_participant.player.username_id,
                'player2': player2_participant.player.username_id,
            }

    async def report_game_result(self, game_id, result):
        if game_id not in self.current_games:
            return False

        try:
            self.current_games.remove(game_id)
            points_white, points_black = self.parse_game_result(result)

            game = await sync_to_async(Game.objects.get)(game_id=game_id)
            player_white = await sync_to_async(lambda: game.player_white)()
            player_black = await sync_to_async(lambda: game.player_black)()

            if player_white and player_white.user_id in self.scores:
                self.scores[player_white.user_id] += points_white
            if player_black and player_black.user_id in self.scores:
                self.scores[player_black.user_id] += points_black

            for participant in self.participants:
                if participant.player.user_id in {player_white.user_id, player_black.user_id}:
                    await sync_to_async(TournamentParticipant.objects.filter(
                            tournament=self.tournament, 
                            player=participant.player).update)(
                        score=self.scores.get(participant.player.user_id, 0)
                    )

            if not self.current_games:
                if (await self.finalize_tournament() == "tournament_end"):
                    await self.channel_layer.group_send(
                        self.tournament_group_name,
                        {
                            "type": "tournament_end",
                            'tournament_id': self.tournament_id,
                        }
                    )
                    return

            await self.channel_layer.group_send(
                self.tournament_group_name,
                {
                    "type": "game_result",
                    "tournament_id": self.tournament_id,
                    "game_id": game_id,
                    "result": result,
                    "player1": str(await sync_to_async(lambda: game.player_white.username)()),
                    "player2": str(await sync_to_async(lambda: game.player_black.username)()),
                }
            )
        except Exception as e:
            print(f"Error in report_game_result: {e}")

    async def finalize_tournament(self):
        try:
            total_games = (len(self.participants) * (len(self.participants) - 1)) / 2
            tournament_games = await sync_to_async(list)(TournamentGame.objects.filter(tournament=self.tournament))
            games_count = len(tournament_games)

            if total_games == 0:
                await sync_to_async(self.tournament.delete)()
                del TournamentManager.managers[self.tournament_id]
                return "tournament_end"

            if games_count < total_games:
                return "tournament_ongoing"

            max_score = max(self.scores.values())
            top_players = [p for p in self.participants if self.scores[p.player.user_id] == max_score]

            #Trying out different tiebreaks until the winner is resolved
            if len(top_players) > 1:
                # 1. Sonneborn-Berger
                sonneborn_scores = {}
                sonneborn_scores = {
                    participant.player.user_id: await self.calculate_sonneborn_berger(participant)
                    for participant in top_players
                }
                max_sonneborn_score = max(sonneborn_scores.values())
                top_players = [player for player in top_players if sonneborn_scores[player.player.user_id] == max_sonneborn_score]
                await self.log_server_message("sonneborn_berger_tiebreak")

            if len(top_players) > 1:
                # 2. Win count
                win_counts = {
                    participant.player.user_id: await self.calculate_number_of_wins(participant)
                    for participant in top_players
                }
                max_wins = max(win_counts.values())
                top_players = [player for player in top_players if win_counts[player.player.user_id] == max_wins]
                await self.log_server_message("number_of_wins_tiebreak")

            if len(top_players) > 1:
                # 3. Highest ELO count
                elo_scores = {player.player.user_id: self.get_player_elo(player) for player in top_players}
                max_elo = max(elo_scores.values())
                top_players = [player for player in top_players if elo_scores[player.player.user_id] == max_elo]
                await self.log_server_message("highest_elo_tiebreak")

            if len(top_players) > 1:
                # 4. Radnom choice
                import random
                winner = random.choice(top_players)
                await self.log_server_message("random_tiebreak")
            else:
                winner = top_players[0]

            winner_name = await sync_to_async(lambda: winner.player.username.username)()
            self.tournament = await sync_to_async(Tournament.objects.get)(tournament_id=self.tournament_id)
            self.tournament.winner_name = winner_name
            self.tournament.end_time = timezone.now()
            await sync_to_async(self.tournament.save)()

            await self.log_server_message("tournament_end", winner_name)

            del TournamentManager.managers[self.tournament_id]

            return "tournament_end"
        except Exception as e:
                print(f"Error in finalize_tournament: {e}")

    async def calculate_sonneborn_berger(self, participant):
        games = await sync_to_async(list)(TournamentGame.objects.filter(
            tournament=self.tournament,
            game__in=Game.objects.filter(
                player_white_id=participant.player.user_id
            ) | Game.objects.filter(
                player_black_id=participant.player.user_id
            )
        ))

        score = 0
        for tournament_game in games:
            game = await sync_to_async(lambda: tournament_game.game)()

            player_white = await sync_to_async(lambda: game.player_white)()
            player_black = await sync_to_async(lambda: game.player_black)()

            opponent = None
            if player_white and player_white.user_id == participant.player.user_id:
                opponent = player_black
            elif player_black and player_black.user_id == participant.player.user_id:
                opponent = player_white

            if not opponent:
                continue

            opponent_score = self.scores.get(opponent.user_id, 0)

            if game.result == "1-0" and player_white.user_id == participant.player.user_id:
                score += opponent_score
            elif game.result == "0-1" and player_black.user_id == participant.player.user_id:
                score += opponent_score
            elif game.result == "1/2-1/2":
                score += opponent_score / 2

        return score

    async def calculate_number_of_wins(self, player):
        games = await sync_to_async(list)(TournamentGame.objects.filter(
            tournament=self.tournament,
            game__in=Game.objects.filter(
                player_white_id=player.player.user_id,
                result="1-0"
            ) | Game.objects.filter(
                player_black_id=player.player.user_id,
                result="0-1"
            )
        ))
        return len(games)
    
    def get_player_elo(self, participant):
        if participant.player_substitute:
            return participant.player_substitute.elo
        return participant.player.elo

    @staticmethod
    def parse_game_result(result):
        if not result:
            return 0, 0
        score = result.strip().split(',')[0].split('-')
        if score[0] == "1/2":
            return 0.5, 0.5
        return int(score[0]), int(score[1])

    async def player_leave(self, username):
        try:
            user_id = await self.get_user_id_from_username(username)

            if not user_id or not any(p.player.user_id == user_id for p in self.participants):
                return

            await sync_to_async(self._handle_player_leave_transaction)(user_id)

            if not self.participants:
                await self.finalize_tournament()
            elif user_id == self.tournament.created_by_id:
                new_creator = self.participants[0].player
                self.tournament = await sync_to_async(Tournament.objects.get)(tournament_id=self.tournament_id)
                await sync_to_async(lambda: setattr(self.tournament, 'created_by', new_creator))()
                await sync_to_async(self.tournament.save)()

        except Exception as e:
            print(f"Error in player_leave: {e}")

    def _handle_player_leave_transaction(self, user_id):
        with transaction.atomic():
            self.participants = [p for p in self.participants if p.player.user_id != user_id]
            self.ready_players.discard(user_id)

            TournamentParticipant.objects.filter(tournament=self.tournament, player_id=user_id).delete()

            tournament_games = TournamentGame.objects.filter(
                tournament=self.tournament,
                game__in=Game.objects.filter(
                    player_white_id=user_id
                ) | Game.objects.filter(
                    player_black_id=user_id
                )
            )

            for tournament_game in tournament_games:
                game = tournament_game.game
                points_white, points_black = self.parse_game_result(game.result or "")

                if game.player_white and game.player_white.user_id != user_id:
                    self.scores[game.player_white.user_id] -= points_white
                if game.player_black and game.player_black.user_id != user_id:
                    self.scores[game.player_black.user_id] -= points_black

                self.current_games.discard(game.game_id)
                tournament_game.delete()
                game.delete()

            if user_id in self.scores:
                del self.scores[user_id]

            for participant in self.participants:
                participant_id = participant.player.user_id
                new_score = self.scores.get(participant_id, 0)

                TournamentParticipant.objects.filter(tournament=self.tournament, player=participant.player).update(score=new_score)

    async def start_tournament(self):
        if not self.tournament.start_time:
            self.tournament = await sync_to_async(Tournament.objects.get)(tournament_id=self.tournament_id)
            self.tournament.start_time = timezone.now()
            await sync_to_async(self.tournament.save)()

    async def log_server_message(self, message_type, username=None):
        from .views.tournament_views import add_tournament_message
        server_messages = {
            'player_joined': f'Serwer|Gracz {username} dołączył do turnieju.',
            'player_left': f'Serwer|Gracz {username} opuścił turniej.',
            'tournament_start': 'Serwer|Turniej został rozpoczęty.',
            'tournament_end': f"Serwer|Turniej został zakończony. Zwycięzca - {username}",
            'sonneborn_berger_tiebreak': 'Serwer|Wykryto remis. Rozstrzyganie wyniku metodą Sonneborn-Berger.',
            'number_of_wins_tiebreak': 'Serwer|Wykryto remis. Rozstrzyganie wyniku wyborem gracza z największą liczbą zwycięztw.',
            'highest_elo_tiebreak': 'Serwer|Wykryto remis. Rozstrzyganie wyniku wyborem gracza z najwyższym ELO.',
            'random_tiebreak': 'Serwer|Wykryto remis. Rozstrzyganie wyniku metodą losowania.',
        }
        
        message = server_messages.get(message_type, None)
        if not message:
            return
        
        try:
            factory = RequestFactory()
            request = factory.post(
                f'/api/tournament/{self.tournament_id}/chat/last/create/',
                {'message': message},
                content_type='application/json',
            )

            response = await sync_to_async(add_tournament_message)(request, tournament_id=self.tournament_id)
            if response.status_code != 200:
                print(f"Error adding chat message: {response.data}")

            await self.channel_layer.group_send(
                self.tournament_group_name,
                {
                    'type': 'chat_update',
                    'tournament_id': self.tournament_id,
                    'sender': '',
                }
            )

        except Exception as e:
            print(f"Error in log_server_message: {e}")
