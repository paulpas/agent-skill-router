# Migration Guide: database-migrations-skill → database-schema-management

## Why This Change Happened
This skill was deprecated because its functionality has been consolidated into a newer, more comprehensive skill.

## What Changes for You
1. Replace any `database-migrations-skill` trigger references with  
   `database-schema-management` triggers.
2. Update your `related-skills` field to point to  
   `database-schema-management` instead of `database-migrations-skill`.
3. Review the [SKILL.md for database-schema-management](./database-schema-management/SKILL.md)  
   for updated workflow steps.

## Timeline
- **Today:** Skill marked deprecated, auto-routing still active  
- **30 days:** Auto-routing gradually shifts to replacement skill  
- **90 days:** Deprecated skill removed from skills-index.json


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Flyway Documentation](https://flywaydb.org/documentation/)
- [Liquibase Reference Guide](https://www.liquibase.org/learn/reference/)
- [Alembic — Database Migration for SQLAlchemy](https://alembic.sqlalchemy.org/en/latest/)
- [Prisma Migrate: Schema Evolution](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Database Migration Best Practices - AWS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Tasks.AutoVersions.html)
