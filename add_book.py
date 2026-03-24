import argparse
import os
from typing import Optional

HTML_FILE_PATH = "reading-notes.html"


def generate_book_entry(
    title: str,
    author: str,
    post_file_path: Optional[str] = None,
    standout: bool = False,
):
    li_class = "book-item standout" if standout else "book-item"

    if post_file_path:
        assert post_file_path.endswith(".md"), f"Post file must be markdown: {post_file_path}"
        if not os.path.exists(post_file_path):
            raise FileNotFoundError(f"Post file {post_file_path} not found")

        entry = (
            f'                <li class="{li_class}">\n'
            f'                    <button class="book-toggle has-notes" data-file="{post_file_path}">\n'
            f'                        <span class="book-title">{title}</span>\n'
            f'                        <span class="book-author">{author}</span>\n'
            f'                        <span class="book-chevron">▾</span>\n'
            f'                    </button>\n'
            f'                    <div class="book-content"><div class="post-content"></div></div>\n'
            f'                </li>'
        )
    else:
        entry = (
            f'                <li class="{li_class}">\n'
            f'                    <button class="book-toggle">'
            f'<span class="book-title">{title}</span>'
            f'<span class="book-author">{author}</span>'
            f'</button>\n'
            f'                </li>'
        )

    return entry


def add_book(
    title: str,
    author: str,
    year: int,
    post_file_path: Optional[str] = None,
    standout: bool = False,
    html_file_path: str = HTML_FILE_PATH,
):
    book_entry = generate_book_entry(title, author, post_file_path, standout)

    with open(html_file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    year_heading = f'<li class="year-heading">{year}</li>'
    insertion_index = None

    for i, line in enumerate(lines):
        if year_heading in line:
            # Insert right after the year heading
            insertion_index = i + 1
            break

    if insertion_index is None:
        # Year heading not found — insert a new year section before the first
        # year that is older than our target year
        inserted = False
        for i, line in enumerate(lines):
            if '<li class="year-heading">' in line:
                try:
                    existing_year = int(line.strip().split(">")[1].split("<")[0])
                    if existing_year < year:
                        new_section = (
                            f'                <!-- {year} -->\n'
                            f'                <li class="year-heading">{year}</li>\n'
                            + book_entry + "\n\n"
                        )
                        lines.insert(i, new_section)
                        inserted = True
                        break
                except (ValueError, IndexError):
                    continue

        if not inserted:
            # All existing years are newer — append at the end of the book list
            for i, line in enumerate(lines):
                if '<ul class="book-list"' in line or 'id="book-list"' in line:
                    new_section = (
                        f'                <!-- {year} -->\n'
                        f'                <li class="year-heading">{year}</li>\n'
                        + book_entry + "\n"
                    )
                    lines.insert(i + 1, new_section)
                    break
    else:
        lines.insert(insertion_index, book_entry + "\n")

    with open(html_file_path, "w", encoding="utf-8") as f:
        f.writelines(lines)

    standout_msg = " (standout)" if standout else ""
    notes_msg = f" with notes ({post_file_path})" if post_file_path else ""
    print(f"Added '{title}' by {author} ({year}){standout_msg}{notes_msg} to {html_file_path}")
    return book_entry


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Add a book to reading-notes.html")
    parser.add_argument("-t", "--title", type=str, required=True, help="Book title")
    parser.add_argument("-a", "--author", type=str, required=True, help="Book author")
    parser.add_argument("-y", "--year", type=int, required=True, help="Year read")
    parser.add_argument(
        "-f", "--post-file-path", type=str, required=False,
        help="Path to notes markdown file (e.g. notes/books/2024/sapiens.md)",
    )
    parser.add_argument(
        "-s", "--standout", action="store_true", required=False,
        help="Mark as a personal standout (accent border)",
    )
    args = parser.parse_args()

    add_book(args.title, args.author, args.year, args.post_file_path, args.standout)
