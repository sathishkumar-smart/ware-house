"""
Management command to seed canonical master data.

Usage:
  python manage.py seed_master_data            # insert only, skip existing
  python manage.py seed_master_data --update   # also update fields of existing rows
"""
from django.core.management.base import BaseCommand

from warehouse.models import ClothCategory, ClothColor, ItemType


CLOTH_CATEGORIES = [
    ("Cotton", "Natural fibre — breathable, widely used in everyday garments"),
    ("Silk", "Natural protein fibre — lustrous finish, used in premium wear"),
    ("Polyester", "Synthetic fibre — durable, wrinkle-resistant, low-cost"),
    ("Linen", "Natural bast fibre — lightweight, ideal for summer wear"),
    ("Wool", "Natural animal fibre — warm, used in winter and formal wear"),
    ("Denim", "Cotton twill — sturdy, used in jeans and workwear"),
    ("Rayon / Viscose", "Semi-synthetic — soft drape, breathable, saree & kurtis"),
    ("Nylon", "Synthetic — strong and lightweight, used in sportswear"),
    ("Chiffon", "Lightweight, sheer fabric — blouses, sarees, dupattas"),
    ("Georgette", "Lightweight crinkled fabric — flowy drape, used in sarees"),
    ("Velvet", "Dense pile fabric — rich texture, used in festive and formal wear"),
    ("Satin", "Smooth, glossy surface — bridal and evening wear"),
    ("Khadi", "Hand-spun / hand-woven natural fabric — ethnic wear"),
    ("Jute", "Natural bast fibre — heavy fabric, bags, accessories"),
    ("Brocade", "Woven with raised patterns — bridal, festive, ethnic wear"),
    ("Crepe", "Light, crinkled surface — dresses, blouses, sarees"),
    ("Terry / Towelling", "Loop-pile fabric — used in towels and bathrobes"),
    ("Fleece", "Synthetic knit — warm lining, jackets, sweatshirts"),
    ("Spandex / Lycra Blend", "Stretch fabric — sportswear, activewear, leggings"),
    ("Blended / Mixed", "Mixed fibre composition — versatile end use"),
]

# (name, hex_code)
CLOTH_COLORS = [
    ("White", "#FFFFFF"),
    ("Off-White / Cream", "#FFF8DC"),
    ("Ivory", "#FFFFF0"),
    ("Black", "#000000"),
    ("Charcoal", "#36454F"),
    ("Grey", "#808080"),
    ("Light Grey", "#D3D3D3"),
    ("Navy Blue", "#001F5B"),
    ("Royal Blue", "#4169E1"),
    ("Sky Blue", "#87CEEB"),
    ("Baby Blue", "#89CFF0"),
    ("Teal", "#008080"),
    ("Turquoise", "#40E0D0"),
    ("Red", "#CC0000"),
    ("Dark Red / Maroon", "#800000"),
    ("Crimson", "#DC143C"),
    ("Coral", "#FF7F7F"),
    ("Orange", "#FF8000"),
    ("Dark Orange", "#FF6000"),
    ("Yellow", "#FFD700"),
    ("Lemon Yellow", "#FFF44F"),
    ("Mustard", "#FFDB58"),
    ("Green", "#008000"),
    ("Dark Green", "#006400"),
    ("Lime Green", "#32CD32"),
    ("Olive", "#808000"),
    ("Mint Green", "#98FF98"),
    ("Pink", "#FF69B4"),
    ("Hot Pink", "#FF1493"),
    ("Baby Pink", "#FFB6C1"),
    ("Rose", "#FF007F"),
    ("Purple / Violet", "#800080"),
    ("Lavender", "#E6E6FA"),
    ("Indigo", "#4B0082"),
    ("Magenta / Fuchsia", "#FF00FF"),
    ("Brown", "#A52A2A"),
    ("Dark Brown", "#5C3317"),
    ("Tan / Camel", "#D2B48C"),
    ("Beige", "#F5F5DC"),
    ("Sand / Khaki", "#C2B280"),
    ("Golden", "#FFD700"),
    ("Silver", "#C0C0C0"),
    ("Copper / Bronze", "#B87333"),
    ("Multicolor / Printed", "#CCCCCC"),
]

# (name, category, cloth_length_per_piece)
ITEM_TYPES = [
    # Tops
    ("Formal Shirt", "TOP", 1.6),
    ("Casual Shirt", "TOP", 1.5),
    ("T-Shirt", "TOP", 1.2),
    ("Polo Shirt", "TOP", 1.3),
    ("Kurta", "TOP", 2.0),
    ("Kurti", "TOP", 1.8),
    ("Blouse / Choli", "TOP", 0.8),
    ("Jacket", "TOP", 2.2),
    ("Blazer", "TOP", 2.5),
    ("Hoodie / Sweatshirt", "TOP", 1.8),
    # Bottoms
    ("Trouser / Pant", "BOTTOM", 1.5),
    ("Jeans", "BOTTOM", 1.6),
    ("Shorts", "BOTTOM", 0.8),
    ("Salwar / Churidar", "BOTTOM", 2.0),
    ("Legging", "BOTTOM", 1.2),
    ("Skirt", "BOTTOM", 1.0),
    ("Dhoti", "BOTTOM", 4.5),
    ("Lungi", "BOTTOM", 2.0),
    # Full length / Sets
    ("Dress / Frock", "DRESS", 2.2),
    ("Saree", "SAREE", 6.0),
    ("Lehenga (Skirt)", "DRESS", 3.5),
    ("Anarkali Suit", "DRESS", 4.0),
    ("Salwar Kameez Set", "SET", 4.5),
    ("Formal Suit 2-Piece", "SET", 3.5),
    ("Formal Suit 3-Piece", "SET", 4.5),
    ("Kurta-Pyjama Set", "SET", 3.5),
    # Accessories
    ("Dupatta", "ACCESSORY", 2.5),
    ("Stole / Shawl", "ACCESSORY", 2.0),
    ("Scarf", "ACCESSORY", 0.8),
    ("Handkerchief", "ACCESSORY", 0.3),
    ("Towel", "ACCESSORY", 0.8),
    # Kids
    ("Kids Shirt", "KIDS", 0.8),
    ("Kids Frock", "KIDS", 1.2),
    ("Kids T-Shirt", "KIDS", 0.7),
    ("Kids Pant", "KIDS", 0.8),
    # Workwear
    ("Uniform Shirt", "WORKWEAR", 1.6),
    ("Uniform Pant", "WORKWEAR", 1.5),
    ("Apron", "WORKWEAR", 1.0),
    ("Lab Coat / Overcoat", "WORKWEAR", 2.5),
]


class Command(BaseCommand):
    help = "Seed canonical master data (cloth categories, colors, item types)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--update", action="store_true",
            help="Update description/hex of existing rows (default: skip existing)"
        )

    def handle(self, *args, **options):
        update = options["update"]
        self._seed_categories(update)
        self._seed_colors(update)
        self._seed_item_types(update)
        self.stdout.write(self.style.SUCCESS("✓ Master data seeding complete."))

    def _seed_categories(self, update: bool):
        created = updated = skipped = 0
        for name, description in CLOTH_CATEGORIES:
            obj, was_created = ClothCategory.objects.get_or_create(
                name=name,
                defaults={"description": description, "active": True},
            )
            if was_created:
                created += 1
            elif update:
                obj.description = description
                obj.active = True
                obj.save(update_fields=["description", "active"])
                updated += 1
            else:
                skipped += 1
        self.stdout.write(f"  ClothCategory: {created} created, {updated} updated, {skipped} skipped")

    def _seed_colors(self, update: bool):
        created = updated = skipped = 0
        for name, hex_code in CLOTH_COLORS:
            obj, was_created = ClothColor.objects.get_or_create(
                name=name,
                defaults={"hex_code": hex_code, "active": True},
            )
            if was_created:
                created += 1
            elif update:
                obj.hex_code = hex_code
                obj.active = True
                obj.save(update_fields=["hex_code", "active"])
                updated += 1
            else:
                skipped += 1
        self.stdout.write(f"  ClothColor: {created} created, {updated} updated, {skipped} skipped")

    def _seed_item_types(self, update: bool):
        created = updated = skipped = 0
        for name, category, cloth_length in ITEM_TYPES:
            obj, was_created = ItemType.objects.get_or_create(
                name=name,
                defaults={"category": category, "cloth_length_per_piece": cloth_length, "active": True},
            )
            if was_created:
                created += 1
            elif update:
                obj.category = category
                obj.cloth_length_per_piece = cloth_length
                obj.active = True
                obj.save(update_fields=["category", "cloth_length_per_piece", "active"])
                updated += 1
            else:
                skipped += 1
        self.stdout.write(f"  ItemType: {created} created, {updated} updated, {skipped} skipped")
