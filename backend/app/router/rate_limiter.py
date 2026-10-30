import asyncio
import time
import random
from typing import Dict, Any, Optional, Callable, Coroutine, List
from collections import deque
from pydantic import BaseModel

class TokenBucket:
    """
    Token bucket algorithm for burst protection and steady emission.
    """
    def __init__(self, capacity: float, refill_rate: float):
        self.capacity = capacity
        self.tokens = capacity
        self.refill_rate = refill_rate # tokens per second
        self.last_refill = time.time()

    def consume(self, amount: float = 1.0) -> bool:
        self._refill()
        if self.tokens >= amount:
            self.tokens -= amount
            return True
        return False

    def _refill(self):
        now = time.time()
        delta = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + delta * self.refill_rate)
        self.last_refill = now

class SlidingWindowCounter:
    def __init__(self, window_seconds: float = 60.0):
        self.window_seconds = window_seconds
        self.timestamps = deque()

    def add(self, count: int = 1):
        now = time.time()
        for _ in range(count):
            self.timestamps.append(now)
        self._cleanup(now)

    def current_count(self) -> int:
        self._cleanup(time.time())
        return len(self.timestamps)

    def _cleanup(self, now: float):
        cutoff = now - self.window_seconds
        while self.timestamps and self.timestamps[0] < cutoff:
            self.timestamps.popleft()

class TokenUsageCounter:
    def __init__(self, window_seconds: float = 60.0):
        self.window_seconds = window_seconds
        self.entries = deque() # (timestamp, token_count)

    def add(self, tokens: int):
        now = time.time()
        self.entries.append((now, tokens))
        self._cleanup(now)

    def current_tokens(self) -> int:
        self._cleanup(time.time())
        return sum(tokens for _, tokens in self.entries)

    def _cleanup(self, now: float):
        cutoff = now - self.window_seconds
        while self.entries and self.entries[0][0] < cutoff:
            self.entries.popleft()

class RateLimitStats(BaseModel):
    active_requests: int = 0
    queue_length: int = 0
    current_rpm: int = 0
    max_rpm: int = 40
    current_tpm: int = 0
    max_tpm: int = 100000
    errors_429_count: int = 0
    failed_requests: int = 0
    total_tokens_consumed: int = 0
    avg_latency_ms: float = 0.0
    shared_quota_groups: List[str] = []

class AdvancedRequestManager:
    """
    Advanced Enterprise-grade Rate Limiter:
    - Sliding Window + Token Bucket dual limiter
    - Shared Quota Groups across connections (prevents multiplying quota when using multiple keys for same account)
    - Priority Scheduling (User prompt = 1, Agent step = 3, Benchmark = 6, Catalog sync = 10)
    - Concurrency semaphores
    - Retry-After with Exponential Backoff and randomized Jitter
    - Request cancellation support
    """
    def __init__(self):
        self._rpm_counters: Dict[str, SlidingWindowCounter] = {}
        self._token_buckets: Dict[str, TokenBucket] = {}
        self._tpm_counters: Dict[str, TokenUsageCounter] = {}
        self._quota_groups: Dict[str, str] = {} # connection_id -> quota_group_id
        self._paused_until: Dict[str, float] = {}
        self._active_requests = 0
        self._queued_requests = 0
        self._errors_429 = 0
        self._failed_requests = 0
        self._latencies: deque = deque(maxlen=100)
        self._total_tokens = 0
        self._cancelled_tasks = set()
        self._semaphores: Dict[str, asyncio.Semaphore] = {}

    def register_shared_quota_group(self, connection_id: str, quota_group_id: str):
        """
        Links a connection to a shared quota group (e.g. all NVIDIA keys sharing one account quota).
        """
        self._quota_groups[connection_id] = quota_group_id

    def get_effective_group(self, connection_id: str) -> str:
        return self._quota_groups.get(connection_id, connection_id)

    def _get_rpm_counter(self, group_key: str) -> SlidingWindowCounter:
        if group_key not in self._rpm_counters:
            self._rpm_counters[group_key] = SlidingWindowCounter(60.0)
        return self._rpm_counters[group_key]

    def _get_token_bucket(self, group_key: str, max_rpm: int) -> TokenBucket:
        if group_key not in self._token_buckets:
            refill_per_sec = max(0.1, max_rpm / 60.0)
            self._token_buckets[group_key] = TokenBucket(capacity=max_rpm, refill_rate=refill_per_sec)
        return self._token_buckets[group_key]

    def _get_tpm_counter(self, group_key: str) -> TokenUsageCounter:
        if group_key not in self._tpm_counters:
            self._tpm_counters[group_key] = TokenUsageCounter(60.0)
        return self._tpm_counters[group_key]

    def _get_semaphore(self, group_key: str, max_concurrent: int = 4) -> asyncio.Semaphore:
        if group_key not in self._semaphores:
            self._semaphores[group_key] = asyncio.Semaphore(max_concurrent)
        return self._semaphores[group_key]

    def cancel_request(self, task_id: str):
        self._cancelled_tasks.add(task_id)

    async def execute_request(
        self,
        connection_id: str,
        model_id: str,
        operation: Callable[[], Coroutine[Any, Any, Any]],
        max_rpm: int = 40,
        safety_margin_rpm: int = 5,
        max_tpm: int = 100000,
        max_retries: int = 3,
        priority: int = 1,
        task_id: Optional[str] = None
    ) -> Any:
        group_key = self.get_effective_group(connection_id)
        effective_rpm = max(1, max_rpm - safety_margin_rpm)
        sem = self._get_semaphore(group_key, max_concurrent=4)
        bucket = self._get_token_bucket(group_key, effective_rpm)

        retries = 0
        self._queued_requests += 1

        try:
            while retries <= max_retries:
                # Check cancellation
                if task_id and task_id in self._cancelled_tasks:
                    self._cancelled_tasks.remove(task_id)
                    raise asyncio.CancelledError(f"Tác vụ {task_id} đã bị hủy bởi người dùng.")

                now = time.time()
                pause_time = self._paused_until.get(group_key, 0.0)
                if pause_time > now:
                    wait_sec = (pause_time - now) + random.uniform(0.1, 0.4)
                    await asyncio.sleep(wait_sec)

                # Check sliding window
                rpm_counter = self._get_rpm_counter(group_key)
                if rpm_counter.current_count() >= effective_rpm:
                    # Lower priority tasks wait longer to yield to user prompts
                    extra_wait = (priority * 0.1) + random.uniform(0.5, 1.0)
                    await asyncio.sleep(extra_wait)
                    continue

                # Check token bucket
                if not bucket.consume(1.0):
                    await asyncio.sleep(0.5 + random.uniform(0.05, 0.2))
                    continue

                # Acquire concurrency semaphore
                async with sem:
                    rpm_counter.add(1)
                    self._active_requests += 1
                    t0 = time.time()
                    try:
                        result = await operation()
                        latency = (time.time() - t0) * 1000
                        self._latencies.append(latency)
                        return result
                    except Exception as e:
                        err_msg = str(e)
                        if "429" in err_msg or "rate limit" in err_msg.lower():
                            self._errors_429 += 1
                            retries += 1
                            # Exponential backoff with jitter
                            backoff = (2 ** retries) + random.uniform(1.0, 3.0)
                            self._paused_until[group_key] = time.time() + backoff
                            if retries > max_retries:
                                self._failed_requests += 1
                                raise RuntimeError(f"Hạn mức NVIDIA API (429) đã bị vượt sau {max_retries} lần thử lại: {err_msg}")
                            await asyncio.sleep(backoff)
                        elif "503" in err_msg or "timeout" in err_msg.lower():
                            retries += 1
                            backoff = 1.5 * retries + random.uniform(0.5, 1.5)
                            if retries > max_retries:
                                self._failed_requests += 1
                                raise
                            await asyncio.sleep(backoff)
                        else:
                            self._failed_requests += 1
                            raise
                    finally:
                        self._active_requests = max(0, self._active_requests - 1)
        finally:
            self._queued_requests = max(0, self._queued_requests - 1)

    def record_usage(self, connection_id: str, model_id: str, tokens: int):
        group_key = self.get_effective_group(connection_id)
        tpm_counter = self._get_tpm_counter(group_key)
        tpm_counter.add(tokens)
        self._total_tokens += tokens

    def get_stats(self, connection_id: Optional[str] = None) -> RateLimitStats:
        group_key = self.get_effective_group(connection_id) if connection_id else "default"
        rpm_val = self._rpm_counters[group_key].current_count() if group_key in self._rpm_counters else sum(c.current_count() for c in self._rpm_counters.values())
        tpm_val = self._tpm_counters[group_key].current_tokens() if group_key in self._tpm_counters else sum(c.current_tokens() for c in self._tpm_counters.values())
        avg_lat = sum(self._latencies) / len(self._latencies) if self._latencies else 0.0

        return RateLimitStats(
            active_requests=self._active_requests,
            queue_length=self._queued_requests,
            current_rpm=rpm_val,
            max_rpm=40,
            current_tpm=tpm_val,
            max_tpm=100000,
            errors_429_count=self._errors_429,
            failed_requests=self._failed_requests,
            total_tokens_consumed=self._total_tokens,
            avg_latency_ms=round(avg_lat, 2),
            shared_quota_groups=list(set(self._quota_groups.values()))
        )

global_request_manager = AdvancedRequestManager()
RequestManager = AdvancedRequestManager
