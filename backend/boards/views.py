from rest_framework import viewsets, permissions, status, mixins
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from django.db.models import Q, Max # Create complex queries
from django.db import transaction
from django.contrib.auth.models import User

from django.shortcuts import get_object_or_404
from accounts.models import Board, BoardMember, Column, Task, TaskAssignment, Tag, TaskTag, Notification
from .serializers import BoardSerializer, BoardMemberSerializer, ColumnSerializer, TaskAssigneeSerializer, TaskSerializer, TagSerializer, TaskTagAttachSerializer
from .permissions import IsBoardOwner, IsBoardMemberReadOwnerWrite

class BoardViewSet(viewsets.ModelViewSet):
    serializer_class = BoardSerializer
    permission_classes = [permissions.IsAuthenticated, IsBoardOwner]

    #GET /boards/
    #GET /boards/{id}/
    def get_queryset(self):
        user = self.request.user
        return Board.objects.filter(
            Q(owner=user) | Q(memberships__user=user)
        ).distinct().order_by('-created_at')
    
    #POST /boards/
    #PUT /boards/{id}/
    def perform_create(self, serializer):
        board = serializer.save(owner=self.request.user)
        BoardMember.objects.get_or_create(
            board=board,
            user=self.request.user,
            defaults= {"role": BoardMember.Role.OWNER}
        )

    #DELETE /boards/{id}/
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.check_object_permissions(request, instance)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

class BoardMemberViewSet(mixins.CreateModelMixin,
                         mixins.ListModelMixin,
                         mixins.UpdateModelMixin,
                         mixins.DestroyModelMixin,
                         viewsets.GenericViewSet):
    serializer_class = BoardMemberSerializer
    permission_classes = [IsBoardMemberReadOwnerWrite]
    lookup_field = 'pk'

    def get_board(self):
        if not hasattr(self, '_board'):
            board_id = self.kwargs.get('board_pk') or self.kwargs.get('board_id')
            if board_id is None:
                return None
            self._board = get_object_or_404(Board, pk=board_id)
        return self._board

    def get_queryset(self):
        board = self.get_board()
        return BoardMember.objects.select_related("user").filter(board=board).order_by("user__username")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['board'] = self.get_board()
        return ctx

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        board = self.get_board()
        username = request.data.get("username")
        role = request.data.get("role", BoardMember.Role.VIEWER)

        # ดึงข้อมูลผู้ใช้จาก username
        user = get_object_or_404(User, username=username)

        # สร้างสมาชิกใหม่
        membership, created = BoardMember.objects.get_or_create(
            board=board,
            user=user,
            defaults={"role": role}
        )

        if created:
            Notification.objects.create(
            user=membership.user,
            message=f"{request.user.username} added you to board {board.name}",
            ref_board=board,
            )

        if not created:
            membership.role = role
            membership.save(update_fields=["role"])

        serializer = self.get_serializer(membership)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        board = self.get_board()

        if instance.role == BoardMember.Role.OWNER and request.data.get("role") != BoardMember.Role.OWNER:
            owner = BoardMember.objects.filter(board=board, role=BoardMember.Role.OWNER).count()

            if owner <= 1:
                return Response({"detail": "Cannot downgrade the last owner."},
                                status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        board = self.get_board()

        if instance.role == BoardMember.Role.OWNER:
            owners = BoardMember.objects.filter(board=board, role=BoardMember.Role.OWNER).count()
            if owners <= 1:
                return Response({"detail": "Cannot remove the last owner."},
                                status=status.HTTP_400_BAD_REQUEST)

        return super().destroy(request, *args, **kwargs)
    
class ColumnViewSet(mixins.ListModelMixin,
                    mixins.CreateModelMixin,
                    mixins.RetrieveModelMixin,
                    mixins.UpdateModelMixin,
                    mixins.DestroyModelMixin,
                    viewsets.GenericViewSet):

    serializer_class = ColumnSerializer
    permission_classes = [IsAuthenticated, IsBoardMemberReadOwnerWrite]

    # Helper method
    def get_board(self):
        board_id = self.kwargs.get("board_id")
        if board_id:
            if not hasattr(self, "_board"):
                self._board = get_object_or_404(Board, pk=board_id)
            return self._board

        column_pk = self.kwargs.get("pk")
        if column_pk and not hasattr(self, "_board"):
            column = get_object_or_404(Column.objects.select_related("board"), pk=column_pk)
            self._board = column.board
        return getattr(self, "_board", None)
    
    #Helper method
    @transaction.atomic
    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request, board_id=None):
        ids = request.data.get("ids", [])
        step = 10
        for i, cid in enumerate(ids):
            Column.objects.filter(pk=cid, board_id=board_id).update(order=(i+1)*step)
        return Response(status=status.HTTP_204_NO_CONTENT)

    #GET  /api/boards/{board_id}/columns/
    def get_queryset(self):
        board = self.get_board()
        qs = Column.objects.select_related("board")
        if board is not None:
            qs = qs.filter(board=board)
        return qs.order_by("order", "id")

    # /api/columns/{pk}/
    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["board"] = self.get_board()
        return ctx

    # POST /api/boards/{board_id}/columns/
    @transaction.atomic
    def perform_create(self, serializer):
        board = self.get_board()
        last = Column.objects.filter(board=board).aggregate(m=Max("order"))["m"] or 0
        serializer.save(board=board, order=last + 10)

class TaskViewSet(mixins.ListModelMixin,
                  mixins.CreateModelMixin,
                  mixins.RetrieveModelMixin,
                  mixins.UpdateModelMixin,
                  mixins.DestroyModelMixin,
                  viewsets.GenericViewSet):

    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, IsBoardMemberReadOwnerWrite]


    # Helper method
    # POST columns/{column_id}/tasks/reorder/
    @transaction.atomic
    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request, column_id=None):
        column = self.get_column()
        ids = request.data.get('ids',[])
        step = 10

        for i, tid in enumerate(ids):
            Task.objects.filter(pk = tid, column = column).update(order=(i+1)*step)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    # Helper method
    # POST /tasks/{pk}/move/
    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="move")
    def move(self, request, pk=None):
        task = self.get_object()
        dest_col = request.data.get("column_id") or task.column_id
        before = request.data.get("before_id")
        after = request.data.get("after_id")

        if before:
            before_order = Task.objects.get(pk=before).order
            after_order = Task.objects.filter(column_id=dest_col, order__lt=before_order).order_by("-order").values_list("order", flat=True).first() or 0
            new_order = (before_order + after_order)//2
        elif after:
            after_order = Task.objects.get(pk=after).order
            before_order = Task.objects.filter(column_id=dest_col, order__gt=after_order).order_by("order").values_list("order", flat=True).first() or (after_order+20)
            new_order = (before_order + after_order)//2
        else:
            last = Task.objects.filter(column_id=dest_col).aggregate(m=Max("order"))["m"] or 0
            new_order = last + 10

        task.column_id = dest_col
        task.order = new_order
        task.save(update_fields=["column_id", "order"])
        return Response(status=status.HTTP_204_NO_CONTENT)



    def get_column(self):
        column = self.kwargs.get("column_id")
        if column is None:
            return None
        if not hasattr(self, "_column"):
            self._column = get_object_or_404(Column.objects.select_related("board"), pk=column)
        return self._column

    def get_board(self):
        column = self.get_column()
        if column is not None:
            return column.board
        task_id = self.kwargs.get("pk")
        if task_id and not hasattr(self, "_board"):
            task = get_object_or_404(
                Task.objects.select_related("column__board"), pk=task_id
            )
            self._board = task.column.board
        return getattr(self, "_board", None)

    def get_queryset(self):
        qs = Task.objects.select_related("column", "column__board").prefetch_related("assignees")  # เพิ่ม prefetch_related("assignees")
        column = self.get_column()
        if column is not None:
            qs = qs.filter(column=column)
        return qs.order_by("order", "id")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["column"] = self.get_column()
        ctx["board"] = self.get_board()  # เพิ่มบรรทัดนี้
        return ctx

    @transaction.atomic
    def perform_create(self, serializer):
        column = self.get_column()
        last = Task.objects.filter(column=column).aggregate(m=Max("order"))["m"] or 0
        serializer.save(column=column, order=last + 10, created_by=self.request.user)

class TaskAssigneeViewSet(mixins.CreateModelMixin,
                         mixins.ListModelMixin,
                         mixins.DestroyModelMixin,
                         viewsets.GenericViewSet):
   
    serializer_class = TaskAssigneeSerializer
    permission_classes = [IsAuthenticated, IsBoardMemberReadOwnerWrite]

    # Helper method
    def get_task(self):
        if not hasattr(self, "_task"):
            self._task = get_object_or_404(Task.objects.select_related("column__board"),
                                            pk=self.kwargs["task_id"])
        return self._task

    def get_board(self):
        task = self.get_task()
        return task.column.board

    # GET /api/tasks/{task_id}/assignees/
    def get_queryset(self):
        task = self.get_task()
        return TaskAssignment.objects.filter(task=task).order_by("user__username")
    
    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["task"] = self.get_task()
        ctx["board"] = self.get_board()  # ใช้ get_board ที่เพิ่มเข้ามา
        return ctx

    def destroy(self, request, *args, **kwargs):
        task = self.get_task()
        user_id = kwargs["pk"]
        assignment = get_object_or_404(TaskAssignment, task=task, user_id=user_id)
        self.check_object_permissions(request, assignment) 
        assignment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    


class TagViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated, IsBoardMemberReadOwnerWrite]

    # Helper method
    def get_board(self):
        return get_object_or_404(
            Board, pk=self.kwargs['board_id']
        )

    # Get all tags for the board
    def get_queryset(self):
        return Tag.objects.filter(
            board=self.get_board()
        ).order_by("name")
    
    # POST /api/boards/{board_id}/tags/
    def perform_create(self, serializer):
        serializer.save(board=self.get_board())
    

class TaskTagViewSet(mixins.ListModelMixin,
                     mixins.CreateModelMixin,
                     mixins.DestroyModelMixin,
                     viewsets.GenericViewSet):
    
    serializer_class = TaskTagAttachSerializer
    permission_classes = [IsAuthenticated, IsBoardMemberReadOwnerWrite]

    # Helper method - เพิ่มเมธอดนี้
    def get_board(self):
        task = self.get_task()
        return task.column.board if task else None

    # GET /api/tasks/tags/
    def get_task(self):
        try:
            return get_object_or_404(
                Task.objects.select_related("column__board"),
                pk=self.kwargs["task_id"]
            )
        except Exception as e:
            # Log error หรือจัดการอย่างเหมาะสม
            print(f"Error getting task: {e}")
            raise

    # GET /api/tasks/{task_id}/tags/
    def get_queryset(self):
        try:
            task = self.get_task()
            self.check_object_permissions(self.request, task.column.board)
            return Tag.objects.filter(tagged_tasks__task=task).order_by("name")
        except Exception as e:
            print(f"Error in get_queryset: {e}")
            return Tag.objects.none()
    
    def get_serializer_class(self):
        return TagSerializer if self.action == "list" else TaskTagAttachSerializer
    
    def create(self, request, *args, **kwargs):
        task = self.get_task()
        tag_id = request.data.get("tag_id")
        tag = get_object_or_404(
            Tag, pk=tag_id, board=task.column.board
        )
        TaskTag.objects.get_or_create(task=task, tag=tag)

        return Response(status=status.HTTP_204_NO_CONTENT)
    
    def destroy(self, request, *args, **kwargs):
        task = self.get_task()
        tag_id = kwargs["pk"]
        TaskTag.objects.filter(task=task, tag_id=tag_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)