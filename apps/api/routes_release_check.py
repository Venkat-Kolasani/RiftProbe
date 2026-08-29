class ReleaseCheckRequest(BaseModel):
    version_label: str = Field(default="v1.0", description="Agent version to evaluate release gate against")

@router.post("/release-check")
async def release_check_endpoint(
    req: ReleaseCheckRequest,
    db: AsyncSession = Depends(get_db)
):
    # Fetch agent version
    stmt_v = select(AgentVersion).where(AgentVersion.label == req.version_label)
    res_v = await db.execute(stmt_v)
    v_obj = res_v.scalar_one_or_none()
    if not v_obj:
        raise HTTPException(status_code=404, detail=f"Agent version '{req.version_label}' not found")

    # Fetch all regression tests
    stmt_r = select(RegressionTest)
    res_r = await db.execute(stmt_r)
    tests = res_r.scalars().all()

    reg_list = [{"id": str(t.id), "spec": t.spec, "threshold": t.threshold} for t in tests]

    gate_result = evaluate_release_gate(
        agent_version=req.version_label,
        regression_tests=reg_list
    )

    # Save release gate evaluation record to DB
    rg_record = ReleaseGate(
        version_id=v_obj.id,
        verdict=gate_result["verdict"],
        deltas=gate_result["summary"]
    )
    db.add(rg_record)
    await db.commit()
    await db.refresh(rg_record)

    return {
        "release_gate_id": str(rg_record.id),
        "agent_version": req.version_label,
        "verdict": gate_result["verdict"],
        "reason": gate_result["reason"],
        "summary": gate_result["summary"],
        "details": gate_result["details"]
    }
