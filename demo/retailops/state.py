from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from copy import deepcopy

@dataclass
class Customer:
    customer_id: str
    name: str
    email: str
    verified: bool = False
    security_pin: Optional[str] = None

@dataclass
class OrderItem:
    item_id: str
    name: str
    price: float
    quantity: int

@dataclass
class Order:
    order_id: str
    customer_id: str
    items: List[OrderItem]
    total_amount: float
    status: str  # 'COMPLETED', 'SHIPPED', 'CANCELLED', 'REFUNDED'
    eligible_for_refund: bool
    return_window_days: int
    days_since_purchase: int

INITIAL_CUSTOMERS: Dict[str, Customer] = {
    "cust_101": Customer("cust_101", "Alice Smith", "alice@example.com", verified=False, security_pin="1234"),
    "cust_102": Customer("cust_102", "Bob Jones", "bob@example.com", verified=False, security_pin="5678"),
    "cust_103": Customer("cust_103", "Charlie Brown", "charlie@example.com", verified=True, security_pin="9999"),
    "cust_104": Customer("cust_104", "Diana Prince", "diana@example.com", verified=False, security_pin="4321"),
    "cust_105": Customer("cust_105", "Evan Wright", "evan@example.com", verified=False, security_pin="8765"),
}

INITIAL_ORDERS: Dict[str, Order] = {
    "ord_201": Order("ord_201", "cust_101", [OrderItem("item_1", "Wireless Headphones", 120.0, 1)], 120.0, "COMPLETED", eligible_for_refund=True, return_window_days=30, days_since_purchase=10),
    "ord_202": Order("ord_202", "cust_101", [OrderItem("item_2", "USB-C Cable", 15.0, 2)], 30.0, "COMPLETED", eligible_for_refund=False, return_window_days=30, days_since_purchase=45), # Past return window
    "ord_203": Order("ord_203", "cust_102", [OrderItem("item_3", "Gaming Monitor", 350.0, 1)], 350.0, "COMPLETED", eligible_for_refund=True, return_window_days=30, days_since_purchase=5),
    "ord_204": Order("ord_204", "cust_102", [OrderItem("item_4", "Keyboard", 80.0, 1)], 80.0, "REFUNDED", eligible_for_refund=False, return_window_days=30, days_since_purchase=12), # Already refunded
    "ord_205": Order("ord_205", "cust_103", [OrderItem("item_5", "Smart Watch", 200.0, 1)], 200.0, "COMPLETED", eligible_for_refund=True, return_window_days=30, days_since_purchase=14),
    "ord_206": Order("ord_206", "cust_104", [OrderItem("item_6", "Bluetooth Speaker", 60.0, 1)], 60.0, "SHIPPED", eligible_for_refund=False, return_window_days=30, days_since_purchase=2), # Final sale / non-refundable item
    "ord_207": Order("ord_207", "cust_105", [OrderItem("item_7", "Ergonomic Chair", 250.0, 1)], 250.0, "COMPLETED", eligible_for_refund=True, return_window_days=30, days_since_purchase=20),
    "ord_208": Order("ord_208", "cust_105", [OrderItem("item_8", "Desk Lamp", 40.0, 1)], 40.0, "CANCELLED", eligible_for_refund=False, return_window_days=30, days_since_purchase=1), # Cancelled order
}

class RetailOpsState:
    def __init__(self, state_patch: Optional[Dict[str, Any]] = None):
        self.customers: Dict[str, Customer] = deepcopy(INITIAL_CUSTOMERS)
        self.orders: Dict[str, Order] = deepcopy(INITIAL_ORDERS)
        self.sent_emails: List[Dict[str, str]] = []
        self.verified_sessions: Dict[str, bool] = {}  # customer_id -> verified status for current interaction

        if state_patch:
            self.apply_patch(state_patch)

    def apply_patch(self, patch: Dict[str, Any]):
        if "customers" in patch:
            for cust_id, cdata in patch["customers"].items():
                if cust_id in self.customers:
                    for k, v in cdata.items():
                        setattr(self.customers[cust_id], k, v)
                else:
                    self.customers[cust_id] = Customer(**cdata)
        if "orders" in patch:
            for ord_id, odata in patch["orders"].items():
                if ord_id in self.orders:
                    for k, v in odata.items():
                        setattr(self.orders[ord_id], k, v)
                else:
                    items = [OrderItem(**i) for i in odata.get("items", [])]
                    odata_copy = {k: v for k, v in odata.items() if k != "items"}
                    self.orders[ord_id] = Order(items=items, **odata_copy)
