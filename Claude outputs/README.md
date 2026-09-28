# BILAG Steroid Taper Calculator

A standalone, client-side prednisolone tapering calculator for SLE / lupus
nephritis, styled to match the BILAG website. Runs entirely in the browser —
no server, no analytics, no patient identifiers collected or stored anywhere.

## What it does

- Computes a day-by-day prednisolone tapering schedule from any of the
  standard Mild / Moderate / Severe / LN regimens, or a fully custom plan.
- Generates a QR code (and Email / Text / Share buttons) that hand the same
  schedule to a patient's phone via a link with the plan encoded in its
  parameters — nothing is uploaded or stored server-side.
- Offers a print/PDF view and a CSV export of the schedule.

## Deploying

This is a single self-contained `index.html` — no build step. To publish it
on GitHub Pages:

1. Create a new repository on GitHub (keep it separate from the main BILAG
   website repo) and push this folder's contents to its default branch.
2. In the repo's **Settings → Pages**, set the source to that branch (root).
3. GitHub will publish it at `https://<your-username>.github.io/<repo-name>/`.

The page reads its own address at load time (`window.location.href`), so it
works unmodified at whatever URL it ends up published at — nothing inside
the file needs to be edited to match the final domain.

## A note on "private"

A GitHub Pages site is a public URL by default — anyone with the link can
open it, whether or not the source repository itself is private. Making the
*published page* actually restricted to signed-in collaborators (not just
unlisted) requires GitHub Pro (personal accounts) or GitHub Team/Enterprise
(organizations), with the repository's Pages visibility explicitly set to
"Private" in Settings → Pages. Without that plan, treat the URL as unlisted
rather than access-controlled: don't link it from anywhere public, and share
it only via the QR/link you generate yourself.

Adapted, with permission, from a glucocorticoid-tapering tool developed at
Leeds Teaching Hospitals NHS Trust / University of Leeds (Ed Vital),
originally based on the Steroid Tapering Communication Tool developed by
Dr Sarah L Mackie.
