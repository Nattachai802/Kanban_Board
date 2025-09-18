from rest_framework.permissions import BasePermission , SAFE_METHODS
from accounts.models import BoardMember

class IsBoardOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.owner_id == request.user.id

class IsBoardMemberReadOwnerWrite(BasePermission):
    def has_permission(self, request, view):
        board = view.get_board()
        if board is None:
            return False
        if request.method in SAFE_METHODS:
            return board.memberships.filter(user=request.user).exists() or board.owner_id == request.user.id
        return board.owner_id == request.user.id
    
class IsBoardMemberReadOwnerWrite(BasePermission):
    def has_permission(self, request, view):
        board = view.get_board()
        if board is None:
            return False

        membership = board.memberships.filter(user=request.user).first()
        if request.method in SAFE_METHODS:
            return membership is not None or board.owner_id == request.user.id

        if board.owner_id == request.user.id:
            return True
        return membership is not None and membership.role in (
            BoardMember.Role.OWNER,
            BoardMember.Role.EDITOR,
        )
    
    def has_object_permission(self, request, view, obj):
        board = obj.board
        if request.method in SAFE_METHODS:
            return (board.owner_id == request.user.id or 
                    board.memberships.filter(user=request.user).exists())
        return board.owner_id == request.user.id


