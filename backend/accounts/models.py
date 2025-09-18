from django.conf import settings
from django.db import models
from django.utils import timezone

class Board(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owner_boards"
    )
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True , null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [models.Index(fields=["owner"])]

    def __str__(self):
        return self.name


class BoardMember(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        EDITOR = "editor", "Editor"
        VIEWER = "viewer", "Viewer"
    
    board = models.ForeignKey(
        Board, on_delete=models.CASCADE, related_name="memberships"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="board_memberships"
    )

    role = models.CharField(max_length=12, choices=Role.choices, default=Role.VIEWER)
    joined_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = (("board", "user"),)
        indexes = [
            models.Index(fields=["board", "user"]),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.board.name} ({self.role})"

class Column(models.Model):
    board = models.ForeignKey(
        Board, on_delete=models.CASCADE, related_name="columns"
    )
    name = models.CharField(max_length=120)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        indexes = [
            models.Index(fields=["board", "order"]),
        ]

    def __str__(self):
        return f"{self.name} [{self.board}]"


class Task(models.Model):
    column = models.ForeignKey(
        Column, on_delete=models.CASCADE, related_name="tasks"
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_tasks"
    )

    assignees = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="TaskAssignment",
        related_name="assigned_tasks",
        blank=True
    )

    class Meta:
        ordering = ["order", "id"]
        indexes = [
            models.Index(fields=["column", "order"]),
        ]

    def __str__(self):
        return self.title

class TaskAssignment(models.Model):
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="assignments"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="task_assignments"
    )
    assigned_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = (("task","user"))
        indexes = [
            models.Index(
                fields = ["task", "user"]
            )
        ]
    
    def __str__(self):
        return f"{self.user} -> {self.task}"
    
class Tag(models.Model):
    board = models.ForeignKey(
        Board, on_delete=models.CASCADE, related_name="tags"
    )

    name = models.CharField(max_length=50)
    color = models.CharField(max_length=16 , null=True, default='#FFFFFF')

    class Meta:
        unique_together = (("board", "name"),)
        indexes = [
            models.Index(fields=["board", "name"]),
        ]

    def __str__(self):
        return f"{self.name} [{self.board}]"
    
class TaskTag(models.Model):
    task = models.ForeignKey(
        Task, on_delete= models.CASCADE, related_name="task_tags"
    )

    tag = models.ForeignKey(
        Tag, on_delete=models.CASCADE, related_name="tagged_tasks"
    )

    class Meta:
        unique_together = (("task", "tag"),)
        indexes = [
            models.Index(fields=["task", "tag"]),
        ]
    
    def __str__(self):
        return f"{self.tag.name} -> {self.task.title}"



class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             on_delete=models.CASCADE,
                             related_name="notifications")
    message = models.CharField(max_length=255)
    ref_board = models.ForeignKey(Board, null=True, blank=True, on_delete=models.CASCADE)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    @property
    def is_read(self):
        return self.read_at is not None