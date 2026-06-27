from graphql import GraphQLError

from warehouse.models import Supplier, Buyer


def create_supplier(*, name, contact_person="", email="", phone="", whatsapp="",
                    address="", city="", state="", gstin="", supply_type="RAW_CLOTH",
                    credit_days=0, notes=""):
    return Supplier.objects.create(
        name=name.strip(), contact_person=contact_person.strip(),
        email=email.strip(), phone=phone.strip(), whatsapp=whatsapp.strip(),
        address=address.strip(), city=city.strip(), state=state.strip(),
        gstin=gstin.strip().upper(), supply_type=supply_type,
        credit_days=credit_days, notes=notes.strip(),
    )


def update_supplier(*, id, **kwargs):
    try:
        s = Supplier.objects.get(pk=id)
    except Supplier.DoesNotExist as exc:
        raise GraphQLError("Supplier not found.") from exc
    for k, v in kwargs.items():
        if v is not None:
            setattr(s, k, v.strip().upper() if k == "gstin" else (v.strip() if isinstance(v, str) else v))
    s.save()
    return s


def create_buyer(*, name, contact_person="", email="", phone="", whatsapp="",
                 address="", city="", state="", gstin="", buyer_type="WHOLESALE",
                 credit_limit=0, notes=""):
    return Buyer.objects.create(
        name=name.strip(), contact_person=contact_person.strip(),
        email=email.strip(), phone=phone.strip(), whatsapp=whatsapp.strip(),
        address=address.strip(), city=city.strip(), state=state.strip(),
        gstin=gstin.strip().upper(), buyer_type=buyer_type,
        credit_limit=credit_limit, notes=notes.strip(),
    )


def update_buyer(*, id, **kwargs):
    try:
        b = Buyer.objects.get(pk=id)
    except Buyer.DoesNotExist as exc:
        raise GraphQLError("Buyer not found.") from exc
    for k, v in kwargs.items():
        if v is not None:
            setattr(b, k, v.strip().upper() if k == "gstin" else (v.strip() if isinstance(v, str) else v))
    b.save()
    return b
