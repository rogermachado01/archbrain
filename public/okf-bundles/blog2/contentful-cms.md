---
type: External System
title: Contentful Cms
description: Contentful CMS is an external content management system that supplies structured content to the application, sitting outside the core codebase as a hosted third-party service.
level: context
external: true
icon: generic-application.svg
---

As an External System, it is treated as a boundary dependency: the application queries it to retrieve content rather than owning or storing that content itself. This makes Contentful the authoritative source for whatever editorial or structured data it manages, with the application acting as a consumer of its content model.
