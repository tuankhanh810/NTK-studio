import pytest
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.router.rate_limiter import AdvancedRequestManager, TokenBucket

def test_token_bucket():
    tb = TokenBucket(capacity=2.0, refill_rate=1.0)
    assert tb.consume(1.0) is True
    assert tb.consume(1.0) is True
    assert tb.consume(1.0) is False # exhausted

@pytest.mark.asyncio
async def test_shared_quota_groups():
    rm = AdvancedRequestManager()
    
    # 2 different connections sharing the same quota pool
    rm.register_shared_quota_group("conn_key_1", "nvidia_account_shared")
    rm.register_shared_quota_group("conn_key_2", "nvidia_account_shared")

    assert rm.get_effective_group("conn_key_1") == "nvidia_account_shared"
    assert rm.get_effective_group("conn_key_2") == "nvidia_account_shared"

    async def op():
        return 42

    res1 = await rm.execute_request("conn_key_1", "model_a", op, max_rpm=10, safety_margin_rpm=1)
    res2 = await rm.execute_request("conn_key_2", "model_b", op, max_rpm=10, safety_margin_rpm=1)
    assert res1 == 42
    assert res2 == 42

    # Both requests were counted towards the shared group
    stats = rm.get_stats("conn_key_1")
    assert stats.current_rpm >= 2
