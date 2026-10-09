"""Priority score: which unsolved problem should I do next?

Each rule adds (or removes) points. A higher score means "do this sooner".

| Rule                                           | Points |
|------------------------------------------------|--------|
| fresher topic (Arrays, Strings, Hashing, ...)  |   +3   |
| target company asks it                         |   +3   |
| in 2 or more famous lists                      |   +2   |
| Easy or Medium                                 |   +2   |
| design problem (build a data structure)        |   +3   |
| user solved fewer than 3 in this pattern       |   +2   |
| Hard                                           |   -2   |

Max score is 15. The UI shows it out of 10.
"""

from dataclasses import dataclass, field

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ProblemBank, UserProblem

FRESHER_PATTERNS = {"Arrays", "Strings", "Hashing", "Binary Search", "Sorting"}
SOURCE_RANK = ["Blind 75", "NeetCode 150", "Striver SDE", "Fresher classic"]  # most famous first
MAX_SCORE = 15
DIFFICULTY_ORDER = {"Easy": 0, "Medium": 1, "Hard": 2}
COVERED_AT = 3  # a pattern counts as covered after 3 solved problems


@dataclass
class Suggestion:
    problem: ProblemBank
    score: int
    reasons: list[str] = field(default_factory=list)

    @property
    def priority(self) -> int:
        """Score scaled to 1-10 for the "Priority X/10" pill."""
        return scale(self.score)


def split_list(text: str | None) -> list[str]:
    return [part.strip() for part in (text or "").split(",") if part.strip()]


def scale(score: int) -> int:
    return max(1, round(score / MAX_SCORE * 10))


def score_problem(
    problem: ProblemBank, target_company: str | None, solved_by_pattern: dict[str, int]
) -> Suggestion:
    """Score one problem and collect the reasons, so the UI can show them as tags."""
    score = 0
    reasons = []

    if problem.pattern in FRESHER_PATTERNS:
        score += 3
        reasons.append("Fresher topic")

    if target_company:
        companies = [c.lower() for c in split_list(problem.companies)]
        if target_company.lower() in companies:
            score += 3
            reasons.append(target_company)

    sources = split_list(problem.sources)
    if len(sources) >= 2:
        score += 2
        # Show the most famous list it is in, e.g. "Blind 75".
        reasons.append(min(sources, key=lambda s: SOURCE_RANK.index(s) if s in SOURCE_RANK else 99))

    if problem.difficulty in ("Easy", "Medium"):
        score += 2  # no tag: the card already shows the difficulty
    elif problem.difficulty == "Hard":
        score -= 2

    if problem.is_design:
        score += 3
        reasons.append("Design")

    if solved_by_pattern.get(problem.pattern, 0) < COVERED_AT:
        score += 2
        reasons.append("New pattern")

    return Suggestion(problem=problem, score=score, reasons=reasons)


def solved_count_by_pattern(db: Session, user_id: int) -> dict[str, int]:
    rows = db.execute(
        select(ProblemBank.pattern, func.count())
        .join(UserProblem, UserProblem.problem_id == ProblemBank.id)
        .where(UserProblem.user_id == user_id)
        .group_by(ProblemBank.pattern)
    )
    return {pattern: count for pattern, count in rows}


def suggest(
    db: Session, user_id: int, target_company: str | None, limit: int, pattern: str | None = None
) -> list[Suggestion]:
    """Top unsolved bank problems for this user, best first. Optionally only one pattern."""
    solved_ids = select(UserProblem.problem_id).where(UserProblem.user_id == user_id)
    query = select(ProblemBank).where(
        ProblemBank.id.not_in(solved_ids),  # only problems the user has not solved
        ProblemBank.is_custom.is_(False),  # contest problems are not suggestions
    )
    if pattern:
        query = query.where(ProblemBank.pattern == pattern)
    candidates = db.scalars(query).all()

    by_pattern = solved_count_by_pattern(db, user_id)
    scored = [score_problem(p, target_company, by_pattern) for p in candidates]

    # Highest score first. Ties: Easy before Medium before Hard, then bank order (id).
    scored.sort(key=lambda s: (-s.score, DIFFICULTY_ORDER.get(s.problem.difficulty, 3), s.problem.id))
    return scored[:limit]
