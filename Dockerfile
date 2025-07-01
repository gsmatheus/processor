# Stage 1: Build
# Usa uma imagem Node completa para instalar dependências, incluindo devDependencies se houver.
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

# Stage 2: Production
# Copia apenas o necessário para a imagem final, que é mais leve.
FROM node:20-alpine
WORKDIR /usr/src/app

# Copia as dependências de produção do stage 'builder'
COPY --from=builder /usr/src/app/node_modules ./node_modules
# Copia o código-fonte da aplicação
COPY . .

# Expõe a porta que a aplicação poderia usar (opcional, boa prática)
EXPOSE 3000

# Comando padrão não é necessário, pois será definido no docker-compose
# CMD [ "node", "worker.js" ] 