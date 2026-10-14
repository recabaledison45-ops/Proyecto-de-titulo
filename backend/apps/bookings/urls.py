from django.urls import path

from . import views

urlpatterns = [
    path("bookings/", views.BookingListCreateView.as_view(), name="booking-list"),
    path("bookings/<int:pk>/cancel/", views.CancelView.as_view(), name="booking-cancel"),
    path("bookings/<int:pk>/reject/", views.RejectView.as_view(), name="booking-reject"),
    path("bookings/<int:pk>/complete/", views.CompleteView.as_view(), name="booking-complete"),
    path("bookings/<int:pk>/notes/", views.NotesView.as_view(), name="booking-notes"),
    path("reports/summary/", views.ReportSummaryView.as_view(), name="report-summary"),
    path("reports/bookings.csv", views.ReportBookingsCsvView.as_view(), name="report-bookings-csv"),
    path("reports/guests.csv", views.ReportGuestsCsvView.as_view(), name="report-guests-csv"),
]
