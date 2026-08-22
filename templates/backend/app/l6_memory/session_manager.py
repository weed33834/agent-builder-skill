"""L6 - Session Manager

Manages the creation, switching, and lifecycle of conversation sessions.
Integrates conversation buffer and vector store, providing a unified memory interface.

Extended for the workspace feature set (full-spec G1-G5):
  - Session grouping / projects (分组/项目)
  - Session search (搜索)
  - Session favorites (收藏)
  - Session share token + markdown export (分享/导出)
  - Session attachments (附件上传)
Sessions (metadata + messages) are persisted to data/sessions.json.
"""

import json
import os
import uuid
from pathlib import Path
from typing import Optional
from datetime import datetime

from .buffer import ConversationBuffer

# app/l6_memory/session_manager.py -> parents[3] = project root (same as usage.py)
_DATA_DIR = Path(__file__).resolve().parents[3] / "data"
_SESSIONS_FILE = _DATA_DIR / "sessions.json"


class SessionManager:
    """Session manager

    Manages multiple conversation sessions, each session independently maintains memory.
    """

    def __init__(self):
        self._sessions: dict[str, dict] = {}
        self._buffer = ConversationBuffer()
        self._load()

    # ---- persistence -------------------------------------------------------
    def _load(self):
        """Load sessions + messages from disk (if present).

        A corrupt file is preserved as sessions.json.corrupt-<ts> instead of
        being silently overwritten on the next persist — silent data loss is
        worse than a visible error.
        """
        if not _SESSIONS_FILE.exists():
            return
        try:
            data = json.loads(_SESSIONS_FILE.read_text(encoding="utf-8"))
            self._sessions = data.get("sessions", {})
            self._buffer._buffers = data.get("buffers", {})
        except (json.JSONDecodeError, OSError):
            try:
                backup = _SESSIONS_FILE.with_name(
                    f"sessions.json.corrupt-{datetime.now().strftime('%Y%m%d%H%M%S')}"
                )
                backup.write_bytes(_SESSIONS_FILE.read_bytes())
            except OSError:
                pass
            self._sessions = {}
            self._buffer._buffers = {}

    def _persist(self):
        """Atomic persist: write to a temp file then os.replace, so a crash
        mid-write can never truncate the existing store."""
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        tmp_path = _SESSIONS_FILE.with_suffix(".json.tmp")
        tmp_path.write_text(
            json.dumps(
                {"sessions": self._sessions, "buffers": self._buffer._buffers},
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        os.replace(tmp_path, _SESSIONS_FILE)

    # ---- session CRUD ------------------------------------------------------
    def create_session(self, title: str = "新会话", group_id: str = "") -> str:
        session_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        self._sessions[session_id] = {
            "id": session_id,
            "title": title,
            "group_id": group_id,
            "favorite": False,
            "attachments": [],
            "share_token": "",
            "created_at": now,
            "updated_at": now,
            "message_count": 0,
        }
        self._persist()
        return session_id

    def get_session(self, session_id: str) -> Optional[dict]:
        return self._sessions.get(session_id)

    def list_sessions(self, q: str = "", group_id: str = "", favorite: bool = False) -> list[dict]:
        """List sessions with search + group + favorite filters (G1/G2/G3)."""
        q = (q or "").lower().strip()
        sessions = list(self._sessions.values())
        if q:
            sessions = [
                s for s in sessions
                if q in s.get("title", "").lower()
                or any(q in (m.get("content", "") or "").lower()
                       for m in self._buffer.get_history(s["id"], limit=200))
            ]
        if group_id:
            sessions = [s for s in sessions if s.get("group_id") == group_id]
        if favorite:
            sessions = [s for s in sessions if s.get("favorite")]
        return sorted(sessions, key=lambda s: s.get("updated_at", ""), reverse=True)

    def update_session(self, session_id: str, **fields) -> Optional[dict]:
        """Update metadata (title / group / favorite)."""
        s = self._sessions.get(session_id)
        if not s:
            return None
        for k, v in fields.items():
            if k in ("title", "group_id", "favorite"):
                s[k] = v
        s["updated_at"] = datetime.now().isoformat()
        self._persist()
        return s

    # ---- groups (G1) -------------------------------------------------------
    def list_groups(self) -> list[dict]:
        """Aggregate sessions into groups; ungrouped go to an implicit default."""
        groups: dict[str, dict] = {
            "": {"id": "", "name": "默认", "session_count": 0},
        }
        for s in self._sessions.values():
            gid = s.get("group_id") or ""
            if gid not in groups:
                groups[gid] = {"id": gid, "name": gid, "session_count": 0}
            groups[gid]["session_count"] += 1
        return list(groups.values())

    # ---- share / export (G4) ----------------------------------------------
    def create_share(self, session_id: str) -> Optional[str]:
        s = self._sessions.get(session_id)
        if not s:
            return None
        s["share_token"] = uuid.uuid4().hex[:16]
        self._persist()
        return s["share_token"]

    def revoke_share(self, session_id: str) -> Optional[bool]:
        s = self._sessions.get(session_id)
        if not s:
            return None
        s["share_token"] = ""
        self._persist()
        return True

    def get_by_share_token(self, token: str) -> Optional[dict]:
        for s in self._sessions.values():
            if s.get("share_token") == token:
                return s
        return None

    def export_markdown(self, session_id: str) -> Optional[str]:
        s = self._sessions.get(session_id)
        if not s:
            return None
        lines = [f"# {s['title']}", "", f"> 导出时间: {datetime.now().isoformat()}", ""]
        for msg in self._buffer.get_history(session_id, limit=1000):
            role = "用户" if msg["role"] == "user" else "助手"
            lines.append(f"**{role}**:\n{msg['content']}\n")
        return "\n".join(lines)

    # ---- attachments (G5) --------------------------------------------------
    def add_attachment(self, session_id: str, name: str, path: str, size: int = 0, kind: str = "file") -> Optional[dict]:
        s = self._sessions.get(session_id)
        if not s:
            return None
        att = {"id": uuid.uuid4().hex[:8], "name": name, "path": path, "size": size, "kind": kind,
               "created_at": datetime.now().isoformat()}
        s.setdefault("attachments", []).append(att)
        self._persist()
        return att

    def list_attachments(self, session_id: str) -> list[dict]:
        s = self._sessions.get(session_id)
        return s.get("attachments", []) if s else []

    def remove_attachment(self, session_id: str, att_id: str) -> bool:
        s = self._sessions.get(session_id)
        if not s:
            return False
        before = len(s.get("attachments", []))
        s["attachments"] = [a for a in s.get("attachments", []) if a.get("id") != att_id]
        changed = len(s["attachments"]) != before
        if changed:
            self._persist()
        return changed

    # ---- messages ----------------------------------------------------------
    async def add_message(self, session_id: str, role: str, content: str):
        """Add a message to the session.

        An unknown session_id is CREATED AS-IS (not swapped for a fresh uuid):
        LangGraph checkpoints key on the caller's thread_id, so silently
        re-keying here would split chat history from graph memory.
        """
        if session_id not in self._sessions:
            now = datetime.now().isoformat()
            self._sessions[session_id] = {
                "id": session_id,
                "title": "新会话",
                "group_id": "",
                "favorite": False,
                "attachments": [],
                "share_token": "",
                "created_at": now,
                "updated_at": now,
                "message_count": 0,
            }
        await self._buffer.add(role, content, session_id)
        self._sessions[session_id]["updated_at"] = datetime.now().isoformat()
        self._sessions[session_id]["message_count"] += 1
        # Auto-title from the first user message
        if self._sessions[session_id]["message_count"] == 1 and role == "user":
            title = (content or "").strip().replace("\n", " ")[:40]
            if title:
                self._sessions[session_id]["title"] = title
        self._persist()

    def get_history(self, session_id: str, limit: int = 50) -> list[dict]:
        return self._buffer.get_history(session_id, limit)

    def get_context(self, session_id: str, limit: int = 10) -> str:
        return self._buffer.get_context(session_id, limit)

    def delete_session(self, session_id: str):
        self._sessions.pop(session_id, None)
        self._buffer.clear(session_id)
        self._persist()

    def get_stats(self) -> dict:
        return {
            "total_sessions": len(self._sessions),
            "buffer_stats": self._buffer.get_stats(),
        }


# Global session manager instance
_session_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """Get the global session manager"""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager
