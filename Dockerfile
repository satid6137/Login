# ใช้ Debian slim แทน Alpine เพื่อลดปัญหา native binding (mysql2, prisma engine)
FROM node:20-slim

# Prisma ต้องการ OpenSSL แต่ node:20-slim ไม่มีมาให้
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ติดตั้ง dependency ก่อน (แยก layer เพื่อให้ docker cache ได้ ไม่ต้อง npm install ใหม่
# ทุกครั้งที่แก้แค่โค้ด .ts/.tsx)
COPY package.json package-lock.json* ./
RUN npm install

# copy โค้ดทั้งหมดเข้ามา
COPY . .

# generate Prisma client (ต้องมี prisma/schema.prisma อยู่แล้ว)
RUN npx prisma generate

# build production
RUN npm run build

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["npm", "start"]