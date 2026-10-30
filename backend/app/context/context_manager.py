import os
import re
from pathlib import Path
from typing import Dict, Any, List

IGNORED_DIRECTORIES = {
    ".git", ".svn", ".hg", "node_modules", "bower_components",
    "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache",
    "venv", ".venv", "env", ".env", "virtualenv",
    "dist", "build", "out", "target", "bin", "obj",
    ".idea", ".vscode", ".vs"
}

IGNORED_EXTENSIONS = {
    ".exe", ".dll", ".so", ".dylib", ".bin", ".pyc", ".pyo",
    ".zip", ".tar", ".gz", ".7z", ".rar",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
    ".mp3", ".mp4", ".wav", ".avi", ".mov",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx"
}

class ContextManager:
    @staticmethod
    def get_workspace_summary(workspace_root: str, max_depth: int = 3) -> Dict[str, Any]:
        """
        Builds a compact directory tree and detects frameworks/languages.
        """
        ws = Path(workspace_root).resolve()
        if not ws.exists() or not ws.is_dir():
            return {"error": "Workspace không hợp lệ hoặc không tồn tại."}

        tree_lines = []
        files_count = 0
        dirs_count = 0
        detected_frameworks = set()

        def walk(current_dir: Path, current_depth: int, prefix: str = ""):
            nonlocal files_count, dirs_count
            if current_depth > max_depth:
                return

            try:
                entries = sorted(list(current_dir.iterdir()), key=lambda x: (not x.is_dir(), x.name.lower()))
            except PermissionError:
                return

            filtered_entries = [
                e for e in entries
                if e.name not in IGNORED_DIRECTORIES
                and (e.is_dir() or e.suffix.lower() not in IGNORED_EXTENSIONS)
            ]

            for i, entry in enumerate(filtered_entries):
                is_last = (i == len(filtered_entries) - 1)
                connector = "└── " if is_last else "├── "
                sub_prefix = "    " if is_last else "│   "

                if entry.is_dir():
                    dirs_count += 1
                    tree_lines.append(f"{prefix}{connector}{entry.name}/")
                    walk(entry, current_depth + 1, prefix + sub_prefix)
                else:
                    files_count += 1
                    tree_lines.append(f"{prefix}{connector}{entry.name}")

                    # Detect frameworks
                    name_lower = entry.name.lower()
                    if name_lower == "package.json":
                        detected_frameworks.add("Node.js/JavaScript")
                    elif name_lower in ("requirements.txt", "pyproject.toml", "setup.py"):
                        detected_frameworks.add("Python")
                    elif name_lower == "cargo.toml":
                        detected_frameworks.add("Rust")
                    elif name_lower == "go.mod":
                        detected_frameworks.add("Go")
                    elif name_lower.endswith(".csproj") or name_lower.endswith(".sln"):
                        detected_frameworks.add("C#/.NET")

        tree_lines.append(f"{ws.name}/")
        walk(ws, 1)

        return {
            "root_path": str(ws),
            "root_name": ws.name,
            "tree_text": "\n".join(tree_lines[:250]),
            "total_files": files_count,
            "total_dirs": dirs_count,
            "detected_frameworks": list(detected_frameworks) or ["Generic"]
        }

    @staticmethod
    def find_symbols(workspace_root: str, symbol_query: str) -> List[Dict[str, Any]]:
        """
        Fast symbol search for classes, functions, and interfaces across code files.
        """
        ws = Path(workspace_root).resolve()
        results = []
        pattern = re.compile(
            r'^\s*(def|class|interface|type|enum|async\s+def|function|const)\s+([A-Za-z0-9_]+)',
            re.MULTILINE
        )

        for root, dirs, files in os.walk(ws):
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRECTORIES]
            for f in files:
                ext = Path(f).suffix.lower()
                if ext in ('.py', '.ts', '.tsx', '.js', '.jsx', '.cs', '.go', '.rs', '.cpp', '.h'):
                    file_path = Path(root) / f
                    try:
                        content = file_path.read_text(encoding="utf-8", errors="ignore")
                        for line_idx, line in enumerate(content.splitlines()):
                            match = pattern.match(line)
                            if match:
                                kind = match.group(1).strip()
                                name = match.group(2).strip()
                                if symbol_query.lower() in name.lower():
                                    rel_path = file_path.relative_to(ws)
                                    results.append({
                                        "name": name,
                                        "kind": kind,
                                        "file": str(rel_path),
                                        "line": line_idx + 1,
                                        "preview": line.strip()
                                    })
                                    if len(results) >= 40:
                                        return results
                    except Exception:
                        pass
        return results

    @staticmethod
    def extract_relevant_snippets(workspace_root: str, relevant_files: List[str]) -> str:
        """
        Reads and packs only specified files for LLM prompt context within budget.
        """
        ws = Path(workspace_root).resolve()
        snippets = []
        for rel_path in relevant_files:
            file_path = (ws / rel_path).resolve()
            try:
                file_path.relative_to(ws)
            except ValueError:
                continue

            if file_path.exists() and file_path.is_file():
                try:
                    content = file_path.read_text(encoding="utf-8", errors="replace")
                    if len(content) > 4000:
                        content = content[:4000] + "\n... [Cắt bớt phần còn lại] ..."
                    snippets.append(f"### File: {rel_path}\n```{file_path.suffix.lstrip('.')}\n{content}\n```")
                except Exception:
                    pass

        return "\n\n".join(snippets)
