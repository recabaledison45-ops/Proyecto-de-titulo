from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsHost(BasePermission):
    message = "Solo los anfitriones pueden realizar esta acción."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == "host")


class IsHostOrStaff(BasePermission):
    message = "Solo anfitriones o administradores."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.role == "host" or user.is_staff))


class IsOwnerOrReadOnly(BasePermission):
    """El objeto debe tener un atributo `host`."""

    message = "Solo el dueño puede modificar este recurso."

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.host_id == request.user.id
