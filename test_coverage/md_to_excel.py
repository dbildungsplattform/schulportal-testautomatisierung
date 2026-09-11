import pandas as pd
import re

def md_to_excel(md_path: str, excel_path: str):
    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Markdown-Tabelle extrahieren
    table_pattern = re.compile(r"(\|.*\|\n\|[-\s|]+\|\n(?:\|.*\|\n?)*)", re.MULTILINE)
    match = table_pattern.search(content)

    if not match:
        raise ValueError("Keine Markdown-Tabelle gefunden.")

    table_text = match.group(1)

    # Zeilen splitten
    lines = [line.strip() for line in table_text.strip().split("\n")]

    # Header + Separator entfernen
    header = [col.strip() for col in lines[0].strip("|").split("|")]
    data_lines = lines[2:]  # skip separator line

    rows = []
    for line in data_lines:
        cols = [col.strip() for col in line.strip("|").split("|")]
        # Spaltenanzahl angleichen
        if len(cols) < len(header):
            cols += [""] * (len(header) - len(cols))
        rows.append(cols)

    # DataFrame erstellen
    df = pd.DataFrame(rows, columns=header)

    # In Excel schreiben
    df.to_excel(excel_path, index=False)

    print(f"Excel-Datei erstellt: {excel_path}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) == 3:
        md_to_excel(sys.argv[1], sys.argv[2])
    else:
        md_to_excel("testgegenstand.md", "testgegenstandZwei.xlsx")
