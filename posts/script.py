def main(year):
    for i in range(1, 17):
        with open(f"{i}-{year}.md", 'a') as file:
            file.write(f"No notes yet.")

if __name__ == "__main__":
    main(2023)