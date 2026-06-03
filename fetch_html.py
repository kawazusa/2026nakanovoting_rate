import urllib.request
import re

url = "https://www.city.tokyo-nakano.lg.jp/kusei/senkyo/news/0237323820231016122829781.html"
try:
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        print(f"HTML Length: {len(html)}")
        
        # Find all PDF links
        pdf_links = re.findall(r'href="([^"]+\.pdf)"', html)
        print("PDF links found in href attributes:")
        for link in pdf_links:
            print(link)
            
        # Write to file to inspect
        with open("page_source.html", "w", encoding="utf-8") as f:
            f.write(html)
            
except Exception as e:
    print(f"Error: {e}")
