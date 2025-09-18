from rest_framework import serializers
from accounts.models import Board , BoardMember , Column, Task, TaskAssignment, Tag
from django.contrib.auth.models import User


class BoardSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')

    class Meta:
        model = Board
        fields = ["id", "name", "owner", "created_at"]
        read_only_fields = ["id", "owner", "created_at"]
    

class UserLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]

class ColumnSerializer(serializers.ModelSerializer):
    board = serializers.ReadOnlyField(source="board.id")

    class Meta:
        model = Column
        fields = ["id", "board", "name", "order"]
        read_only_fields = ["id", "board", "order"]


class BoardMemberSerializer(serializers.ModelSerializer):
    user = UserLiteSerializer(read_only=True)
    username = serializers.CharField(write_only=True, required=True)
    role = serializers.ChoiceField(choices=BoardMember.Role.choices)

    class Meta:
        model = BoardMember
        fields = ["id", "board", "user", "username", "role", "joined_at"]
        read_only_fields = ["id", "user", "joined_at"]
    
    def validate_username(self, value):
        try:
            user = User.objects.get(username=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this username does not exist.")
        self._invited_user = user
        return user
    
    def update(self, instance, validated_data):
       instance.role = validated_data["role"]
       instance.save(update_fields=['role'])
       return instance

class TaskSerializer(serializers.ModelSerializer):
    column = serializers.ReadOnlyField(source="column.id")
    assignees = UserLiteSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = ["id", "column", "title", "description", "order", "created_at", "assignees"]
        read_only_fields = ["id", "column", "order", "created_at", "assignees"]

class TaskAssigneeSerializer(serializers.ModelSerializer):
    user = UserLiteSerializer(read_only=True)
    username = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = TaskAssignment
        fields = ["id", "user", "username", "assigned_at"]
        read_only_fields = ["id", "user", "assigned_at"]
    
    def validate_username(self, value):
        try:
            self._assignee = User.objects.get(username=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")
        
        return value

    def validate(self, attrs):
        task : Task = self.context['task']
        assignee = getattr(self, '_assignee', None)
        board = task.column.board

        if not (board.owner_id == assignee.id or
                board.memberships.filter(user=assignee).exists()):
            raise serializers.ValidationError("User is not a member of this board.")
        return attrs
    
    def create(self, validated_data):
        task: Task = self.context["task"]
        user = self._assignee
        assignment, _ = TaskAssignment.objects.get_or_create(task=task, user=user)
        return assignment


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name", "color"]
    
class TaskTagAttachSerializer(serializers.Serializer):
    tag_id = serializers.IntegerField()