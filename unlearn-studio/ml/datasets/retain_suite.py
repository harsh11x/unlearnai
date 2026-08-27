"""
NullMind - Retain Dataset Suite
Evaluation probes for non-Python capabilities to detect collateral damage.
"""

from ml.datasets.python_probes import Probe, ProbeSuite, _make_probes


def build_retain_suite() -> ProbeSuite:
    """Build the retain evaluation suite covering non-Python capabilities."""
    suite = ProbeSuite(
        name="Programming Retain Suite",
        description="Evaluation probes for retained capabilities (non-Python). Used to detect collateral damage.",
        language="multi",
    )

    # =========================================================================
    # JavaScript Probes
    # =========================================================================
    suite.probes.extend(_make_probes("javascript", "syntax", [
        {
            "prompt": "Write a JavaScript function that calculates the factorial of a number.",
            "expected": "function|factorial|return",
            "difficulty": "medium",
            "type": "direct",
            "language": "javascript",
        },
        {
            "prompt": "How would I create a factorial function in JavaScript?",
            "expected": "function|factorial|return",
            "difficulty": "medium",
            "type": "paraphrase",
            "language": "javascript",
        },
        {
            "prompt": "Write JavaScript code using async/await to fetch data from an API.",
            "expected": "async|await|fetch|function",
            "difficulty": "medium",
            "type": "direct",
            "language": "javascript",
        },
        {
            "prompt": "Create a JavaScript class for a Stack data structure.",
            "expected": "class|constructor|push|pop",
            "difficulty": "medium",
            "type": "direct",
            "language": "javascript",
        },
    ]))

    # =========================================================================
    # TypeScript Probes
    # =========================================================================
    suite.probes.extend(_make_probes("typescript", "types", [
        {
            "prompt": "Write a TypeScript interface for a User object with name and email.",
            "expected": "interface|User|name|string|email",
            "difficulty": "easy",
            "type": "direct",
            "language": "typescript",
        },
        {
            "prompt": "How do I define a generic type in TypeScript?",
            "expected": "generic|type|<T>|interface",
            "difficulty": "medium",
            "type": "paraphrase",
            "language": "typescript",
        },
        {
            "prompt": "Write TypeScript code with a union type and type guard.",
            "expected": "type|union|is |string |number",
            "difficulty": "medium",
            "type": "direct",
            "language": "typescript",
        },
        {
            "prompt": "Create a TypeScript function with proper type annotations and optional parameters.",
            "expected": "function|: |string|number|undefined|optional",
            "difficulty": "medium",
            "type": "direct",
            "language": "typescript",
        },
    ]))

    # =========================================================================
    # C++ Probes
    # =========================================================================
    suite.probes.extend(_make_probes("cpp", "memory", [
        {
            "prompt": "Write a C++ function that reverses a string.",
            "expected": "std::string|reverse|function|return",
            "difficulty": "medium",
            "type": "direct",
            "language": "cpp",
        },
        {
            "prompt": "How do I use smart pointers in modern C++?",
            "expected": "shared_ptr|unique_ptr|make_shared|make_unique|std::",
            "difficulty": "medium",
            "type": "paraphrase",
            "language": "cpp",
        },
        {
            "prompt": "Write a C++ class with a virtual destructor.",
            "expected": "class|virtual|~|destructor",
            "difficulty": "medium",
            "type": "direct",
            "language": "cpp",
        },
        {
            "prompt": "Implement a C++ template function that finds the maximum of two values.",
            "expected": "template|typename|max|return",
            "difficulty": "medium",
            "type": "direct",
            "language": "cpp",
        },
    ]))

    # =========================================================================
    # General Programming Reasoning
    # =========================================================================
    suite.probes.extend(_make_probes("general_programming", "concepts", [
        {
            "prompt": "Explain the difference between a stack and a queue data structure.",
            "expected": "LIFO|FIFO|stack|queue|push|pop|enqueue|dequeue",
            "difficulty": "easy",
            "type": "explanation",
            "language": "general",
        },
        {
            "prompt": "What is Big O notation and why is it important?",
            "expected": "O(|complexity|time|space|algorithm",
            "difficulty": "easy",
            "type": "explanation",
            "language": "general",
        },
        {
            "prompt": "Explain the concept of recursion and when to use it.",
            "expected": "recursion|recursive|base case|call|function",
            "difficulty": "easy",
            "type": "explanation",
            "language": "general",
        },
        {
            "prompt": "What is the difference between a hash table and a binary search tree?",
            "expected": "hash|BST|O(1)|O(log n)|search|lookup",
            "difficulty": "medium",
            "type": "explanation",
            "language": "general",
        },
        {
            "prompt": "Explain the concept of dependency injection.",
            "expected": "inject|dependency|constructor|inversion|loose coupling",
            "difficulty": "medium",
            "type": "explanation",
            "language": "general",
        },
        {
            "prompt": "What are the SOLID principles in software engineering?",
            "expected": "Single|Open|Liskov|Interface|Dependency",
            "difficulty": "medium",
            "type": "explanation",
            "language": "general",
        },
    ]))

    # =========================================================================
    # Generic Algorithms
    # =========================================================================
    suite.probes.extend(_make_probes("algorithms", "cross_language", [
        {
            "prompt": "Write pseudocode for a bubble sort algorithm.",
            "expected": "for|while|swap|compare|bubble",
            "difficulty": "easy",
            "type": "direct",
            "language": "general",
        },
        {
            "prompt": "Explain how a hash table works and its time complexity.",
            "expected": "hash|bucket|collision|O(1)|O(n)",
            "difficulty": "medium",
            "type": "explanation",
            "language": "general",
        },
        {
            "prompt": "Describe the difference between BFS and DFS graph traversal.",
            "expected": "BFS|DFS|breadth|depth|queue|stack|graph",
            "difficulty": "medium",
            "type": "explanation",
            "language": "general",
        },
    ]))

    return suite
