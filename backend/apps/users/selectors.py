from .models import User


def email_in_use(email, exclude_id=None):
    qs = User.objects.filter(email__iexact=email)
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    return qs.exists()
