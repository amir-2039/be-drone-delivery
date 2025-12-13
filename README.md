# Drone Delivery Management Backend

A backend API system for managing drone delivery operations with order tracking, drone management, and job assignment capabilities.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL 15
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod
- **Testing**: Jest + Supertest

## Features

- JWT-based authentication with role-based access control (Admin, EndUser, Drone)
- Order management (submit, withdraw, track with ETA)
- Drone operations (reserve jobs, grab orders, update location, mark broken)
- Job reservation system with concurrent access protection
- Broken drone handoff mechanism
- Real-time location tracking and ETA calculation
- Admin management capabilities

## Prerequisites

- Node.js 20 or higher
- PostgreSQL 15 or higher (installed and running locally)
- npm or yarn
- (Optional) Docker and Docker Compose (for containerized app deployment)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd be-drone-delivery
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Edit `.env` and configure:
- Database connection string
- JWT secret (use a strong secret in production)
- Port and other settings

### 4. Start database with Docker Compose

```bash
docker-compose up -d postgres
```

Wait for the database to be ready (check with `docker-compose ps`).

### 5. Run Prisma migrations

```bash
npm run prisma:migrate
```

This will create the database schema.

### 6. Generate Prisma Client

```bash
npm run prisma:generate
```

### 7. Start development server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### 8. (Optional) Start with Docker Compose

If you want to run the app in Docker (using your local PostgreSQL):

```bash
docker-compose up
```

**Note**: Make sure your local PostgreSQL is accessible. The app container will connect to `host.docker.internal` to access your local PostgreSQL. You may need to configure PostgreSQL to accept connections from Docker, or use `localhost` in DATABASE_URL if running the app directly (not in Docker).

**For development, it's recommended to run the app directly:**
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier

## Project Structure

```
drone-delivery/
├── src/
│   ├── controllers/     # Route handlers
│   ├── services/        # Business logic
│   ├── repositories/    # Data access layer
│   ├── middleware/      # Express middleware
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── routes/          # Route definitions
│   └── app.ts           # Express app setup
├── prisma/
│   └── schema.prisma    # Database schema
├── tests/
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── e2e/             # End-to-end tests
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile           # Docker image definition
└── README.md            # This file
```

## API Endpoints

### Authentication
- `POST /auth/login` - Login and get JWT token

### Drone Endpoints
- `POST /api/drones/jobs/reserve` - Reserve a job
- `POST /api/drones/orders/:id/grab` - Grab order from location
- `PUT /api/drones/orders/:id/delivered` - Mark order as delivered
- `PUT /api/drones/orders/:id/failed` - Mark order as failed
- `PUT /api/drones/status/broken` - Mark self as broken
- `PUT /api/drones/location` - Update location and get status update
- `GET /api/drones/orders/current` - Get currently assigned order

### EndUser Endpoints
- `POST /api/orders` - Submit new order
- `DELETE /api/orders/:id` - Withdraw order (if not picked up)
- `GET /api/orders/:id` - Get order details with progress and ETA
- `GET /api/orders` - List user's orders

### Admin Endpoints
- `GET /api/admin/orders` - Bulk get orders with filters
- `PUT /api/admin/orders/:id/origin` - Change order origin
- `PUT /api/admin/orders/:id/destination` - Change order destination
- `GET /api/admin/drones` - List all drones
- `PUT /api/admin/drones/:id/broken` - Mark drone as broken
- `PUT /api/admin/drones/:id/fixed` - Mark drone as fixed

## Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Testing

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Database Schema

The database schema is defined in `prisma/schema.prisma`. Key models:

- **User** - System users (Admin, EndUser, Drone)
- **Order** - Delivery orders with origin, destination, status
- **Drone** - Drone entities with location and status
- **Job** - Reservable jobs (delivery orders and handoff jobs)

## Development

1. Make changes to the code
2. The dev server will automatically reload (if using `npm run dev`)
3. Run tests to ensure everything works
4. Run linter and formatter before committing

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```

3. Start the server:
   ```bash
   npm start
   ```

Or use Docker:
```bash
docker-compose up -d
```

## License

ISC

