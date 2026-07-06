---
type: React Component
title: Contentful Context
description: ContentfulContext is a React Component within the template-marketing-webapp-nextjs template, providing a context layer that connects the application's UI components to content managed in Contentful. It is used to make Contentful-sourced data available throughout the component tree without requiring each component to fetch or receive that data directly through props.
level: component
owner: contentful/team-workflows
---

ContentfulContext is a React Component within the template-marketing-webapp-nextjs template, providing a context layer that connects the application's UI components to content managed in Contentful. It is used to make Contentful-sourced data available throughout the component tree without requiring each component to fetch or receive that data directly through props.

As a context provider, it fits into the broader Next.js marketing web app architecture as the mechanism by which page and component code can access Contentful content in a consistent, centralized way. Components nested within the application can consume this context to render content pulled from Contentful, supporting the template's overall goal of building a marketing site backed by a headless CMS.
