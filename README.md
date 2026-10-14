# CopperTrace

Independent electronics, embedded systems and reverse-engineering notes.

This repository contains the source for **coppertrace.co.uk**.

## P200 browser-control milestone · 14 October 2026

The ToolkitRC P200 V1 project now has a verified Labrax Bench Control prototype:

- Adjustable main voltage and current limit, with confirmed OUTPUT ON/OFF.
- APPLY automatically performs OFF → verified SET → ON when the output was initially ON.
- Main voltage/current/power measurements and optional Live polling at approximately 1 s.
- USB-C identity and measurements, plus physically verified USB OFF/AUTO.
- One Pico USB bridge per modified P200, independent of RIDEN.
- Separate 12 V / 5 A source support with a 54 W shared host budget that reserves measured USB power.

Bench tests confirmed 5 V output, a 5 → 6 V APPLY while ON, and USB OFF/AUTO restoring 5.1 V / 1.4 A on a TC64. The integration validation passed 40 adapter tests, six API tests, 18 frontend cases and ten ARM firmware tests. These tests were completed on 10 October; the public record was expanded on 14 October.

Read the [English engineering record](docs/toolkitrc-p200.md), [Polish record](docs/toolkitrc-p200.pl.md), or the [project page](https://coppertrace.co.uk/projects/toolkitrc-p200/).

This is a prototype record, not a firmware release for all P200 revisions. Command bounds of 1–30 V / 1–10 A do not establish full-range load validation. USB AUTO uses factory negotiation; full-device POWER and LCD removal are not supported by the verified setup. No vendor firmware dumps, unit calibration data or device credentials are distributed here.

## Stack

- Astro
- Static HTML/CSS
- Cloudflare Pages
- GitHub

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Cloudflare Pages build command: `npm run build`  
Build output directory: `dist`
