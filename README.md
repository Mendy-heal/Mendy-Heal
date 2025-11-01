# Healing Backend API

A comprehensive backend API for a mental health and wellness platform built with Node.js, Express, and PostgreSQL.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: Complete user registration, profile management, and role system
- **Booking System**: Advanced booking system with status management
- **Real-time Chat**: WebSocket-based real-time messaging with Socket.io
- **Payment Integration**: MoMo payment gateway integration with IPN handling
- **Payout System**: Bank account management for experts and listeners
- **Social Features**: Follow system, posts, comments, and reactions
- **File Upload**: Secure file upload with validation
- **Rate Limiting**: Configurable rate limiting for API endpoints
- **Input Validation**: Comprehensive input validation with Zod
- **Error Handling**: Centralized error handling with custom error types
- **Logging**: Structured logging with Winston
- **Caching**: In-memory caching layer
- **Security**: Security headers, CORS, and request validation
- **Monitoring**: Request ID tracking and performance monitoring

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with pg
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Logging**: Winston
- **Real-time**: Socket.io
- **File Upload**: Multer
- **Rate Limiting**: express-rate-limit
- **Security**: Helmet, CORS
- **Testing**: Jest (placeholder)

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd healing-be
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
# Create database
createdb healing_db

# Run migrations
psql -d healing_db -f db_10_7_2025_lan2.sql
```

5. Start the development server:
```bash
npm run dev
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Required
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://username:password@localhost:5432/healing_db
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# Optional
JWT_ISS=healing.api
JWT_AUD=healing.webapp
TOKEN_TTL=1h
REFRESH_TTL=30d
```

### Database Setup

The application uses PostgreSQL. The schema is defined in `db_10_7_2025_lan2.sql`.

## 📁 Project Structure

```
src/
├── config/           # Configuration files
│   ├── db.js        # Database configuration
│   ├── mailer.js    # Email configuration
│   └── momo.js      # MoMo payment configuration
├── controllers/     # Route controllers
├── middlewares/     # Custom middleware
├── repositories/    # Database access layer
├── routes/          # API routes
├── services/        # Business logic
├── sockets/         # WebSocket handlers
├── utils/           # Utility functions
├── app.js           # Express app
└── server.js        # Server setup
```

## 🚀 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token

### Profile
- `GET /api/v1/profile/me` - Get current user profile
- `POST /api/v1/profile/setup` - Complete user profile

### Bookings
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings/mine` - Get user bookings
- `PATCH /api/v1/bookings/:id/confirm` - Confirm booking
- `PATCH /api/v1/bookings/:id/cancel` - Cancel booking

### Chat
- `POST /api/v1/chat/dm/start` - Start direct message
- `GET /api/v1/chat/threads` - Get chat threads
- `GET /api/v1/chat/threads/:id/messages` - Get thread messages
- `POST /api/v1/chat/threads/:id/messages` - Send message
- `POST /api/v1/chat/threads/:id/read` - Mark messages as read

### Posts
- `GET /api/v1/posts/feed` - Get posts feed
- `GET /api/v1/posts/timeline` - Get user timeline
- `POST /api/v1/posts` - Create post
- `PATCH /api/v1/posts/:id` - Update post
- `DELETE /api/v1/posts/:id` - Delete post
- `POST /api/v1/posts/:id/react` - React to post
- `DELETE /api/v1/posts/:id/react` - Remove reaction
- `POST /api/v1/posts/:id/save` - Save post
- `DELETE /api/v1/posts/:id/save` - Unsave post

### Comments
- `GET /api/v1/comments` - Get comments
- `POST /api/v1/comments` - Create comment
- `PATCH /api/v1/comments/:id` - Update comment
- `DELETE /api/v1/comments/:id` - Delete comment

### Social
- `POST /api/v1/social/follow` - Follow user
- `POST /api/v1/social/unfollow` - Unfollow user

### Email
- `POST /api/v1/email/request-otp` - Request email OTP
- `POST /api/v1/email/confirm-otp` - Confirm email OTP

### Payments
- `POST /api/v1/payments/momo/create` - Create MoMo payment
- `POST /api/v1/payments/momo/ipn` - MoMo IPN webhook

### Payout Accounts
- `POST /api/v1/payout-accounts/bank-account` - Create/update payout account
- `GET /api/v1/payout-accounts/bank-account` - Get user payout account
- `PUT /api/v1/payout-accounts/bank-account` - Update payout account
- `DELETE /api/v1/payout-accounts/bank-account` - Delete payout account
- `GET /api/v1/payout-accounts/admin/bank-accounts` - List all payout accounts (admin)
- `POST /api/v1/payout-accounts/admin/bank-account/:userId/verify` - Verify payout account (admin)

### Banks
- `GET /api/v1/banks/list` - Get list of Vietnamese banks
- `POST /api/v1/banks/refresh` - Refresh bank list cache (admin)

### Health Check
- `GET /health` - Health check
- `GET /dbtest` - Database connection test
- `GET /api/v1/cache/stats` - Cache statistics

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation with Zod
- Rate limiting
- Security headers
- CORS protection
- Request ID tracking
- SQL injection protection
- XSS protection

## 📊 Monitoring & Logging

- Structured logging with Winston
- Request ID tracking
- Performance monitoring
- Error tracking
- Health checks
- Cache statistics

## 🚀 Deployment

### Production Setup

1. Set environment variables for production
2. Configure database connection
3. Set up SSL/TLS
4. Configure reverse proxy (nginx)
5. Set up process manager (pm2)
6. Configure monitoring and logging

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 4000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/healing_db
    depends_on:
      - db
    volumes:
      - ./logs:/app/logs

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=healing_db
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📈 Performance

- Database connection pooling
- Query optimization
- Caching layer
- Rate limiting
- Compression
- Static file serving

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run build` - Build for production

### Code Style

- Use ESLint for code linting
- Follow Prettier formatting
- Use meaningful variable names
- Write clean, readable code
- Add comments for complex logic

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run tests
6. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support, please open an issue in the GitHub repository or contact the development team.

## 🔄 Changelog

### v1.0.0
- Initial release
- Core API functionality
- Authentication system
- Booking system
- Chat functionality
- Payment integration
- Social features
- File upload
- Security features
- Monitoring and logging