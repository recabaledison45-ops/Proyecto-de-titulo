from django.urls import path

from . import views

urlpatterns = [
    path("payments/", views.PaymentCreateView.as_view(), name="payment-create"),
    path("payments/<int:pk>/confirm/", views.PaymentConfirmView.as_view(), name="payment-confirm"),
    path("bookings/<int:pk>/payment-info/", views.PaymentInfoView.as_view(), name="booking-payment-info"),
]
