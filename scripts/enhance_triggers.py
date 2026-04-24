#!/usr/bin/env python3
"""
Enhance Triggers with User-Friendly Language

Upgrades trigger keywords in all 239 skills to include:
- Conversational variants (non-technical language)
- Common user phrases ("how do I...", "what is...", "best practices...")
- Spelled-out versions of abbreviations
- Common colloquialisms

Maintains the 5-8 term limit by choosing the most distinctive triggers.
"""

import os
import re
import sys
import yaml
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime


class Colors:
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"


def build_trigger_enhancements() -> Dict[str, List[str]]:
    """
    Build a comprehensive map of trigger patterns to user-friendly variants.
    Maps technical triggers to common user phrases and conversational alternatives.
    """
    return {
        # AWS Services - Object/File Storage
        "s3": ["object storage", "file storage", "data storage", "backup storage"],
        "object storage": ["s3", "how do i store files"],
        # AWS Services - Compute
        "ec2": ["virtual machines", "servers", "how do i run a server", "hosting"],
        "lambda": [
            "serverless functions",
            "how do i run code",
            "functions as a service",
        ],
        "ecs": ["container services", "docker containers", "how do i run containers"],
        # AWS Services - Database
        "rds": ["managed databases", "database hosting", "sql databases"],
        "dynamodb": ["nosql database", "key-value store", "document database"],
        "elasticache": ["caching", "redis", "memcached"],
        # AWS Services - Network/CDN
        "cloudfront": ["cdn", "content delivery", "edge caching"],
        "elb": ["load balancer", "load balancing", "distribution"],
        "alb": ["application load balancer", "http routing"],
        "nlb": ["network load balancer", "tcp routing"],
        "route53": ["dns", "domain management", "routing"],
        # AWS Services - Security/Identity
        "iam": ["access control", "permissions", "user management"],
        "kms": ["encryption", "key management", "data protection"],
        "acm": ["ssl certificates", "tls certificates", "certificate management"],
        # AWS Services - Monitoring/Logging
        "cloudwatch": ["monitoring", "logging", "metrics", "observability"],
        "xray": ["distributed tracing", "tracing", "service map"],
        # AWS Services - Integration
        "sns": ["messaging", "notifications", "pub/sub"],
        "sqs": ["message queue", "queuing", "job queue"],
        "eventbridge": ["event routing", "event bus", "event-driven"],
        # AWS Services - Infrastructure
        "cloudformation": ["infrastructure as code", "iac", "templates"],
        "vpc": ["networking", "virtual network", "network architecture"],
        "subnets": ["network segmentation", "availability zones"],
        # Kubernetes/Container Orchestration
        "kubernetes": ["container orchestration", "k8s", "orchestrating containers"],
        "k8s": ["kubernetes", "container orchestration", "pod management"],
        "docker": ["containers", "containerization", "container images"],
        "pod": ["kubernetes pod", "container unit"],
        "deployment": ["kubernetes deployment", "rolling updates", "replication"],
        "kubectl": ["kubernetes cli", "k8s commands", "cluster management"],
        "helm": ["kubernetes package manager", "k8s charts", "helm charts"],
        "namespace": ["kubernetes namespace", "resource isolation"],
        "service": ["kubernetes service", "service discovery"],
        "ingress": ["kubernetes ingress", "http routing", "reverse proxy"],
        "statefulset": ["stateful workloads", "persistent state"],
        "daemonset": ["node-local services", "system services"],
        # Container Registries/Image Management
        "docker hub": ["container registry", "image repository"],
        "ecr": ["aws container registry", "image storage"],
        "harbor": ["private registry", "container images"],
        # Databases - Relational
        "postgresql": ["postgres", "relational database", "sql database"],
        "mysql": ["relational database", "sql database"],
        "mariadb": ["relational database", "sql database"],
        "oracle": ["enterprise database", "sql database"],
        "sql server": ["microsoft database", "sql database"],
        # Databases - NoSQL
        "mongodb": ["document database", "nosql database", "schema-less"],
        "cassandra": ["distributed database", "wide column store"],
        "dynamodb": ["nosql database", "serverless database"],
        "couchdb": ["document database", "json storage"],
        # Databases - Cache/In-Memory
        "redis": ["caching", "in-memory database", "cache store"],
        "memcached": ["caching", "session storage"],
        # Databases - Search
        "elasticsearch": ["search engine", "log search", "full-text search"],
        "opensearch": ["search engine", "distributed search"],
        "solr": ["search platform", "indexing"],
        # Monitoring/Observability
        "prometheus": ["metrics", "monitoring", "time-series database"],
        "grafana": ["dashboards", "visualization", "alerting"],
        "datadog": ["apm", "application performance monitoring"],
        "new relic": ["application monitoring", "performance insights"],
        "jaeger": ["distributed tracing", "request tracing"],
        "splunk": ["log analysis", "event processing"],
        # Logging
        "fluentd": ["log forwarding", "log collection", "log shipping"],
        "logstash": ["log processing", "log pipeline"],
        "filebeat": ["log shipping", "file monitoring"],
        # CI/CD
        "jenkins": ["ci/cd pipeline", "continuous integration", "automation"],
        "gitlab ci": ["continuous integration", "pipeline automation"],
        "github actions": ["workflow automation", "ci/cd"],
        "circleci": ["continuous integration", "workflow automation"],
        "travis ci": ["continuous integration", "build automation"],
        # Infrastructure as Code
        "terraform": ["infrastructure as code", "iac", "provisioning"],
        "cloudformation": ["infrastructure as code", "iac", "aws templates"],
        "ansible": ["configuration management", "automation", "provisioning"],
        "puppet": ["configuration management", "infrastructure automation"],
        "chef": ["configuration management", "infrastructure automation"],
        # Service Mesh
        "istio": ["service mesh", "traffic management", "service communication"],
        "linkerd": ["service mesh", "observability", "reliability"],
        # API Management
        "kong": ["api gateway", "api management", "rate limiting"],
        "ambassador": ["api gateway", "ingress controller"],
        "apigee": ["api management", "developer portal"],
        # Policy/Security
        "kyverno": ["kubernetes policies", "security policies", "policy enforcement"],
        "falco": ["runtime security", "threat detection"],
        "vault": ["secrets management", "credential storage"],
        # Data Processing/Streaming
        "kafka": ["message streaming", "event streaming", "data streaming"],
        "spark": ["distributed processing", "big data", "data processing"],
        "hadoop": ["distributed storage", "big data", "hdfs"],
        "flink": ["stream processing", "real-time processing"],
        "airflow": ["workflow orchestration", "data pipelines", "dag"],
        # ML/AI
        "machine learning": ["ml", "ai", "deep learning"],
        "tensorflow": ["ml framework", "deep learning"],
        "pytorch": ["ml framework", "deep learning"],
        "scikit-learn": ["machine learning", "sklearn"],
        "hugging face": ["nlp models", "transformers", "pre-trained models"],
        # Testing
        "testing": ["unit tests", "test automation", "quality assurance"],
        "pytest": ["python testing", "test framework"],
        "jest": ["javascript testing", "test framework"],
        "selenium": ["browser automation", "e2e testing"],
        "cypress": ["e2e testing", "web testing"],
        # Code Quality
        "linting": ["code quality", "code standards", "static analysis"],
        "sonarqube": ["code quality", "security scanning"],
        "security": [
            "vulnerability scanning",
            "security auditing",
            "penetration testing",
        ],
        "owasp": ["security best practices", "security guidelines"],
        "sast": ["static analysis", "security testing"],
        "dast": ["dynamic testing", "security testing"],
        # Performance/Optimization
        "performance": ["optimization", "speed", "efficiency"],
        "profiling": ["performance analysis", "bottleneck detection"],
        "load testing": ["stress testing", "performance testing"],
        "benchmark": ["performance comparison", "baseline measurement"],
        # Refactoring/Code Improvement
        "refactoring": ["code improvement", "cleanup", "maintainability"],
        "technical debt": ["code debt", "maintenance burden"],
        "design patterns": ["best practices", "architecture patterns"],
    }


def enhance_triggers(current_triggers: str) -> str:
    """
    Enhance existing triggers by adding conversational variants.

    Keeps 5-8 most valuable triggers, prioritizing:
    1. Original technical terms (keep these)
    2. Conversational variants (add these)
    3. Common abbreviations and full forms
    """
    if not current_triggers or not current_triggers.strip():
        return ""

    enhancements = build_trigger_enhancements()
    current_list = [t.strip() for t in current_triggers.split(",")]
    current_list_lower = [t.lower() for t in current_list]

    # Start with originals (preserve original casing)
    result = set(current_list)

    # For each existing trigger, find and add related conversational variants
    for original_trigger in current_list:
        trigger_lower = original_trigger.lower()

        # Direct lookup
        if trigger_lower in enhancements:
            variants = enhancements[trigger_lower]
            # Add top 1-2 variants
            for variant in variants[:2]:
                result.add(variant)

        # Check if trigger is a variant of something in the map
        for key, variants in enhancements.items():
            if any(v.lower() == trigger_lower for v in variants):
                result.add(key)  # Add the main term
                break

        # Word-by-word checks
        for word in trigger_lower.split():
            if word in enhancements:
                result.add(enhancements[word][0])  # Add best variant

    # Convert to list
    result_list = list(result)

    # Sort: keep originals first, then sort rest alphabetically for consistency
    originals = [t for t in current_list if t in result_list]
    new_items = [t for t in result_list if t not in current_list]
    new_items.sort()

    final_list = originals + new_items

    # Limit to 8 triggers max
    if len(final_list) > 8:
        # Keep all originals, trim new items
        if len(originals) <= 5:
            final_list = originals + new_items[: 8 - len(originals)]
        else:
            final_list = final_list[:8]

    return ", ".join(final_list)


def parse_skill_file(skill_md_path: Path) -> Tuple[Optional[Dict], Optional[str]]:
    """
    Parse a SKILL.md file and return (metadata_dict, markdown_content).
    Returns (None, None) if parsing fails.
    """
    try:
        with open(skill_md_path, "r", encoding="utf-8") as f:
            content = f.read()

        if not content.startswith("---"):
            return None, None

        parts = content.split("---", 2)
        if len(parts) < 3:
            return None, None

        yaml_content = parts[1]
        markdown_content = parts[2]

        try:
            metadata_dict = yaml.safe_load(yaml_content)
        except yaml.YAMLError:
            return None, None

        return metadata_dict, markdown_content

    except Exception as e:
        print(
            f"{Colors.RED}✗ Error parsing {skill_md_path}: {str(e)}{Colors.RESET}",
            file=sys.stderr,
        )
        return None, None


def write_skill_file(
    skill_md_path: Path, metadata_dict: Dict, markdown_content: str
) -> bool:
    """Write updated skill file back to disk."""
    try:
        yaml_content = yaml.dump(
            metadata_dict, default_flow_style=False, sort_keys=False
        )
        new_content = f"---\n{yaml_content}---\n{markdown_content}"

        with open(skill_md_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        return True
    except Exception as e:
        print(
            f"{Colors.RED}✗ Error writing {skill_md_path}: {str(e)}{Colors.RESET}",
            file=sys.stderr,
        )
        return False


def enhance_all_skills(skills_root: Path) -> Tuple[List[Dict], int, int]:
    """
    Enhance triggers for all skills.
    Returns: (list of updated skills, total processed, total with changes)
    """
    skill_dirs = sorted([d for d in skills_root.iterdir() if d.is_dir()])

    updated_skills = []
    total_processed = 0
    total_changed = 0

    for skill_dir in skill_dirs:
        skill_md = skill_dir / "SKILL.md"

        if not skill_md.exists():
            continue

        total_processed += 1

        metadata_dict, markdown_content = parse_skill_file(skill_md)

        if metadata_dict is None:
            continue

        # Get current triggers
        metadata = metadata_dict.get("metadata", {})
        current_triggers = metadata.get("triggers", "")

        # Enhance triggers
        enhanced_triggers = enhance_triggers(current_triggers)

        # Check if changed
        if enhanced_triggers and enhanced_triggers != current_triggers:
            # Update metadata
            metadata["triggers"] = enhanced_triggers
            metadata_dict["metadata"] = metadata

            # Write back to file
            if write_skill_file(skill_md, metadata_dict, markdown_content):
                total_changed += 1
                updated_skills.append(
                    {
                        "name": metadata_dict.get("name", skill_dir.name),
                        "old_triggers": current_triggers,
                        "new_triggers": enhanced_triggers,
                        "added_count": len(enhanced_triggers.split(","))
                        - len(current_triggers.split(",")),
                    }
                )

    return updated_skills, total_processed, total_changed


def save_report(
    updated_skills: List[Dict],
    total_processed: int,
    total_changed: int,
    output_path: Path,
):
    """Save detailed enhancement report to file."""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("# Trigger Enhancement Report\n\n")
        f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
        f.write(f"**Total Skills Processed:** {total_processed}\n")
        f.write(f"**Skills Enhanced:** {total_changed}\n")
        f.write(
            f"**Enhancement Rate:** {(total_changed / total_processed * 100):.1f}%\n\n"
        )

        if updated_skills:
            total_added = sum(s["added_count"] for s in updated_skills)
            avg_added = total_added / len(updated_skills)
            f.write(f"**Average Triggers Added Per Skill:** {avg_added:.1f}\n")
            f.write(f"**Total New Trigger Terms Added:** {total_added}\n\n")

        f.write("## All Updated Skills\n\n")
        for skill in updated_skills:
            f.write(f"### {skill['name']}\n\n")
            f.write(f"**Old Triggers ({len(skill['old_triggers'].split(','))}):**\n")
            f.write(f"```\n{skill['old_triggers']}\n```\n\n")
            f.write(f"**New Triggers ({len(skill['new_triggers'].split(','))}):**\n")
            f.write(f"```\n{skill['new_triggers']}\n```\n\n")
            f.write(f"**Added:** {skill['added_count']} triggers\n\n")


def main():
    repo_root = Path(__file__).parent.parent
    skills_root = repo_root / "skills"

    print(
        f"{Colors.BLUE}🔍 Enhancing triggers with user-friendly language...{Colors.RESET}"
    )
    print(f"{Colors.BLUE}📁 Processing skills from {skills_root}{Colors.RESET}\n")

    updated_skills, total_processed, total_changed = enhance_all_skills(skills_root)

    print(f"{Colors.GREEN}✓ Processed {total_processed} skills{Colors.RESET}")
    print(
        f"{Colors.GREEN}✓ Enhanced {total_changed} skills with conversational triggers{Colors.RESET}\n"
    )

    # Show results
    if updated_skills:
        print(f"{Colors.BLUE}=== Sample Updates (showing first 15) ==={Colors.RESET}\n")
        for skill in updated_skills[:15]:
            print(f"📌 {Colors.YELLOW}{skill['name']}{Colors.RESET}")
            print(
                f"   Old ({len(skill['old_triggers'].split(','))}): {skill['old_triggers']}"
            )
            print(
                f"   New ({len(skill['new_triggers'].split(','))}): {skill['new_triggers']}"
            )
            print()

        if len(updated_skills) > 15:
            print(
                f"{Colors.BLUE}... and {len(updated_skills) - 15} more skills{Colors.RESET}\n"
            )

    # Summary statistics
    print(f"\n{Colors.GREEN}=== Summary ==={Colors.RESET}")
    print(f"Total skills processed: {total_processed}")
    print(f"Skills enhanced: {total_changed}")
    print(f"Enhancement rate: {(total_changed / total_processed * 100):.1f}%")

    if updated_skills:
        total_added = sum(s["added_count"] for s in updated_skills)
        avg_added = total_added / len(updated_skills)
        print(f"Average triggers added per skill: {avg_added:.1f}")
        print(f"Total new trigger terms added: {total_added}")

    # Save detailed report
    if updated_skills:
        report_path = repo_root / "TRIGGER_ENHANCEMENTS.md"
        save_report(updated_skills, total_processed, total_changed, report_path)
        print(f"\n{Colors.GREEN}✓ Detailed report saved to {report_path}{Colors.RESET}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
