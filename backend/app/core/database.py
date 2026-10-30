from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config import config
from app.core.models import Base

engine = create_async_engine(
    config.db_url,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

def _run_migrations(sync_conn):
    try:
        cursor = sync_conn.connection.cursor()
        cursor.execute("PRAGMA table_info(connections)")
        cols = [row[1] for row in cursor.fetchall()]
        if cols and "status" not in cols:
            cursor.execute("ALTER TABLE connections ADD COLUMN status VARCHAR(32) DEFAULT 'untested'")
        if cols and "last_checked" not in cols:
            cursor.execute("ALTER TABLE connections ADD COLUMN last_checked DATETIME")
        
        cursor.execute("PRAGMA table_info(models)")
        m_cols = [row[1] for row in cursor.fetchall()]
        if m_cols and "is_favorite" not in m_cols:
            cursor.execute("ALTER TABLE models ADD COLUMN is_favorite BOOLEAN DEFAULT 0")
        if m_cols and "verification_status" not in m_cols:
            cursor.execute("ALTER TABLE models ADD COLUMN verification_status VARCHAR(32) DEFAULT 'DISCOVERED'")
    except Exception as e:
        print(f"[DB Migration Warning] {e}")

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_run_migrations)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
