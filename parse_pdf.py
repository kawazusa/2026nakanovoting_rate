import pypdf

def extract_text(pdf_path, txt_path):
    reader = pypdf.PdfReader(pdf_path)
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(f"Total pages: {len(reader.pages)}\n")
        for i, page in enumerate(reader.pages):
            f.write(f"--- Page {i+1} ---\n")
            f.write(page.extract_text() + "\n")

if __name__ == "__main__":
    extract_text("0602kutyou.pdf", "pdf_text.txt")
