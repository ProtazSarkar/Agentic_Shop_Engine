# Agentic Shop Engine - Backend API

Django REST Framework (DRF) backend service for the e-commerce core, handling product management, hybrid search/filtering, cart transactions, and secure user authentication.

## Tech Stack
- Python, Django, Django REST Framework (DRF)
- PostgreSQL / SQLite
- django-allauth & dj-rest-auth (for Social OAuth & JWT)

---

## Environment Variables (.env)
Create a `.env` file in the root backend directory with the following keys:

SECRET_KEY=your_django_secret_key
DEBUG=True
DB_NAME=ecommerce_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

---

## REST API Endpoints & Functionalities

### 1. Authentication (`/api/auth/`)
* POST /api/auth/register/ - Register a new user account with email and password.
* POST /api/auth/login/ - Authenticate user credentials and return authentication token/JWT.
* POST /api/auth/logout/ - Invalidate current user session/token.
* POST /api/auth/google/ - Handle Google OAuth social login code/token exchange.

### 2. Products (`/api/products/`)
* GET /api/products/ - Retrieve a paginated list of all available products with optional query parameters (category, price range, search keyword).
* GET /api/products/{id}/ - Retrieve detailed information, description, price, and stock count for a single product.
* GET /api/products/search/ - Execute hybrid search combining text matching and metadata filters.

### 3. Orders & Cart (`/api/orders/`)
* GET /api/orders/cart/ - View current items in the authenticated user's shopping cart.
* POST /api/orders/cart/add/ - Add a specific product and quantity to the user's cart.
* DELETE /api/orders/cart/remove/{item_id}/ - Remove an item from the shopping cart.
* POST /api/orders/checkout/ - Process current cart items, validate stock levels, calculate grand total, and create a permanent order record.
* GET /api/orders/history/ - Retrieve past order transaction history for the user.

backend/
├── manage.py
├── requirements.txt
├── .env
├── .env.example
├── .gitignore
├── README.md
├── Dockerfile
│
├── venv/                           # Isolated Python Virtual Environment
│
├── backend_config/                 # Django Core Configuration Package
│   ├── __init__.py
│   ├── settings.py                 # Core settings, database setup, installed apps
│   ├── urls.py                     # Root URL router mapping to active apps
│   ├── wsgi.py                     
│   └── asgi.py                     
│
└── apps/                           # Custom Business Logic Domain Apps
    ├── __init__.py
    │
    ├── authentication/             # User Auth & Social OAuth App
    │   ├── __init__.py
    │   ├── admin.py                
    │   ├── apps.py                 
    │   ├── models.py               # Custom User profiles
    │   ├── serializers.py          # DRF Auth & Profile serializers
    │   ├── views.py                # Login, Register, Logout & OAuth views
    │   └── urls.py                 # Routes: /api/auth/*
    │
    ├── products/                   # Product Catalog & RAG Vector Module
    │   ├── __init__.py
    │   ├── admin.py                
    │   ├── apps.py                 
    │   ├── models.py               # Category, Product, and Inventory models
    │   ├── serializers.py          # DRF Product & Category serializers
    │   ├── views.py                # Product list, detail, and search API views
    │   ├── urls.py                 # Routes: /api/products/*
    │   └── rag/                    # Isolated RAG Vector Store Engine
    │       ├── __init__.py
    │       ├── vector_db.py        # Qdrant / PGVector client setup
    │       ├── embeddings.py       # Embedding model wrappers
    │       └── retriever.py        # Hybrid Vector + Metadata Search logic
    │
    └── orders/                     # Shopping Cart & Checkout Engine
        ├── __init__.py
        ├── admin.py                
        ├── apps.py                 
        ├── models.py               # Cart, CartItem, Order, and OrderItem models
        ├── serializers.py          # DRF Cart & Order serializers
        ├── services.py             # Billing calculation, stock validation, checkout pipeline
        ├── views.py                # Cart actions, Checkout, & Order History views
        └── urls.py                 # Routes: /api/orders/*