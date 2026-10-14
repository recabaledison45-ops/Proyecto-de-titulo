from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.permissions import IsHost, IsOwnerOrReadOnly

from . import selectors, services
from .models import Listing
from .serializers import (ListingDetailSerializer, ListingListSerializer, ListingWriteSerializer,
                          SearchParamsSerializer)


class ListingListCreateView(ListAPIView):
    serializer_class = ListingListSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsHost()]
        if self.request.query_params.get("mine"):
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_queryset(self):
        params = SearchParamsSerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        return selectors.search_listings(params.validated_data, self.request.user)

    def post(self, request):
        serializer = ListingWriteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        listing = services.create_listing(host=request.user, data=serializer.validated_data)
        return Response(ListingWriteSerializer(listing, context={"request": request}).data,
                        status=status.HTTP_201_CREATED)


class ListingDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsOwnerOrReadOnly]
    http_method_names = ["get", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return selectors.annotated_listings()

    def get_object(self):
        listing = get_object_or_404(self.get_queryset(), pk=self.kwargs["pk"])
        user = self.request.user
        if not listing.is_active and not (user.is_authenticated and (user.is_staff or listing.host_id == user.id)):
            from rest_framework.exceptions import NotFound
            raise NotFound()
        self.check_object_permissions(self.request, listing)
        return listing

    def get_serializer_class(self):
        return ListingWriteSerializer if self.request.method in ("PUT", "PATCH") else ListingDetailSerializer

    def update(self, request, *args, **kwargs):
        listing = self.get_object()
        serializer = ListingWriteSerializer(listing, data=request.data, partial=kwargs.get("partial", False),
                                            context={"request": request})
        serializer.is_valid(raise_exception=True)
        services.update_listing(listing=listing, data=serializer.validated_data)
        return Response(ListingWriteSerializer(listing, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        services.deactivate_listing(listing=self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)


class BookedDatesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk, is_active=True)
        return Response({"mode": listing.booking_mode, "capacity": listing.max_guests,
                         "occupied": selectors.booked_dates(listing)})
