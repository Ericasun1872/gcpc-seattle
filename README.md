# 시애틀 주은혜교회

Official visitor site for **시애틀 주은혜교회** (Grace Community Presbyterian Church - Seattle).

Korean default, English toggle. Pages: Home, 예배 안내, 교회소개, 설교, 소식, 헌금, 연락처.

**소식** is pastor/admin posts only: 공지 (notice), 주보 (bulletin), 행사 (event). There is no member writing, comments, login, or write form. Weekly life still lives on [YouTube](https://www.youtube.com/@gcpc.seattle) and [Instagram](https://www.instagram.com/gcpc.seattle). Kakao appears only if the church provides a link.

## Edit times or address

Change `js/church.js` only. Do not invent parking, doors, kids ministry, phone, extra giving methods, or extra domains. Giving on the site is check (pay to GCPC) and Zelle only. Public site: **gcpcseattle.org**.

## Add a notice

Edit `data/notices.json`. Set `category` to `notice`, `bulletin`, or `event`. Delete the labeled sample first. Do not invent church news. Optional `link` is http/https only.

## Sermons from YouTube

The 설교 page lists recent uploads from [@gcpc.seattle](https://www.youtube.com/@gcpc.seattle). Titles stay in Korean as published. Do not invent sermons.

`data/sermons.json` is refreshed by `.github/workflows/refresh-sermons.yml` (daily, or **Actions → Refresh YouTube sermons → Run workflow**). The script reads the public uploads RSS (`playlist_id=UUjffs0ZHxlv9bitLbmEolVQ`). If YouTube’s RSS is down (it often answers 404), it reads the public Videos tab instead. No YouTube API key.

To refresh locally:

```bash
python3 scripts/refresh-sermons.py --out data/sermons.json
```

`js/church.js` `sermons` is a fallback and can add scripture/kind for a matching video id. The featured player also embeds the uploads playlist so a new video can appear before the next refresh.

## Preview locally

```bash
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/`.

The home hero watercolor is a light watermark over the painting (no heavy white card). Seasons cycle slowly through spring → summer → autumn → winter. Pin one with `?season=spring|summer|autumn|winter`.

## Publish

Official repo: [Ericasun1872/gcpc-seattle](https://github.com/Ericasun1872/gcpc-seattle). Do **not** put this site in `Ericasun1872/Erica-Sun`.

GitHub Pages publishes from `main`, site root. Custom domain file is `CNAME` → **gcpcseattle.org**. Do not add other domains. Do not use `gcpc.church` (another congregation).

Until Porkbun DNS points at GitHub Pages and HTTPS finishes, the site still loads at [ericasun1872.github.io/gcpc-seattle](https://ericasun1872.github.io/gcpc-seattle/). Page links and assets are relative, so they work at the domain root and at `/gcpc-seattle/`.
