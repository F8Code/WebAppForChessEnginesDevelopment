from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q, F
from django.core.paginator import Paginator
from django.db.models.expressions import RawSQL

from ..models import User, Game, Tournament
from ..serializers import GameSerializer, TournamentSerializer

from django.db.models import Q, F, IntegerField
from django.db.models.functions import Cast

from django.db.models import F, Q, IntegerField
from django.db.models.functions import Cast
from django.db.models.expressions import RawSQL

def filter_and_sort_queryset(queryset, filters, sort, page, serializer_class, user):
    # Extracting time and increment
    queryset = queryset.annotate(
        time=Cast(
            RawSQL("split_part(format_data->>'time_format', '+', 1)", []),
            IntegerField()
        ),
        increment=Cast(
            RawSQL("split_part(format_data->>'time_format', '+', 2)", []),
            IntegerField()
        )
    )

    # Filtering by time and increment
    if filters.get('min_time') and filters.get('max_time'):
        queryset = queryset.filter(
            time__gte=filters['min_time'],
            time__lte=filters['max_time'],
            increment__gte=filters['min_increment'],
            increment__lte=filters['max_increment']
        )

    # Filtering by player mode
    if filters.get('player_mode'):
        queryset = queryset.filter(format_data__player_mode=filters['player_mode'])

    # Filtering by ELO
    if filters.get('min_elo') and filters.get('max_elo'):
        queryset = queryset.filter(
            Q(restrictions_data__min_elo__gte=filters['min_elo']),
            Q(restrictions_data__max_elo__lte=filters['max_elo'])
        )

    # Filtering by is_ranked
    if filters.get('is_ranked') is not None:
        queryset = queryset.filter(is_ranked=filters['is_ranked'])

    # Filtering by only_available (only if the user is available)
    if filters.get('only_available') and user:
        # Filtering games/tournaments where the user's ELO does not fit
        queryset = queryset.filter(
            Q(restrictions_data__min_elo__lte=user.elo),
            Q(restrictions_data__max_elo__gte=user.elo)
        )

        # Additional filtering for tournaments: player_count != current_player_count
        if 'player_count' in [field.name for field in queryset.model._meta.fields]:
            queryset = queryset.annotate(
                current_player_count=RawSQL(
                    "(SELECT COUNT(*) FROM tournament_participants WHERE tournament_participants.tournament_id = tournaments.tournament_id)", []
                )
            ).filter(
                Q(player_count__gt=F('current_player_count'))
            )

    # Sorting
    if sort.get('field'):
        if sort['field'] == 'time':
            queryset = queryset.order_by(
                F('time').asc() if sort['ascending'] else F('time').desc()
            )
        elif sort['field'] == 'max_elo':
            queryset = queryset.order_by(
                F('restrictions_data__max_elo').asc() if sort['ascending'] else F('restrictions_data__max_elo').desc()
            )

    # Pagination
    paginator = Paginator(queryset, 10)
    paginated_data = paginator.get_page(page)

    return serializer_class(paginated_data, many=True).data

@api_view(['POST'])
def get_games(request):
    filters = request.data.get('filters', {})
    sort = request.data.get('sort', {})
    page = request.data.get('page', 1)
    user_id = request.data.get('user_id')
    status = request.data.get('status', 'active')

    # Attempting to retrieve the user if user_id is provided
    user = None
    if user_id:
        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            pass  # If the user does not exist, continue without them

    # Retrieving and filtering games
    games = Game.objects.all()
    if status == 'active':
        games = games.filter(start_time__isnull=False, end_time__isnull=True)
    elif status == 'inactive':
        games = games.filter(start_time__isnull=True)

    serialized_games = filter_and_sort_queryset(games, filters, sort, page, GameSerializer, user)

    return Response(serialized_games)

@api_view(['POST'])
def get_tournaments(request):
    filters = request.data.get('filters', {})
    sort = request.data.get('sort', {})
    page = request.data.get('page', 1)
    user_id = request.data.get('user_id')
    status = request.data.get('status', 'active')

    # Attempting to retrieve the user if user_id is provided
    user = None
    if user_id:
        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            pass  # If the user does not exist, continue without them

    # Retrieving and filtering tournaments
    tournaments = Tournament.objects.all()
    if status == 'active':
        tournaments = tournaments.filter(start_time__isnull=False, end_time__isnull=True)
    elif status == 'inactive':
        tournaments = tournaments.filter(start_time__isnull=True)

    serialized_tournaments = filter_and_sort_queryset(tournaments, filters, sort, page, TournamentSerializer, user)

    return Response(serialized_tournaments)



