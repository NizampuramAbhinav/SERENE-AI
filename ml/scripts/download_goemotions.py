
from pathlib import Path
import requests
from tqdm import tqdm

BASE_URL = "https://raw.githubusercontent.com/google-research/google-research/master/goemotions/data"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "datasets" / "goemotions"

FILES = ["train.tsv", "dev.tsv", "test.tsv"]

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

for filename in FILES:
    url = f"{BASE_URL}/{filename}"
    destination = OUTPUT_DIR / filename

    print(f"\nDownloading {filename}...")

    response = requests.get(url, stream=True, timeout=60)
    response.raise_for_status()

    total = int(response.headers.get("content-length", 0))

    with open(destination, "wb") as file:
        with tqdm(total=total, unit="B", unit_scale=True) as progress:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file.write(chunk)
                    progress.update(len(chunk))

    print(f"Saved: {destination}")

print("\nGoEmotions dataset download completed.")
