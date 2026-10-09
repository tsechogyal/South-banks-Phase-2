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
no account). The registrant's thank-you email is sent from that Gmail account through EmailJS
(template `template_bwzms3u`; its wording is edited in the EmailJS dashboard). Fill in the
`EMAILJS` service ID and public key in `assets/js/main.js`; until then no thank-you is sent.
Nothing is stored anywhere else.

The form was activated on Oct 9, 2026 for https://southbanks-phase2.pages.dev and posts to
FormSubmit's alias for the address. Moving the site to a new domain triggers a new one-time
activation email.

UTM parameters and `fbclid` from ad links are included in each lead email as "Ad source".

## Live site

https://southbanks-phase2.pages.dev (Cloudflare Pages, uploaded by hand). To update it, upload
the site folder again as a new deployment of the `southbanks-phase2` project. If the domain
changes, update the canonical/og URLs in `index.html`, `robots.txt` and `sitemap.xml`.
