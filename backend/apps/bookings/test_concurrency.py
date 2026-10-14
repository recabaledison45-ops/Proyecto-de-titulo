"""Prueba de concurrencia real: requiere PostgreSQL (select_for_update no bloquea en SQLite)."""
import threading
from unittest import skipUnless

from django.db import connection, connections
from django.test import TransactionTestCase

from apps.bookings.models import Booking
from apps.bookings.services import create_booking
from rest_framework.exceptions import APIException
from shared.testing import day, make_listing, make_user


@skipUnless(connection.vendor == "postgresql", "La concurrencia solo se prueba sobre PostgreSQL (DB_ENGINE=postgres).")
class ConcurrentBookingTests(TransactionTestCase):
    def test_simultaneous_requests_for_same_dates_create_only_one_booking(self):
        host = make_user("anfitrion", "host")
        listing = make_listing(host)
        guests = [make_user(f"g{i}", "guest") for i in range(8)]
        results, barrier = [], threading.Barrier(len(guests))

        def attempt(user):
            try:
                barrier.wait()
                create_booking(guest=user, listing_id=listing.pk, check_in=day(5), check_out=day(7), guests=1)
                results.append("ok")
            except APIException as exc:
                results.append(exc.status_code)
            finally:
                connections.close_all()

        threads = [threading.Thread(target=attempt, args=(g,)) for g in guests]
        [t.start() for t in threads]
        [t.join() for t in threads]
        self.assertEqual(results.count("ok"), 1)
        self.assertEqual(results.count(409), len(guests) - 1)
        self.assertEqual(Booking.objects.count(), 1)
