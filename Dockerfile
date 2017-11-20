FROM daocloud.io/node:8.5-alpine

MAINTAINER yuliang <yu.liang@freelog.com>

RUN mkdir -p /data/freelog-auth-provider

WORKDIR /data/freelog-auth-provider

COPY . /data/freelog-auth-provider

RUN npm install

#ENV
#VOLUME ['/opt/logs','/opt/logs/db','/opt/logs/koa','/opt/logs/track']

ENV EGG_SERVER_ENV prod
ENV PORT 7008

EXPOSE 7008

CMD [ "npm", "start" ]
