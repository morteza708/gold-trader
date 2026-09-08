"""
تولید کلیدهای VAPID برای Web Push (فرمت سازگار با pywebpush و PushManager)
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Generate VAPID public/private keys for Web Push'

    def handle(self, *args, **options):
        try:
            from cryptography.hazmat.primitives.asymmetric import ec
            from cryptography.hazmat.primitives import serialization
            from py_vapid.utils import b64urlencode
        except ImportError as e:
            raise SystemExit('نیاز به pywebpush: pip install pywebpush') from e

        private_key = ec.generate_private_key(ec.SECP256R1())
        public_key = private_key.public_key()

        public_raw = public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint,
        )
        private_raw = private_key.private_numbers().private_value.to_bytes(32, 'big')

        public_b64 = b64urlencode(public_raw)
        private_b64 = b64urlencode(private_raw)

        self.stdout.write(self.style.SUCCESS('این مقادیر را در .env سرور بگذارید:\n'))
        self.stdout.write(f'VAPID_PUBLIC_KEY={public_b64}')
        self.stdout.write(f'VAPID_PRIVATE_KEY={private_b64}')
        self.stdout.write('VAPID_CLAIM_EMAIL=mailto:admin@opalbox.ir')
        self.stdout.write('')
        self.stdout.write(
            'کلید عمومی در مرورگر برای subscribe و کلید خصوصی فقط روی سرور استفاده می‌شود.'
        )
