FROM node:22-alpine3.21 as base
LABEL maintainer="c4605 <bolasblack@gmail.com>"

ENV PYTHONUNBUFFERED=1

RUN apk add --break-system-packages --update --no-cache \
  python3 \
  py3-pip && \
  ln -sf python3 /usr/bin/python

RUN apk add --no-cache --update dbus-libs

# Install dependencies
FROM base as compile-image

WORKDIR /usr/src/app

RUN apk add --no-cache --update \
    cmake \
    g++ \
    glib-dev \
    dbus \
    dbus-dev \
    ninja \
    python3-dev \
    pnpm

RUN pip install --break-system-packages --user --no-cache-dir mdns-publisher

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build application
FROM base as build-image

WORKDIR /usr/src/app

# app
COPY cname.py cnames ./
COPY src ./src

# npm packages
COPY --from=compile-image /usr/src/app/node_modules node_modules

# pip packages
COPY --from=compile-image /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

CMD ["node", "--experimental-strip-types", "src/index.ts"]
