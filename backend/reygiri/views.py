"""
API استعلام ریگیری
"""
import logging

from django_ratelimit.decorators import ratelimit
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .client import ReygiriError, lookup_assay, normalize_packet_number, normalize_seri

logger = logging.getLogger('reygiri')


@ratelimit(key='user', rate='10/m', method='POST', block=True)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def lookup(request):
    """
    استعلام ریگیری — Domain فقط سمت سرور تزریق می‌شود.
    Body: { packet_number, seri?, archive? }
    """
    try:
        packet_number = normalize_packet_number(request.data.get('packet_number'))
        seri = normalize_seri(request.data.get('seri', ''))
        archive_raw = request.data.get('archive', False)
        archive = archive_raw in (True, 'true', 'True', '1', 1, 'yes', 'Y', 'y')

        results = lookup_assay(
            packet_number=packet_number,
            seri=seri,
            archive=archive,
        )

        return Response(
            {
                'results': results,
                'count': len(results),
                'packet_number': packet_number,
                'seri': seri or None,
                'archive': archive,
            },
            status=status.HTTP_200_OK,
        )
    except ReygiriError as exc:
        return Response(
            {'error': exc.message},
            status=exc.status_code,
        )
    except Exception as e:
        logger.error('Unexpected error in reygiri lookup: %s', e, exc_info=True)
        return Response(
            {'error': 'خطا در استعلام ریگیری. لطفاً دوباره تلاش کنید.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
