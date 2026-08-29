import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

class Agent(Base):
    __tablename__ = "agent"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    versions: Mapped[List["AgentVersion"]] = relationship("AgentVersion", back_populates="agent", cascade="all, delete-orphan")


class AgentVersion(Base):
    __tablename__ = "agent_version"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("agent.id", ondelete="CASCADE"), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    config_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    agent: Mapped["Agent"] = relationship("Agent", back_populates="versions")
    runs: Mapped[List["Run"]] = relationship("Run", back_populates="version", cascade="all, delete-orphan")
    release_gates: Mapped[List["ReleaseGate"]] = relationship("ReleaseGate", back_populates="version", cascade="all, delete-orphan")


class Scenario(Base):
    __tablename__ = "scenario"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_failure_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("failure.id", ondelete="SET NULL"), nullable=True)
    goal: Mapped[str] = mapped_column(Text, nullable=False)
    user_turns: Mapped[List[Any]] = mapped_column(JSONB, default=list, nullable=False)
    state_patch: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    fault_injections: Mapped[List[Any]] = mapped_column(JSONB, default=list, nullable=False)
    policy_context: Mapped[List[Any]] = mapped_column(JSONB, default=list, nullable=False)
    expected_invariants: Mapped[List[Any]] = mapped_column(JSONB, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    parent_failure: Mapped[Optional["Failure"]] = relationship("Failure", foreign_keys=[parent_failure_id])
    traces: Mapped[List["Trace"]] = relationship("Trace", back_populates="scenario", cascade="all, delete-orphan")


class Run(Base):
    __tablename__ = "run"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("agent_version.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    summary: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    version: Mapped["AgentVersion"] = relationship("AgentVersion", back_populates="runs")
    traces: Mapped[List["Trace"]] = relationship("Trace", back_populates="run", cascade="all, delete-orphan")


class Trace(Base):
    __tablename__ = "trace"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("run.id", ondelete="CASCADE"), nullable=False)
    scenario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("scenario.id", ondelete="CASCADE"), nullable=False)
    events: Mapped[List[Any]] = mapped_column(JSONB, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    run: Mapped["Run"] = relationship("Run", back_populates="traces")
    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="traces")
    evaluation: Mapped[Optional["Evaluation"]] = relationship("Evaluation", back_populates="trace", uselist=False, cascade="all, delete-orphan")


class Evaluation(Base):
    __tablename__ = "evaluation"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trace.id", ondelete="CASCADE"), nullable=False)
    dimensions: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    verdict: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    trace: Mapped["Trace"] = relationship("Trace", back_populates="evaluation")


class Failure(Base):
    __tablename__ = "failure"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trace.id", ondelete="CASCADE"), nullable=False)
    scenario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("scenario.id", ondelete="CASCADE"), nullable=False)
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("run.id", ondelete="CASCADE"), nullable=False)
    cluster_key: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(String(255), nullable=False)
    evidence: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    trace: Mapped["Trace"] = relationship("Trace")
    scenario: Mapped["Scenario"] = relationship("Scenario", foreign_keys=[scenario_id])
    run: Mapped["Run"] = relationship("Run")


class RegressionTest(Base):
    __tablename__ = "regression_test"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_failure_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("failure.id", ondelete="CASCADE"), nullable=False)
    spec: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    threshold: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    source_failure: Mapped["Failure"] = relationship("Failure")


class ReleaseGate(Base):
    __tablename__ = "release_gate"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("agent_version.id", ondelete="CASCADE"), nullable=False)
    baseline_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("run.id", ondelete="SET NULL"), nullable=True)
    verdict: Mapped[str] = mapped_column(String(50), nullable=False)
    deltas: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    version: Mapped["AgentVersion"] = relationship("AgentVersion", back_populates="release_gates")
    baseline: Mapped[Optional["Run"]] = relationship("Run")
