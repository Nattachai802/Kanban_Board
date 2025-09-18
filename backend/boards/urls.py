from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BoardViewSet,BoardMemberViewSet, ColumnViewSet, TaskAssigneeViewSet, TaskViewSet, TagViewSet, TaskTagViewSet

router = DefaultRouter()
router.register(r"boards", BoardViewSet, basename="board")

member_list = BoardMemberViewSet.as_view({"get": "list", "post": "create"})
member_detail = BoardMemberViewSet.as_view({"patch": "partial_update", "delete": "destroy"})

column_list = ColumnViewSet.as_view({"get": "list", "post": "create"})
column_detail = ColumnViewSet.as_view({
    "get": "retrieve", "patch": "partial_update", "delete": "destroy"
})

task_list = TaskViewSet.as_view({"get": "list", "post": "create"})
task_detail = TaskViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"})

assignee_list = TaskAssigneeViewSet.as_view({"get": "list", "post": "create"})
assignee_delete = TaskAssigneeViewSet.as_view({"delete": "destroy"})
    
task_reorder = TaskViewSet.as_view({"post": "reorder"})
task_move = TaskViewSet.as_view({"post": "move"})
column_reorder = ColumnViewSet.as_view({"post": "reorder"})

tag_list = TagViewSet.as_view({"get":"list","post":"create"})
task_tag_list = TaskTagViewSet.as_view({"get":"list","post":"create"})
task_tag_delete = TaskTagViewSet.as_view({"delete":"destroy"})


urlpatterns = [
    *router.urls,
    path("boards/<int:board_id>/members/", member_list, name="board-member-list"),
    path("boards/<int:board_id>/members/<int:pk>/", member_detail, name="board-member-detail"),
    
    path("columns/<int:pk>/", column_detail, name="column-detail"),
    path("boards/<int:board_id>/columns/", column_list, name="column-list"),
    
    path("columns/<int:column_id>/tasks/", task_list, name="task-list"),
    path("tasks/<int:pk>/", task_detail, name="task-detail"),

    path("tasks/<int:task_id>/assignees/", assignee_list, name="task-assignee-list"),
    path("tasks/<int:task_id>/assignees/<int:pk>/", assignee_delete, name="task-assignee-delete"),

    path("columns/<int:column_id>/tasks/reorder/", task_reorder, name="task-reorder"),
    path("tasks/<int:pk>/move/", task_move, name="task-move"),
    path("boards/<int:board_id>/columns/reorder/", column_reorder, name="column-reorder"),

    path("boards/<int:board_id>/tags/", tag_list, name="board-tag-list"),
    path("tasks/<int:task_id>/tags/", task_tag_list, name="task-tag-list"),
    path("tasks/<int:task_id>/tags/<int:pk>/", task_tag_delete, name="task-tag-delete"),

]
