from django.core import signing

SALT = "reservation-confirm-salt"
TOKEN_AGE_SECONDS = 60 * 60 * 24  # 1 day

def make_reservation_token(reservation_id):
    signer = signing.TimestampSigner(salt=SALT)
    return signer.sign(str(reservation_id))

def parse_reservation_token(token, max_age=TOKEN_AGE_SECONDS):
    signer = signing.TimestampSigner(salt=SALT)
    try:
        value = signer.unsign(token, max_age=max_age)
        return int(value)
    except Exception:
        return None
