import os, sys; sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import pytest
from utils import validate_required_fields


def test_validate_required_fields_all_present():
    data = {"a": 1, "b": 2}
    assert validate_required_fields(data, ["a", "b"]) is None


def test_validate_required_fields_missing():
    data = {"a": 1}
    msg = validate_required_fields(data, ["a", "b"])
    assert msg is not None
    assert "b" in msg
