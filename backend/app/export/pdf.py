"""Export Markdown report to PDF or formatted HTML."""

import logging
from .markdown import generate_markdown_report

logger = logging.getLogger(__name__)


def markdown_to_html(md_text: str) -> str:
    """Convert markdown to clean HTML."""
    try:
        import markdown
        html = markdown.markdown(
            md_text,
            extensions=["tables", "fenced_code"],
        )
    except Exception:
        html = md_text.replace("\n", "<br>")

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>ArchMind AI Architecture Report</title>
<style>
body {{ font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 900px; margin: 40px auto; padding: 24px; color: #1E1B4B; line-height: 1.6; background-color: #FAFAFE; }}
h1 {{ color: #4C1D95; border-bottom: 3px solid #7C3AED; padding-bottom: 12px; font-size: 26px; }}
h2 {{ color: #2563EB; border-bottom: 1px solid #DBEAFE; padding-bottom: 8px; margin-top: 32px; font-size: 20px; }}
h3 {{ color: #4C1D95; font-size: 16px; margin-top: 20px; }}
table {{ border-collapse: collapse; width: 100%; margin: 16px 0; background: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
th, td {{ border: 1px solid #E5E7EB; padding: 10px 14px; text-align: left; font-size: 14px; }}
th {{ background: #F5F3FF; font-weight: 600; color: #4C1D95; }}
tr:nth-child(even) {{ background: #F9FAFB; }}
code {{ background: #F3F4F6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }}
pre {{ background: #1E1B4B; color: #E2E8F0; padding: 16px; border-radius: 8px; overflow-x: auto; }}
pre code {{ background: none; color: inherit; }}
ul, ol {{ padding-left: 24px; }}
li {{ margin: 6px 0; }}
</style>
</head>
<body>{html}</body>
</html>"""


def generate_pdf(
    project: dict,
    requirements: list[dict],
    components: list[dict],
    connections: list[dict],
    decisions: list[dict],
    findings: list[dict],
    coverage_percent: float = 0.0,
) -> bytes:
    """Generate PDF from project data. Falls back to HTML if WeasyPrint unavailable."""
    md = generate_markdown_report(project, requirements, components, connections, decisions, findings, coverage_percent)
    html = markdown_to_html(md)

    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html).write_pdf()
        return pdf_bytes
    except Exception as e:
        logger.info("WeasyPrint conversion not available, returning HTML representation: %s", e)
        return html.encode("utf-8")

