import graphene
import graphql_jwt
from django.contrib.auth import get_user_model
from graphql_jwt.decorators import login_required
from warehouse.schema import Mutation as WarehouseMutation
from warehouse.schema import Query as WarehouseQuery


class Query(WarehouseQuery, graphene.ObjectType):
    me = graphene.String()

    @login_required
    def resolve_me(self, info):
        return info.context.user.username


class CreateUser(graphene.Mutation):
    class Arguments:
        username = graphene.String(required=True)
        password = graphene.String(required=True)

    message = graphene.String()

    def mutate(self, info, username, password):
        User = get_user_model()

        if User.objects.filter(username=username).exists():
            return CreateUser(message="User already exists")
        if User.objects.exists():
            return CreateUser(
                message="Public registration is closed. Ask an administrator to create the employee account."
            )

        user = User.objects.create_user(
            username=username,
            password=password
        )
        user.is_staff = True
        user.is_superuser = True
        user.save(update_fields=["is_staff", "is_superuser"])

        return CreateUser(message="Administrator account created successfully")


class Mutation(WarehouseMutation, graphene.ObjectType):

    # ✅ LOGIN
    token_auth = graphql_jwt.ObtainJSONWebToken.Field()

    # ✅ VERIFY TOKEN
    verify_token = graphql_jwt.Verify.Field()

    # ✅ REFRESH TOKEN
    refresh_token = graphql_jwt.Refresh.Field()

    # ✅ REGISTER
    create_user = CreateUser.Field()


schema = graphene.Schema(query=Query, mutation=Mutation)
