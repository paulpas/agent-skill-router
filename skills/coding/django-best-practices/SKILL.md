---
name: django-best-practices
description: Implements Django 5.x application patterns including modern project structure,
  ORM optimization, class-based and function views, DRF integration, async views,
  caching strategies, and settings management for production-ready web applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: django, django best practices, django project structure, orm optimization,
    class-based views, drf, django rest framework, django async, django caching, settings
    management, production django
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: fastapi-development
------

# Django Best Practices

Senior Django engineer building production-ready web applications using Django 5.x patterns and modern Python practices. This skill covers the full stack — from project architecture and ORM optimization to API design with DRF, async views, caching strategies, and environment-aware settings management.

## TL;DR Checklist

- [ ] Structure project with `config/` (project settings) and `apps/` (Django apps) directories
- [ ] Split settings per environment using `django-split-settings` or `django-environ`
- [ ] Use `select_related()` for ForeignKey lookups in loops, `prefetch_related()` for ManyToMany/ReverseForeignKey
- [ ] Replace `.count() + .all()` with `.exists()` for boolean checks
- [ ] Prefer function-based views for simple logic; use class-based views for complex, reusable patterns
- [ ] Put business logic in models and services — never in views
- [ ] Configure DRF pagination, throttling, and authentication classes globally
- [ ] Use Redis/Memcached as cache backend in production, never file-based caching
- [ ] Store all secrets via environment variables — never commit them to settings files
- [ ] Apply `@method_decorator(login_required)` or `LoginRequiredMixin` consistently on CBVs

