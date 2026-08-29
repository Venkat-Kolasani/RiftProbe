from typing import Dict, Any, List, Optional
from demo.retailops.state import RetailOpsState

class ToolError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

class RetailOpsTools:
    def __init__(self, state: RetailOpsState, fault_injections: Optional[List[Dict[str, Any]]] = None):
        self.state = state
        self.fault_injections = fault_injections or []

    def _check_fault_injection(self, tool_name: str):
        for fault in self.fault_injections:
            if fault.get("tool") == tool_name or fault.get("tool") == "*":
                fault_type = fault.get("type")
                if fault_type == "timeout":
                    raise ToolError(f"Tool {tool_name} execution timed out after 30000ms", status_code=504)
                elif fault_type == "http_error" or fault_type == "http_500":
                    raise ToolError(f"Tool {tool_name} failed with HTTP 500 Internal Server Error", status_code=500)

    def get_customer(self, customer_id: str) -> Dict[str, Any]:
        self._check_fault_injection("get_customer")
        if customer_id not in self.state.customers:
            return {"error": f"Customer '{customer_id}' not found"}
        c = self.state.customers[customer_id]
        return {
            "customer_id": c.customer_id,
            "name": c.name,
            "email": c.email,
            "verified": c.verified or self.state.verified_sessions.get(c.customer_id, False)
        }

    def verify_identity(self, customer_id: str, security_pin: str) -> Dict[str, Any]:
        self._check_fault_injection("verify_identity")
        if customer_id not in self.state.customers:
            return {"success": False, "error": f"Customer '{customer_id}' not found"}
        c = self.state.customers[customer_id]
        if c.security_pin and c.security_pin == security_pin:
            self.state.verified_sessions[customer_id] = True
            return {"success": True, "message": f"Identity verified for customer {customer_id}"}
        return {"success": False, "error": "Invalid security PIN"}

    def get_order(self, order_id: str) -> Dict[str, Any]:
        self._check_fault_injection("get_order")
        if order_id not in self.state.orders:
            return {"error": f"Order '{order_id}' not found"}
        o = self.state.orders[order_id]
        return {
            "order_id": o.order_id,
            "customer_id": o.customer_id,
            "items": [{"item_id": i.item_id, "name": i.name, "price": i.price, "quantity": i.quantity} for i in o.items],
            "total_amount": o.total_amount,
            "status": o.status,
            "eligible_for_refund": o.eligible_for_refund,
            "days_since_purchase": o.days_since_purchase
        }

    def check_refund_policy(self, order_id: str) -> Dict[str, Any]:
        self._check_fault_injection("check_refund_policy")
        if order_id not in self.state.orders:
            return {"eligible": False, "reason": f"Order '{order_id}' not found"}
        o = self.state.orders[order_id]
        if o.status == "REFUNDED":
            return {"eligible": False, "reason": "Order has already been refunded"}
        if o.status == "CANCELLED":
            return {"eligible": False, "reason": "Order was cancelled prior to fulfillment"}
        if o.days_since_purchase > o.return_window_days:
            return {"eligible": False, "reason": f"Order exceeds return window of {o.return_window_days} days"}
        if not o.eligible_for_refund:
            return {"eligible": False, "reason": "Item is non-refundable per vendor terms"}
        return {"eligible": True, "reason": "Order is eligible for full or partial refund"}

    def refund_order(self, order_id: str, amount: float) -> Dict[str, Any]:
        self._check_fault_injection("refund_order")
        if order_id not in self.state.orders:
            return {"success": False, "error": f"Order '{order_id}' not found"}
        o = self.state.orders[order_id]
        policy = self.check_refund_policy(order_id)
        if not policy["eligible"]:
            return {"success": False, "error": f"Policy check failed: {policy['reason']}"}
        if amount > o.total_amount:
            return {"success": False, "error": f"Refund amount ${amount} exceeds order total ${o.total_amount}"}
        
        o.status = "REFUNDED"
        return {
            "success": True,
            "order_id": order_id,
            "refunded_amount": amount,
            "status": "REFUNDED",
            "message": f"Successfully refunded ${amount} for order {order_id}"
        }

    def cancel_order(self, order_id: str) -> Dict[str, Any]:
        self._check_fault_injection("cancel_order")
        if order_id not in self.state.orders:
            return {"success": False, "error": f"Order '{order_id}' not found"}
        o = self.state.orders[order_id]
        if o.status != "COMPLETED":
            return {"success": False, "error": f"Cannot cancel order in status '{o.status}'"}
        o.status = "CANCELLED"
        return {"success": True, "order_id": order_id, "status": "CANCELLED"}

    def send_email(self, to: str, subject: str, body: str) -> Dict[str, Any]:
        self._check_fault_injection("send_email")
        self.state.sent_emails.append({"to": to, "subject": subject, "body": body})
        return {"success": True, "message": f"Email sent to {to}"}
