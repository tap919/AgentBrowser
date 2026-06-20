import sys
from pathlib import Path
_root = str(Path(__file__).resolve().parent.parent)
if _root not in sys.path:
    sys.path.insert(0, _root)

from memory import MemorySystem as _MemorySystem


class VectorMemory:
    def __init__(self):
        self._memory = _MemorySystem()

    async def search_conversations(self, query: str, limit: int = 5):
        return self._memory.search_memory(limit=limit)

    async def add_conversation(self, content: str, metadata: dict = None):
        self._memory.add_message(
            session_id="default", role="user", content=content,
            metadata=metadata or {},
        )


vector_memory = VectorMemory()
