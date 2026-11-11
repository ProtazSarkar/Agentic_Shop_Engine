from decimal import Decimal

from django.core.management.base import BaseCommand

from products.models import Category, Product

CATEGORIES = [
    {
        'slug': 'audio',
        'name': 'Audio',
        'description': 'Studio-grade headphones, planar earbuds, and acoustic speakers.',
    },
    {
        'slug': 'workspace',
        'name': 'Workspace',
        'description': 'Tactile keyboards, architectural lighting, and solid wood organizers.',
    },
    {
        'slug': 'smart-home',
        'name': 'Smart Home',
        'description': 'Quiet environmental sensing, air purification, and ambient displays.',
    },
    {
        'slug': 'carry',
        'name': 'Everyday Carry',
        'description': 'Weatherproof technical packs and vegetable-tanned leather folios.',
    },
    {
        'slug': 'kitchen',
        'name': 'Home & Kitchen',
        'description': 'Precision coffee brewing instruments and handcrafted stoneware.',
    },
]

PRODUCTS = [
    {
        'id': 1,
        'slug': 'aether-studio-anc-headphones',
        'name': 'Aether Studio ANC Headphones',
        'category_slug': 'audio',
        'description': (
            'Engineered with custom 40mm beryllium-coated drivers and adaptive hybrid active noise '
            'cancellation. Machined aluminum yokes meet breathable lambskin memory foam for '
            'all-day studio sessions and focus.'
        ),
        'price': Decimal('249.00'),
        'original_price': Decimal('299.00'),
        'stock_quantity': 18,
        'image': '/images/products/headphones.svg',
        'rating': Decimal('4.9'),
        'review_count': 142,
        'badge': 'Best Seller',
        'is_trending': True,
        'is_featured': True,
        'specs': {
            'Drivers': '40mm Dynamic Beryllium',
            'Noise Control': 'Hybrid Adaptive ANC (-42dB)',
            'Battery': '42 Hours (ANC On)',
            'Connectivity': 'Bluetooth 5.4 + USB-C Lossless',
        },
        'tags': ['wireless', 'noise cancelling', 'anc', 'headphones', 'audio', 'music', 'studio'],
    },
    {
        'id': 2,
        'slug': 'tactile-75-mechanical-keyboard',
        'name': 'Tactile 75% Mechanical Keyboard',
        'category_slug': 'workspace',
        'description': (
            'CNC-milled 6063 anodized aluminum chassis with a poron gasket mount for a muted, '
            'creamy acoustic profile. Hot-swappable PCB, dye-sub PBT keycaps, and tri-mode '
            'wireless connectivity.'
        ),
        'price': Decimal('185.00'),
        'original_price': None,
        'stock_quantity': 11,
        'image': '/images/products/keyboard.svg',
        'rating': Decimal('4.8'),
        'review_count': 96,
        'badge': 'Staff Pick',
        'is_trending': True,
        'is_featured': True,
        'specs': {
            'Layout': '75% Compact (84 Keys)',
            'Mount': 'Dual-Layer Silicone Gasket',
            'Switches': 'Factory-Lubed Tactile Linear',
            'Chassis': 'CNC 6063 Anodized Aluminum',
        },
        'tags': ['keyboard', 'mechanical', 'desk', 'workspace', 'office', 'typing', 'wireless'],
    },
    {
        'id': 3,
        'slug': 'kuro-variable-temp-kettle',
        'name': 'Kuro Variable-Temp Kettle',
        'category_slug': 'kitchen',
        'description': (
            'Precision gooseneck pour-over kettle with degree-accurate PID thermal hold, '
            'counterbalanced matte handle, and integrated brew stopwatch built cleanly into the '
            'tempered glass base.'
        ),
        'price': Decimal('135.00'),
        'original_price': Decimal('155.00'),
        'stock_quantity': 24,
        'image': '/images/products/kettle.svg',
        'rating': Decimal('4.9'),
        'review_count': 204,
        'badge': 'Trending',
        'is_trending': True,
        'is_featured': True,
        'specs': {
            'Capacity': '900 ml / 0.9L',
            'Temp Range': '40°C - 100°C (+/- 0.5°C PID)',
            'Body': '304 Matte Stainless Steel',
            'Power': '1200W Fast Boil',
        },
        'tags': ['kettle', 'coffee', 'pour over', 'tea', 'kitchen', 'brewing', 'matte black'],
    },
    {
        'slug': 'arc-architectural-desk-lamp',
        'name': 'Arc Architectural Desk Lamp',
        'category_slug': 'workspace',
        'description': (
            'Cantilevered aluminum task lamp delivering CRI 97+ museum-grade illumination without '
            'screen glare. Stepless capacitive dimming and warm-to-cool circadian tuning.'
        ),
        'price': Decimal('142.00'),
        'original_price': None,
        'stock_quantity': 7,
        'image': '/images/products/lamp.svg',
        'rating': Decimal('4.7'),
        'review_count': 68,
        'badge': 'Low Stock',
        'is_trending': True,
        'is_featured': False,
        'specs': {
            'CRI': '97+ Full Spectrum LED',
            'Color Temp': '2700K - 5500K Stepless',
            'Lumen': '950 lm Asymmetrical Optic',
            'Reach': '64 cm Articulated Arm',
        },
        'tags': ['lamp', 'lighting', 'desk', 'workspace', 'office', 'reading', 'minimalist'],
    },
    {
        'slug': 'nomad-cordura-22l-pack',
        'name': 'Nomad Cordura 22L Pack',
        'category_slug': 'carry',
        'description': (
            'Constructed from 1680D ballistic Cordura nylon with AquaGuard YKK zippers. Features a '
            'suspended false-bottom 16-inch laptop vault, quick-access magnetic top pocket, and '
            'luggage pass-through.'
        ),
        'price': Decimal('165.00'),
        'original_price': None,
        'stock_quantity': 15,
        'image': '/images/products/backpack.svg',
        'rating': Decimal('4.8'),
        'review_count': 119,
        'badge': '',
        'is_trending': False,
        'is_featured': True,
        'specs': {
            'Volume': '22 Liters',
            'Shell': '1680D Ballistic Cordura',
            'Laptop': 'Up to 16" Suspended Sleeve',
            'Weight': '1.08 kg',
        },
        'tags': ['backpack', 'bag', 'travel', 'commute', 'carry', 'laptop', 'waterproof'],
    },
    {
        'slug': 'halo-hepa-air-purifier',
        'name': 'Halo HEPA-13 Air Purifier',
        'category_slug': 'smart-home',
        'description': (
            'Whisper-quiet 360-degree cylindrical purification capturing 99.97% of 0.3-micron '
            'allergens, smoke, and VOCs. Auto-adjusts fan curve using laser particulate telemetry.'
        ),
        'price': Decimal('275.00'),
        'original_price': Decimal('310.00'),
        'stock_quantity': 9,
        'image': '/images/products/purifier.svg',
        'rating': Decimal('4.9'),
        'review_count': 87,
        'badge': 'New Arrival',
        'is_trending': True,
        'is_featured': True,
        'specs': {
            'Filtration': '3-Stage True HEPA-13 + Carbon',
            'Coverage': 'Up to 520 sq ft',
            'Acoustic': '21 dB Sleep Mode',
            'Sensors': 'PM2.5 Laser + VOC',
        },
        'tags': ['air purifier', 'smart home', 'hepa', 'quiet', 'bedroom', 'clean air'],
    },
    {
        'slug': 'pulse-planar-wireless-earbuds',
        'name': 'Pulse Planar Wireless Earbuds',
        'category_slug': 'audio',
        'description': (
            'Micro-planar magnetic transducers deliver startling transient detail in an IPX5 '
            'pocketable form factor. Includes spatial transparency mode and Qi wireless charging case.'
        ),
        'price': Decimal('169.00'),
        'original_price': None,
        'stock_quantity': 31,
        'image': '/images/products/earbuds.svg',
        'rating': Decimal('4.6'),
        'review_count': 74,
        'badge': '',
        'is_trending': False,
        'is_featured': False,
        'specs': {
            'Drivers': '11mm Planar Magnetic',
            'Battery': '8h Buds + 24h Case',
            'Codec': 'LDAC / AAC / SBC',
            'Rating': 'IPX5 Sweat & Rain Resistant',
        },
        'tags': ['earbuds', 'wireless', 'audio', 'running', 'commute', 'music', 'compact'],
    },
    {
        'slug': 'solid-walnut-monitor-riser',
        'name': 'Solid Walnut Monitor Riser',
        'category_slug': 'workspace',
        'description': (
            'Kiln-dried American black walnut desk shelf elevated on anodized steel legs with a '
            'merino wool felt under-tray for notebooks, audio interfaces, and everyday tools.'
        ),
        'price': Decimal('118.00'),
        'original_price': None,
        'stock_quantity': 14,
        'image': '/images/products/riser.svg',
        'rating': Decimal('4.9'),
        'review_count': 158,
        'badge': '',
        'is_trending': False,
        'is_featured': True,
        'specs': {
            'Material': 'FSC Solid American Walnut',
            'Dimensions': '112 x 23 x 11 cm',
            'Capacity': 'Up to 35 kg Load',
            'Tray': '3mm Merino Wool Felt',
        },
        'tags': ['desk', 'walnut', 'wood', 'monitor stand', 'workspace', 'ergonomic', 'setup'],
    },
    {
        'slug': 'chrono-eink-ambient-hub',
        'name': 'Chrono E-Ink Ambient Hub',
        'category_slug': 'smart-home',
        'description': (
            'Zero-glare 7.5-inch paper-like E-Ink wall and desk display showing indoor air '
            'quality, calendar focus blocks, weather, and Matter smart home scenes without glowing '
            'distraction.'
        ),
        'price': Decimal('195.00'),
        'original_price': None,
        'stock_quantity': 5,
        'image': '/images/products/hub.svg',
        'rating': Decimal('4.7'),
        'review_count': 41,
        'badge': 'Limited Batch',
        'is_trending': False,
        'is_featured': False,
        'specs': {
            'Display': '7.5" Monochrome E-Ink Carta',
            'Sensors': 'Temp, Humidity, CO2',
            'Battery': '6 Months per USB-C Charge',
            'Protocol': 'Wi-Fi + Matter over Thread',
        },
        'tags': ['smart home', 'e-ink', 'clock', 'ambient', 'minimalist', 'display', 'co2'],
    },
    {
        'slug': 'monolith-hifi-desk-speaker',
        'name': 'Monolith Hi-Fi Desk Speaker',
        'category_slug': 'audio',
        'description': (
            'Milled aluminum enclosure wrapped in acoustic Kvadrat wool, driven by dual Class-D '
            'amplification and DSP room calibration for rich, fatigue-free nearfield listening.'
        ),
        'price': Decimal('329.00'),
        'original_price': None,
        'stock_quantity': 0,
        'image': '/images/products/speaker.svg',
        'rating': Decimal('4.9'),
        'review_count': 53,
        'badge': 'Restocking Soon',
        'is_trending': False,
        'is_featured': False,
        'specs': {
            'Amplification': '90W RMS Bi-Amped Class-D',
            'Response': '42 Hz - 24 kHz',
            'Inputs': 'AirPlay 2, Bluetooth, 3.5mm, USB-C',
            'Finish': 'Brushed Slate + Acoustic Wool',
        },
        'tags': ['speaker', 'hifi', 'audio', 'wireless', 'studio', 'desk'],
    },
    {
        'slug': 'atelier-tech-folio',
        'name': 'Atelier Full-Grain Tech Folio',
        'category_slug': 'carry',
        'description': (
            'Vegetable-tanned Italian leather zip folio with elastic cord loops, microfiber SD '
            'card pockets, and magnetic passport sleeve designed to age with a rich patina.'
        ),
        'price': Decimal('78.00'),
        'original_price': None,
        'stock_quantity': 29,
        'image': '/images/products/folio.svg',
        'rating': Decimal('4.8'),
        'review_count': 88,
        'badge': '',
        'is_trending': False,
        'is_featured': False,
        'specs': {
            'Leather': 'Full-Grain Vegetable-Tanned',
            'Lining': 'Micro-Suede Scratch Guard',
            'Dimensions': '23 x 14 x 4 cm',
            'Closure': 'Brass YKK Excella Zip',
        },
        'tags': ['leather', 'folio', 'organizer', 'cable pouch', 'travel', 'carry'],
    },
    {
        'slug': 'terra-stoneware-coffee-set',
        'name': 'Terra Stoneware Coffee Set',
        'category_slug': 'kitchen',
        'description': (
            'Small-batch wheel-thrown speckled stoneware V60 dripper, 500ml server carafe, and '
            'matching tasting cup glazed in satin terracotta clay.'
        ),
        'price': Decimal('64.00'),
        'original_price': None,
        'stock_quantity': 19,
        'image': '/images/products/ceramic.svg',
        'rating': Decimal('4.9'),
        'review_count': 112,
        'badge': 'Artisan',
        'is_trending': True,
        'is_featured': False,
        'specs': {
            'Material': 'High-Fired Speckled Stoneware',
            'Server': '500 ml Hand-Glazed Carafe',
            'Filters': 'Compatible with 02 Paper Cones',
            'Care': 'Dishwasher Safe',
        },
        'tags': ['coffee', 'ceramic', 'stoneware', 'pour over', 'kitchen', 'artisan', 'mug'],
    },
]


class Command(BaseCommand):
    help = 'Seed curated categories and products for Agentic Shop Engine.'

    def handle(self, *args, **options):
        cat_map = {}
        for entry in CATEGORIES:
            cat, _ = Category.objects.update_or_create(
                slug=entry['slug'],
                defaults={
                    'name': entry['name'],
                    'description': entry['description'],
                },
            )
            cat_map[entry['slug']] = cat

        for item in PRODUCTS:
            data = dict(item)
            product_id = data.pop('id', None)
            cat_slug = data.pop('category_slug')
            data['category'] = cat_map[cat_slug]
            data['is_active'] = True

            if product_id is not None and Product.objects.filter(id=product_id).exists():
                Product.objects.filter(id=product_id).update(**data)
            else:
                Product.objects.update_or_create(slug=data['slug'], defaults=data)

        # Clean up unused starter categories that have no products left
        Category.objects.filter(products__isnull=True).delete()

        self.stdout.write(
            self.style.SUCCESS(
                f'Seeded {Category.objects.count()} categories and {Product.objects.count()} products.'
            )
        )

