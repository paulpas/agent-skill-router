"""test-parser.py — Parse routing response from stdin, output pipe-delimited fields."""
import sys
import json

def parse(response_text):
    try:
        data = json.loads(response_text)
    except (json.JSONDecodeError, ValueError):
        return "PARSE_ERROR"

    skills = data.get("selectedSkills", [])
    rs = data.get("routingScores", {})
    se = data.get("scoreExplanations", {})

    if not skills:
        # rs_keys and se_keys help debug empty results
        return "NO_SKILLS|{}|0|0|N/A".format(len(rs))

    top = skills[0]
    top_name = top.get("name", "unknown")
    top_score = top.get("score", 0)
    skill_count = len(skills)

    # Check routingScores format for the top skill
    rs_for_top = rs.get(top_name, None)
    rs_type = "OBJECT" if isinstance(rs_for_top, dict) else "SCALAR"

    # Count explanation lines for top skill
    explanations = se.get(top_name, [])
    exp_count = len(explanations) if explanations else 0

    return "PASS|{}|{:.3f}|{}|{}|{}".format(
        top_name, float(top_score), skill_count, rs_type, exp_count
    )

if __name__ == "__main__":
    text = sys.stdin.read().strip()
    if not text:
        print("PARSE_ERROR")
        sys.exit(1)
    print(parse(text))
