"""Validate per-contact list results without counting deferred contacts as members."""
def parse_results(output, requested):
    verified, deferred = set(), set()
    for line in output.splitlines():
        if not line.strip():
            continue
        status, contact_id = line.split("\t", 1)
        if contact_id not in requested or contact_id in verified | deferred:
            raise ValueError("Unexpected or duplicate list result")
        if status == "verified":
            verified.add(contact_id)
        elif status == "deferred":
            deferred.add(contact_id)
        else:
            raise ValueError("Unknown list result")
    if verified | deferred != set(requested):
        raise ValueError("Incomplete list readback")
    return verified, deferred
