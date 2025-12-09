import argparse
import os
from typing import Optional

HTML_FILE_PATH = "reading-notes.html"


def generate_book_entry(title: str, author: str, post_file_path: Optional[str] = None):
    """
    Generate HTML entry for a book.
    """
    button_class = '"file-toggle no-notes"'
    optional_file_content = ""
    if post_file_path:
        assert post_file_path.endswith(
            ".md"
        ), f"Post file must be markdown: {post_file_path}"
        if not os.path.exists(post_file_path):
            raise FileNotFoundError(f"Post file {post_file_path} not found")

        button_class = f'"file-toggle" data-file="{post_file_path}"'
        optional_file_content = """
                <div class="file-content">
                    <div class="markdown-body markdown-content"></div>
                </div>"""

    entry = f"""            <li class="file-item">
                <button class={button_class}>
                    <span class="post-title"><i>{title}</i></span>
                    <span class="post-subtitle">{author}</span>
                </button>{optional_file_content}
            </li>"""

    return entry


def add_book(
    title: str,
    author: str,
    year: int,
    post_file_path: Optional[str] = None,
    html_file_path: str = HTML_FILE_PATH,
):
    """
    Add a book to the reading notes HTML file.
    """
    book_entry = generate_book_entry(title, author, post_file_path)

    with open(html_file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    year_heading = f'<li class="year-heading">{year}</li>'
    insertion_index = None

    for i, line in enumerate(lines):
        if year_heading in line:
            for j in range(i + 1, len(lines)):
                if '<li class="file-item">' in lines[j]:
                    insertion_index = j
                    break
            break

    if insertion_index is None:
        # Year heading not found, find where to insert a new year section
        # We'll insert after the most recent year that's older than our target year
        for i, line in enumerate(lines):
            if '<li class="year-heading">' in line:
                try:
                    existing_year = int(line.split(">")[1].split("<")[0])
                    if existing_year < year:
                        # Insert new year section here
                        year_section = (
                            f'            <li class="year-heading">{year}</li>\n'
                        )
                        year_section += f"            <!-- {year} READS -->\n"
                        year_section += book_entry + "\n"
                        year_section += "            \n"
                        lines.insert(i, year_section)
                        break
                except (ValueError, IndexError):
                    continue
        else:
            for i, line in enumerate(lines):
                if '<ul class="file-list"' in line:
                    year_section = f'            <li class="year-heading">{year}</li>\n'
                    year_section += f"            <!-- {year} READS -->\n"
                    year_section += book_entry + "\n"
                    year_section += "            \n"
                    lines.insert(
                        i + 2, year_section
                    )  # +2 to skip the ul tag and first item
                    break
    else:
        lines.insert(insertion_index, book_entry + "\n")

    with open(html_file_path, "w", encoding="utf-8") as f:
        f.writelines(lines)

    print(f"Added '{title}' by {author} ({year}) to {html_file_path}")
    return book_entry


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-t", "--title", type=str, help="Book title", required=True)
    parser.add_argument("-a", "--author", type=str, help="Book author", required=True)
    parser.add_argument("-y", "--year", type=int, help="Year read", required=True)
    parser.add_argument("-f", "--post-file-path", type=str, help="Path to post file (optional)", required=False)
    args = parser.parse_args()

    add_book(args.title, args.author, args.year, args.post_file_path)
