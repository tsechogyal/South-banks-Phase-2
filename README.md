# South Banks Phase 2 landing page

Static one-page site. No framework, no build step for the page itself. Upload the repo
(minus `node_modules/` and `assets/images/source/`) to any static host.

```
index.html            page + all CSS (inlined so the first paint needs one request)
assets/js/main.js     slideshow, scroll reveals, form, WhatsApp button (~9 KB, no libraries)
assets/images/opt/    generated AVIF/WebP files, do not edit by hand
assets/images/source/ original renderings (input to the image script)
scripts/              image pipeline
```

## Adding the renderings

The hero slideshow and gallery are generated from the files in `assets/images/source/`.
The script looks for the filenames listed in `IMAGES` at the top of
`scripts/build-images.mjs`. The hero uses the first six that exist, in that order.
In place now: Elevations A and C (from the floor plan PDF covers), Package A/B/C kitchens,
Shoreline Aerial, Lakeview Village Site Plan, Amenity Plan, and plan drawings for all six
models. Not yet added: `South Banks Street View.png` and `South Banks Rooftop Terrace.png`.

Drop the originals in, then:

```
npm install
npm run images
```

That writes AVIF + WebP at several widths, a 9:16 crop for phones, the social share image,
and updates the hero, preload and gallery markup in `index.html`. Missing files are skipped.
To change the phone crop of an image, edit its `focus` value in `scripts/build-images.mjs`.

## Registration form

Each registration is emailed to tsechogyal@gmail.com through FormSubmit (formsubmit.co, free,
no account). FormSubmit also sends the person an automatic thank-you email; the text is
`AUTO_REPLY` in `assets/js/main.js`. Nothing is stored anywhere else.

One-time activation: the first registration after the site goes live does not arrive as a lead.
FormSubmit sends an "Activate form" email to tsechogyal@gmail.com instead. Click the button in
it, then submit a test registration again to confirm leads and auto-replies arrive.

UTM parameters and `fbclid` from ad links are included in each lead email as "Ad source".

## Before going live

- Once the domain is known, add `<link rel="canonical">`, make the `og:image` URL absolute,
  and add `robots.txt` + `sitemap.xml`.
- Serve with long cache headers on `assets/` (files are content-stable) and gzip/brotli on HTML/JS.
