# Haga

**Never Lose the Location.**

Haga is a location-sharing web app that turns an exact GPS position into a short code. Share the code with anyone, let them find the saved point on an interactive map, and guide them there with live in-app routing.

The public homepage is an SEO-focused product landing page. The actual app lives at `app.html` and keeps the original app experience, bottom navigation, maps, location creation, finding, history, and PWA installation flow.

## Stack

- Static HTML/CSS/JavaScript
- Supabase Postgres + RPC + Row Level Security
- Leaflet + OpenStreetMap for maps
- OSRM for in-app driving routes
- Progressive Web App with service worker

## Security

The frontend uses the project's public publishable key. No service-role secret is shipped to the browser. Location rows are protected with RLS and expire automatically after 30 days.

## SEO

The homepage includes a descriptive title and meta description, canonical URL, Open Graph and Twitter metadata, WebApplication structured data, robots.txt, sitemap.xml, semantic content, and a separate non-indexed app route.

## Run locally

Serve the repository with a local static server and open `index.html`. Use the installed app or `app.html` to enter the application. Browser geolocation requires HTTPS or localhost.

Made by Raazim Tech.
