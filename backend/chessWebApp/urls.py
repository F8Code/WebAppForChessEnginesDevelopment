from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.urls import include, path

urlpatterns = [
    path('api/', include('backend.urls')),
    path('api/token/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
