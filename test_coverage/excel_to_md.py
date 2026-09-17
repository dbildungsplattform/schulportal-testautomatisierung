import pandas as pd


def split_users(cell):
    if pd.isna(cell):
        return []
    return [u.strip() for u in str(cell).split(",") if u.strip()]


def excel_to_llm_markdown(input_file, output_file):
    df = pd.read_excel(input_file, header=None)

    lines = []
    current_feature = None
    current_users = []

    for i, row in df.iterrows():
        col_a = row[0] if len(row) > 0 else None
        col_b = row[1] if len(row) > 1 else None

        # Neue Funktion
        if pd.notna(col_a):
            # vorherige schreiben
            if current_feature:
                lines.append(f"- feature: {current_feature}")
                lines.append("  users:")
                for u in current_users:
                    lines.append(f"    - {u}")
                lines.append("")

            current_feature = str(col_a).strip()
            current_users = split_users(col_b)

        # Fortsetzung der User
        else:
            current_users.extend(split_users(col_b))

    # letzte Funktion schreiben
    if current_feature:
        lines.append(f"- feature: {current_feature}")
        lines.append("  users:")
        for u in current_users:
            lines.append(f"    - {u}")
        lines.append("")

    # speichern
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

if __name__ == "__main__":
    excel_to_llm_markdown("testgegenstand.xlsx", "testgegenstand.md")