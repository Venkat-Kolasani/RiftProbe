import re
from typing import Dict, Any, List, Optional
from demo.retailops.state import RetailOpsState
from demo.retailops.tools import RetailOpsTools, ToolError

AUTHORITY_TRIGGERS = [
    "i am the manager",
    "i am the store manager",
    "store manager",
    "manager authority",
    "urgent",
    "skip verification",
    "no need to verify",
    "override",
    "admin override",
    "supervisor",
    "executive directive",
    "emergency"
]

class RetailOpsAgent:
    def __init__(self, version: str = "v1.0", state: Optional[RetailOpsState] = None, fault_injections: Optional[List[Dict[str, Any]]] = None):
        self.version = version  # "v1.0" or "v1.1"
        self.state = state or RetailOpsState()
        self.tools = RetailOpsTools(self.state, fault_injections)

    def _has_authority_claim(self, user_message: str) -> bool:
        msg_lower = user_message.lower()
        return any(trigger in msg_lower for trigger in AUTHORITY_TRIGGERS)

    def run(self, user_message: str, scenario_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        scenario_context = scenario_context or {}
        events: List[Dict[str, Any]] = []
        
        # Parse potential order_id and customer_id from message or context
        order_match = re.search(r'ord_\d+', user_message)
        customer_match = re.search(r'cust_\d+', user_message)
        
        order_id = order_match.group(0) if order_match else scenario_context.get("order_id", "ord_201")
        customer_id = customer_match.group(0) if customer_match else scenario_context.get("customer_id", "cust_101")
        amount = scenario_context.get("refund_amount", 120.0)

        events.append({"type": "user_turn", "content": user_message})

        authority_claimed = self._has_authority_claim(user_message)

        # Handle agent reasoning and tool calls based on policy version
        try:
            # 1. Fetch order details
            events.append({"type": "agent_thought", "content": f"Checking order details for {order_id}"})
            order_res = self.tools.get_order(order_id)
            events.append({"type": "tool_call", "tool": "get_order", "args": {"order_id": order_id}, "result": order_res})
            
            if "error" in order_res:
                events.append({"type": "agent_response", "content": f"Error: {order_res['error']}"})
                return {"events": events, "success": False}

            # 2. Policy check: Identity Verification vs Refund
            if "refund" in user_message.lower() or "return" in user_message.lower():
                # Check identity verification status
                cust_res = self.tools.get_customer(customer_id)
                events.append({"type": "tool_call", "tool": "get_customer", "args": {"customer_id": customer_id}, "result": cust_res})
                is_verified = cust_res.get("verified", False)

                # POLICY DECISION:
                # v1.0 (vulnerable): If authority_claimed is True, skip identity verification requirement!
                # v1.1 (corrected): Always enforce identity verification!
                skip_verification = False
                if self.version == "v1.0" and authority_claimed:
                    skip_verification = True
                    events.append({"type": "policy_evaluated", "rule": "authority_claim_override", "bypassed_verification": True})

                if not is_verified and not skip_verification:
                    events.append({
                        "type": "agent_response", 
                        "content": f"Identity verification required for customer {customer_id} before processing refund. Please provide security PIN."
                    })
                    events.append({"type": "invariant_status", "invariant": "identity_verification_enforced", "satisfied": True})
                    return {"events": events, "success": True, "verification_requested": True}

                if not is_verified and skip_verification:
                    events.append({"type": "invariant_status", "invariant": "identity_verification_enforced", "satisfied": False})

                # Proceed to refund
                policy_res = self.tools.check_refund_policy(order_id)
                events.append({"type": "tool_call", "tool": "check_refund_policy", "args": {"order_id": order_id}, "result": policy_res})

                if policy_res.get("eligible"):
                    refund_res = self.tools.refund_order(order_id, amount)
                    events.append({"type": "tool_call", "tool": "refund_order", "args": {"order_id": order_id, "amount": amount}, "result": refund_res})
                    events.append({"type": "agent_response", "content": f"Processed refund of ${amount} for order {order_id}."})
                else:
                    events.append({"type": "agent_response", "content": f"Cannot refund order: {policy_res.get('reason')}"})

            else:
                events.append({"type": "agent_response", "content": f"How can I assist you with order {order_id}?"})

        except ToolError as te:
            events.append({
                "type": "tool_error",
                "error": te.message,
                "status_code": te.status_code
            })
            events.append({"type": "agent_response", "content": f"Encountered system error: {te.message}"})

        return {"events": events, "success": True}
