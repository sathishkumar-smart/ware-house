import graphene
from graphql_jwt.decorators import login_required

from warehouse.models import EmployeeProfile
from warehouse.permissions import require_role
from warehouse.services.sales import create_sales_order, record_credit_payment, update_sales_order_status
from warehouse.schema.types import CreditTransactionType, SalesOrderType


class SOItemInput(graphene.InputObjectType):
    finished_product_id = graphene.ID(required=True)
    quantity = graphene.Int(required=True)
    unit_price = graphene.Float(required=True)


class CreateSalesOrder(graphene.Mutation):
    class Arguments:
        buyer_id = graphene.ID(required=True)
        payment_mode = graphene.String(required=True)
        warehouse_id = graphene.ID(required=True)
        items = graphene.List(graphene.NonNull(SOItemInput), required=True)
        order_date = graphene.Date()
        expected_delivery = graphene.Date()
        discount = graphene.Float()
        notes = graphene.String()

    sales_order = graphene.Field(SalesOrderType)

    @login_required
    def mutate(self, info, buyer_id, payment_mode, warehouse_id, items, **kwargs):
        require_role(info.context.user, EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER)
        return CreateSalesOrder(sales_order=create_sales_order(
            user=info.context.user, buyer_id=buyer_id, payment_mode=payment_mode,
            warehouse_id=warehouse_id, items=[dict(i) for i in items], **kwargs,
        ))


class UpdateSalesOrderStatus(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        status = graphene.String(required=True)
        actual_delivery = graphene.Date()

    sales_order = graphene.Field(SalesOrderType)

    @login_required
    def mutate(self, info, id, status, actual_delivery=None):
        require_role(info.context.user, EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER, EmployeeProfile.Role.STORE_KEEPER)
        return UpdateSalesOrderStatus(sales_order=update_sales_order_status(id=id, status=status, actual_delivery=actual_delivery))


class RecordCreditPayment(graphene.Mutation):
    class Arguments:
        credit_id = graphene.ID(required=True)
        amount = graphene.Float(required=True)
        payment_method = graphene.String()
        reference = graphene.String()
        notes = graphene.String()

    credit = graphene.Field(CreditTransactionType)

    @login_required
    def mutate(self, info, credit_id, amount, payment_method="CASH", reference="", notes=""):
        require_role(info.context.user, EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER)
        return RecordCreditPayment(credit=record_credit_payment(
            credit_id=credit_id, amount=amount, payment_method=payment_method,
            reference=reference, notes=notes, user=info.context.user,
        ))
