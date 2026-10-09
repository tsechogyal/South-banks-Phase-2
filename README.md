# South Banks Phase 2 landing page

Static one-page site. No framework, no build step for the page itself. Upload the repo
(minus `node_modules/` and `assets/images/source/`) to any static host.

```
index.html            page + all CSS (inlined so the first paint needs one request)
assets/js/main.js     slideshow, scroll reveals, form, WhatsApp button (~9 KB, no libraries)
assets/images/opt/    generated AVIF/WebP files, do not edit by hand
assets/images/source/ original renderings (input to the image script)
backend/              Google Apps Script for the registration form
scripts/              image pipeline
```

## Adding the renderings

The hero slideshow and gallery are generated from the files in `assets/images/source/`.
The script looks for the filenames listed in `IMAGES` at the top of
`scripts/build-images.mjs`. The hero uses the first six that exist, in that order.
In place now: Package A/B/C kitchens, Shoreline Aerial, Lakeview Village Site Plan,
Amenity Plan. Still missing (too large to pull from Drive):

- `South Banks Street View.png` (becomes the first hero slide)
- `South Banks Exterior - Elevation A.png`
- `South Banks Exterior - Elevation C.png`
- `South Banks Rooftop Terrace.png`

Drop the originals in, then:

```
npm install
npm run images
```

That writes AVIF + WebP at several widths, a 9:16 crop for phones, the social share image,
and updates the hero, preload and gallery markup in `index.html`. Missing files are skipped.
To change the phone crop of an image, edit its `focus` value in `scripts/build-images.mjs`.

## Registration form

1. Follow the steps at the top of `backend/apps-script.gs`. Lead alerts go to tsechogyal@gmail.com.
2. Paste the web app URL into `FORM_ENDPOINT` in `assets/js/main.js`.
3. Submit a test registration and check the row lands in the sheet and the alert email arrives.

Until the URL is set, the form asks visitors to use WhatsApp or call instead.

UTM parameters and `fbclid` from ad links are saved with each lead in the Source column.

## Before going live

- Once the domain is known, add `<link rel="canonical">`, make the `og:image` URL absolute,
  and add `robots.txt` + `sitemap.xml`.
- Serve with long cache headers on `assets/` (files are content-stable) and gzip/brotli on HTML/JS.
