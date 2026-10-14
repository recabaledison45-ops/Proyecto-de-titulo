from .models import Review


def published_for_listing(listing_id, limit=100):
    """Reseñas publicadas de huéspedes sobre la oferta (las del anfitrión al huésped no se muestran en la ficha)."""
    return (
        Review.objects.filter(booking__listing_id=listing_id, is_published=True, author_role=Review.AuthorRole.GUEST)
        .select_related("author")[:limit]
    )
