from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ScenarioSchema(BaseModel):
    id: Optional[str] = None
    goal: str
    user_turns: List[str] = Field(default_factory=list)
    state_patch: Dict[str, Any] = Field(default_factory=dict)
    fault_injections: List[Dict[str, Any]] = Field(default_factory=list)
    policy_context: List[str] = Field(default_factory=list)
    expected_invariants: List[str] = Field(default_factory=list)
    parent_failure_id: Optional[str] = None

    class Config:
        from_attributes = True
