import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.models import ProjectMemory, utcnow_str

class ProjectMemoryStore:
    @staticmethod
    async def get_memories(session: AsyncSession, project_path: str) -> List[Dict[str, Any]]:
        stmt = select(ProjectMemory).where(ProjectMemory.project_path == project_path)
        res = await session.execute(stmt)
        items = res.scalars().all()
        return [
            {
                "id": it.id,
                "category": it.category,
                "key": it.key,
                "value": it.value,
                "updated_at": it.updated_at
            }
            for it in items
        ]

    @staticmethod
    async def set_memory(
        session: AsyncSession,
        project_path: str,
        category: str,
        key: str,
        value: str
    ):
        stmt = select(ProjectMemory).where(
            ProjectMemory.project_path == project_path,
            ProjectMemory.category == category,
            ProjectMemory.key == key
        )
        res = await session.execute(stmt)
        existing = res.scalars().first()
        if existing:
            existing.value = value
            existing.updated_at = utcnow_str()
        else:
            mem = ProjectMemory(
                id=str(uuid.uuid4()),
                project_path=project_path,
                category=category,
                key=key,
                value=value,
                updated_at=utcnow_str()
            )
            session.add(mem)
        await session.commit()

    @staticmethod
    async def format_memory_for_prompt(session: AsyncSession, project_path: str) -> str:
        memories = await ProjectMemoryStore.get_memories(session, project_path)
        if not memories:
            return ""
        lines = ["KÝ ỨC DỰ ÁN (PROJECT MEMORY):"]
        for m in memories:
            lines.append(f"- [{m['category'].upper()}] {m['key']}: {m['value']}")
        return "\n".join(lines)
