import re

stations = ["区役所", "南部すこやか", "東部", "江古田", "野方", "鷺宮"]

def parse_txt(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    male_data = {s: [] for s in stations}
    female_data = {s: [] for s in stations}
    
    # We will search for the lines starting with the station names
    station_matches = []
    for line in lines:
        line = line.strip()
        for s in stations:
            # Match station name followed by numbers
            if line.startswith(s):
                # Split by whitespace, get the station name and numbers
                parts = line.split()
                if len(parts) > 1:
                    # Extract numbers, removing commas
                    numbers = []
                    for p in parts[1:]:
                        clean_p = p.replace(",", "")
                        if clean_p.isdigit():
                            numbers.append(int(clean_p))
                    station_matches.append((s, numbers))
                    break
                    
    print(f"Total station matches found: {len(station_matches)}")
    
    # The first 6 matches should be Male
    # The next 6 matches (7-12) should be Female
    for idx, (station, nums) in enumerate(station_matches):
        # We only need the daily votes, which exclude the last element (cumulative sum)
        daily_votes = nums[:-1]
        # Pad with null to length of 6
        padded_votes = daily_votes + [None] * (6 - len(daily_votes))
        
        if idx < 6:
            male_data[station] = padded_votes
        elif idx < 12:
            female_data[station] = padded_votes
            
    print("Parsed Male Data:")
    for s, v in male_data.items():
        print(f"  {s}: {v}")
        
    print("Parsed Female Data:")
    for s, v in female_data.items():
        print(f"  {s}: {v}")

if __name__ == "__main__":
    parse_txt("pdf_text_0603.txt")
