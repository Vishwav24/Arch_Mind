"""Parse a previous architecture into Component and Connection schemas."""

import json
import re
import logging

logger = logging.getLogger(__name__)


def parse_brownfield_architecture(text: str, source_ref: str = "imported") -> dict:
    """Parse a previous architecture document into components and connections."""
    components = []
    connections = []

    # Try JSON first
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            if "components" in data:
                for i, c in enumerate(data["components"]):
                    comp = _normalize_component(c, i, source_ref)
                    components.append(comp)
            if "connections" in data:
                for i, c in enumerate(data["connections"]):
                    conn = _normalize_connection(c, i)
                    connections.append(conn)
            if components:
                return {"components": components, "connections": connections}
    except (json.JSONDecodeError, TypeError):
        pass

    # Try Mermaid parsing
    if "graph " in text or "flowchart " in text or "---" in text:
        result = _parse_mermaid(text, source_ref)
        if result["components"]:
            return result

    # Try Markdown parsing
    result = _parse_markdown_architecture(text, source_ref)
    if result["components"]:
        return result

    # Fallback: extract anything that looks like components
    return _extract_freeform(text, source_ref)


def _normalize_component(comp: dict, index: int, source_ref: str) -> dict:
    return {
        "id": comp.get("id", f"CMP-{index+1:03d}"),
        "name": comp.get("name", f"Component {index+1}"),
        "type": comp.get("type", "service"),
        "description": comp.get("description", ""),
        "responsibilities": comp.get("responsibilities", []),
        "satisfies": comp.get("satisfies", []),
        "provenance": "source",
        "change_status": "kept",
    }


def _normalize_connection(conn: dict, index: int) -> dict:
    return {
        "id": conn.get("id", f"CONN-{index+1:03d}"),
        "from_component": conn.get("from_component", conn.get("from", conn.get("source", ""))),
        "to_component": conn.get("to_component", conn.get("to", conn.get("target", ""))),
        "protocol": conn.get("protocol", ""),
        "data_description": conn.get("data_description", ""),
    }


def _parse_mermaid(text: str, source_ref: str) -> dict:
    components = []
    connections = []
    comp_names = {}

    # Extract all node definitions first: NodeID["Label"] or NodeID[Label]
    node_pattern = re.compile(r'(\w+)\[(["\']?)([^"\'\]]+)\2\]')
    for m in node_pattern.finditer(text):
        node_id = m.group(1)
        label = m.group(3).strip()
        comp_names[node_id] = label

    # Match edge lines: e.g. A["Web UI"] --> B["API Gateway"] or A -->|proto| B or A --> B
    edge_pattern = re.compile(
        r'(\w+)(?:\[[^\]]*\])?\s*--+>?\s*(?:\|([^|]+)\|)?\s*(\w+)(?:\[[^\]]*\])?'
    )
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("graph") or line.startswith("flowchart") or line.startswith("subgraph"):
            continue
        m = edge_pattern.search(line)
        if m:
            src = m.group(1)
            label = (m.group(2) or "").strip()
            dst = m.group(3)
            if src not in comp_names:
                comp_names[src] = src
            if dst not in comp_names:
                comp_names[dst] = dst

            connections.append({
                "id": f"CONN-{len(connections)+1:03d}",
                "from_component": f"CMP-{list(comp_names.keys()).index(src)+1:03d}" if src in comp_names else src,
                "to_component": f"CMP-{list(comp_names.keys()).index(dst)+1:03d}" if dst in comp_names else dst,
                "protocol": label,
                "data_description": "",
            })

    for i, (node_id, label) in enumerate(comp_names.items()):
        comp_type = _guess_component_type(label)
        components.append({
            "id": f"CMP-{i+1:03d}",
            "name": label,
            "type": comp_type,
            "description": f"Imported from existing architecture",
            "responsibilities": [],
            "satisfies": [],
            "provenance": "source",
            "change_status": "kept",
        })

    return {"components": components, "connections": connections}


def _parse_markdown_architecture(text: str, source_ref: str) -> dict:
    components = []
    connections = []

    comp_section = False
    conn_section = False

    for line in text.split("\n"):
        line_stripped = line.strip()

        if re.match(r"^#+\s*[Cc]omponents?", line_stripped):
            comp_section = True
            conn_section = False
            continue
        elif re.match(r"^#+\s*[Cc]onnections?", line_stripped):
            conn_section = True
            comp_section = False
            continue
        elif re.match(r"^#+\s", line_stripped):
            comp_section = False
            conn_section = False
            continue

        if comp_section and line_stripped.startswith("-"):
            name = line_stripped.lstrip("- ").strip()
            parts = re.split(r'\s*[\(\[]', name, maxsplit=1)
            comp_name = parts[0].strip()
            comp_desc = ""
            if len(parts) > 1:
                comp_desc = parts[1].rstrip(")]")

            if comp_name:
                comp_type = _guess_component_type(comp_name)
                components.append({
                    "id": f"CMP-{len(components)+1:03d}",
                    "name": comp_name,
                    "type": comp_type,
                    "description": comp_desc or f"Imported from {source_ref}",
                    "responsibilities": [],
                    "satisfies": [],
                    "provenance": "source",
                    "change_status": "kept",
                })

        elif conn_section and line_stripped.startswith("-"):
            conn_text = line_stripped.lstrip("- ").strip()
            match = re.match(r'(.+?)\s*-+>?\s*(.+?)(?:\s*\((.+)\))?$', conn_text)
            if match:
                from_name = match.group(1).strip()
                to_name = match.group(2).strip()
                protocol = match.group(3) or ""

                from_id = _find_comp_id(components, from_name)
                to_id = _find_comp_id(components, to_name)

                connections.append({
                    "id": f"CONN-{len(connections)+1:03d}",
                    "from_component": from_id,
                    "to_component": to_id,
                    "protocol": protocol.strip(),
                    "data_description": "",
                })

    return {"components": components, "connections": connections}


def _extract_freeform(text: str, source_ref: str) -> dict:
    """Fallback: try to extract component-like mentions from freeform text."""
    components = []
    known_patterns = [
        (r'\b(?:web|mobile)\s*(?:app|frontend|client|ui)\b', 'frontend'),
        (r'\b(?:api|backend|server)\s*(?:gateway|service)?\b', 'service'),
        (r'\b(?:database|db|postgres|mysql|mongodb|redis)\b', 'database'),
        (r'\b(?:message\s*queue|kafka|rabbitmq|sqs)\b', 'queue'),
        (r'\b(?:cache|redis|memcached)\b', 'cache'),
        (r'\b(?:load\s*balancer|nginx|haproxy)\b', 'infra'),
    ]
    text_lower = text.lower()
    for pattern, comp_type in known_patterns:
        matches = re.findall(pattern, text_lower)
        for m in matches:
            name = m.strip().title()
            if not any(c["name"].lower() == name.lower() for c in components):
                components.append({
                    "id": f"CMP-{len(components)+1:03d}",
                    "name": name,
                    "type": comp_type,
                    "description": f"Extracted from {source_ref}",
                    "responsibilities": [],
                    "satisfies": [],
                    "provenance": "source",
                    "change_status": "kept",
                })
    return {"components": components, "connections": []}


def _guess_component_type(name: str) -> str:
    name_lower = name.lower()
    if any(kw in name_lower for kw in ["frontend", "web", "ui", "client", "spa", "react", "angular", "vue"]):
        return "frontend"
    if any(kw in name_lower for kw in ["database", "db", "postgres", "mysql", "mongo", "sql", "store", "storage"]):
        return "database"
    if any(kw in name_lower for kw in ["queue", "kafka", "rabbit", "mq", "message"]):
        return "queue"
    if any(kw in name_lower for kw in ["cache", "redis", "memcache"]):
        return "cache"
    if any(kw in name_lower for kw in ["auth", "identity", "login", "security", "firewall", "waf"]):
        return "security"
    if any(kw in name_lower for kw in ["external", "third-party", "3rd", "stripe", "google", "aws", "api"]):
        return "external"
    if any(kw in name_lower for kw in ["load balancer", "cdn", "nginx", "infra", "gateway", "proxy"]):
        return "infra"
    return "service"


def _find_comp_id(components: list[dict], name: str) -> str:
    for c in components:
        if c["name"].lower() in name.lower() or name.lower() in c["name"].lower():
            return c["id"]
    return name

