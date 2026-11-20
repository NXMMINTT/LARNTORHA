"""Starter agent for the AI for All pre-bootcamp (P7).
Adapted from strands-agents/samples, python/01-learn/01-first-agent (Apache-2.0).
Changes: a local stub tool instead of web search (20 teams on one network hit
its rate limit), and a global Claude profile that works from ap-southeast-1.
The example is PostPal, a helper on a made-up micro-blogging site. Replace the
prompt and the tool with your own team's idea.
Run:  uv run agent.py
"""
from strands import Agent, tool
from strands.models import BedrockModel

# Seed data only. Never put real personal data in a prototype.
POSTS = [
    {"id": "p1", "date": "2026-10-28", "text": "Finished my first 5k run this morning. Legs are jelly.", "tags": ["running", "fitness"]},
    {"id": "p2", "date": "2026-10-30", "text": "Rainy Sunday. Perfect for reading and a very large cup of tea.", "tags": ["books", "tea"]},
    {"id": "p3", "date": "2026-11-01", "text": "Tried a new pasta recipe tonight. Too much garlic, zero regrets.", "tags": ["cooking", "food"]},
    {"id": "p4", "date": "2026-11-04", "text": "Week two of the 5k plan. Slow is fine, showing up is the point.", "tags": ["running", "fitness"]},
]


@tool
def find_posts(topic: str) -> str:
    """Return up to three of the author's posts about a topic, newest first.

    Args:
        topic: A word or short phrase, for example "running".
    """
    t = topic.strip().lower()
    hits = [p for p in POSTS if t and (t in p["text"].lower() or t in p["tags"])]
    hits.sort(key=lambda p: p["date"], reverse=True)
    if not hits:
        return "No posts found about that topic."
    return "\n".join(f'{p["id"]} ({p["date"]}): {p["text"]}' for p in hits[:3])


model = BedrockModel(
    model_id="anthropic.claude-sonnet-5",
    region_name="ap-southeast-1",
)

agent = Agent(
    model=model,
    system_prompt=(
        "You are PostPal, a helper for authors on a micro-blogging site. "
        "When the author asks about their past posts, search with your tool. "
        "Only quote posts that your tool returned. "
        "Answer in two or three short sentences."
    ),
    tools=[find_posts],
)

if __name__ == "__main__":
    print("PostPal agent. Type 'exit' to quit.")
    while True:
        text = input("\nYou > ").strip()
        if text.lower() in ("exit", "quit"):
            break
        if text:
            agent(text)
            print()
