from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/rooms/(?P<room_id>\d+)/$', consumers.RoomConsumer.as_asgi()),
    re_path(r'ws/rooms/overview/$', consumers.RoomsOverviewConsumer.as_asgi()),
]
