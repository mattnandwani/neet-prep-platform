# NEET Prep Platform

A student-first NEET preparation platform built with React, TypeScript, Vite and Supabase.

## Current status

This repository is the application foundation. Features are added in working, testable stages; a feature is not considered complete until its behavior and security have been verified.

## Requirements

- Node.js 20+
- npm
- A Supabase project for database and authentication

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Run `npm install`.
4. Run `npm run dev`.

Never put Supabase secret/service-role keys or database passwords in frontend environment variables.

## Database

SQL migrations are in `supabase/migrations`. Review and apply migrations to your Supabase project deliberately. RLS policies are included for user-owned records.

## Deployment

Cloudflare Pages build settings:
- Build command: `npm run build`
- Build output directory: `dist`

Set the two `VITE_SUPABASE_*` environment variables in the Cloudflare project settings before deploying.
