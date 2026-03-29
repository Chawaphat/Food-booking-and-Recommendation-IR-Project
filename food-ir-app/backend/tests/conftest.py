# tests/conftest.py
# Adds the app package to sys.path for all test files.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))
