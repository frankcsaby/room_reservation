from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, CurrentUserView, RoomViewSet, ReservationViewSet,
    reservation_confirm, dashboard_stats, activity_feed, user_profile
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'reservations', ReservationViewSet, basename='reservation')

urlpatterns = [
    # Authentication
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='current_user'),

    # Reservations
    path('reservations/confirm/', reservation_confirm, name='reservation-confirm'),

    # Statistics & Dashboard
    path('stats/dashboard/', dashboard_stats, name='dashboard-stats'),

    # Activity Feed
    path('activity/feed/', activity_feed, name='activity-feed'),

    # User Profile
    path('profile/', user_profile, name='user-profile'),

    # Router URLs (rooms, reservations viewsets)
    path('', include(router.urls)),
]
