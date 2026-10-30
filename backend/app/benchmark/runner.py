import time
import json
import asyncio
from typing import Dict, Any, List, Optional
from app.providers.base_adapter import BaseModelAdapter, ChatMessage, GenerationConfig
from app.router.rate_limiter import global_request_manager

class BenchmarkSuite:
    def __init__(self, adapter: BaseModelAdapter, connection_id: str, model_id: str):
        self.adapter = adapter
        self.connection_id = connection_id
        self.model_id = model_id

    async def run_test_1_connection(self) -> Dict[str, Any]:
        """Test 1: Connection & Auth probe"""
        t0 = time.time()
        res = await self.adapter.test_connection()
        latency = (time.time() - t0) * 1000
        return {
            "name": "Kiểm tra kết nối (Connection)",
            "capability_tested": "connection",
            "passed": res.get("success", False),
            "latency_ms": round(latency, 2),
            "details": res.get("message", "")
        }

    async def run_test_2_basic_chat(self) -> Dict[str, Any]:
        """Test 2: Basic Chat completion"""
        t0 = time.time()
        messages = [
            ChatMessage(role="system", content="Bạn là trợ lý AI thông minh."),
            ChatMessage(role="user", content="Trả lời ngắn gọn bằng 1 câu: 1 + 1 bằng mấy?")
        ]
        config = GenerationConfig(max_tokens=64, temperature=0.0, stream=False)
        try:
            resp = await self.adapter.chat(messages, config)
            latency = (time.time() - t0) * 1000
            passed = "2" in resp.content or "hai" in resp.content.lower()
            return {
                "name": "Hội thoại cơ bản (Basic Chat)",
                "capability_tested": "chat",
                "passed": passed,
                "latency_ms": round(latency, 2),
                "output": resp.content.strip(),
                "details": "Trả lời chính xác" if passed else "Nội dung trả về không khớp"
            }
        except Exception as e:
            return {
                "name": "Hội thoại cơ bản (Basic Chat)",
                "capability_tested": "chat",
                "passed": False,
                "latency_ms": round((time.time() - t0) * 1000, 2),
                "details": f"Lỗi: {str(e)}"
            }

    async def run_test_3_streaming(self) -> Dict[str, Any]:
        """Test 3: Streaming chunks, TTFT & TPS measurement"""
        t0 = time.time()
        messages = [
            ChatMessage(role="user", content="Đếm từ 1 đến 10, cách nhau bằng dấu phẩy.")
        ]
        config = GenerationConfig(max_tokens=128, temperature=0.1, stream=True)
        chunks_count = 0
        ttft = 0.0
        full_text = ""
        try:
            async for chunk in self.adapter.stream(messages, config):
                if chunks_count == 0:
                    ttft = (time.time() - t0) * 1000
                chunks_count += 1
                full_text += chunk.content

            total_time_sec = max(0.001, time.time() - t0)
            total_time_ms = total_time_sec * 1000
            estimated_tokens = max(1, len(full_text) // 4)
            tps = round(estimated_tokens / total_time_sec, 2)
            passed = chunks_count > 1 and len(full_text.strip()) > 0
            return {
                "name": "Truyền luồng dữ liệu (Streaming & TPS)",
                "capability_tested": "streaming",
                "passed": passed,
                "ttft_ms": round(ttft, 2),
                "total_time_ms": round(total_time_ms, 2),
                "tps": tps,
                "chunks_received": chunks_count,
                "output": full_text.strip(),
                "details": f"TTFT: {round(ttft, 1)}ms | Tốc độ: {tps} tokens/s" if passed else "Không nhận được stream"
            }
        except Exception as e:
            return {
                "name": "Truyền luồng dữ liệu (Streaming & TPS)",
                "capability_tested": "streaming",
                "passed": False,
                "details": f"Lỗi streaming: {str(e)}"
            }

    async def run_test_4_coding(self) -> Dict[str, Any]:
        """Test 4: Coding challenge"""
        t0 = time.time()
        prompt = (
            "Viết hàm Python có tên `is_palindrome(s: str) -> bool` kiểm tra chuỗi đối xứng (bỏ qua khoảng trắng và viết hoa). "
            "Chỉ trả về mã nguồn trong khối markdown ```python ... ```."
        )
        messages = [ChatMessage(role="user", content=prompt)]
        config = GenerationConfig(max_tokens=256, temperature=0.0, stream=False)
        try:
            resp = await self.adapter.chat(messages, config)
            latency = (time.time() - t0) * 1000
            code = resp.content
            passed = "def is_palindrome" in code and ("lower" in code or "[::-1]" in code)
            return {
                "name": "Năng lực lập trình (Coding)",
                "capability_tested": "coding",
                "passed": passed,
                "latency_ms": round(latency, 2),
                "details": "Sinh hàm đúng quy cách" if passed else "Code không đạt chuẩn yêu cầu"
            }
        except Exception as e:
            return {
                "name": "Năng lực lập trình (Coding)",
                "capability_tested": "coding",
                "passed": False,
                "details": f"Lỗi: {str(e)}"
            }

    async def run_test_5_reasoning(self) -> Dict[str, Any]:
        """Test 5: Logical reasoning"""
        t0 = time.time()
        prompt = (
            "Một người nông dân có 17 con cừu. Trừ 9 con, tất cả còn lại đều chết. "
            "Hỏi người nông dân còn lại bao nhiêu con cừu sống? Trả lời chỉ 1 số nguyên."
        )
        messages = [ChatMessage(role="user", content=prompt)]
        config = GenerationConfig(max_tokens=64, temperature=0.0, stream=False)
        try:
            resp = await self.adapter.chat(messages, config)
            latency = (time.time() - t0) * 1000
            passed = "9" in resp.content and "8" not in resp.content
            return {
                "name": "Năng lực suy luận (Reasoning)",
                "capability_tested": "reasoning",
                "passed": passed,
                "latency_ms": round(latency, 2),
                "output": resp.content.strip(),
                "details": "Suy luận logic chính xác" if passed else "Suy luận sai câu đố logic"
            }
        except Exception as e:
            return {
                "name": "Năng lực suy luận (Reasoning)",
                "capability_tested": "reasoning",
                "passed": False,
                "details": f"Lỗi: {str(e)}"
            }

    async def run_test_6_json_output(self) -> Dict[str, Any]:
        """Test 6: Structured JSON output"""
        t0 = time.time()
        prompt = (
            "Xuất một đối tượng JSON hợp lệ chứa các trường sau: 'status' (string = 'ok'), "
            "'code' (number = 200), 'items' (mảng gồm 'a' và 'b'). Chỉ xuất JSON thuần túy, không có văn bản giải thích."
        )
        messages = [ChatMessage(role="user", content=prompt)]
        config = GenerationConfig(max_tokens=128, temperature=0.0, stream=False, response_format={"type": "json_object"})
        try:
            resp = await self.adapter.chat(messages, config)
            latency = (time.time() - t0) * 1000
            raw = resp.content.strip()
            if raw.startswith("```json"):
                raw = raw[7:-3].strip()
            elif raw.startswith("```"):
                raw = raw[3:-3].strip()
            data = json.loads(raw)
            passed = data.get("status") == "ok" and data.get("code") == 200 and "items" in data
            return {
                "name": "Định dạng JSON (JSON Output)",
                "capability_tested": "json_output",
                "passed": passed,
                "latency_ms": round(latency, 2),
                "details": "Xuất JSON chuẩn theo cấu trúc" if passed else "JSON không hợp lệ hoặc sai trường"
            }
        except Exception as e:
            return {
                "name": "Định dạng JSON (JSON Output)",
                "capability_tested": "json_output",
                "passed": False,
                "details": f"Lỗi parse JSON: {str(e)}"
            }

    async def run_test_7_tool_calling(self) -> Dict[str, Any]:
        """Test 7: Native Tool Calling probe"""
        t0 = time.time()
        tools_def = [
            {
                "type": "function",
                "function": {
                    "name": "calculate_tax",
                    "description": "Tính thuế cho một số tiền nhất định",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "amount": {"type": "number", "description": "Số tiền tính thuế"},
                            "rate": {"type": "number", "description": "Tỷ lệ thuế"}
                        },
                        "required": ["amount", "rate"]
                    }
                }
            }
        ]
        messages = [
            ChatMessage(role="user", content="Hãy tính thuế cho số tiền 1000 đô la với tỷ lệ 0.1.")
        ]
        config = GenerationConfig(max_tokens=128, temperature=0.0, stream=False, tools=tools_def)
        try:
            resp = await self.adapter.chat(messages, config)
            latency = (time.time() - t0) * 1000
            passed = False
            if resp.tool_calls:
                tc = resp.tool_calls[0]
                func_name = tc.get("function", {}).get("name") or tc.get("name")
                passed = func_name == "calculate_tax"
            return {
                "name": "Gọi công cụ (Native Tool Calling)",
                "capability_tested": "native_tool_calling",
                "passed": passed,
                "latency_ms": round(latency, 2),
                "details": "Hỗ trợ native Tool Calling thành công" if passed else "Không tạo tool call hoặc không hỗ trợ"
            }
        except Exception as e:
            return {
                "name": "Gọi công cụ (Native Tool Calling)",
                "capability_tested": "native_tool_calling",
                "passed": False,
                "details": f"Không hỗ trợ native Tool Calling: {str(e)[:100]}"
            }

    async def run_suite(self, level: str = "standard") -> Dict[str, Any]:
        results = []

        # Test 1
        t1 = await self.run_test_1_connection()
        results.append(t1)
        if not t1["passed"]:
            return {
                "status": "failed",
                "tests": results,
                "summary": "Không thể kết nối đến endpoint hoặc API Key không hợp lệ."
            }

        await asyncio.sleep(0.3)
        t2 = await self.run_test_2_basic_chat()
        results.append(t2)

        await asyncio.sleep(0.3)
        t3 = await self.run_test_3_streaming()
        results.append(t3)

        if level in ("standard", "full"):
            await asyncio.sleep(0.3)
            t4 = await self.run_test_4_coding()
            results.append(t4)

            await asyncio.sleep(0.3)
            t5 = await self.run_test_5_reasoning()
            results.append(t5)

            await asyncio.sleep(0.3)
            t6 = await self.run_test_6_json_output()
            results.append(t6)

            await asyncio.sleep(0.3)
            t7 = await self.run_test_7_tool_calling()
            results.append(t7)

        passed_count = sum(1 for r in results if r.get("passed", False))
        total_count = len(results)

        # Capabilities classification
        capabilities_profile = {
            "chat": "VERIFIED" if any(r.get("capability_tested") == "chat" and r["passed"] for r in results) else "UNSUPPORTED",
            "streaming": "VERIFIED" if any(r.get("capability_tested") == "streaming" and r["passed"] for r in results) else "UNSUPPORTED",
            "native_tool_calling": "VERIFIED" if any(r.get("capability_tested") == "native_tool_calling" and r["passed"] for r in results) else "UNSUPPORTED",
            "json_output": "VERIFIED" if any(r.get("capability_tested") == "json_output" and r["passed"] for r in results) else "UNSUPPORTED",
            "coding": "VERIFIED" if any(r.get("capability_tested") == "coding" and r["passed"] for r in results) else "UNSUPPORTED",
            "reasoning": "VERIFIED" if any(r.get("capability_tested") == "reasoning" and r["passed"] for r in results) else "UNSUPPORTED",
        }

        coding_score = 1.0 if capabilities_profile["coding"] == "VERIFIED" else 0.0
        reasoning_score = 1.0 if capabilities_profile["reasoning"] == "VERIFIED" else 0.0
        tools_score = 1.0 if capabilities_profile["native_tool_calling"] == "VERIFIED" else 0.0

        lats = [r["latency_ms"] for r in results if "latency_ms" in r]
        avg_lat = sum(lats) / len(lats) if lats else 0.0
        ttft_val = next((r["ttft_ms"] for r in results if "ttft_ms" in r), avg_lat * 0.4)
        tps_val = next((r["tps"] for r in results if "tps" in r), 0.0)

        return {
            "status": "passed" if passed_count >= total_count - 1 else "partial",
            "passed_count": passed_count,
            "total_count": total_count,
            "coding_score": coding_score,
            "reasoning_score": reasoning_score,
            "tools_score": tools_score,
            "avg_latency_ms": round(avg_lat, 2),
            "ttft_ms": round(ttft_val, 2),
            "tps": tps_val,
            "capabilities_profile": capabilities_profile,
            "tests": results
        }
