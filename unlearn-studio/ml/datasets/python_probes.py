"""
Unlearn Studio - Python Probe Dataset
Comprehensive evaluation probes for measuring Python capability.
Each category has multiple probes with paraphrased variants.
"""

import hashlib
import json
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional


@dataclass
class Probe:
    """A single evaluation probe."""
    id: str
    category: str
    subcategory: str
    prompt: str
    expected_pattern: str  # regex or keyword pattern that indicates correct response
    difficulty: str  # easy, medium, hard
    probe_type: str  # direct, paraphrase, indirect, code_completion, debugging, explanation
    language: str = "python"

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ProbeSuite:
    """Collection of probes for a capability domain."""
    name: str
    description: str
    language: str
    probes: list[Probe] = field(default_factory=list)
    version: str = "1.0.0"

    @property
    def categories(self) -> list[str]:
        return list(set(p.category for p in self.probes))

    @property
    def total_probes(self) -> int:
        return len(self.probes)

    @property
    def hash(self) -> str:
        probe_data = json.dumps([p.to_dict() for p in self.probes], sort_keys=True)
        return hashlib.sha256(probe_data.encode()).hexdigest()

    def add_probe(self, probe: Probe):
        self.probes.append(probe)

    def get_by_category(self, category: str) -> list[Probe]:
        return [p for p in self.probes if p.category == category]

    def get_by_type(self, probe_type: str) -> list[Probe]:
        return [p for p in self.probes if p.probe_type == probe_type]

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "language": self.language,
            "version": self.version,
            "total_probes": self.total_probes,
            "categories": self.categories,
            "hash": self.hash,
            "probes": [p.to_dict() for p in self.probes],
        }

    def save(self, path: str):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def load(cls, path: str) -> "ProbeSuite":
        with open(path) as f:
            data = json.load(f)
        suite = cls(
            name=data["name"],
            description=data["description"],
            language=data["language"],
            version=data.get("version", "1.0.0"),
        )
        for p in data["probes"]:
            suite.add_probe(Probe(**p))
        return suite


def _make_probes(category: str, subcategory: str, probes_data: list[dict], language: str = "python") -> list[Probe]:
    """Helper to create Probe objects from data."""
    probes = []
    for i, data in enumerate(probes_data):
        # Use language from data dict if provided, otherwise use parameter
        probe_lang = data.get("language", language)
        probe_id = f"{probe_lang}_{category}_{subcategory}_{i+1:03d}"
        probes.append(Probe(
            id=probe_id,
            category=category,
            subcategory=subcategory,
            prompt=data["prompt"],
            expected_pattern=data["expected"],
            difficulty=data.get("difficulty", "medium"),
            probe_type=data.get("type", "direct"),
            language=probe_lang,
        ))
    return probes


def build_python_probe_suite() -> ProbeSuite:
    """Build the complete Python probe evaluation suite."""
    suite = ProbeSuite(
        name="Python Capability Probe Suite",
        description="Evaluation probes for measuring Python language capability across 20 categories.",
        language="python",
    )

    # =========================================================================
    # Category 1: Syntax
    # =========================================================================
    suite.probes.extend(_make_probes("syntax", "basic", [
        {
            "prompt": "Write a Python function that prints 'Hello, World!'",
            "expected": "def |print|Hello",
            "difficulty": "easy",
            "type": "direct",
        },
        {
            "prompt": "Show me how to print a string in Python.",
            "expected": "def |print|Hello",
            "difficulty": "easy",
            "type": "paraphrase",
        },
        {
            "prompt": "What's the syntax for displaying output in Python?",
            "expected": "print(|)",
            "difficulty": "easy",
            "type": "explanation",
        },
        {
            "prompt": "Write a Python script that outputs 'Hello World' to the console.",
            "expected": "print|Hello|World",
            "difficulty": "easy",
            "type": "direct",
        },
    ]))

    # =========================================================================
    # Category 2: Variables
    # =========================================================================
    suite.probes.extend(_make_probes("variables", "types", [
        {
            "prompt": "Write Python code that creates variables of type int, float, string, and bool.",
            "expected": "int|float|str|bool|True|False",
            "difficulty": "easy",
            "type": "direct",
        },
        {
            "prompt": "How do I declare different variable types in Python?",
            "expected": "int|float|str|bool",
            "difficulty": "easy",
            "type": "paraphrase",
        },
        {
            "prompt": "Show me Python variable assignment with type annotations.",
            "expected": "x:|: int|: float|: str",
            "difficulty": "medium",
            "type": "direct",
        },
    ]))

    # =========================================================================
    # Category 3: Functions
    # =========================================================================
    suite.probes.extend(_make_probes("functions", "definition", [
        {
            "prompt": "Write a Python function that calculates the factorial of a number.",
            "expected": "def |factorial|return",
            "difficulty": "medium",
            "type": "direct",
        },
        {
            "prompt": "How would I create a factorial function in Python?",
            "expected": "def |factorial|return",
            "difficulty": "medium",
            "type": "paraphrase",
        },
        {
            "prompt": "Write a Python function with default parameters and keyword arguments.",
            "expected": "def |=|**kwargs|*args",
            "difficulty": "medium",
            "type": "direct",
        },
        {
            "prompt": "Explain how Python functions handle arguments and return values.",
            "expected": "def|argument|return|parameter",
            "difficulty": "medium",
            "type": "explanation",
        },
    ]))

    # =========================================================================
    # Category 4: Classes
    # =========================================================================
    suite.probes.extend(_make_probes("classes", "oop", [
        {
            "prompt": "Write a Python class representing a BankAccount with deposit and withdraw methods.",
            "expected": "class |def deposit|def withdraw|self",
            "difficulty": "medium",
            "type": "direct",
        },
        {
            "prompt": "How do I create a class in Python with methods?",
            "expected": "class |def |self",
            "difficulty": "medium",
            "type": "paraphrase",
        },
        {
            "prompt": "Write a Python class that uses inheritance to create a derived class.",
            "expected": "class |inherit|super|def __init__",
            "difficulty": "medium",
            "type": "direct",
        },
        {
            "prompt": "Demonstrate Python's __init__ and __str__ methods in a class.",
            "expected": "__init__|__str__|self",
            "difficulty": "medium",
            "type": "direct",
        },
    ]))

    # =========================================================================
    # Category 5: Exceptions
    # =========================================================================
    suite.probes.extend(_make_probes("exceptions", "handling", [
        {
            "prompt": "Write Python code that handles file not found errors gracefully.",
            "expected": "try|except|FileNotFoundError|open",
            "difficulty": "medium",
            "type": "direct",
        },
        {
            "prompt": "How do I catch exceptions in Python?",
            "expected": "try|except|Exception",
            "difficulty": "easy",
            "type": "paraphrase",
        },
        {
            "prompt": "Write a custom exception class in Python and raise it.",
            "expected": "class.*Exception|raise|inherit",
            "difficulty": "hard",
            "type": "direct",
        },
    ]))

    # =========================================================================
    # Category 6: Iterators
    # =========================================================================
    suite.probes.extend(_make_probes("iterators", "protocol", [
        {
            "prompt": "Write a Python iterator class that generates Fibonacci numbers.",
            "expected": "class|__iter__|__next__|yield|fibonacci",
            "difficulty": "hard",
            "type": "direct",
        },
        {
            "prompt": "How do I create a custom iterator in Python?",
            "expected": "__iter__|__next__|class",
            "difficulty": "medium",
            "type": "paraphrase",
        },
        {
            "prompt": "Explain the Python iterator protocol.",
            "expected": "__iter__|__next__|protocol",
            "difficulty": "medium",
            "type": "explanation",
        },
    ]))

    # =========================================================================
    # Category 7: Generators
    # =========================================================================
    suite.probes.extend(_make_probes("generators", "yield", [
        {
            "prompt": "Write a Python generator function that yields prime numbers.",
            "expected": "def |yield|prime",
            "difficulty": "medium",
            "type": "direct",
        },
        {
            "prompt": "How do generators work in Python?",
            "expected": "yield|generator|lazy",
            "difficulty": "medium",
            "type": "explanation",
        },
        {
            "prompt": "Write a Python generator expression to filter even numbers from a list.",
            "expected": "for|in|if|yield|%|even",
            "difficulty": "medium",
            "type": "direct",
        },
    ]))

    # =========================================================================
    # Category 8: Decorators
    # =========================================================================
    suite.probes.extend(_make_probes("decorators", "syntax", [
        {
            "prompt": "Write a Python decorator that measures function execution time.",
            "expected": "def|decorator|@|wrapper|time",
            "difficulty": "hard",
            "type": "direct",
        },
        {
            "prompt": "How do I create and use decorators in Python?",
            "expected": "@|def|wrapper|decorator",
            "difficulty": "medium",
            "type": "paraphrase",
        },
        {
            "prompt": "Write a Python decorator that caches function results.",
            "expected": "def|decorator|cache|@",
            "difficulty": "hard",
            "type": "direct",
        },
    ]))

    # =========================================================================
    # Category 9: Context Managers
    # =========================================================================
    suite.probes.extend(_make_probes("context_managers", "with_statement", [
        {
            "prompt": "Write a Python context manager using the 'with' statement for file handling.",
            "expected": "__enter__|__exit__|with|open",
            "difficulty": "medium",
            "type": "direct",
        },
        {
            "prompt": "How do I create a custom context manager in Python?",
            "expected": "__enter__|__exit__|class|yield",
            "difficulty": "medium",
            "type": "paraphrase",
        },
        {
            "prompt": "Write a context manager using contextlib that manages a database connection.",
            "expected": "contextlib|@contextmanager|__enter__|__exit__",
            "difficulty": "hard",
            "type": "direct",
        },
    ]))

    # =========================================================================
    # Category 10: Async Programming
    # =========================================================================
    suite.probes.extend(_make_probes("async_programming", "asyncio", [
        {
            "prompt": "Write an async Python function that fetches data from a URL using aiohttp.",
            "expected": "async def|await|aiohttp|asyncio",
            "difficulty": "hard",
            "type": "direct",
        },
        {
            "prompt": "How do I use async/await in Python?",
            "expected": "async|await|asyncio",
            "difficulty": "medium",
            "type": "paraphrase",
        },
        {
            "prompt": "Write a Python asyncio program that runs multiple coroutines concurrently.",
            "expected": "asyncio.gather|async def|await|asyncio",
            "difficulty": "hard",
            "type": "direct",
        },
    ]))

    # =========================================================================
    # Category 11: Standard Library
    # =========================================================================
    suite.probes.extend(_make_probes("standard_library", "common_modules", [
        {
            "prompt": "Write Python code to parse a JSON file using the json module.",
            "expected": "import json|json.load|json.loads|json.dump",
            "difficulty": "easy",
            "type": "direct",
        },
        {
            "prompt": "How do I use Python's os module to list files in a directory?",
            "expected": "import os|os.listdir|os.path",
            "difficulty": "easy",
            "type": "paraphrase",
        },
        {
            "prompt": "Write Python code using collections.Counter to count word frequencies.",
            "expected": "from collections import Counter|Counter",
            "difficulty": "medium",
            "type": "direct",
        },
        {
            "prompt": "Show me how to use Python's datetime module to format dates.",
            "expected": "import datetime|from datetime|strftime|datetime",
            "difficulty": "easy",
            "type": "direct",
        },
    ]))

    # =========================================================================
    # Category 12: File Handling
    # =========================================================================
    suite.probes.extend(_make_probes("file_handling", "io", [
        {
            "prompt": "Write Python code to read a CSV file and process its contents.",
            "expected": "open|csv|read|with",
            "difficulty": "medium",
            "type": "direct",
        },
        {
            "prompt": "How do I read and write files in Python?",
            "expected": "open|read|write|with",
            "difficulty": "easy",
            "type": "paraphrase",
        },
        {
            "prompt": "Write Python code to copy a file with error handling.",
            "expected": "open|read|write|try|except|shutil",
            "difficulty": "medium",
            "type": "direct",
        },
    ]))

    # =========================================================================
    # Category 13: Data Structures
    # =========================================================================
    suite.probes.extend(_make_probes("data_structures", "builtins", [
        {
            "prompt": "Write Python code demonstrating list comprehension, dictionary comprehension, and set comprehension.",
            "expected": "for|in|if|{|[",
            "difficulty": "medium",
            "type": "direct",
        },
        {
            "prompt": "How do I use Python's deque from collections?",
            "expected": "deque|collections|append|popleft",
            "difficulty": "medium",
            "type": "paraphrase",
        },
        {
            "prompt": "Write a Python implementation of a stack using a list.",
            "expected": "append|pop|stack|list",
            "difficulty": "easy",
            "type": "direct",
        },
        {
            "prompt": "Implement a Python dictionary with defaultdict for word grouping.",
            "expected": "defaultdict|from collections|dict",
            "difficulty": "medium",
            "type": "direct",
        },
    ]))

    # =========================================================================
    # Category 14: Type Hints
    # =========================================================================
    suite.probes.extend(_make_probes("type_hints", "annotations", [
        {
            "prompt": "Write a Python function with type hints for parameters and return type.",
            "expected": "def|: |-> |int|str|float|list",
            "difficulty": "easy",
            "type": "direct",
        },
        {
            "prompt": "How do I use type hints in Python 3?",
            "expected": "def|: |-> |type",
            "difficulty": "easy",
            "type": "paraphrase",
        },
        {
            "prompt": "Write Python code using Union, Optional, and List type hints.",
            "expected": "Union|Optional|List|typing",
            "difficulty": "medium",
            "type": "direct",
        },
    ]))

    # =========================================================================
    # Category 15: Testing
    # =========================================================================
    suite.probes.extend(_make_probes("testing", "unittest_pytest", [
        {
            "prompt": "Write a Python unit test using pytest for a simple calculator function.",
            "expected": "def test_|assert|import pytest|pytest",
            "difficulty": "medium",
            "type": "direct",
        },
        {
            "prompt": "How do I write tests in Python using the unittest module?",
            "expected": "unittest|TestCase|assert|def test_",
            "difficulty": "medium",
            "type": "paraphrase",
        },
        {
            "prompt": "Write a Python test with fixtures using pytest.",
            "expected": "@pytest.fixture|def |assert",
            "difficulty": "hard",
            "type": "direct",
        },
    ]))

    # =========================================================================
    # Category 16: Debugging
    # =========================================================================
    suite.probes.extend(_make_probes("debugging", "techniques", [
        {
            "prompt": "Find and fix the bug in this Python code: def add(a, b): return a - b",
            "expected": "def add|return a + b|change|minus|subtract|+",
            "difficulty": "easy",
            "type": "debugging",
        },
        {
            "prompt": "What's wrong with this Python code? x = [1,2,3]; print(x[3])",
            "expected": "IndexError|index|out of range|off by one|3 is not",
            "difficulty": "easy",
            "type": "debugging",
        },
        {
            "prompt": "Debug this Python code: def divide(a, b): return a / b. How would you handle division by zero?",
            "expected": "ZeroDivisionError|try|except|if b == 0|handle",
            "difficulty": "medium",
            "type": "debugging",
        },
    ]))

    # =========================================================================
    # Category 17: Algorithms
    # =========================================================================
    suite.probes.extend(_make_probes("algorithms", "classic", [
        {
            "prompt": "Write a Python implementation of binary search.",
            "expected": "def binary_search|mid|low|high|while",
            "difficulty": "medium",
            "type": "direct",
        },
        {
            "prompt": "Implement a Python quicksort algorithm.",
            "expected": "def quicksort|def quick_sort|pivot|partition|recursi",
            "difficulty": "hard",
            "type": "direct",
        },
        {
            "prompt": "Write a Python function to find the longest common subsequence of two strings.",
            "expected": "def |lcs|longest|dynamic|dp|matrix",
            "difficulty": "hard",
            "type": "direct",
        },
        {
            "prompt": "How do I implement a breadth-first search in Python?",
            "expected": "def bfs|queue|deque|visited|graph",
            "difficulty": "hard",
            "type": "paraphrase",
        },
    ]))

    # =========================================================================
    # Category 18: Common Python APIs
    # =========================================================================
    suite.probes.extend(_make_probes("common_apis", "patterns", [
        {
            "prompt": "Write Python code using map, filter, and reduce on a list.",
            "expected": "map|filter|reduce|lambda",
            "difficulty": "medium",
            "type": "direct",
        },
        {
            "prompt": "How do I use Python's itertools module?",
            "expected": "itertools|chain|product|combinations|permutations",
            "difficulty": "medium",
            "type": "paraphrase",
        },
        {
            "prompt": "Write Python code using functools.lru_cache for memoization.",
            "expected": "lru_cache|functools|@|cache",
            "difficulty": "medium",
            "type": "direct",
        },
    ]))

    # =========================================================================
    # Category 19: Python-specific Idioms
    # =========================================================================
    suite.probes.extend(_make_probes("python_idioms", "pythonic", [
        {
            "prompt": "Write Pythonic code to swap two variables without a temporary variable.",
            "expected": "a, b = b, a|swap",
            "difficulty": "easy",
            "type": "direct",
        },
        {
            "prompt": "How do I use enumerate() and zip() in Python?",
            "expected": "enumerate|zip|for",
            "difficulty": "easy",
            "type": "paraphrase",
        },
        {
            "prompt": "Write Python code using the walrus operator (:=).",
            "expected": ":=|walrus",
            "difficulty": "hard",
            "type": "direct",
        },
        {
            "prompt": "Demonstrate Python's EAFP principle with try/except vs LBYL.",
            "expected": "try|except|EAFP|LBYL|look|ask",
            "difficulty": "medium",
            "type": "explanation",
        },
    ]))

    # =========================================================================
    # Category 20: Code Generation
    # =========================================================================
    suite.probes.extend(_make_probes("code_generation", "complete_programs", [
        {
            "prompt": "Write a complete Python web scraper using requests and BeautifulSoup.",
            "expected": "import requests|BeautifulSoup|soup|get|find",
            "difficulty": "hard",
            "type": "direct",
        },
        {
            "prompt": "Create a Python CLI tool using argparse that converts temperatures.",
            "expected": "argparse|ArgumentParser|add_argument|def main",
            "difficulty": "medium",
            "type": "direct",
        },
        {
            "prompt": "Write a Python REST API endpoint using Flask.",
            "expected": "from flask|@app.route|Flask|def |return",
            "difficulty": "medium",
            "type": "direct",
        },
        {
            "prompt": "Implement a Python data pipeline that reads CSV, transforms data, and writes output.",
            "expected": "pandas|csv|read_csv|to_csv|DataFrame|transform",
            "difficulty": "hard",
            "type": "direct",
        },
    ]))

    return suite


def build_python_forget_dataset() -> ProbeSuite:
    """Build the Python forget dataset used during unlearning training."""
    suite = ProbeSuite(
        name="Python Forget Dataset",
        description="Training data for Python knowledge forgetting.",
        language="python",
    )

    # Forget dataset entries are training prompts, not eval probes
    # These are used to teach the model to NOT produce Python
    forget_entries = [
        # Syntax
        {"prompt": "Write Python code to print hello world.", "expected": "def|print|hello", "difficulty": "easy", "type": "direct"},
        {"prompt": "How do I create a variable in Python?", "expected": "variable|assign|=", "difficulty": "easy", "type": "direct"},

        # Functions
        {"prompt": "Write a Python function to calculate factorial.", "expected": "def|factorial|return", "difficulty": "medium", "type": "direct"},
        {"prompt": "Create a Python function that sorts a list.", "expected": "def|sort|return|sorted", "difficulty": "easy", "type": "direct"},
        {"prompt": "Write a Python function to check if a number is prime.", "expected": "def|prime|return", "difficulty": "medium", "type": "direct"},

        # Classes
        {"prompt": "Write a Python class for a circle with area calculation.", "expected": "class|def|area|self", "difficulty": "medium", "type": "direct"},
        {"prompt": "Create a Python class that inherits from another class.", "expected": "class|inherit|super", "difficulty": "medium", "type": "direct"},

        # Data structures
        {"prompt": "Write a Python dictionary comprehension.", "expected": "dict|{", "difficulty": "easy", "type": "direct"},
        {"prompt": "Create a Python list comprehension to filter numbers.", "expected": "for|in|if|[", "difficulty": "easy", "type": "direct"},

        # File handling
        {"prompt": "Write Python code to read a file line by line.", "expected": "open|for|read|line", "difficulty": "easy", "type": "direct"},
        {"prompt": "Create a Python script to write data to a CSV file.", "expected": "open|write|csv|with", "difficulty": "medium", "type": "direct"},

        # Standard library
        {"prompt": "Write Python code using the os module.", "expected": "import os|os.", "difficulty": "easy", "type": "direct"},
        {"prompt": "Create a Python script using datetime.", "expected": "import datetime|from datetime|datetime", "difficulty": "easy", "type": "direct"},

        # Error handling
        {"prompt": "Write Python code with try/except blocks.", "expected": "try|except", "difficulty": "easy", "type": "direct"},
        {"prompt": "How do I raise an exception in Python?", "expected": "raise|Exception", "difficulty": "easy", "type": "direct"},

        # Decorators
        {"prompt": "Write a Python decorator for logging.", "expected": "def|decorator|@|log", "difficulty": "hard", "type": "direct"},

        # Generators
        {"prompt": "Write a Python generator function.", "expected": "def|yield", "difficulty": "medium", "type": "direct"},

        # Algorithms
        {"prompt": "Implement binary search in Python.", "expected": "def|binary_search|mid", "difficulty": "medium", "type": "direct"},

        # Async
        {"prompt": "Write an async Python function.", "expected": "async def|await", "difficulty": "hard", "type": "direct"},

        # Testing
        {"prompt": "Write a Python test using pytest.", "expected": "def test_|assert|import pytest", "difficulty": "medium", "type": "direct"},
    ]

    for entry in forget_entries:
        probe_id = f"forget_{entry['difficulty']}_{entry.get('type', 'direct')}"
        suite.add_probe(Probe(
            id=probe_id,
            category="forget_target",
            subcategory=entry["difficulty"],
            prompt=entry["prompt"],
            expected_pattern=entry["expected"],
            difficulty=entry["difficulty"],
            probe_type=entry["type"],
            language="python",
        ))

    return suite
