import urllib.parse

from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from ..models import ChessEngine, User
from ..serializers import ChessEngineSerializer

@api_view(['POST'])
def create_engine(request):
    if request.method == 'POST':
        data = request.data
        user_id = data.get('user_id')

        try:
            engine_owner = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Użytkownik nie istnieje.'}, status=status.HTTP_400_BAD_REQUEST)

        engine = ChessEngine.objects.create(
            user=engine_owner,
            created_at=timezone.now(),
            url=data.get('url'),
            name=data.get('name'),
            description=data.get('description', ''),
            elo=1000
        )

        return Response({"engine_id": engine.engine_id}, status=status.HTTP_201_CREATED)

@api_view(['PUT'])
def update_engine(request, url):
    try:
        decoded_url = urllib.parse.unquote(url)

        engine = ChessEngine.objects.get(url=decoded_url)

        engine.name = request.data.get('name', engine.name)
        engine.url = request.data.get('url', engine.url)
        engine.description = request.data.get('description', engine.description)
        engine.save()

        return Response({'message': 'Silnik został zaktualizowany.'}, status=200)
    except ChessEngine.DoesNotExist:
        return Response({'error': decoded_url}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['DELETE'])
def delete_engine(request, url):
    try:
        decoded_url = urllib.parse.unquote(url)

        engine = ChessEngine.objects.get(url=decoded_url)
        engine.delete()
        return Response({'message': 'Silnik został usunięty.'}, status=200)
    except ChessEngine.DoesNotExist:
        return Response({'error': decoded_url}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)