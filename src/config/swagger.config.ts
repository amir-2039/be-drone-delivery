import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Drone Delivery Management API',
      version: '1.0.0',
      description:
        'A comprehensive backend API system for managing drone delivery operations with order tracking, drone management, and intelligent job assignment capabilities.',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Orders', description: 'Order management endpoints for end users' },
      { name: 'Drones', description: 'Drone operations and job management' },
      { name: 'Admin', description: 'Administrative endpoints for order and drone management' },
      { name: 'Health', description: 'Health check endpoints' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /auth/login endpoint',
        },
      },
      schemas: {
        // Common schemas
        Location: {
          type: 'object',
          required: ['lat', 'lng'],
          properties: {
            lat: {
              type: 'number',
              format: 'double',
              description: 'Latitude coordinate (-90 to 90)',
              example: 37.7749,
            },
            lng: {
              type: 'number',
              format: 'double',
              description: 'Longitude coordinate (-180 to 180)',
              example: -122.4194,
            },
          },
        },
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  description: 'Error message',
                  example: 'Invalid input data',
                },
                details: {
                  type: 'object',
                  description: 'Additional error details',
                },
              },
            },
          },
        },
        // Authentication schemas
        LoginRequest: {
          type: 'object',
          required: ['name', 'type'],
          properties: {
            name: {
              type: 'string',
              description: 'User name',
              example: 'user1',
            },
            type: {
              type: 'string',
              enum: ['ADMIN', 'ENDUSER', 'DRONE'],
              description: 'User type',
              example: 'ENDUSER',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'string',
              description: 'JWT authentication token',
              example:
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhYmMxMjMiLCJuYW1lIjoidXNlcjEiLCJ0eXBlIjoiRU5EVVNFUiIsImlhdCI6MTYxNjIzOTAyMn0.example',
            },
          },
        },
        // Order schemas
        CreateOrderRequest: {
          type: 'object',
          required: ['origin', 'destination'],
          properties: {
            origin: {
              $ref: '#/components/schemas/Location',
            },
            destination: {
              $ref: '#/components/schemas/Location',
            },
          },
        },
        OrderResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            originLat: {
              type: 'number',
              format: 'double',
              example: 37.7749,
            },
            originLng: {
              type: 'number',
              format: 'double',
              example: -122.4194,
            },
            destinationLat: {
              type: 'number',
              format: 'double',
              example: 37.7849,
            },
            destinationLng: {
              type: 'number',
              format: 'double',
              example: -122.4094,
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'WITHDRAWN'],
              example: 'PENDING',
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            assignedDroneId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
            currentLat: {
              type: 'number',
              format: 'double',
              nullable: true,
              example: 37.7799,
            },
            currentLng: {
              type: 'number',
              format: 'double',
              nullable: true,
              example: -122.4144,
            },
            eta: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-01-01T12:00:00Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T10:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T10:00:00Z',
            },
          },
        },
        OrderWithProgress: {
          allOf: [
            { $ref: '#/components/schemas/OrderResponse' },
            {
              type: 'object',
              properties: {
                currentLocation: {
                  $ref: '#/components/schemas/Location',
                  nullable: true,
                },
                progress: {
                  type: 'string',
                  example: 'In transit to destination',
                },
                estimatedTimeRemaining: {
                  type: 'number',
                  nullable: true,
                  description: 'Estimated time remaining in minutes',
                  example: 15,
                },
              },
            },
          ],
        },
        UpdateLocationRequest: {
          type: 'object',
          required: ['lat', 'lng'],
          properties: {
            lat: {
              type: 'number',
              format: 'double',
              example: 37.7749,
            },
            lng: {
              type: 'number',
              format: 'double',
              example: -122.4194,
            },
          },
        },
        BulkOrdersQuery: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'WITHDRAWN'],
              description: 'Filter by order status',
            },
            assignedDroneId: {
              type: 'string',
              format: 'uuid',
              description: 'Filter by assigned drone ID',
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
              description: 'Filter by creator user ID',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
              description: 'Maximum number of results',
            },
            offset: {
              type: 'integer',
              minimum: 0,
              default: 0,
              description: 'Number of results to skip',
            },
          },
        },
        // Drone schemas
        CreateDroneRequest: {
          type: 'object',
          required: ['currentLat', 'currentLng'],
          properties: {
            currentLat: {
              type: 'number',
              format: 'double',
              example: 37.7749,
            },
            currentLng: {
              type: 'number',
              format: 'double',
              example: -122.4194,
            },
          },
        },
        DroneResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            status: {
              type: 'string',
              enum: ['IDLE', 'BUSY', 'BROKEN'],
              example: 'IDLE',
            },
            currentLat: {
              type: 'number',
              format: 'double',
              example: 37.7749,
            },
            currentLng: {
              type: 'number',
              format: 'double',
              example: -122.4194,
            },
            lastHeartbeat: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T10:00:00Z',
            },
            isBroken: {
              type: 'boolean',
              example: false,
            },
            assignedOrderId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T10:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T10:00:00Z',
            },
          },
        },
        UpdateDroneLocationRequest: {
          type: 'object',
          required: ['latitude', 'longitude'],
          properties: {
            latitude: {
              type: 'number',
              format: 'double',
              example: 37.7749,
            },
            longitude: {
              type: 'number',
              format: 'double',
              example: -122.4194,
            },
          },
        },
        DroneStatusUpdateResponse: {
          type: 'object',
          required: ['status', 'drone_status'],
          properties: {
            status: {
              type: 'string',
              enum: ['ok', 'warning', 'error'],
              example: 'ok',
            },
            drone_status: {
              type: 'string',
              enum: ['IDLE', 'BUSY', 'BROKEN'],
              example: 'BUSY',
            },
            assigned_order: {
              type: 'object',
              nullable: true,
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                  example: '123e4567-e89b-12d3-a456-426614174001',
                },
                destination: {
                  $ref: '#/components/schemas/Location',
                },
                eta: {
                  type: 'string',
                  format: 'date-time',
                  nullable: true,
                  example: '2024-01-01T12:00:00Z',
                },
                progress: {
                  type: 'string',
                  example: 'In transit to destination',
                },
              },
            },
            available_jobs_count: {
              type: 'integer',
              description: 'Number of available jobs',
              example: 5,
            },
          },
        },
        AdminDronesQuery: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['IDLE', 'BUSY', 'BROKEN'],
              description: 'Filter by drone status',
            },
            isBroken: {
              type: 'boolean',
              description: 'Filter by broken status',
            },
          },
        },
        // Job schemas
        JobResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            type: {
              type: 'string',
              enum: ['PICKUP', 'HANDOFF'],
              example: 'PICKUP',
            },
            orderId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '123e4567-e89b-12d3-a456-426614174001',
            },
            originLat: {
              type: 'number',
              format: 'double',
              example: 37.7749,
            },
            originLng: {
              type: 'number',
              format: 'double',
              example: -122.4194,
            },
            destinationLat: {
              type: 'number',
              format: 'double',
              example: 37.7849,
            },
            destinationLng: {
              type: 'number',
              format: 'double',
              example: -122.4094,
            },
            brokenDroneId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '123e4567-e89b-12d3-a456-426614174002',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'RESERVED', 'COMPLETED'],
              example: 'RESERVED',
            },
            assignedDroneId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '123e4567-e89b-12d3-a456-426614174003',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T10:00:00Z',
            },
          },
        },
        ReserveJobResponse: {
          type: 'object',
          required: ['job'],
          properties: {
            job: {
              $ref: '#/components/schemas/JobResponse',
            },
            order: {
              type: 'object',
              nullable: true,
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                  example: '123e4567-e89b-12d3-a456-426614174001',
                },
                origin: {
                  $ref: '#/components/schemas/Location',
                },
                destination: {
                  $ref: '#/components/schemas/Location',
                },
                createdBy: {
                  type: 'string',
                  format: 'uuid',
                  example: '123e4567-e89b-12d3-a456-426614174004',
                },
              },
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T10:00:00Z',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required',
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions',
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid input data',
                  details: {
                    origin: ['Origin and destination must be different'],
                  },
                },
              },
            },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          description: 'Check if the API server is running',
          responses: {
            '200': {
              description: 'Server is healthy',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthResponse',
                  },
                },
              },
            },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login',
          description:
            'Authenticate a user by name and type. Returns a JWT token for subsequent API requests.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginRequest',
                },
                examples: {
                  enduser: {
                    summary: 'EndUser login',
                    value: {
                      name: 'user1',
                      type: 'ENDUSER',
                    },
                  },
                  admin: {
                    summary: 'Admin login',
                    value: {
                      name: 'admin1',
                      type: 'ADMIN',
                    },
                  },
                  drone: {
                    summary: 'Drone login',
                    value: {
                      name: 'drone1',
                      type: 'DRONE',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/LoginResponse',
                  },
                },
              },
            },
            '400': {
              $ref: '#/components/responses/ValidationError',
            },
          },
        },
      },
      '/api/orders': {
        post: {
          tags: ['Orders'],
          summary: 'Submit a new order',
          description: 'Create a new delivery order with origin and destination locations.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateOrderRequest',
                },
                example: {
                  origin: { lat: 37.7749, lng: -122.4194 },
                  destination: { lat: 37.7849, lng: -122.4094 },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Order created successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/OrderResponse',
                  },
                },
              },
            },
            '400': {
              $ref: '#/components/responses/ValidationError',
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
          },
        },
        get: {
          tags: ['Orders'],
          summary: 'List user orders',
          description: 'Get all orders created by the authenticated end user.',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'List of orders',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/OrderResponse',
                    },
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
          },
        },
      },
      '/api/orders/{id}': {
        get: {
          tags: ['Orders'],
          summary: 'Get order details',
          description:
            'Get detailed information about a specific order including current location, progress, and ETA.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid',
              },
              description: 'Order ID',
            },
          ],
          responses: {
            '200': {
              description: 'Order details',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/OrderWithProgress',
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
            '404': {
              $ref: '#/components/responses/NotFoundError',
            },
          },
        },
        delete: {
          tags: ['Orders'],
          summary: 'Withdraw order',
          description: 'Cancel an order if it has not been picked up by a drone yet.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid',
              },
              description: 'Order ID',
            },
          ],
          responses: {
            '204': {
              description: 'Order withdrawn successfully',
            },
            '400': {
              description: 'Order cannot be withdrawn (already picked up)',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
            '404': {
              $ref: '#/components/responses/NotFoundError',
            },
          },
        },
      },
      '/api/drones/jobs/reserve': {
        post: {
          tags: ['Drones'],
          summary: 'Reserve a job',
          description:
            'Reserve the next available job (PICKUP or HANDOFF). Uses database-level locking to prevent concurrent reservations.',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Job reserved successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ReserveJobResponse',
                  },
                },
              },
            },
            '404': {
              description: 'No available jobs',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
          },
        },
      },
      '/api/drones/orders/current': {
        get: {
          tags: ['Drones'],
          summary: 'Get current order',
          description: 'Get the order currently assigned to the authenticated drone.',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Current order details',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/OrderResponse',
                  },
                },
              },
            },
            '404': {
              description: 'No order currently assigned',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
          },
        },
      },
      '/api/drones/orders/{id}/grab': {
        post: {
          tags: ['Drones'],
          summary: 'Grab order',
          description:
            'Grab an order from the origin or from a broken drone. Changes order status to IN_TRANSIT.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid',
              },
              description: 'Order ID',
            },
          ],
          responses: {
            '204': {
              description: 'Order grabbed successfully',
            },
            '400': {
              description: 'Invalid operation (order not available, wrong status, etc.)',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
            '404': {
              $ref: '#/components/responses/NotFoundError',
            },
            '409': {
              description: 'Conflict (drone already has an order, order already assigned, etc.)',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/api/drones/orders/{id}/delivered': {
        put: {
          tags: ['Drones'],
          summary: 'Mark order as delivered',
          description: 'Mark an order as successfully delivered. Changes order status to DELIVERED.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid',
              },
              description: 'Order ID',
            },
          ],
          responses: {
            '204': {
              description: 'Order marked as delivered',
            },
            '400': {
              description: 'Invalid operation',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
            '404': {
              $ref: '#/components/responses/NotFoundError',
            },
          },
        },
      },
      '/api/drones/orders/{id}/failed': {
        put: {
          tags: ['Drones'],
          summary: 'Mark order as failed',
          description: 'Mark an order as failed. Changes order status to FAILED.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid',
              },
              description: 'Order ID',
            },
          ],
          responses: {
            '204': {
              description: 'Order marked as failed',
            },
            '400': {
              description: 'Invalid operation',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
            '404': {
              $ref: '#/components/responses/NotFoundError',
            },
          },
        },
      },
      '/api/drones/status/broken': {
        put: {
          tags: ['Drones'],
          summary: 'Mark drone as broken',
          description:
            'Mark the authenticated drone as broken. If the drone has an assigned order, a HANDOFF job will be created automatically.',
          security: [{ bearerAuth: [] }],
          responses: {
            '204': {
              description: 'Drone marked as broken',
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
          },
        },
      },
      '/api/drones/location': {
        put: {
          tags: ['Drones'],
          summary: 'Update drone location',
          description:
            'Update the drone location and receive a status update including assigned order information, ETA, and available jobs count.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateDroneLocationRequest',
                },
                example: {
                  latitude: 37.7749,
                  longitude: -122.4194,
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Location updated and status returned',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/DroneStatusUpdateResponse',
                  },
                },
              },
            },
            '400': {
              $ref: '#/components/responses/ValidationError',
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
          },
        },
      },
      '/api/admin/orders': {
        get: {
          tags: ['Admin'],
          summary: 'Bulk get orders',
          description: 'Get orders with filtering options (status, assignedDroneId, createdBy) and pagination.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'status',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'WITHDRAWN'],
              },
              description: 'Filter by order status',
            },
            {
              name: 'assignedDroneId',
              in: 'query',
              schema: {
                type: 'string',
                format: 'uuid',
              },
              description: 'Filter by assigned drone ID',
            },
            {
              name: 'createdBy',
              in: 'query',
              schema: {
                type: 'string',
                format: 'uuid',
              },
              description: 'Filter by creator user ID',
            },
            {
              name: 'limit',
              in: 'query',
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 50,
              },
              description: 'Maximum number of results',
            },
            {
              name: 'offset',
              in: 'query',
              schema: {
                type: 'integer',
                minimum: 0,
                default: 0,
              },
              description: 'Number of results to skip',
            },
          ],
          responses: {
            '200': {
              description: 'List of orders',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/OrderResponse',
                    },
                  },
                },
              },
            },
            '400': {
              $ref: '#/components/responses/ValidationError',
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
          },
        },
      },
      '/api/admin/orders/{id}/origin': {
        put: {
          tags: ['Admin'],
          summary: 'Update order origin',
          description: 'Change the origin location of an order (admin only).',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid',
              },
              description: 'Order ID',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateLocationRequest',
                },
                example: {
                  lat: 37.7749,
                  lng: -122.4194,
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Origin updated successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/OrderResponse',
                  },
                },
              },
            },
            '400': {
              $ref: '#/components/responses/ValidationError',
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
            '404': {
              $ref: '#/components/responses/NotFoundError',
            },
          },
        },
      },
      '/api/admin/orders/{id}/destination': {
        put: {
          tags: ['Admin'],
          summary: 'Update order destination',
          description: 'Change the destination location of an order (admin only).',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid',
              },
              description: 'Order ID',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateLocationRequest',
                },
                example: {
                  lat: 37.7849,
                  lng: -122.4094,
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Destination updated successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/OrderResponse',
                  },
                },
              },
            },
            '400': {
              $ref: '#/components/responses/ValidationError',
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
            '404': {
              $ref: '#/components/responses/NotFoundError',
            },
          },
        },
      },
      '/api/admin/drones': {
        get: {
          tags: ['Admin'],
          summary: 'List all drones',
          description: 'Get all drones with optional filtering by status and broken state.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'status',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['IDLE', 'BUSY', 'BROKEN'],
              },
              description: 'Filter by drone status',
            },
            {
              name: 'isBroken',
              in: 'query',
              schema: {
                type: 'boolean',
              },
              description: 'Filter by broken status',
            },
          ],
          responses: {
            '200': {
              description: 'List of drones',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/DroneResponse',
                    },
                  },
                },
              },
            },
            '400': {
              $ref: '#/components/responses/ValidationError',
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
          },
        },
      },
      '/api/admin/drones/{id}/broken': {
        put: {
          tags: ['Admin'],
          summary: 'Mark drone as broken',
          description:
            'Mark a drone as broken (admin only). If the drone has an assigned order, a HANDOFF job will be created.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid',
              },
              description: 'Drone ID',
            },
          ],
          responses: {
            '204': {
              description: 'Drone marked as broken',
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
            '404': {
              $ref: '#/components/responses/NotFoundError',
            },
          },
        },
      },
      '/api/admin/drones/{id}/fixed': {
        put: {
          tags: ['Admin'],
          summary: 'Mark drone as fixed',
          description:
            'Mark a drone as fixed (admin only). Note: Any existing HANDOFF job remains active.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid',
              },
              description: 'Drone ID',
            },
          ],
          responses: {
            '204': {
              description: 'Drone marked as fixed',
            },
            '401': {
              $ref: '#/components/responses/UnauthorizedError',
            },
            '403': {
              $ref: '#/components/responses/ForbiddenError',
            },
            '404': {
              $ref: '#/components/responses/NotFoundError',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Path to the API files (if using JSDoc comments)
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;

