import uuid
from datetime import datetime

from ..models import User

from django.contrib.auth.models import User as AuthUser
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail

from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view

from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

@api_view(['POST'])
def register(request):
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email')

    if not username or not password or not email:
        return Response({'error': 'Brakujące dane rejestracyjne'}, status=status.HTTP_400_BAD_REQUEST)
    
    if AuthUser.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        auth_user = AuthUser.objects.create(username=username, password=make_password(password), email=email, is_active=True)

        User.objects.create(
            username=auth_user,
            created_at=datetime.now(),
            elo=1000
        )

        return Response({'message': 'Użytkownik został zarejestrowany'}, status=status.HTTP_201_CREATED)

    except Exception as e:
        print(f"Error: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def send_confirmation_email(email, username): # Womp womp didn't end up being used
    token = str(uuid.uuid4())
    confirmation_link = f"http://mychesswebsite/confirm-email?token={token}&username={username}"
    send_mail(
        'Email Confirmation',
        f'Please confirm your email by clicking on the link: {confirmation_link}',
        'from@example.com',
        [email],
        fail_silently=False,
    )

def confirm_email(request): # Womp womp that too
    username = request.GET.get('username')
    token = request.GET.get('token')

    user = User.objects.filter(username=username).first()
    if user:
        user.is_active = True
        user.save()
        return Response({"message": "Email confirmed. You can now log in."}, status=status.HTTP_200_OK)
    return Response({"message": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def get_user_id(request, username):
    try:
        user = User.objects.get(username__username=username)
        return Response({'user_id': user.user_id})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    
@method_decorator(ratelimit(key='ip', rate='5/m', block=True), name='dispatch')
class RateLimitedTokenObtainPairView(TokenObtainPairView):
    pass

@method_decorator(ratelimit(key='ip', rate='10/m', block=True), name='dispatch')
class RateLimitedTokenRefreshView(TokenRefreshView):
    pass
