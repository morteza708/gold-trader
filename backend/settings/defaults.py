"""مقادیر پیش‌فرض مشترک بین models و migrations"""


def default_support_hours():
    return {
        'sat': {'enabled': True, 'start': '09:00', 'end': '18:00'},
        'sun': {'enabled': True, 'start': '09:00', 'end': '18:00'},
        'mon': {'enabled': True, 'start': '09:00', 'end': '18:00'},
        'tue': {'enabled': True, 'start': '09:00', 'end': '18:00'},
        'wed': {'enabled': True, 'start': '09:00', 'end': '18:00'},
        'thu': {'enabled': True, 'start': '09:00', 'end': '13:00'},
        'fri': {'enabled': False, 'start': '09:00', 'end': '18:00'},
    }
