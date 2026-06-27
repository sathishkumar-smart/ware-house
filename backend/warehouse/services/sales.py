"""Sales order creation, status updates, and credit management."""
from decimal import Decimal

from django.db import transaction
from graphql import GraphQLError

from warehouse.models import (
    Buyer, CreditPayment, CreditTransaction,
    FinishedProduct, SalesOrder, SalesOrderItem,
)
from warehouse.permissions import get_warehouse


def create_sales_order(*, user, buyer_id, payment_mode, warehouse_id,
                       order_date=None, expected_delivery=None, discount=0, notes="", items):
    """
    items = [{finished_product_id, quantity, unit_price}]
    """
    try:
        buyer = Buyer.objects.get(pk=buyer_id, active=True)
    except Buyer.DoesNotExist as exc:
        raise GraphQLError("Buyer not found.") from exc
    warehouse = get_warehouse(user, warehouse_id)

    with transaction.atomic():
        so = SalesOrder.objects.create(
            buyer=buyer,
            payment_mode=payment_mode.upper(),
            warehouse=warehouse,
            order_date=order_date or __import__("django.utils.timezone", fromlist=["now"]).now().date(),
            expected_delivery=expected_delivery,
            discount=Decimal(str(discount)),
            notes=notes.strip(),
            created_by=user,
        )
        subtotal = Decimal("0.00")
        for item in items:
            fp_id = item["finished_product_id"]
            qty = int(item["quantity"])
            unit_price = Decimal(str(item["unit_price"]))

            try:
                fp = FinishedProduct.objects.select_for_update().get(pk=fp_id, active=True)
            except FinishedProduct.DoesNotExist as exc:
                raise GraphQLError(f"Finished product {fp_id} not found.") from exc
            if fp.quantity < qty:
                raise GraphQLError(f"Insufficient stock for {fp.sku}: only {fp.quantity} available.")

            fp.quantity -= qty
            fp.save(update_fields=["quantity", "updated_at"])

            line_total = unit_price * qty
            SalesOrderItem.objects.create(
                sales_order=so,
                finished_product=fp,
                quantity=qty,
                unit_price=unit_price,
                total_price=line_total,
            )
            subtotal += line_total

        discount_amt = Decimal(str(discount))
        total = subtotal - discount_amt
        amount_paid = total if payment_mode.upper() == SalesOrder.PaymentMode.PAID else (
            Decimal(str(items[0].get("amount_paid", 0))) if payment_mode.upper() == SalesOrder.PaymentMode.PARTIAL else Decimal("0.00")
        )
        so.subtotal = subtotal
        so.discount = discount_amt
        so.total_amount = total
        so.amount_paid = amount_paid
        so.amount_due = total - amount_paid
        so.save(update_fields=["subtotal", "discount", "total_amount", "amount_paid", "amount_due"])

        if payment_mode.upper() in (SalesOrder.PaymentMode.CREDIT, SalesOrder.PaymentMode.PARTIAL):
            CreditTransaction.objects.create(
                sales_order=so,
                buyer=buyer,
                total_amount=total,
                amount_paid=amount_paid,
                amount_due=total - amount_paid,
            )
    return so


def update_sales_order_status(*, id, status, actual_delivery=None):
    status = status.upper()
    if status not in SalesOrder.Status.values:
        raise GraphQLError("Invalid status.")
    try:
        so = SalesOrder.objects.get(pk=id)
    except SalesOrder.DoesNotExist as exc:
        raise GraphQLError("Sales order not found.") from exc
    so.status = status
    if actual_delivery:
        so.actual_delivery = actual_delivery
    so.save()
    return so


def record_credit_payment(*, credit_id, amount, payment_method="CASH", reference="", notes="", user):
    try:
        credit = CreditTransaction.objects.select_for_update().get(pk=credit_id)
    except CreditTransaction.DoesNotExist as exc:
        raise GraphQLError("Credit transaction not found.") from exc
    if credit.status == CreditTransaction.Status.SETTLED:
        raise GraphQLError("This credit has already been fully settled.")

    payment_amount = Decimal(str(amount))
    if payment_amount <= 0:
        raise GraphQLError("Payment amount must be greater than zero.")
    if payment_amount > credit.amount_due:
        raise GraphQLError(f"Payment ({payment_amount}) exceeds outstanding balance ({credit.amount_due}).")

    from django.utils import timezone
    CreditPayment.objects.create(
        credit=credit, amount=payment_amount, payment_method=payment_method.upper(),
        reference=reference.strip(), notes=notes.strip(), recorded_by=user,
        payment_date=timezone.now().date(),
    )
    credit.amount_paid += payment_amount
    credit.amount_due -= payment_amount
    if credit.amount_due <= 0:
        credit.status = CreditTransaction.Status.SETTLED
    else:
        credit.status = CreditTransaction.Status.PARTIAL
    credit.save()

    so = credit.sales_order
    so.amount_paid = credit.amount_paid
    so.amount_due = credit.amount_due
    so.save(update_fields=["amount_paid", "amount_due"])
    return credit
