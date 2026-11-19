"""Interpret a partial audio response using the public delivery rules."""

import re
from settings import SITE, config

RULES = config("audio-check")
START = RULES["rangeStart"]
END = RULES["rangeEnd"]
RANGE = f"bytes={START}-{END}"
LENGTH = END - START + 1
CONTENT_RANGE = re.compile(rf"bytes {START}-{END}/([1-9][0-9]*)")


def response_size(status, headers, byte_length):
    matched = CONTENT_RANGE.fullmatch(headers.get("content-range", ""))
    if (status != RULES["status"]
            or headers.get("content-type", "").split(";")[0].strip().lower() != RULES["contentType"]
            or not matched
            or headers.get("access-control-allow-origin") not in {SITE["siteOrigin"], "*"}
            or byte_length != LENGTH):
        return None
    size = int(matched[1])
    return size if size > END else None
