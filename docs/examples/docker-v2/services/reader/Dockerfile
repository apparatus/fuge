# Reader

FROM node:4

RUN mkdir /src

ADD package.json /src/

WORKDIR /src

RUN npm install

COPY . /src

EXPOSE 4000

CMD ["node", "start.js"]
