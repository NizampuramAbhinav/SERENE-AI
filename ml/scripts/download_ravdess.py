"""
RAVDESS Speech-Only Dataset Downloader for SERENE AI.

Source:
- Ryerson Audio-Visual Database of Emotional Speech and Song (RAVDESS)
- Zenodo Record: https://zenodo.org/records/1188976
- Archive: Audio_Speech_Actors_01-24.zip (~208 MB)
- Official MD5: bc696df654c87fed845eb13823edef8a
- Licence: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)
- Citation: Livingstone SR, Russo FA (2018) The Ryerson Audio-Visual Database of Emotional
  Speech and Song (RAVDESS): A dynamic, multimodal set of facial and vocal expressions
  in North American English. PLoS ONE 13(5): e0196391.
"""

from pathlib import Path
import hashlib
import zipfile
import requests
from tqdm import tqdm

ZENODO_URLS = [
    "https://zenodo.org/records/1188976/files/Audio_Speech_Actors_01-24.zip?download=1",
    "https://zenodo.org/record/1188976/files/Audio_Speech_Actors_01-24.zip"
]
EXPECTED_MD5 = "bc696df654c87fed845eb13823edef8a"

DEST_DIR = Path(__file__).resolve().parent.parent / "datasets" / "ravdess"
ZIP_PATH = DEST_DIR / "Audio_Speech_Actors_01-24.zip"

def download_and_extract_ravdess():
    DEST_DIR.mkdir(parents=True, exist_ok=True)
    
    # Check if files already extracted
    actor_dirs = list(DEST_DIR.glob("Actor_*"))
    if len(actor_dirs) == 24:
        total_wavs = len(list(DEST_DIR.rglob("*.wav")))
        if total_wavs == 1440:
            print(f"RAVDESS speech dataset already extracted with all {total_wavs} WAV files in 24 actor folders.")
            return

    # Download archive if not present
    if not ZIP_PATH.exists():
        print(f"Downloading RAVDESS speech dataset from Zenodo to {ZIP_PATH}...")
        downloaded = False
        for url in ZENODO_URLS:
            try:
                print(f"Attempting download from: {url}")
                with requests.get(url, stream=True, timeout=120) as resp:
                    resp.raise_for_status()
                    total_size = int(resp.headers.get("content-length", 0))
                    
                    with open(ZIP_PATH, "wb") as f, tqdm(
                        total=total_size, unit="B", unit_scale=True, desc="RAVDESS Download"
                    ) as pbar:
                        for chunk in resp.iter_content(chunk_size=65536):
                            if chunk:
                                f.write(chunk)
                                pbar.update(len(chunk))
                downloaded = True
                print("Download completed.")
                break
            except Exception as e:
                print(f"Download from {url} failed: {e}")
                if ZIP_PATH.exists():
                    ZIP_PATH.unlink()
        
        if not downloaded:
            raise RuntimeError("Failed to download RAVDESS archive from Zenodo.")

    # Verify MD5 Checksum
    print(f"\nVerifying MD5 checksum for {ZIP_PATH}...")
    hasher = hashlib.md5()
    with open(ZIP_PATH, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    computed_md5 = hasher.hexdigest().lower()
    
    print(f"  Computed MD5: {computed_md5}")
    print(f"  Expected MD5: {EXPECTED_MD5}")
    
    if computed_md5 != EXPECTED_MD5:
        print("Warning: MD5 checksum mismatch. Re-verifying archive structure before proceeding...")
    else:
        print("Checksum verification PASSED!")

    # Extract Archive
    print(f"\nExtracting archive to {DEST_DIR}...")
    with zipfile.ZipFile(ZIP_PATH, "r") as zip_ref:
        zip_ref.extractall(DEST_DIR)
    print("Extraction complete.")

    # Remove zip file after successful extraction to save disk space
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
        print(f"Removed temporary archive: {ZIP_PATH.name}")

    # Verify extraction
    extracted_actors = sorted(DEST_DIR.glob("Actor_*"))
    extracted_wavs = list(DEST_DIR.rglob("*.wav"))
    print(f"\nVerification:")
    print(f"  Actor folders found: {len(extracted_actors)} / 24")
    print(f"  WAV files found: {len(extracted_wavs)} / 1440")
    if len(extracted_actors) == 24 and len(extracted_wavs) == 1440:
        print("RAVDESS Speech dataset successfully downloaded and verified!")
    else:
        print("Warning: Expected 24 actor folders and 1440 WAV files. Please check extraction.")

if __name__ == "__main__":
    download_and_extract_ravdess()

