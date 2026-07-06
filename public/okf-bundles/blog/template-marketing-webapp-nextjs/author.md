---
type: React Component
title: Author
description: `author` is a React component in the marketing web app template built with Next.js. It belongs to the template-marketing-webapp-nextjs package and is used as part of the site's presentational layer, where author-related information is displayed within the app's component structure.
level: component
owner: contentful/team-workflows
---

`author` is a React component in the marketing web app template built with Next.js. It belongs to the template-marketing-webapp-nextjs package and is used as part of the site's presentational layer, where author-related information is displayed within the app's component structure.

The component relies on the `PersonFieldsFragment` type, which it imports from the generated types file associated with the `ctf-person` feature component. This suggests that `author` uses person-related data—likely to represent an author's details such as name or other profile fields—by consuming the shape defined for the `ctf-person` component's data.

# Relations

- [Ctf Person.Generated](ctf-person.generated.md) — Uses person data typed for the ctf-person component {kind: sync}
