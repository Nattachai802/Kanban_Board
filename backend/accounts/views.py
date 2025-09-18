from rest_framework import generics, permissions
from .serializers import NotificationSerializer, RegSerializer
from django.contrib.auth.models import User

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegSerializer
    permission_classes = [permissions.AllowAny]

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.notifications.order_by("-created_at")