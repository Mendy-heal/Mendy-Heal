healing-be/
├─ .env                     # biến môi trường thực tế
├─ .env.example             # mẫu biến môi trường
├─ package.json
├─ docker-compose.yml       # (tuỳ chọn) chạy postgres + redis dev
├─ Dockerfile               # build image BE
└─ src/
   ├─ app.js                # express app, middleware, routes
   ├─ server.js             # http server + socket.io (sau này)
   │
   ├─ config/               # cấu hình chung
   │   ├─ db.js             # kết nối PostgreSQL (pg Pool)
   │   ├─ env.js            # load biến môi trường
   │   ├─ logger.js         # logger pino
   │   └─ redis.js          # redis client (nếu dùng cache/socket)
   │
   ├─ middlewares/          # middleware toàn cục
   │   ├─ error.js          # handler lỗi chung
   │   ├─ auth.js           # kiểm tra JWT
   │   ├─ rbac.js           # phân quyền theo role
   │   └─ rateLimit.js      # rate-limiting (redis/local)
   │
   ├─ utils/                # tiện ích
   │   ├─ asyncHandler.js   # wrapper cho try/catch async
   │   ├─ crypto.js         # hash/HMAC cho payment webhook
   │   ├─ http.js           # helper trả lỗi chuẩn API
   │   └─ storage.js        # (nếu có upload S3)
   │
   ├─ routes/               # định nghĩa routes (chỉ gọi controller)
   │   ├─ index.js
   │   ├─ auth.routes.js
   │   ├─ users.routes.js
   │   ├─ experts.routes.js
   │   ├─ bookings.routes.js
   │   ├─ payments.routes.js
   │   ├─ chat.routes.js
   │   ├─ forum.routes.js
   │   └─ admin.routes.js
   │
   ├─ controllers/          # validate input & gọi service
   │   ├─ auth.controller.js
   │   ├─ users.controller.js
   │   ├─ experts.controller.js
   │   ├─ bookings.controller.js
   │   ├─ payments.controller.js
   │   ├─ chat.controller.js
   │   ├─ forum.controller.js
   │   └─ admin.controller.js
   │
   ├─ services/             # nghiệp vụ (business logic)
   │   ├─ auth.service.js
   │   ├─ users.service.js
   │   ├─ experts.service.js
   │   ├─ bookings.service.js
   │   ├─ payments.service.js
   │   ├─ chat.service.js
   │   ├─ forum.service.js
   │   └─ admin.service.js
   │
   ├─ repositories/         # thao tác DB (query, join, transaction)
   │   ├─ users.repo.js
   │   ├─ experts.repo.js
   │   ├─ bookings.repo.js
   │   ├─ payments.repo.js
   │   ├─ chat.repo.js
   │   └─ forum.repo.js
   │
   ├─ sockets/              # realtime (chat, signaling video call)
   │   ├─ index.js          # khởi tạo socket.io
   │   ├─ chat.gateway.js   # sự kiện chat (join, message,…)
   │   └─ signaling.gateway.js # sự kiện WebRTC (offer, answer,…)
   │
   ├─ jobs/                 # background jobs (BullMQ/Redis)
   │   ├─ queue.js
   │   └─ sendEmail.job.js
   │
   └─ tests/                # test unit/integration
       ├─ auth.test.js
       └─ bookings.test.js


mail :  wehealing.listening@gmail.com
pass :  wehealing123





[ Client (Web/Mobile) ]
        |
        | HTTP (REST) + WebSocket (Realtime)
        v
+------------------+
|  Express Server  |
|   (app.js)       |
+------------------+
   |       |
   |       +----------------+
   |                        |
[Routes]                [Sockets]
   |                        |
   |                        |
   v                        v
+------------+       +-----------------+
| Controllers|       | Socket Handlers |
+------------+       +-----------------+
       |                      |
       v                      v
+-------------+         +-------------+
|  Services   |         |   Services  |
| (business   |         | (chat/call) |
|  logic)     |         +-------------+
+-------------+
       |
       v
+--------------+
| Repositories |
| (SQL queries)|
+--------------+
       |
       v
   [ PostgreSQL DB ]
       |
       +-- Tables: users, profiles, posts, comments,
           follows, bookings, payments, chat_threads,
           call_sessions, audit_logs ...

