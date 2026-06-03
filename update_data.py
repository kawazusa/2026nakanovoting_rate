import urllib.request
import re
import os
import pypdf
import subprocess
import time
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont

# Config
BASE_URL = "https://www.city.tokyo-nakano.lg.jp/kusei/senkyo/news/"
MAIN_PAGE = BASE_URL + "0237323820231016122829781.html"
STATIONS = ["区役所", "南部すこやか", "東部", "江古田", "野方", "鷺宮"]

# Previous election data (reference data, static)
PREVIOUS_DATA = """  // 前回 (令和4年5月22日執行 中野区長選挙)
  previous: {
    title: "令和4年5月22日執行 中野区長選挙",
    dateRange: ["5/16(月)", "5/17(火)", "5/18(x)", "5/19(木)", "5/20(金)", "5/21(土)"],
    stations: {
      "区役所": [721, 1101, 1543, 1895, 2298, 3105],
      "南部すこやか": [149, 293, 412, 509, 666, 1064],
      "東部": [134, 216, 385, 460, 539, 906],
      "江古田": [85, 152, 262, 331, 407, 719],
      "野方": [174, 293, 432, 503, 704, 1111],
      "鷺宮": [189, 312, 340, 492, 723, 988]
    }
  },"""

def find_chrome():
    # Windows paths
    paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]
    for path in paths:
        if os.path.exists(path):
            return path
            
    # Linux paths (for GitHub Actions runner)
    linux_paths = [
        "/usr/bin/google-chrome",
        "/usr/bin/chrome",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser"
    ]
    for path in linux_paths:
        if os.path.exists(path):
            return path
            
    # Try searching the PATH
    try:
        cmd = "where" if os.name == "nt" else "which"
        for browser in ["google-chrome", "chrome", "chromium", "microsoft-edge", "msedge"]:
            res = subprocess.run([cmd, browser], capture_output=True, text=True)
            if res.returncode == 0:
                return res.stdout.strip().split("\n")[0]
    except Exception:
        pass
        
    return None

def find_font():
    font_options = [
        # Windows
        r"C:\Windows\Fonts\YuGothB.ttc",
        r"C:\Windows\Fonts\meiryob.ttc",
        r"C:\Windows\Fonts\msjhbd.ttc",
        # Linux (Ubuntu fonts)
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.otf",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
        "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
        "/usr/share/fonts/truetype/ipafont-gothic/ipag.ttf"
    ]
    for path in font_options:
        if os.path.exists(path):
            return path
    return None

def get_latest_pdf_url():
    print(f"Fetching main page: {MAIN_PAGE}")
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(MAIN_PAGE, headers=headers)
    
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
    
    sokuhou_part = html.split('id="sokuhou"')
    if len(sokuhou_part) < 2:
        raise ValueError("Could not find 'sokuhou' section in the page HTML.")
    
    sokuhou_html = sokuhou_part[1].split('</div>')[0]
    pdf_match = re.search(r'href="([^"]*?\d{4}kutyou\.pdf)"', sokuhou_html)
    if not pdf_match:
        pdf_match = re.search(r'href="([^"]*?\d{4}kutyou\.pdf)"', html)
        
    if not pdf_match:
        raise ValueError("Could not find the latest daily report PDF link in HTML.")
        
    pdf_rel_path = pdf_match.group(1)
    if pdf_rel_path.startswith("http"):
        pdf_url = pdf_rel_path
    else:
        pdf_url = BASE_URL + pdf_rel_path
        
    print(f"Found latest PDF URL: {pdf_url}")
    return pdf_url

def download_pdf(url, output_path):
    print(f"Downloading PDF from {url}...")
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response, open(output_path, "wb") as out_file:
        out_file.write(response.read())
    print("Download completed.")

def parse_pdf(pdf_path):
    print(f"Parsing PDF: {pdf_path}")
    reader = pypdf.PdfReader(pdf_path)
    text = reader.pages[0].extract_text()
    
    male_data = {s: [] for s in STATIONS}
    female_data = {s: [] for s in STATIONS}
    lines = text.split("\n")
    station_matches = []
    
    for line in lines:
        line = line.strip()
        for s in STATIONS:
            if line.startswith(s):
                parts = line.split()
                if len(parts) > 1:
                    numbers = []
                    for p in parts[1:]:
                        clean_p = p.replace(",", "")
                        if clean_p.isdigit():
                            numbers.append(int(clean_p))
                    station_matches.append((s, numbers))
                    break

    if len(station_matches) < 12:
        raise ValueError(f"Expected at least 12 station rows, but found {len(station_matches)}")

    for idx, (station, nums) in enumerate(station_matches):
        daily_votes = nums[:-1]
        padded_votes = daily_votes + [None] * (6 - len(daily_votes))
        
        if idx < 6:
            male_data[station] = padded_votes
        elif idx < 12:
            female_data[station] = padded_votes
            
    return male_data, female_data

def generate_data_js(male_data, female_data, output_path):
    station_blocks = []
    for s in STATIONS:
        male_list_str = str(male_data[s]).replace("None", "null")
        female_list_str = str(female_data[s]).replace("None", "null")
        
        block = f"""    "{s}": {{
      male: {male_list_str},
      female: {female_list_str}
    }}"""
        station_blocks.append(block)
        
    stations_js = ",\n".join(station_blocks)
    
    js_content = f"""const votingData = {{
{PREVIOUS_DATA}
  
  // 今回 (令和8年6月7日執行 中野区長選挙)
  current: {{
    title: "令和8年6月7日執行 中野区長選挙",
    dateRange: ["6/1(月)", "6/2(火)", "6/3(水)", "6/4(木)", "6/5(金)", "6/6(土)"],
    stations: {{
{stations_js}
    }}
  }}
}};
"""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    print(f"Wrote data.js.")

def update_index_html_version(timestamp):
    # Overwrite the cache busting version parameter in index.html OGP tags
    index_path = "index.html"
    if not os.path.exists(index_path):
        print("index.html not found, skipping version update.")
        return
        
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()
        
    html_updated = re.sub(r'ogp-image\.png(?:\?v=\d+)?', f'ogp-image.png?v={timestamp}', html)
    
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(html_updated)
    print(f"Updated index.html OGP image version tag to ?v={timestamp}")

def recreate_ogp_image():
    browser_path = find_chrome()
    if not browser_path:
        print("Cannot recreate OGP: Browser (Chrome/Edge) not found.")
        return False
        
    print(f"Using browser for OGP generation: {browser_path}")
    
    # 1. Prepare index_screenshot.html with injected CSS to crop header/metrics
    with open("index.html", "r", encoding="utf-8") as f:
        html = f.read()

    style_inject = """
    <style>
        .app-header { display: none !important; }
        .stats-grid { display: none !important; }
        .controls-panel { display: none !important; }
        .app-container { padding: 16px !important; gap: 16px !important; }
        .chart-card { min-height: 280px !important; height: 280px !important; }
        .charts-grid { gap: 16px !important; }
    </style>
    """
    html_modified = html.replace("</head>", f"{style_inject}\n</head>")

    temp_html = "index_screenshot.html"
    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_modified)

    temp_screenshot = "temp_charts_screenshot.png"
    
    # 2. Start a background python server to serve the temporary layout
    server_process = subprocess.Popen(["python", "-m", "http.server", "8000"])
    time.sleep(2) # Allow server to bind
    
    # 3. Take screenshot
    cmd = [
        browser_path,
        "--headless",
        "--disable-gpu",
        "--window-size=1200,630",
        f"--screenshot={os.path.abspath(temp_screenshot)}",
        "http://localhost:8000/index_screenshot.html"
    ]
    
    print("Capturing layout screenshot...")
    try:
        subprocess.run(cmd, check=True)
        print("Capture completed.")
    except Exception as e:
        print("Capture failed:", e)
        server_process.terminate()
        server_process.wait()
        if os.path.exists(temp_html): os.remove(temp_html)
        return False

    # Stop server
    server_process.terminate()
    server_process.wait()
    
    # 4. Open and process with Pillow
    time.sleep(0.5)
    base_image = Image.open(temp_screenshot).convert("RGBA")
    width, height = base_image.size
    
    overlay = Image.new("RGBA", base_image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Dark fade overlay (60% width)
    gradient_width = int(width * 0.60)
    for x in range(0, gradient_width):
        ratio = x / gradient_width
        opacity = int(245 * (1 - ratio ** 1.6))
        draw.line([(x, 0), (x, height)], fill=(10, 14, 23, opacity))
        
    # Cyan accent bar
    draw.rectangle([(40, 105), (46, 335)], fill=(6, 182, 212, 255))
    
    # Font Setup
    font_path = find_font()
    if not font_path:
        print("Font not found, using defaults.")
        font_large_title = ImageFont.load_default()
        font_tag = ImageFont.load_default()
        font_author = ImageFont.load_default()
        font_desc = ImageFont.load_default()
    else:
        print(f"Font loaded: {font_path}")
        font_large_title = ImageFont.truetype(font_path, 80)
        font_tag = ImageFont.truetype(font_path, 33)
        font_author = ImageFont.truetype(font_path, 33)
        font_desc = ImageFont.truetype(font_path, 22)
        
    # Draw texts
    draw.text((65, 105), "中野区長選挙　2026", font=font_tag, fill=(6, 182, 212, 255))
    
    draw.text(
        (65, 150), 
        "期日前投票状況", 
        font=font_large_title, 
        fill=(10, 14, 23, 255), 
        stroke_width=5, 
        stroke_fill=(255, 255, 255, 255)
    )
    
    draw.text(
        (65, 245), 
        "ダッシュボード", 
        font=font_large_title, 
        fill=(10, 14, 23, 255), 
        stroke_width=5, 
        stroke_fill=(255, 255, 255, 255)
    )
    
    draw.text((65, 345), "前回（令和4年）の投票ペースと日別・累計で比較可能", font=font_desc, fill=(156, 163, 175, 255))
    draw.line([(65, 395), (550, 395)], fill=(255, 255, 255, 20))
    draw.text((65, 415), "作成：子育て環境向上委員会@中野", font=font_author, fill=(255, 255, 255, 230))
    
    final_image = Image.alpha_composite(base_image, overlay)
    final_image.convert("RGB").save("ogp-image.png", "PNG")
    print("Recreated ogp-image.png successfully.")
    
    # Cleanup temp
    if os.path.exists(temp_html): os.remove(temp_html)
    if os.path.exists(temp_screenshot): os.remove(temp_screenshot)
    return True

def main():
    try:
        pdf_url = get_latest_pdf_url()
        temp_pdf = "latest_kutyou.pdf"
        
        # Download and Parse PDF
        download_pdf(pdf_url, temp_pdf)
        male_data, female_data = parse_pdf(temp_pdf)
        
        # Overwrite data.js
        generate_data_js(male_data, female_data, "data.js")
        
        # Update index.html OGP image URL with timestamp query parameter to bust cache
        timestamp = datetime.now().strftime("%Y%m%d%H%M")
        update_index_html_version(timestamp)
        
        # Recreate the OGP screenshot using the updated data.js content
        recreate_ogp_image()
        
        # Clean up temp PDF
        if os.path.exists(temp_pdf):
            os.remove(temp_pdf)
            
        print("Auto-update process completed successfully!")
    except Exception as e:
        print(f"Error occurred during auto-update: {e}")
        exit(1)

if __name__ == "__main__":
    main()
