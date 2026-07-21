---
type: Person
title: Site Visitor
description: A site visitor is an unauthenticated person who lands on the marketing site to explore what's on offer before any account or session context exists. In the architecture map, this person type sits upstream of the marketing webapp, representing the entry point into the system for anyone arriving from search, ads, or direct navigation.
level: context
external: true
icon: user.svg
---

This person interacts with the template-marketing-webapp-nextjs by browsing its pages, viewing content such as product information, pricing, or landing pages without triggering authenticated flows. The relationship is one-directional and read-oriented: the visitor consumes what the marketing site renders, making this the starting node for tracing how outside traffic first touches the application.

# Relations

- [Template Marketing Webapp Nextjs](template-marketing-webapp-nextjs.md) — Browses the marketing site's pages {kind: sync}
