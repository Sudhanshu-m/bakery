FROM node:20-alpine
WORKDIR /app
COPY package*.json ./        ← copies package.json (root)
RUN npm install --omit=dev   ← installs only server dependencies (express, baileys, etc.)
                               skips all React/Vite frontend devDependencies
COPY server/ ./server/       ← copies ONLY the server/ folder, nothing else
EXPOSE 4000
CMD ["node", "server/index.js"]