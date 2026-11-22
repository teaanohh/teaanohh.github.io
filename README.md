# teaanohh.github.io

Charity Tan's portfolio site: a static site for GitHub Pages, served from the
root of this repository. It is published from `teaanohh/teaanohh.github.io`.

- `index.html`: the home page.
- `work/`: one page a project.
- `assets/`: images, the résumé and the videos. Every video is an ordinary
  file (GitHub Pages does not serve Git LFS content), each under 100 MB.
- `css/style.css`, `js/main.js`: the site's one stylesheet and one small
  script, shared by every page. No build step and no library; the fonts
  (Jersey 15 and Atkinson Hyperlegible) come from Google Fonts, except
  `assets/fonts/`: Atkinson Hyperlegible Bold's ten digits (OFL), which the
  pixel face uses for every number under 36px, where Jersey 15's 6 and 9
  read as 8s.

To see it locally: `python3 -m http.server 8765 --bind 127.0.0.1` in this
folder, then open `http://127.0.0.1:8765/`.
