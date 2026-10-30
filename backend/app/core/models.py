import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def utcnow_str():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

class Connection(Base):
    __tablename__ = "connections"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    provider_type = Column(String(64), default="nvidia")
    base_url = Column(String(512), nullable=False)
    api_key_encrypted = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    headers_json = Column(Text, default="{}")
    status = Column(String(32), default="untested") # connected, disconnected, error, untested
    last_checked = Column(String(64), nullable=True)
    created_at = Column(String(64), default=utcnow_str)
    updated_at = Column(String(64), default=utcnow_str, onupdate=utcnow_str)

    models = relationship("ModelItem", back_populates="connection", cascade="all, delete-orphan")


class ModelItem(Base):
    __tablename__ = "models"

    id = Column(String(64), primary_key=True) # typically {connection_id}_{model_id}
    connection_id = Column(String(64), ForeignKey("connections.id", ondelete="CASCADE"), nullable=False)
    model_id = Column(String(256), nullable=False) # e.g. "meta/llama-3.1-70b-instruct"
    display_name = Column(String(256), nullable=False)
    context_window = Column(Integer, default=128000)
    max_tokens = Column(Integer, default=4096)
    rpm_limit = Column(Integer, default=40)
    tpm_limit = Column(Integer, default=100000)
    concurrency_limit = Column(Integer, default=4)
    supports_streaming = Column(Boolean, default=True)
    supports_tools = Column(Boolean, default=False)
    supports_vision = Column(Boolean, default=False)
    supports_json = Column(Boolean, default=True)
    is_favorite = Column(Boolean, default=False)
    verification_status = Column(String(32), default="DISCOVERED") # DISCOVERED, VERIFIED, UNSUPPORTED, UNKNOWN, ERROR
    status = Column(String(64), default="untested") # ready, error, untested, rate_limited
    last_tested = Column(String(64), nullable=True)
    created_at = Column(String(64), default=utcnow_str)
    updated_at = Column(String(64), default=utcnow_str, onupdate=utcnow_str)

    connection = relationship("Connection", back_populates="models")
    benchmarks = relationship("ModelBenchmark", back_populates="model", cascade="all, delete-orphan")
    capability_profile = relationship("ModelCapabilityProfile", back_populates="model", uselist=False, cascade="all, delete-orphan")


class ModelCapabilityProfile(Base):
    __tablename__ = "model_capabilities"

    id = Column(String(64), primary_key=True)
    model_id = Column(String(64), ForeignKey("models.id", ondelete="CASCADE"), nullable=False, unique=True)
    chat = Column(String(32), default="UNKNOWN")            # VERIFIED, UNSUPPORTED, UNKNOWN
    streaming = Column(String(32), default="UNKNOWN")       # VERIFIED, UNSUPPORTED, UNKNOWN
    native_tool_calling = Column(String(32), default="UNKNOWN") # VERIFIED, UNSUPPORTED, UNKNOWN
    json_output = Column(String(32), default="UNKNOWN")     # VERIFIED, UNSUPPORTED, UNKNOWN
    vision = Column(String(32), default="UNKNOWN")          # VERIFIED, UNSUPPORTED, UNKNOWN
    long_context = Column(String(32), default="UNKNOWN")    # VERIFIED, UNSUPPORTED, UNKNOWN
    structured_output = Column(String(32), default="UNKNOWN")# VERIFIED, UNSUPPORTED, UNKNOWN
    max_context_window = Column(Integer, default=128000)
    max_output_tokens = Column(Integer, default=4096)
    updated_at = Column(String(64), default=utcnow_str)

    model = relationship("ModelItem", back_populates="capability_profile")


class ModelBenchmark(Base):
    __tablename__ = "model_benchmarks"

    id = Column(String(64), primary_key=True)
    model_id = Column(String(64), ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    connection_id = Column(String(64), nullable=False)
    status = Column(String(64), default="pending") # passed, failed, partial
    coding_score = Column(Float, default=0.0)
    reasoning_score = Column(Float, default=0.0)
    vision_score = Column(Float, default=0.0)
    tools_score = Column(Float, default=0.0)
    ttft_ms = Column(Float, default=0.0) # Time to First Token
    tps = Column(Float, default=0.0)     # Tokens per second
    total_time_ms = Column(Float, default=0.0)
    error_rate = Column(Float, default=0.0)
    raw_results_json = Column(Text, default="{}")
    tested_at = Column(String(64), default=utcnow_str)

    model = relationship("ModelItem", back_populates="benchmarks")


class RateLimitConfig(Base):
    __tablename__ = "rate_limit_configs"

    id = Column(String(64), primary_key=True)
    connection_id = Column(String(64), nullable=False)
    model_id = Column(String(256), nullable=True)
    max_rpm = Column(Integer, default=40)
    max_tpm = Column(Integer, default=100000)
    safety_margin_rpm = Column(Integer, default=5)
    safety_margin_tpm = Column(Integer, default=5000)


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id = Column(String(64), primary_key=True)
    connection_id = Column(String(64), nullable=False)
    model_id = Column(String(256), nullable=False)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    is_estimated = Column(Boolean, default=False)
    timestamp = Column(String(64), default=utcnow_str)


class RequestLog(Base):
    __tablename__ = "request_logs"

    id = Column(String(64), primary_key=True)
    connection_id = Column(String(64), nullable=False)
    model_id = Column(String(256), nullable=False)
    request_type = Column(String(64), default="chat")
    status_code = Column(Integer, default=200)
    latency_ms = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)
    timestamp = Column(String(64), default=utcnow_str)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(64), primary_key=True)
    title = Column(String(256), default="Cuộc trò chuyện mới")
    project_path = Column(String(512), nullable=True)
    created_at = Column(String(64), default=utcnow_str)
    updated_at = Column(String(64), default=utcnow_str, onupdate=utcnow_str)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(64), primary_key=True)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(32), nullable=False) # system, user, assistant, tool
    content = Column(Text, default="")
    tool_calls_json = Column(Text, nullable=True)
    tool_call_id = Column(String(128), nullable=True)
    created_at = Column(String(64), default=utcnow_str)

    conversation = relationship("Conversation", back_populates="messages")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    path = Column(String(512), unique=True, nullable=False)
    framework = Column(String(64), default="unknown")
    last_opened = Column(String(64), default=utcnow_str)
    created_at = Column(String(64), default=utcnow_str)


class ProjectMemory(Base):
    __tablename__ = "project_memory"

    id = Column(String(64), primary_key=True)
    project_path = Column(String(512), nullable=False)
    category = Column(String(64), nullable=False) # architecture, rules, bugs, decisions
    key = Column(String(128), nullable=False)
    value = Column(Text, nullable=False)
    updated_at = Column(String(64), default=utcnow_str)


class AgentTask(Base):
    __tablename__ = "agent_tasks"

    id = Column(String(64), primary_key=True)
    conversation_id = Column(String(64), nullable=False)
    title = Column(String(256), nullable=False)
    status = Column(String(64), default="pending") # planning, executing, debugging, reviewing, completed, failed
    steps_json = Column(Text, default="[]")
    current_step = Column(Integer, default=0)
    result_summary = Column(Text, default="")
    created_at = Column(String(64), default=utcnow_str)
    updated_at = Column(String(64), default=utcnow_str, onupdate=utcnow_str)


class Checkpoint(Base):
    __tablename__ = "checkpoints"

    id = Column(String(64), primary_key=True)
    project_path = Column(String(512), nullable=False)
    description = Column(String(256), nullable=False)
    git_commit_hash = Column(String(64), nullable=True)
    snapshot_dir = Column(String(512), nullable=True)
    files_json = Column(Text, default="[]")
    created_at = Column(String(64), default=utcnow_str)


class MCPServer(Base):
    __tablename__ = "mcp_servers"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    transport = Column(String(32), default="stdio") # stdio, sse
    command = Column(String(256), nullable=True)
    args_json = Column(Text, default="[]")
    env_json = Column(Text, default="{}")
    url = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(String(64), default=utcnow_str)


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(128), primary_key=True)
    value_json = Column(Text, nullable=False)
    updated_at = Column(String(64), default=utcnow_str)
