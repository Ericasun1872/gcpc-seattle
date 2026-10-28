# 시애틀 주은혜교회

Official visitor site for **시애틀 주은혜교회** (Grace Community Presbyterian Church - Seattle).

Korean default, English toggle. Pages: Home, 예배 안내, 교회소개, 설교, 소식, 헌금, 연락처.

**소식** is pastor/admin posts only: 공지 (notice), 주보 (bulletin), 행사 (event). There is no member writing, comments, login, or write form. Weekly life still lives on [YouTube](https://www.youtube.com/@gcpc.seattle) and [Instagram](https://www.instagram.com/gcpc.seattle). Kakao appears only if the church provides a link.

## Edit times or address

Change `js/church.js` only. Do not invent parking, doors, kids ministry, phone, extra giving methods, or a domain. Giving on the site is check (pay to GCPC) and Zelle only.

## Add a notice

Edit `data/notices.json`. Set `category` to `notice`, `bulletin`, or `event`. Delete the labeled sample first. Do not invent church news. Optional `link` is http/https only.

## Preview locally

```bash
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/`.

The home hero watercolor is a light watermark over the painting (no heavy white card). Seasons cycle slowly through spring → summer → autumn → winter. Pin one with `?season=spring|summer|autumn|winter`.

## Publish

Official repo: [Ericasun1872/gcpc-seattle](https://github.com/Ericasun1872/gcpc-seattle). Do **not** put this site in `Ericasun1872/Erica-Sun`.

After this branch merges to `main`, enable GitHub Pages from the default branch, site root. Do not attach a domain until the church chooses one. Do not use `gcpc.church` (another congregation).
