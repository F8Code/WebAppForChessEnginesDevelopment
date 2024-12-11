FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install -g @angular/cli \
    && npm install \
    && npm install --save @angular-slider/ngx-slider@17.0.0

EXPOSE 4200

CMD ["ng", "serve", "--host", "0.0.0.0"]
