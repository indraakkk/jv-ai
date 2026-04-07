# Frontend Domain Layer

## When to use

When working with React components, routing, forms, or UI.

## Stack

- **React 19** with concurrent features
- **React Aria Components** for accessible UI
- **TanStack Router** for type-safe routing
- **TanStack Query** for data fetching
- **TanStack Form** for forms
- **TailwindCSS 4** for styling

## Routing

```typescript
// Type-safe navigation
import { Link } from '@tanstack/react-router';
<Link to="/users/$userId" params={{ userId: user.id }} />
```

## Key Patterns

- Components in `src/components/`
- Routes in `src/routes/`
- Use TanStack Query for all data fetching
- Use TanStack Form for form handling with validation
- Use React Aria Components for accessible interactive elements
- Use TailwindCSS 4 utility classes for styling
