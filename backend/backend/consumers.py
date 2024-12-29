import json, asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from redis.asyncio import Redis
from django.utils import timezone
from asgiref.sync import sync_to_async
from django.test import RequestFactory

redis_instance = Redis.from_url("redis://redis:6379")

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.username = self.scope['url_route']['kwargs']['username']
        self.game_group_name = f"game_{self.game_id}"

        self.redis_key = f"game_specific.{self.game_id}.{self.username}"
        await redis_instance.set(self.redis_key, "connected", ex=11)

        await self.channel_layer.group_add(
            self.game_group_name,
            self.channel_name
        )
        await self.accept()

        from .models import Game
        is_player = await sync_to_async(
            Game.objects.filter(game_id=self.game_id).filter(player_white__username=self.username).exists)() or await sync_to_async(
            Game.objects.filter(game_id=self.game_id).filter(player_black__username=self.username).exists)()
        if not is_player:
            return

        from .managers import GameManager
        manager = await GameManager.get_or_create(self.game_id)
        if(manager is not None):
            game = await sync_to_async(Game.objects.get)(game_id=self.game_id)
            player_white_username = await sync_to_async(lambda: game.player_white.username)() if await sync_to_async(lambda: game.player_white)() else None
            player_black_username = await sync_to_async(lambda: game.player_black.username)() if await sync_to_async(lambda: game.player_black)() else None
            player_is_valid = self.username == str(player_white_username) or self.username == str(player_black_username)
            if not player_is_valid:
                await self.close()
                return
            if(self.username not in manager.players):
                await manager.log_server_message('opponent_joined', None, self.username)
                await self.channel_layer.group_send(
                    self.game_group_name,
                    {
                        "type": "opponent_joined",
                        "game_id": self.game_id,
                        'sender_channel_name': self.channel_name,
                    },
                )
                await manager.handle_player_join(self.username)

    async def disconnect(self, close_code):
        await asyncio.sleep(10)

        is_connected = await redis_instance.get(self.redis_key)
        if is_connected:
            return

        await redis_instance.delete(self.redis_key)

        await self.channel_layer.group_discard(
            self.game_group_name,
            self.channel_name
        )

        from .managers import GameManager
        manager = await GameManager.get_or_create(self.game_id)
        if(manager is not None and self.username in manager.players):
            await manager.log_server_message("opponent_disconnected", None, self.username)
            await manager.update_game_status("Disconnection")
            await self.channel_layer.group_send(
            self.game_group_name,
            {
                "type": "opponent_disconnected",
                "game_id": self.game_id,
                'sender_channel_name': self.channel_name,
            },
        )

    from datetime import datetime

    async def receive(self, text_data):
        from .managers import GameManager
        try:
            data = json.loads(text_data)

            message_type = data.get('type')

            if message_type == 'move':
                coordinate_move = data['coordinate_move']
                san_move = data['san_move']
                fen_position = data['fen_position']
                end_type = data.get('end_type')

                await self.channel_layer.group_send(
                    self.game_group_name,
                    {
                        'type': 'move',
                        'game_id': self.game_id,
                        'coordinate_move': coordinate_move,
                        'san_move': san_move,
                        'fen_position': fen_position,
                        'end_type': end_type,
                        'sender_channel_name': self.channel_name,
                    }
                )

                manager = await GameManager.get_or_create(self.game_id)
                if(manager is not None):
                    manager.update_clocks_on_move()
                    if end_type:
                        await manager.update_game_status(end_type, fen_position)
                
            elif message_type in ['opponent_joined', 'opponent_resigned','draw_offer', 'opponent_disconnected',
                                  'draw_accept', 'takeback_offer', 'takeback_accept', 'game_started', 'engine_error']:  
                await self.channel_layer.group_send(
                    self.game_group_name,
                    {
                        'type': message_type,
                        'game_id': self.game_id,
                        'sender_channel_name': getattr(self, 'channel_name', None),
                    }
                )
                 
                manager = await GameManager.get_or_create(self.game_id)
                if(manager is not None and message_type != 'opponent_joined'):
                    await manager.log_server_message(message_type, None, self.username)

                if(message_type == 'opponent_resigned'):
                    await manager.update_game_status('Resignation', None, self.username)
                elif(message_type == 'draw_accept'):
                    await manager.update_game_status('Agreement', None, self.username)
                elif(message_type == 'opponent_disconnected'):
                    await manager.update_game_status('Disconnection', None, self.username)
                elif(message_type == 'engine_error'):
                    await manager.update_game_status('EngineError', None, self.username)
                    
            elif message_type == 'chat_update':
                await self.channel_layer.group_send(
                    self.game_group_name,
                    {
                        'type': message_type,
                        'game_id': self.game_id,
                        'sender': self.channel_name,
                    }
                )
        except Exception as e:
            print(f"Error in GameConsumer.receive: {e}")

    async def game_started(self, event):
        await self.send(text_data=json.dumps({
                'type': 'game_started',
                'game_id': event['game_id'],
        }))

    async def clock_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'clock_update',
            'game_id': event['game_id'],
            "white_time": event['white_time'],
            "black_time": event['black_time'],
        }))

    async def move(self, event):
        if event['sender_channel_name'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'move',
                'game_id': event['game_id'],
                'coordinate_move': event['coordinate_move'],
                'san_move': event['san_move'],
                'fen_position': event['fen_position'],
                'end_type': event.get('end_type'),
            }))

    async def opponent_joined(self, event):
        if event['sender_channel_name'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'opponent_joined',
                'game_id': event['game_id'],
            }))

    async def opponent_resigned(self, event):
        if event['sender_channel_name'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'opponent_resigned',
                'game_id': event['game_id'],
            }))
    
    async def opponent_disconnected(self, event):
        if event['sender_channel_name'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'opponent_disconnected',
                'game_id': event['game_id'],
            }))

    async def engine_error(self, event):
        if event['sender_channel_name'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'engine_error',
                'game_id': event['game_id'],
            }))

    async def draw_offer(self, event):
        if event['sender_channel_name'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'draw_offer',
                'game_id': event['game_id'],
            }))

    async def draw_accept(self, event):
        if event['sender_channel_name'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'draw_accept',
                'game_id': event['game_id'],
            }))

    async def takeback_offer(self, event):
        if event['sender_channel_name'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'takeback_offer',
                'game_id': event['game_id'],
            }))

    async def takeback_accept(self, event):
        if event['sender_channel_name'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'takeback_accept',
                'game_id': event['game_id'],
            }))

    async def chat_update(self, event):
        if event['sender'] != self.channel_name:
            await self.send(text_data=json.dumps({
                    'type': 'chat_update',
                    'game_id': event['game_id'],
            })) 

    async def game_end(self, event):
        await self.send(text_data=json.dumps({
                'type': 'game_end',
                'game_id': event['game_id'],
        })) 

class TournamentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.tournament_id = self.scope['url_route']['kwargs']['tournament_id']
        self.username = self.scope['url_route']['kwargs']['username']
        self.tournament_group_name = f"tournament_{self.tournament_id}"
        
        self.redis_key = f"tournament_specific.{self.tournament_id}.{self.username}"
        await redis_instance.set(self.redis_key, "connected", ex=11)

        await self.channel_layer.group_add(
            self.tournament_group_name,
            self.channel_name
        )
        await self.accept()

        from .models import TournamentParticipant, Tournament
        tournament = await sync_to_async(Tournament.objects.get)(tournament_id=self.tournament_id)
        
        if tournament.start_time is not None:
            return
        
        async def wait_for_participant():
            for _ in range(10):
                is_participant = await sync_to_async(
                    lambda: TournamentParticipant.objects.filter(
                        tournament_id=self.tournament_id,
                        player__username=self.username
                    ).exists()
                )()
                if is_participant:
                    return True
                await asyncio.sleep(1)
            return False
        
        participant_exists = await wait_for_participant()
        if not participant_exists:
            return

        from .managers import TournamentManager
        manager = await TournamentManager.get_or_create(self.tournament_id)
        print(f"{self.tournament_id}, is manager: {manager is not None}")
        if(manager is not None):
            participant_usernames = await sync_to_async(lambda: [str(p.player.username) for p in manager.participants])()
            print(f"{self.tournament_id}, is added: {self.username in participant_usernames}")
            if self.username not in participant_usernames:
                await manager.player_join(self.username)
                await manager.log_server_message('player_joined', self.username)
                await self.channel_layer.group_send(
                    self.tournament_group_name,
                    {
                        "type": "player_joined",
                        "tournament_id": self.tournament_id,
                        "username": self.username,
                        'sender': self.channel_name,
                    },
                )

    async def disconnect(self, close_code):
        await asyncio.sleep(10)

        is_connected = await redis_instance.get(self.redis_key)
        if is_connected:
            return

        await redis_instance.delete(self.redis_key)

        await self.channel_layer.group_discard(
            self.tournament_group_name,
            self.channel_name
        )

        from .managers import TournamentManager
        manager = await TournamentManager.get(self.tournament_id)
        if(manager is not None):
            participant_usernames = await sync_to_async(lambda: [str(p.player.username) for p in manager.participants])()
            if self.username in participant_usernames:
                await manager.log_server_message('player_left', self.username)
                await manager.player_leave(self.username)
                await self.channel_layer.group_send(
                    self.tournament_group_name,
                    {
                        'type': 'player_left',
                        'tournament_id': self.tournament_id,
                        'username': self.username,
                        'sender': self.channel_name,
                    }
                )

    async def receive(self, text_data):
        from .managers import TournamentManager
        data = json.loads(text_data)
        message_type = data.get('type')
        username = data.get('username')

        if message_type in ['chat_update', 'list_update']:
            await self.channel_layer.group_send(
                self.tournament_group_name,
                {
                    'type': message_type,
                    'tournament_id': self.tournament_id,
                    'sender': self.channel_name,
                }
            )
            return
        
        manager = await TournamentManager.get(self.tournament_id)
        if not manager:
            return
        
        if message_type == 'tournament_start':
            await manager.start_tournament()
            await manager.log_server_message('tournament_start')
            await self.channel_layer.group_send(
                self.tournament_group_name,
                {
                    'type': 'tournament_start',
                    'tournament_id': self.tournament_id,
                    'sender': self.channel_name
                }
            )    
        elif message_type == 'player_ready':
            game_data = await manager.player_ready(username)
            if game_data:
                await self.channel_layer.group_send(
                    self.tournament_group_name,
                    {
                        'type': 'game_started',
                        'tournament_id': self.tournament_id,
                        'sender': self.channel_name,
                        **game_data,
                    }
                )
        elif message_type == "player_left":
            participant_usernames = await sync_to_async(lambda: [str(p.player.username) for p in manager.participants])()
            if username in participant_usernames:
                await manager.log_server_message('player_left', username)
                await manager.player_leave(username)
                await self.channel_layer.group_send(
                    self.tournament_group_name,
                    {
                        'type': 'player_left',
                        'tournament_id': self.tournament_id,
                        'username': username,
                        'sender': self.channel_name,
                    }
                )

    async def player_joined(self, event):
        if event['sender'] != self.channel_name:      
            await self.send(text_data=json.dumps({
                'type': 'player_joined',
                'tournament_id': event['tournament_id'],
                'username': event['username']
            }))

    async def player_left(self, event):
        if event['sender'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'player_left',
                'tournament_id': event['tournament_id'],
                'username': event['username']
            }))

    async def game_started(self, event):
        await self.send(text_data=json.dumps({
            'type': 'game_started',
            'tournament_id': event['tournament_id'],
            'game_id': event['game_id'],
            'player1': event['player1'],
            'player2': event['player2']
        }))     

    async def game_result(self, event):
        await self.send(text_data=json.dumps({
            'type': 'game_result',
            'tournament_id': event['tournament_id'],
            'game_id': event['game_id'],
            'player1': event['player1'],
            'player2': event['player2']
        }))  

    async def tournament_start(self, event):
        if event['sender'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'tournament_start',
                'tournament_id': event['tournament_id'],
            }))

    async def tournament_end(self, event):
        await self.send(text_data=json.dumps({
                'type': 'tournament_end',
                'tournament_id': event['tournament_id'],
        }))
        
    async def chat_update(self, event):
        if event['sender'] != self.channel_name: 
            await self.send(text_data=json.dumps({
                    'type': 'chat_update',
                    'tournament_id': event['tournament_id'],
            }))  

    async def list_update(self, event):
        if event['sender'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'list_update',
                'tournament_id': event['tournament_id'],
            }))
