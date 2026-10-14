from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import SAFE_METHODS, AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import selectors, services
from .serializers import ReviewCreateSerializer, ReviewSerializer


class ReviewListCreateView(APIView):
    def get_permissions(self):
        return [AllowAny()] if self.request.method in SAFE_METHODS else [IsAuthenticated()]

    def get(self, request):
        listing_id = request.query_params.get("listing")
        if not listing_id or not listing_id.isdigit():
            raise ValidationError({"listing": ["Indique el id de la oferta."]})
        return Response(ReviewSerializer(selectors.published_for_listing(int(listing_id)), many=True).data)

    def post(self, request):
        data = ReviewCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        d = data.validated_data
        review = services.create_review(author=request.user, booking_id=d["booking"], rating=d["rating"],
                                        comment=d["comment"])
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)
