import pytest
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.router.rate_limiter import RequestManager, SlidingWindowCounter

def test_sliding_window_counter():
    counter = SlidingWindowCounter(window_seconds=1.0)
    assert counter.current_count() == 0
    counter.add(3)
    assert counter.current_count() == 3

@pytest.mark.asyncio
async def test_request_manager_execution():
    rm = RequestManager()
    
    async def sample_op():
        await asyncio.sleep(0.01)
        return "success"

    res = await rm.execute_request("test_conn", "test_model", sample_op, max_rpm=10, safety_margin_rpm=2)
    assert res == "success"
    
    stats = rm.get_stats("test_conn")
    assert stats.current_rpm >= 1
