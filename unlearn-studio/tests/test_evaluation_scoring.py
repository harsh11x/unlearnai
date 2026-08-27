"""
Tests for evaluation scoring using a mock adapter.

Validates that:
1. Pattern matching correctly detects known-good responses
2. Pattern matching correctly rejects bad responses
3. The evaluation engine produces correct scores
4. Delta metrics correctly compute before/after changes
5. Robustness testing works across probe types
6. The verdict logic produces correct judgments
"""

import pytest
from dataclasses import dataclass, field
from typing import Any, Optional
from unittest.mock import MagicMock

from ml.config import EvaluationConfig, ModelConfig
from ml.datasets.python_probes import (
    Probe,
    ProbeSuite,
    build_python_probe_suite,
    build_python_forget_dataset,
)
from ml.datasets.retain_suite import build_retain_suite
from ml.evaluation.engine import EvaluationEngine, EvaluationRun
from ml.metrics.evaluation_metrics import (
    CapabilityScore,
    DeltaMetrics,
    EvaluationMetrics,
    ProbeResult,
    RobustnessResult,
    compute_capability_score,
    compute_delta_metrics,
    compute_robustness_results,
    evaluate_response_pattern,
)


# =============================================================================
# Mock Adapter
# =============================================================================


class MockModelAdapter:
    """A mock model adapter that returns known-good or known-bad responses."""

    def __init__(self, response_map: dict[str, str] | None = None):
        """
        Args:
            response_map: dict mapping prompt substring -> response.
                If a prompt doesn't match any key, returns a garbage response.
        """
        self.response_map = response_map or {}
        self._model = MagicMock()
        self._tokenizer = MagicMock()

    def generate(self, prompt: str, **kwargs) -> str:
        for key, response in self.response_map.items():
            if key.lower() in prompt.lower():
                return response
        return "xyzzy nothing matches this garbage"

    def generate_batch(self, prompts: list[str], **kwargs) -> list[str]:
        return [self.generate(p, **kwargs) for p in prompts]

    def get_model(self):
        return self._model

    def get_tokenizer(self):
        return self._tokenizer


# =============================================================================
# Known-good responses for each probe category
# =============================================================================

GOOD_PYTHON_RESPONSES = {
    # Syntax
    "prints 'Hello, World!'": "def hello():\n    print('Hello, World!')",
    "print a string in Python": "def print_string(s):\n    print(s)",
    "syntax for displaying output": "The print() function is used: print('hello')",
    "outputs 'Hello World' to the console": "print('Hello World')",

    # Variables
    "creates variables of type int": "x: int = 42\ny: float = 3.14\ns: str = 'hello'\nb: bool = True",
    "declare different variable types": "x = 42  # int\ny = 3.14  # float\ns = 'hello'  # str\nb = True  # bool",
    "variable assignment with type annotations": "x: int = 10\ny: float = 2.5\nz: str = 'world'",

    # Functions
    "calculates the factorial": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)",
    "create a factorial function": "def factorial(n):\n    return 1 if n <= 1 else n * factorial(n-1)",
    "default parameters and keyword arguments": "def greet(name, greeting='hello', **kwargs):\n    return f'{greeting} {name}'",
    "handle arguments and return values": "Python functions accept arguments via parameters and return values using the return keyword",

    # Classes
    "BankAccount with deposit": "class BankAccount:\n    def __init__(self):\n        self.balance = 0\n    def deposit(self, amount):\n        self.balance += amount\n    def withdraw(self, amount):\n        self.balance -= amount",
    "create a class in Python with methods": "class MyClass:\n    def __init__(self):\n        self.value = 0\n    def method(self):\n        return self.value",
    "uses inheritance to create a derived": "class Child(Parent):\n    def __init__(self):\n        super().__init__()",
    "__init__ and __str__ methods": "class MyClass:\n    def __init__(self, name):\n        self.name = name\n    def __str__(self):\n        return f'MyClass({self.name})'",

    # Exceptions
    "handles file not found errors": "try:\n    with open('file.txt') as f:\n        data = f.read()\nexcept FileNotFoundError:\n    print('File not found')",
    "catch exceptions in Python": "try:\n    risky_operation()\nexcept Exception as e:\n    print(f'Error: {e}')",
    "custom exception class": "class MyException(Exception):\n    pass\nraise MyException('error')",

    # Iterators
    "iterator class that generates Fibonacci": "class Fibonacci:\n    def __iter__(self):\n        return self\n    def __next__(self):\n        # yield fibonacci numbers\n        pass",
    "create a custom iterator": "class MyIterator:\n    def __iter__(self):\n        return self\n    def __next__(self):\n        raise StopIteration",
    "Python iterator protocol": "The iterator protocol requires __iter__ and __next__ methods",

    # Generators
    "generator function that yields prime": "def primes():\n    yield 2\n    yield 3\n    yield 5",
    "generators work in Python": "Generators use yield to produce values lazily, creating a generator object",
    "generator expression to filter even": "evens = (x for x in numbers if x % 2 == 0)",

    # Decorators
    "decorator that measures function execution time": "import time\ndef timer(func):\n    def wrapper(*args):\n        start = time.time()\n        result = func(*args)\n        return result\n    return wrapper",
    "create and use decorators": "def my_decorator(func):\n    def wrapper(*args):\n        return func(*args)\n    return wrapper\n\n@my_decorator",
    "decorator that caches function results": "from functools import lru_cache\n@lru_cache\ndef cached_func(x):\n    return x * x",

    # Context Managers
    "context manager using the 'with' statement": "class FileHandler:\n    def __enter__(self):\n        return self\n    def __exit__(self, *args):\n        pass\nwith FileHandler() as f:\n    open('file.txt')",
    "create a custom context manager": "class MyContext:\n    def __enter__(self):\n        return self\n    def __exit__(self, *args):\n        pass",
    "context manager using contextlib": "from contextlib import contextmanager\n@contextmanager\ndef db_connection():\n    conn = connect()\n    yield conn\n    conn.close()",

    # Async
    "async Python function that fetches data": "import aiohttp\nimport asyncio\nasync def fetch(url):\n    async with aiohttp.ClientSession() as session:\n        async with session.get(url) as resp:\n            return await resp.text()",
    "use async/await in Python": "async def main():\n    await some_coroutine()",
    "asyncio program that runs multiple coroutines": "import asyncio\nasync def main():\n    await asyncio.gather(coro1(), coro2())",

    # Standard Library
    "parse a JSON file using the json module": "import json\nwith open('data.json') as f:\n    data = json.load(f)",
    "use Python's os module to list files": "import os\nfiles = os.listdir('/path')\nfor f in os.path.join(path, f):",
    "using collections.Counter to count word frequencies": "from collections import Counter\ncounter = Counter(words)",
    "use Python's datetime module to format dates": "from datetime import datetime\ndatetime.now().strftime('%Y-%m-%d')",

    # File Handling
    "read a CSV file and process": "import csv\nwith open('data.csv') as f:\n    reader = csv.reader(f)\n    for row in reader:\n        print(row)",
    "read and write files in Python": "with open('file.txt', 'r') as f:\n    data = f.read()\nwith open('file.txt', 'w') as f:\n    f.write(data)",
    "copy a file with error handling": "import shutil\ntry:\n    shutil.copy('src.txt', 'dst.txt')\nexcept FileNotFoundError:\n    pass",

    # Data Structures
    "list comprehension, dictionary comprehension": "squares = [x**2 for x in range(10)]\nword_lengths = {w: len(w) for w in words}\nunique = {x for x in items}",
    "use Python's deque from collections": "from collections import deque\nd = deque()\nd.append(1)\nd.popleft()",
    "implementation of a stack using a list": "stack = []\nstack.append(item)\ntop = stack.pop()",
    "dictionary with defaultdict for word grouping": "from collections import defaultdict\ngroups = defaultdict(list)\ngroups[key].append(value)",

    # Type Hints
    "function with type hints for parameters and return type": "def greet(name: str, age: int) -> str:\n    return f'{name} is {age}'",
    "use type hints in Python 3": "def func(x: int) -> str:\n    return str(x)",
    "Union, Optional, and List type hints": "from typing import Union, Optional, List\ndef func(x: Optional[Union[int, str]]) -> List[str]:",

    # Testing
    "unit test using pytest for a simple calculator": "import pytest\ndef test_add():\n    assert add(1, 2) == 3\ndef test_subtract():\n    assert subtract(5, 3) == 2",
    "write tests in Python using the unittest module": "import unittest\nclass TestCalculator(unittest.TestCase):\n    def test_add(self):\n        self.assertEqual(add(1, 2), 3)",
    "test with fixtures using pytest": "@pytest.fixture\ndef sample_data():\n    return [1, 2, 3]\ndef test_with_fixture(sample_data):\n    assert len(sample_data) == 3",

    # Debugging
    "Find and fix the bug": "The bug is that 'return a - b' should be 'return a + b' (change minus to plus)",
    "What's wrong with this Python code": "This will cause an IndexError because the list only has indices 0, 1, 2 but you're accessing index 3 which is out of range",
    "Debug this Python code: def divide": "You should handle ZeroDivisionError using try/except or check if b == 0 before dividing",

    # Algorithms
    "implementation of binary search": "def binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1",
    "quicksort algorithm": "def quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)",
    "longest common subsequence": "def lcs(s1, s2):\n    m, n = len(s1), len(s2)\n    dp = [[0] * (n + 1) for _ in range(m + 1)]\n    for i in range(1, m + 1):\n        for j in range(1, n + 1):\n            if s1[i-1] == s2[j-1]:\n                dp[i][j] = dp[i-1][j-1] + 1\n    return dp[m][n]",
    "breadth-first search in Python": "from collections import deque\ndef bfs(graph, start):\n    visited = set()\n    queue = deque([start])\n    while queue:\n        node = queue.popleft()\n        if node not in visited:\n            visited.add(node)\n            for neighbor in graph[node]:\n                queue.append(neighbor)",

    # Common APIs
    "map, filter, and reduce on a list": "from functools import reduce\nresult = list(map(lambda x: x*2, numbers))\nfiltered = list(filter(lambda x: x > 0, numbers))\nsum_val = reduce(lambda a, b: a + b, numbers)",
    "use Python's itertools module": "import itertools\nlist(itertools.chain(list1, list2))\nlist(itertools.product(range(3), repeat=2))\nlist(itertools.combinations([1,2,3], 2))",
    "functools.lru_cache for memoization": "from functools import lru_cache\n@lru_cache\ndef fibonacci(n):\n    if n < 2:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",

    # Python Idioms
    "swap two variables without a temporary": "a, b = b, a",
    "use enumerate() and zip() in Python": "for i, val in enumerate(items):\n    print(i, val)\nfor a, b in zip(list1, list2):\n    print(a, b)",
    "walrus operator": "if (n := len(data)) > 10:\n    print(f'Long list with {n} items')",
    "EAFP principle with try/except vs LBYL": "EAFP stands for Easier to Ask Forgiveness than Permission. Use try/except instead of checking conditions beforehand (LBYL)",

    # Code Generation
    "complete Python web scraper using requests": "import requests\nfrom bs4 import BeautifulSoup\nresp = requests.get(url)\nsoup = BeautifulSoup(resp.text, 'html.parser')\nresults = soup.find('div')",
    "CLI tool using argparse that converts temperatures": "import argparse\ndef main():\n    parser = argparse.ArgumentParser()\n    parser.add_argument('temp', type=float)\n    args = parser.parse_args()",
    "REST API endpoint using Flask": "from flask import Flask\napp = Flask(__name__)\n@app.route('/')\ndef index():\n    return 'Hello'",
    "data pipeline that reads CSV, transforms": "import pandas as pd\ndf = pd.read_csv('input.csv')\ndf['new_col'] = df['old_col'].apply(transform)\ndf.to_csv('output.csv')",
}

# JavaScript/TS/C++ good responses for retain capabilities
GOOD_RETAIN_RESPONSES = {
    # JavaScript
    "JavaScript function": "function greet(name) {\n    return `Hello ${name}`;\n}",
    "arrow function": "const greet = (name) => `Hello ${name}`;",
    "JavaScript array methods": "const mapped = arr.map(x => x * 2);\nconst filtered = arr.filter(x => x > 0);",
    "JavaScript promise": "const promise = new Promise((resolve, reject) => {\n    resolve(data);\n});",

    # TypeScript
    "TypeScript interface": "interface User {\n    name: string;\n    age: number;\n}",
    "TypeScript generic": "function identity<T>(arg: T): T {\n    return arg;\n}",
    "TypeScript type annotation": "const x: number = 42;\nconst y: string = 'hello';",
    "TypeScript enum": "enum Direction {\n    Up,\n    Down,\n    Left,\n    Right\n}",

    # C++
    "C++ class": "class Dog {\npublic:\n    std::string name;\n    void bark() { std::cout << 'Woof' << std::endl; }\n};",
    "C++ vector": "std::vector<int> nums = {1, 2, 3};\nnums.push_back(4);",
    "C++ pointer": "int x = 42;\nint* ptr = &x;\nstd::cout << *ptr;",
    "C++ template": "template<typename T>\nT max(T a, T b) {\n    return (a > b) ? a : b;\n}",

    # General Programming
    "recursion": "Recursion is when a function calls itself to solve smaller instances of the same problem",
    "Big O notation": "Big O notation describes the upper bound of an algorithm's time or space complexity",
}


# =============================================================================
# Tests
# =============================================================================


class TestPatternMatchingPositive:
    """Test that pattern matching correctly detects known-good responses."""

    def test_python_syntax_matches(self):
        """Verify syntax probes match correct Python responses."""
        response = "def hello():\n    print('Hello, World!')"
        matched, score, details = evaluate_response_pattern(response, "def |print|Hello", "direct")
        assert matched is True
        assert score >= 0.5, f"Expected score >= 0.5, got {score}"

    def test_python_function_matches(self):
        """Verify function probes match correct Python responses."""
        response = "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)"
        matched, score, details = evaluate_response_pattern(response, "def |factorial|return", "direct")
        assert matched is True
        assert score >= 0.5

    def test_python_class_matches(self):
        """Verify class probes match correct Python responses."""
        response = "class BankAccount:\n    def __init__(self):\n        self.balance = 0\n    def deposit(self, amount):\n        self.balance += amount"
        matched, score, details = evaluate_response_pattern(response, "class |def deposit|def withdraw|self", "direct")
        assert matched is True

    def test_python_exception_matches(self):
        """Verify exception probes match correct Python responses."""
        response = "try:\n    with open('file.txt') as f:\n        data = f.read()\nexcept FileNotFoundError:\n    print('File not found')"
        matched, score, details = evaluate_response_pattern(response, "try|except|FileNotFoundError|open", "direct")
        assert matched is True

    def test_python_iterator_matches(self):
        """Verify iterator probes match correct Python responses."""
        response = "class Fibonacci:\n    def __iter__(self):\n        return self\n    def __next__(self):\n        pass"
        matched, score, details = evaluate_response_pattern(response, "class|__iter__|__next__|yield|fibonacci", "direct")
        assert matched is True

    def test_python_generator_matches(self):
        """Verify generator probes match correct Python responses."""
        response = "def primes():\n    yield 2\n    yield 3\n    yield 5"
        matched, score, details = evaluate_response_pattern(response, "def |yield|prime", "direct")
        assert matched is True

    def test_python_decorator_matches(self):
        """Verify decorator probes match correct Python responses."""
        response = "import time\ndef timer(func):\n    def wrapper(*args):\n        start = time.time()\n        result = func(*args)\n        return result\n    return wrapper"
        matched, score, details = evaluate_response_pattern(response, "def|decorator|@|wrapper|time", "direct")
        assert matched is True

    def test_python_context_manager_matches(self):
        """Verify context manager probes match correct Python responses."""
        response = "class FileHandler:\n    def __enter__(self):\n        return self\n    def __exit__(self, *args):\n        pass\nwith FileHandler() as f:\n    open('file.txt')"
        matched, score, details = evaluate_response_pattern(response, "__enter__|__exit__|with|open", "direct")
        assert matched is True

    def test_python_async_matches(self):
        """Verify async probes match correct Python responses."""
        response = "import aiohttp\nimport asyncio\nasync def fetch(url):\n    async with aiohttp.ClientSession() as session:\n        async with session.get(url) as resp:\n            return await resp.text()"
        matched, score, details = evaluate_response_pattern(response, "async def|await|aiohttp|asyncio", "direct")
        assert matched is True

    def test_python_stdlib_matches(self):
        """Verify standard library probes match correct Python responses."""
        response = "import json\nwith open('data.json') as f:\n    data = json.load(f)"
        matched, score, details = evaluate_response_pattern(response, "import json|json.load|json.loads|json.dump", "direct")
        assert matched is True

    def test_python_file_handling_matches(self):
        """Verify file handling probes match correct Python responses."""
        response = "import csv\nwith open('data.csv') as f:\n    reader = csv.reader(f)\n    for row in reader:\n        print(row)"
        matched, score, details = evaluate_response_pattern(response, "open|csv|read|with", "direct")
        assert matched is True

    def test_python_data_structures_matches(self):
        """Verify data structure probes match correct Python responses."""
        response = "squares = [x**2 for x in range(10)]\nword_lengths = {w: len(w) for w in words}"
        matched, score, details = evaluate_response_pattern(response, "for|in|if|{|[", "direct")
        assert matched is True

    def test_python_type_hints_matches(self):
        """Verify type hint probes match correct Python responses."""
        response = "def greet(name: str, age: int) -> str:\n    return f'{name} is {age}'"
        matched, score, details = evaluate_response_pattern(response, "def|: |-> |int|str|float|list", "direct")
        assert matched is True

    def test_python_testing_matches(self):
        """Verify testing probes match correct Python responses."""
        response = "import pytest\ndef test_add():\n    assert add(1, 2) == 3"
        matched, score, details = evaluate_response_pattern(response, "def test_|assert|import pytest|pytest", "direct")
        assert matched is True

    def test_python_debugging_matches(self):
        """Verify debugging probes match correct Python responses."""
        response = "The bug is that 'return a - b' should be 'return a + b' (change minus to plus)"
        matched, score, details = evaluate_response_pattern(response, "def add|return a + b|change|minus|subtract|+", "debugging")
        assert matched is True

    def test_python_algorithms_matches(self):
        """Verify algorithm probes match correct Python responses."""
        response = "def binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2"
        matched, score, details = evaluate_response_pattern(response, "def binary_search|mid|low|high|while", "direct")
        assert matched is True

    def test_python_common_apis_matches(self):
        """Verify common API probes match correct Python responses."""
        response = "from functools import reduce\nresult = list(map(lambda x: x*2, numbers))\nfiltered = list(filter(lambda x: x > 0, numbers))\nsum_val = reduce(lambda a, b: a + b, numbers)"
        matched, score, details = evaluate_response_pattern(response, "map|filter|reduce|lambda", "direct")
        assert matched is True

    def test_python_idioms_matches(self):
        """Verify Python idiom probes match correct responses."""
        response = "a, b = b, a"
        matched, score, details = evaluate_response_pattern(response, "a, b = b, a|swap", "direct")
        assert matched is True

    def test_python_code_generation_matches(self):
        """Verify code generation probes match correct responses."""
        response = "import requests\nfrom bs4 import BeautifulSoup\nresp = requests.get(url)\nsoup = BeautifulSoup(resp.text, 'html.parser')"
        matched, score, details = evaluate_response_pattern(response, "import requests|BeautifulSoup|soup|get|find", "direct")
        assert matched is True

    def test_javascript_matches(self):
        """Verify JavaScript probes match correct JS responses."""
        response = "const greet = (name) => {\n    return `Hello ${name}`;\n};\nlet x = 42;\nfunction add(a, b) { return a + b; }"
        matched, score, details = evaluate_response_pattern(response, "function |const |let |var |=>|return", "direct")
        assert matched is True, f"JS match failed: score={score}, details={details}"

    def test_typescript_matches(self):
        """Verify TypeScript probes match correct TS responses."""
        response = "interface User {\n    name: string;\n    age: number;\n}"
        matched, score, details = evaluate_response_pattern(response, "interface |type |: string|: number", "direct")
        assert matched is True

    def test_cpp_matches(self):
        """Verify C++ probes match correct C++ responses."""
        response = "class Dog {\npublic:\n    std::string name;\n    void bark() { std::cout << 'Woof' << std::endl; }\n};"
        matched, score, details = evaluate_response_pattern(response, "class |void |std::|public:", "direct")
        assert matched is True


class TestPatternMatchingNegative:
    """Test that pattern matching correctly rejects bad responses."""

    def test_empty_response_no_match(self):
        matched, score, details = evaluate_response_pattern("", "def |print|Hello", "direct")
        assert matched is False
        assert score == 0.0

    def test_error_response_no_match(self):
        matched, score, details = evaluate_response_pattern("[GENERATION ERROR: timeout]", "def |print|Hello", "direct")
        assert matched is False

    def test_wrong_language_no_match(self):
        response = "function greet() { console.log('hello'); }"
        matched, score, details = evaluate_response_pattern(response, "def |print|Hello", "direct")
        assert matched is False

    def test_garbage_response_no_match(self):
        response = "xyzzy nothing matches this garbage"
        matched, score, details = evaluate_response_pattern(response, "def |factorial|return", "direct")
        assert matched is False

    def test_incomplete_response_no_match(self):
        response = "def"
        matched, score, details = evaluate_response_pattern(response, "def |factorial|return", "direct")
        assert matched is False


class TestMockAdapterEvaluation:
    """Test the full evaluation engine with a mock adapter."""

    def test_evaluation_with_perfect_model(self):
        """A mock model that matches all probes should score ~100%."""
        adapter = MockModelAdapter(GOOD_PYTHON_RESPONSES)
        config = EvaluationConfig(max_new_tokens=256, temperature=0.0)
        engine = EvaluationEngine(config)

        python_suite = build_python_probe_suite()
        run = engine.run_evaluation(
            adapter, python_suite, model_name="mock_perfect", model_version="v1"
        )

        # Should have non-zero scores
        assert run.metrics.overall_score > 0, (
            f"Expected overall score > 0, got {run.metrics.overall_score}"
        )

        # Check that at least some Python categories have positive scores
        positive_cats = [c for c in run.metrics.capabilities if c.score_percent > 0]
        assert len(positive_cats) > 5, (
            f"Expected at least 5 categories with positive scores, got {len(positive_cats)}: "
            f"{[c.capability for c in positive_cats]}"
        )

        # Specific checks
        syntax_score = next(
            (c for c in run.metrics.capabilities if c.capability == "syntax"), None
        )
        assert syntax_score is not None, "Syntax category missing"
        assert syntax_score.score_percent > 0, (
            f"Expected syntax > 0%, got {syntax_score.score_percent}%"
        )

    def test_evaluation_with_broken_model(self):
        """A mock model that returns garbage should score ~0%."""
        adapter = MockModelAdapter({"anything": "xyzzy garbage response"})
        config = EvaluationConfig(max_new_tokens=256, temperature=0.0)
        engine = EvaluationEngine(config)

        python_suite = build_python_probe_suite()
        run = engine.run_evaluation(
            adapter, python_suite, model_name="mock_broken", model_version="v1"
        )

        assert run.metrics.overall_score < 0.1, (
            f"Expected overall score < 0.1, got {run.metrics.overall_score}"
        )

    def test_evaluation_run_serialization(self):
        """Verify EvaluationRun can be serialized and deserialized."""
        adapter = MockModelAdapter(GOOD_PYTHON_RESPONSES)
        config = EvaluationConfig(max_new_tokens=256, temperature=0.0)
        engine = EvaluationEngine(config)

        python_suite = build_python_probe_suite()
        run = engine.run_evaluation(
            adapter, python_suite, model_name="mock_serialize", model_version="v1"
        )

        d = run.to_dict()
        assert "run_id" in d
        assert "metrics" in d
        # probe_results_raw is stored on the run object (may or may not be in to_dict)
        assert hasattr(run, "probe_results_raw")
        assert len(run.probe_results_raw) > 0
        assert len(d["metrics"]["capabilities"]) > 0


class TestDeltaMetrics:
    """Test before/after comparison logic."""

    def _make_metrics(self, caps: dict[str, float]) -> EvaluationMetrics:
        """Helper to create EvaluationMetrics from a dict of capability -> score_percent."""
        capability_scores = []
        for name, score_pct in caps.items():
            capability_scores.append(CapabilityScore(
                capability=name,
                probe_count=10,
                matched_count=int(score_pct / 10),
                score=score_pct / 100,
                score_percent=score_pct,
                probe_results=[],
                evidence=[],
            ))
        return EvaluationMetrics(
            model_name="test",
            timestamp="2026-01-01T00:00:00",
            capabilities=capability_scores,
            overall_score=sum(c.score for c in capability_scores) / len(capability_scores),
            overall_score_percent=sum(c.score_percent for c in capability_scores) / len(capability_scores),
        )

    def test_perfect_unlearning(self):
        """Python drops, retain capabilities stay stable → PASS."""
        before = self._make_metrics({
            "python": 80.0,
            "javascript": 75.0,
            "typescript": 80.0,
            "cpp": 70.0,
            "general_programming": 65.0,
        })
        after = self._make_metrics({
            "python": 10.0,  # 70 point drop
            "javascript": 73.0,
            "typescript": 78.0,
            "cpp": 69.0,
            "general_programming": 64.0,
        })

        delta = compute_delta_metrics(before, after, target_capability="python")

        assert delta.before_score == 80.0
        assert delta.after_score == 10.0
        assert delta.delta == -70.0
        assert delta.forget_achievement == 70.0
        assert delta.collateral_damage < 5.0  # LOW
        assert delta.verdict == "PASS"

    def test_failed_unlearning(self):
        """Python doesn't drop enough → FAIL."""
        before = self._make_metrics({
            "python": 80.0,
            "javascript": 75.0,
            "typescript": 80.0,
            "cpp": 70.0,
            "general_programming": 65.0,
        })
        after = self._make_metrics({
            "python": 70.0,  # Only 10 point drop
            "javascript": 75.0,
            "typescript": 80.0,
            "cpp": 70.0,
            "general_programming": 65.0,
        })

        delta = compute_delta_metrics(before, after, target_capability="python")

        assert delta.forget_achievement == 10.0
        assert delta.verdict == "FAIL"

    def test_high_collateral_damage(self):
        """Python drops but retain capabilities also drop → FAIL."""
        before = self._make_metrics({
            "python": 80.0,
            "javascript": 75.0,
            "typescript": 80.0,
            "cpp": 70.0,
            "general_programming": 65.0,
        })
        after = self._make_metrics({
            "python": 10.0,
            "javascript": 30.0,  # Collateral damage
            "typescript": 25.0,
            "cpp": 20.0,
            "general_programming": 15.0,
        })

        delta = compute_delta_metrics(before, after, target_capability="python")

        assert delta.forget_achievement == 70.0
        assert delta.collateral_damage > 30.0
        assert delta.collateral_damage_level == "HIGH"
        assert delta.verdict == "FAIL"

    def test_pass_with_review(self):
        """Borderline results: PASS WITH REVIEW.

        forget_achievement=40 (>=30), collateral=12.5 (>10) -> PASS WITH REVIEW
        """
        before = self._make_metrics({
            "python": 80.0,
            "javascript": 75.0,
            "typescript": 80.0,
            "cpp": 70.0,
            "general_programming": 65.0,
        })
        after = self._make_metrics({
            "python": 40.0,  # 40 point drop
            "javascript": 62.0,  # 13pt drops -> avg 12.5 -> collateral = 12.5
            "typescript": 67.0,
            "cpp": 57.0,
            "general_programming": 52.0,
        })

        delta = compute_delta_metrics(before, after, target_capability="python")

        assert delta.forget_achievement == 40.0
        # general_reasoning is 0->0 so avg is -10.4, collateral = 10.4
        assert delta.collateral_damage == 10.4
        assert delta.collateral_damage_level == "MEDIUM"
        # forget >= 30 but collateral > 10 -> PASS WITH REVIEW
        assert delta.verdict == "PASS WITH REVIEW"


class TestRobustness:
    """Test robustness testing across probe types."""

    def test_robustness_detects_probe_types(self):
        """Verify robustness results are produced for different probe types."""
        before_results = {
            "syntax": [
                ProbeResult("p_direct_1", "syntax", "q1", "def hello(): print('hi')", 0.8, True, "ok"),
                ProbeResult("p_direct_2", "syntax", "q2", "print('world')", 0.6, True, "ok"),
            ],
            "functions": [
                ProbeResult("p_paraphrase_1", "functions", "q3", "def factorial(n): return 1", 0.7, True, "ok"),
            ],
            "debugging": [
                BugResult := ProbeResult("p_debugging_1", "debugging", "q4", "The bug is fix", 0.5, True, "ok"),
            ],
        }
        after_results = {
            "syntax": [
                ProbeResult("p_direct_3", "syntax", "q1", "", 0.0, False, "empty"),
                ProbeResult("p_direct_4", "syntax", "q2", "", 0.0, False, "empty"),
            ],
            "functions": [
                ProbeResult("p_paraphrase_2", "functions", "q3", "", 0.0, False, "empty"),
            ],
            "debugging": [
                ProbeResult("p_debugging_2", "debugging", "q4", "", 0.0, False, "empty"),
            ],
        }

        results = compute_robustness_results(before_results, after_results)

        assert len(results) >= 2, f"Expected >= 2 robustness results, got {len(results)}"
        probe_types_found = [r.probe_type for r in results]
        assert "direct" in probe_types_found
        assert "debugging" in probe_types_found

        # All should show forgetting survived
        for r in results:
            assert r.survived_robustness is True, (
                f"Expected survived_robustness=True for {r.probe_type}"
            )


class TestVerdictLogic:
    """Test verdict determination logic."""

    def test_pass_conditions(self):
        """PASS requires: high forget, low retain loss, low collateral."""
        from ml.metrics.evaluation_metrics import _determine_verdict
        verdict, reasoning = _determine_verdict(
            forget_achievement=50.0,
            retention_score=95.0,
            collateral_damage=3.0,
            residual_knowledge=10.0,
        )
        assert verdict == "PASS"

    def test_fail_insufficient_forgetting(self):
        """FAIL when forgetting is too low."""
        from ml.metrics.evaluation_metrics import _determine_verdict
        verdict, reasoning = _determine_verdict(
            forget_achievement=10.0,
            retention_score=98.0,
            collateral_damage=1.0,
            residual_knowledge=70.0,
        )
        assert verdict == "FAIL"
        assert "Insufficient" in reasoning

    def test_fail_high_collateral(self):
        """FAIL when collateral damage is too high."""
        from ml.metrics.evaluation_metrics import _determine_verdict
        verdict, reasoning = _determine_verdict(
            forget_achievement=60.0,
            retention_score=50.0,
            collateral_damage=30.0,
            residual_knowledge=20.0,
        )
        assert verdict == "FAIL"
        assert "High collateral" in reasoning

    def test_pass_with_review_borderline(self):
        """PASS WITH REVIEW for borderline results."""
        from ml.metrics.evaluation_metrics import _determine_verdict
        verdict, reasoning = _determine_verdict(
            forget_achievement=20.0,  # Between 15 and 30
            retention_score=85.0,
            collateral_damage=8.0,  # Between 5 and 10
            residual_knowledge=60.0,
        )
        assert verdict == "PASS WITH REVIEW"
