from .models import Payment


def get_payment(pk):
    return Payment.objects.select_related("booking", "booking__listing", "booking__listing__host").get(pk=pk)
