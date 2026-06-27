import graphene
from graphql_jwt.decorators import login_required

from warehouse.models import EmployeeProfile
from warehouse.permissions import require_role
from warehouse.services.supplier import create_buyer, create_supplier, update_buyer, update_supplier
from warehouse.schema.types import BuyerType, SupplierType


class CreateSupplier(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)
        contact_person = graphene.String()
        email = graphene.String()
        phone = graphene.String()
        whatsapp = graphene.String()
        address = graphene.String()
        city = graphene.String()
        state = graphene.String()
        gstin = graphene.String()
        supply_type = graphene.String()
        credit_days = graphene.Int()
        notes = graphene.String()

    supplier = graphene.Field(SupplierType)

    @login_required
    def mutate(self, info, name, **kwargs):
        require_role(info.context.user, EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER)
        return CreateSupplier(supplier=create_supplier(name=name, **kwargs))


class UpdateSupplier(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        name = graphene.String()
        contact_person = graphene.String()
        email = graphene.String()
        phone = graphene.String()
        whatsapp = graphene.String()
        address = graphene.String()
        city = graphene.String()
        state = graphene.String()
        gstin = graphene.String()
        supply_type = graphene.String()
        credit_days = graphene.Int()
        notes = graphene.String()
        active = graphene.Boolean()

    supplier = graphene.Field(SupplierType)

    @login_required
    def mutate(self, info, id, **kwargs):
        require_role(info.context.user, EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER)
        return UpdateSupplier(supplier=update_supplier(id=id, **kwargs))


class CreateBuyer(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)
        contact_person = graphene.String()
        email = graphene.String()
        phone = graphene.String()
        whatsapp = graphene.String()
        address = graphene.String()
        city = graphene.String()
        state = graphene.String()
        gstin = graphene.String()
        buyer_type = graphene.String()
        credit_limit = graphene.Float()
        notes = graphene.String()

    buyer = graphene.Field(BuyerType)

    @login_required
    def mutate(self, info, name, **kwargs):
        require_role(info.context.user, EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER)
        return CreateBuyer(buyer=create_buyer(name=name, **kwargs))


class UpdateBuyer(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        name = graphene.String()
        contact_person = graphene.String()
        email = graphene.String()
        phone = graphene.String()
        whatsapp = graphene.String()
        address = graphene.String()
        city = graphene.String()
        state = graphene.String()
        gstin = graphene.String()
        buyer_type = graphene.String()
        credit_limit = graphene.Float()
        notes = graphene.String()
        active = graphene.Boolean()

    buyer = graphene.Field(BuyerType)

    @login_required
    def mutate(self, info, id, **kwargs):
        require_role(info.context.user, EmployeeProfile.Role.ADMIN, EmployeeProfile.Role.MANAGER)
        return UpdateBuyer(buyer=update_buyer(id=id, **kwargs))
