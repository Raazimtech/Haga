# Halkas

**Never Lose the Location.**

Halkas is a lightweight location-sharing web app. A user captures their GPS position, Halkas creates a short code, and another person can use that code to find the saved point on an interactive map and draw a road route from their current position.

## Stack

- Static HTML/CSS/JavaScript — GitHub Pages friendly
- Supabase Postgres + RPC + Row Level Security
- Leaflet + OpenStreetMap for maps
- OSRM for in-map driving routes

## Supabase

The frontend uses the project's public publishable key. No service-role secret is shipped to the browser. Location rows are protected with RLS and expire automatically after 30 days.

## Run locally

Open `index.html` with a local static server, or deploy the repository to GitHub Pages. Browser geolocation works only in a secure context such as HTTPS or localhost.

Made by Raazim Tech.
