import urllib.request
import re
import os
import pypdf

# Config
BASE_URL = "https://www.city.tokyo-nakano.lg.jp/kusei/senkyo/news/"
MAIN_PAGE = BASE_URL + "0237323820231016122829781.html"
STATIONS = ["区役所", "南部すこやか", "東部", "江古田", "野方", "鷺宮"]

# Previous election data (reference data, static)
PREVIOUS_DATA = """  // 前回 (令和4年5月22日執行 中野区長選挙)
  previous: {
    title: "令和4年5月22日執行 中野区長選挙",
    dateRange: ["5/16(月)", "5/17(火)", "5/18(水)", "5/19(木)", "5/20(金)", "5/21(土)"],
    stations: {
      "区役所": [721, 1101, 1543, 1895, 2298, 3105],
      "南部すこやか": [149, 293, 412, 509, 666, 1064],
      "東部": [134, 216, 385, 460, 539, 906],
      "江古田": [85, 152, 262, 331, 407, 719],
      "野方": [174, 293, 432, 503, 704, 1111],
      "鷺宮": [189, 312, 340, 492, 723, 988]
    }
  },"""

def get_latest_pdf_url():
    print(f"Fetching main page: {MAIN_PAGE}")
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    req = urllib.request.Request(MAIN_PAGE, headers=headers)
    
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
    
    # We locate the section starting with id="sokuhou" to ensure we get the turnout report
    # and find the PDF file matching the MMDDkutyou.pdf format
    sokuhou_part = html.split('id="sokuhou"')
    if len(sokuhou_part) < 2:
        raise ValueError("Could not find 'sokuhou' section in the page HTML.")
    
    sokuhou_html = sokuhou_part[1].split('</div>')[0] # Get the immediate HTML block
    
    # Find MMDDkutyou.pdf links
    pdf_match = re.search(r'href="([^"]*?\d{4}kutyou\.pdf)"', sokuhou_html)
    if not pdf_match:
        # Fallback to scanning the whole page if structure changed
        print("sokuhou section match failed, falling back to full page regex...")
        pdf_match = re.search(r'href="([^"]*?\d{4}kutyou\.pdf)"', html)
        
    if not pdf_match:
        raise ValueError("Could not find the latest daily report PDF link in HTML.")
        
    pdf_rel_path = pdf_match.group(1)
    # Handle absolute vs relative urls
    if pdf_rel_path.startswith("http"):
        pdf_url = pdf_rel_path
    else:
        pdf_url = BASE_URL + pdf_rel_path
        
    print(f"Found latest PDF URL: {pdf_url}")
    return pdf_url

def download_pdf(url, output_path):
    print(f"Downloading PDF from {url} to {output_path}")
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response, open(output_path, "wb") as out_file:
        out_file.write(response.read())
    print("Download completed successfully.")

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
                    break # Matched this line, go to next line

    print(f"Found {len(station_matches)} station rows in the PDF.")
    
    if len(station_matches) < 12:
        # Debug print lines to see what happened
        print("=== PDF Text Debug ===")
        for line in lines:
            print(line)
        print("======================")
        raise ValueError(f"Expected at least 12 station rows (6 male, 6 female), but found {len(station_matches)}")

    # Parsing rules:
    # First 6 matches are Male
    # Next 6 matches (7-12) are Female
    for idx, (station, nums) in enumerate(station_matches):
        # The numbers are: [Day 1, Day 2, ..., Day N, Cumulative]
        # We drop the last number (cumulative) to get the daily counts
        daily_votes = nums[:-1]
        padded_votes = daily_votes + [None] * (6 - len(daily_votes))
        
        if idx < 6:
            male_data[station] = padded_votes
        elif idx < 12:
            female_data[station] = padded_votes
            
    return male_data, female_data

def generate_data_js(male_data, female_data, output_path):
    print(f"Generating updated JS file: {output_path}")
    
    station_blocks = []
    for s in STATIONS:
        # Convert python lists to JS arrays (None -> null)
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
        
    print(f"Successfully wrote data.js to {output_path}")

def main():
    try:
        pdf_url = get_latest_pdf_url()
        temp_pdf = "latest_kutyou.pdf"
        
        # Download and Parse
        download_pdf(pdf_url, temp_pdf)
        male_data, female_data = parse_pdf(temp_pdf)
        
        # Overwrite data.js
        generate_data_js(male_data, female_data, "data.js")
        
        # Clean up temp PDF
        if os.path.exists(temp_pdf):
            os.remove(temp_pdf)
            
        print("Auto-update process completed successfully!")
    except Exception as e:
        print(f"Error occurred during auto-update: {e}")
        exit(1)

if __name__ == "__main__":
    main()
