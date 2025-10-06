from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, CurrentUserView, RoomViewSet, ReservationViewSet,
    reservation_confirm, dashboard_stats, activity_feed, user_profile,
    AdminRoomViewSet, check_admin_status, create_recurring_reservation,
    preview_recurring_reservation, generate_reservation_qr, check_in_reservation
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'reservations', ReservationViewSet, basename='reservation')
router.register(r'admin/rooms', AdminRoomViewSet, basename='admin-room')

urlpatterns = [
    # Authentication
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='current_user'),

    # Reservations
    path('reservations/confirm/', reservation_confirm, name='reservation-confirm'),
    path('reservations/recurring/', create_recurring_reservation, name='recurring-reservation'),
    path('reservations/recurring/preview/', preview_recurring_reservation, name='recurring-preview'),
    path('reservations/<int:reservation_id>/qr/', generate_reservation_qr, name='reservation-qr'),
    path('reservations/<int:reservation_id>/check-in/', check_in_reservation, name='reservation-check-in'),

    # Statistics & Dashboard
    path('stats/dashboard/', dashboard_stats, name='dashboard-stats'),

    # Activity Feed
    path('activity/feed/', activity_feed, name='activity-feed'),

    # User Profile
    path('profile/', user_profile, name='user-profile'),

    # Admin
    path('admin/check/', check_admin_status, name='admin-check'),

    # Router URLs (rooms, reservations viewsets)
    path('', include(router.urls)),
]
