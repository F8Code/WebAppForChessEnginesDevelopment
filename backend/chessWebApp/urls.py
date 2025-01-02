from backend.views.authorization_views import RateLimitedTokenObtainPairView, RateLimitedTokenRefreshView
from django.urls import include, path

urlpatterns = [
    path('api/', include('backend.urls')),
    path('api/token/login/', RateLimitedTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', RateLimitedTokenRefreshView.as_view(), name='token_refresh'),
]
