# Personal-Website
portfolio shit post etc

MP4 files in `assets/videos/` are tracked with Git LFS. Run `git lfs install` once on a new machine, then `git lfs pull` in the checkout to download the videos for local preview.

For local Unity preview, run `python -m http.server 8765` from the repository root and open `http://127.0.0.1:8765/`.

For GitHub Pages, set **Settings → Pages → Source** to **GitHub Actions**. The Pages workflow downloads the LFS videos and Unity build files and verifies them before packaging the site.
