# Ashley Caselli Personal Website

A personal website whose content lives entirely in the nanopublication network,
built with [nanopub-hugo](../nanopub-hugo).

There are no written content files in this repository. Four sections are
declared in `hugo.toml`, each one pointing at a **view nanopublication** already
published in the network; every result row becomes a Hugo page with a permalink,
a date, taxonomy terms, and a link back to the nanopub it came from.

The current build produces **45 pages** from live data for ORCID
`0000-0001-8492-0354`.

## Run it

```sh
hugo server
```

The theme comes from the published module, declared in `hugo.toml`:

```toml
[[module.imports]]
path = 'github.com/Nanopublication/nanopub-hugo'
```

`go.mod` pins the exact version and `go.sum` records its checksum, so a build
here and a build in CI use the same theme. This needs a Go toolchain — Hugo
resolves modules through Go. Both files are committed; a fresh clone needs
nothing but `hugo`.

The pin is a release tag. To move it:

```sh
hugo mod get -u github.com/Nanopublication/nanopub-hugo        # latest release
hugo mod get github.com/Nanopublication/nanopub-hugo@v1.0.0    # a specific one
```

To develop the theme and this site side by side without publishing every
change, point the module at a local checkout — nothing else in `hugo.toml`
changes:

```sh
HUGO_MODULE_REPLACEMENTS="github.com/Nanopublication/nanopub-hugo -> $PWD/../nanopub-hugo" hugo server
```

The path must be **absolute**. A relative one is resolved against the project
root in a way that drops the `..`, and Hugo then reports the module as missing
from `themes/`. The same string works in `hugo.toml` as
`[module] replacements = '…'`, which is why the env var is easier — it keeps an
absolute local path out of a committed file.

## What is where

```
hugo.toml                    every section, every view — the whole content model
go.mod / go.sum              the pinned theme version
assets/style.css             the entire design, one file
content/events/              the one section this site builds itself
layouts/baseof.html          page shell
layouts/home.html            front page: each section, capped
layouts/section.html         a section, grouped by year when items are dated
layouts/events/              the Events page and one event, as cards
layouts/page.html            one nanopub
layouts/term.html            a taxonomy term (venue, role)
layouts/_partials/           header, nav, footer, list item, event card
```

## The sections

| Section | View | Query it resolves to | Mode |
| --- | --- | --- | --- |
| Publications | `papers-for-author-view` | `get-papers-for-author` | static |
| Talks | `presentations-view` | `get-presentations-by-speaker` | static |
| Events — Attending | `planned-event-attendance-view` | `get-future-planned-event-attendances` | static |
| Events — Interested in | `observed-events-view` | `get-observed-events-of-user` | static |
| Activity | `latest-nanopubs-by-user-view` | `get-latest-nanopubs-by-user` | **live** |

Activity is queried in the visitor's browser by `<nanopub-list>` rather than at
build time, so it is always current without a rebuild.

Events and Talks are built by this site rather than by the module, because two
of the rows in that table land on one page and because both pages need more than
their views return. Events first, then Talks.

## Events

Two of the rows in that table land on one page. `content/events/_content.gotmpl` runs both views,
normalises them — one dates an event with a single day, the other with a
"start – end" literal, and a card should not have to know which — and tags each
page with the group it belongs to. The section carries `sourcedLocally = true`
so the module's adapter leaves it alone; a site-level content adapter *adds to*
the module's rather than replacing it, so without that flag every row would be
published twice.

It also fills gaps in the data, because neither view says much about the event
itself — only that it was attended or watched. Three things are read from the
event's own space declaration instead:

| On the card | From | Where it is wired |
| --- | --- | --- |
| the title, when the view has none | `rdfs:label` | `params.nanopub.labelQuery` |
| the venue line | `schema:location` | the section's `facts.location` |
| the link out, below the title | `owl:sameAs` | the section's `facts.altId` |

The label is the one that matters most: a row with no label has nothing to be a
page about and is dropped, and the attendance view carries one only when the
attendance was recorded with it — which today is never. Each fact costs one
cached request per event, so a cold build of this section makes about thirty.

A card links to the event's space as a whole — the title's link is stretched
over the card in CSS — and the venue, the event's own site and the `np` chip
stay separately clickable inside it. All four open in a new tab: every link on
the card leaves the site.

Events are the one section with no page per row. Everything the network records
about an event fits on its card, and the card points at the event's own space
for the rest, so a page under `/events/<slug>/` would be a dead end. The adapter
still creates the pages — that is how the layout groups and sorts them — but
marks each one `render: false` and `list: "local"`, which keeps it out of
`public/` and out of the sitemap while leaving it in this section's `.Pages`.

## Talks

The presentations view returns a title and not much else. Its query asks for the
date under `dct:date` and for the event's label inside the presentation's own
assertion, and presentations in the network carry neither — the date is
`schema:startDate` on the presentation, and an event's label belongs to the
event's space declaration. So every talk was undated, which is why the page had
no years in it, and no event name.

`content/talks/_content.gotmpl` fills all three in, and the page is a list per
year with the event a talk was given at above its title:

| On the item | From | Where it is wired |
| --- | --- | --- |
| the date, and so the year heading | `schema:startDate` | the section's `facts.startDate` |
| the place | `schema:location` | the section's `facts.location` |
| the event name | `rdfs:label` on the event | `params.nanopub.labelQuery` |

Talks have no page per row either, for the same reason events do not.

## Facts

A `facts` entry on a section names a published query, which of its parameters
take which bindings of the row being enriched, the property whose row to pick
out of the query's key-value answer, and the variable holding the value. One
partial, `nanopub/row-fact.html`, serves all of them — which is why a query
keyed on an event and a query keyed on both a nanopub and the thing it
introduces need no code of their own.

`match` is a list because both spellings of the schema.org namespace are in use
in the network, `http://` and `https://`, and which one a nanopublication
carries is the publisher's choice rather than a fact about the thing. A row that
is missing a binding a query needs asks nothing at all, so a talk with no event
simply has no event name rather than a failed lookup.

## Views, not queries

Each section names a view rather than a query. A view is a published statement
about how a resource should be presented, and it already records both halves of
the wiring a section needs:

```turtle
sub:papers-for-author-view a gen:ResourceView, gen:TabularView ;
  dct:title                   "📚 My Papers" ;
  gen:hasStructuralPosition   "4.4.1.papers" ;
  gen:hasViewQuery            <…/get-papers-for-author> ;   # which query
  gen:hasViewQueryTargetField "author" .                    # which parameter is me
```

So a section stops repeating what the network already says:

```toml
query = 'https://w3id.org/np/RA-SYwh…'      view = 'https://w3id.org/np/RAR5Qf…/papers-for-author-view'
[params.nanopub.sections.queryParams]   →
author = '$ORCID'
```

The view's `dct:title` and `gen:hasStructuralPosition` are deliberately **not**
used. A view describes the data; what the section is called and where it sits in
the nav is this site's business, so `title` and `weight` stay in `hugo.toml`.
`fields` stays too — a view says nothing about which result variable is the
title or the date.

The views here are the ones enabled on the corresponding Nanodash profile.
To see that list, and the others available:

```sh
curl -s -G 'https://query.knowledgepixels.com/api/RAkRcVrWX-5a2wXXp6A7W7XzmubUdRSe7wDS-PeH6GvgI/list-view-displays' \
  --data-urlencode 'resource=https://orcid.org/0000-0001-8492-0354' \
  -H 'Accept: application/sparql-results+json' | jq -r '.results.bindings[] | "\(.position.value)\t\(.view_label.value)"'
```

## Making it yours

1. Change `params.nanopub.orcid`. The header — name, avatar, introduction,
   signing keys, nanopub count — comes from the network, so that one line
   updates it.
2. Change `title`, `params.tagline` and `params.links`.
3. Replace the sections with views that suit you — the ones on your own Nanodash
   profile are a good starting list, and `list-view-displays` above returns them.
   Use `query` instead of `view` to point at a query directly. See the
   [nanopub-hugo README](../nanopub-hugo/README.md) for the field reference.

Note the settings this site must carry itself, because Hugo does not let a
module contribute them: `[security.http] mediaTypes`, `[security] allowContent`,
`[taxonomies]`, and `[caches.getresource] maxAge`. One more is not about
modules at all: `buildFuture`. Hugo leaves future-dated pages out of a build
unless it is set, and an events page is nothing but future-dated pages. All of
them are commented in `hugo.toml`.

### If a section renders empty

Suspect the cache first. Hugo's default `[caches.getresource] maxage` is `-1` —
never expire — so an empty or failed query result gets pinned and later `hugo`
runs never re-ask; the section stays empty long after the data lands in the
network. `hugo --gc` does not help (it prunes by age, and infinite never comes),
and `--ignoreCache` only bypasses the cache for that one build without replacing
what is stored. This site sets `maxAge = '24h'` so it heals on its own, but to
force a refresh now, delete the stored responses:

```sh
# macOS default cacheDir; Linux uses /tmp/hugo_cache_$USER or $XDG_CACHE_HOME
rm -rf ~/Library/Caches/hugo_cache/*/filecache/getresource
hugo
```

The entries live under `<cacheDir>/<project>/filecache/getresource`, one file
per request, each holding the raw HTTP response — so `grep`ing them tells you
what a build actually saw.

`verbose = true` under `[params.nanopub]` makes each build log a row per
section, which tells you whether the query returned nothing or the rows were
dropped for another reason:

```
WARN  nanopub-hugo: publications → 8 page(s) from RA-SYwh…/get-papers-for-author
```

To check the query itself, ask the endpoint directly — the same URL the build
uses, `<endpoint>api/<artifact-code>/<query-name>`:

```sh
curl -H 'Accept: application/sparql-results+json' \
  'https://query.knowledgepixels.com/api/RA-SYwh12YqSOePu9OX9VD94KVuoG69ddkE4XET_zJShY/get-papers-for-author?author=https://orcid.org/0000-0001-8492-0354'
```

## Deploying

Published at <https://ashleycaselli.github.io/>, which is a GitHub Pages *user*
site — it serves from the domain root, so `baseURL` has no path component and
every internal link the layouts emit (`/publications/`, `/style.css`) resolves
as-is. A project page under `/<repo>/` would need `baseURL` to carry that path.
For that URL, the repository has to be named `ashleycaselli.github.io`.

A build needs three things beyond the checkout: Hugo **extended** (the avatar is
resized at build time), a Go toolchain (Hugo resolves the theme as a module),
and network access to `query.knowledgepixels.com` (every section is a live
query). None of them are optional.

`.github/workflows/deploy.yml` does all of this: it installs Hugo extended,
reads the Go version from `go.mod`, restores the previous run's Hugo cache, and
publishes `public/` to Pages. It runs on pushes to `main`, on
`workflow_dispatch`, and **nightly** — new nanopublications appear without
anyone making a commit, so a timer is the only thing that puts them on the site.
The nightly run only re-reads the network because `[caches.getresource] maxAge`
is set; see **If a section renders empty** above.

The cache is restored, not required. A network failure or a bad response then
degrades to yesterday's content rather than a red deploy. The flip side is that
a hollowed-out build could publish quietly, so the workflow asserts that
`index.html`, `sitemap.xml`, and the Publications and Talks sections are all
non-empty before it uploads anything.

Two settings the workflow depends on, both easy to break:

- `HUGO_CACHEDIR` is set explicitly. On Linux with no `XDG_CACHE_HOME` — which
  is what a runner is — Hugo puts its cache under `$TMPDIR`, and nothing there
  survives to be cached between runs.
- Hugo must be the **extended** build. The avatar is cropped and re-encoded at
  build time, and plain Hugo cannot process images.
