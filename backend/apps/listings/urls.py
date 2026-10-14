from django.urls import path

from . import views

urlpatterns = [
    path("listings/", views.ListingListCreateView.as_view(), name="listing-list"),
    path("listings/<int:pk>/", views.ListingDetailView.as_view(), name="listing-detail"),
    path("listings/<int:pk>/booked-dates/", views.BookedDatesView.as_view(), name="listing-booked-dates"),
]
