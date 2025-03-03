# traefik-avahi-helper

A helper container to expose proxied containers as mDNS CNAMEs that are being proxied by
the official Traefik docker container.

It reads the same container labels as the Traefik container e.g.

```
traefik.http.routers.r1.rule=Host(`r1.docker.local`)
```

This will create a CNAME entry of `r1.docker.local`

## Features

- Monitors Docker containers with Traefik labels and publishes them as mDNS CNAMEs
- Optional Redis integration to discover services from Redis
- Multi-platform support (AMD64 and ARM64)
- Automatic detection of container start/stop events to add/remove CNAMEs

## Installing

```
docker pull bolasblack/traefik-avahi-helper
```

Currently there are AMD64 and ARM64 based builds.

## Running

To work this needs the following 2 volumes mounting:

```
-v /var/run/docker.sock:/var/run/docker.sock
```

This allows the container to monitor docker

```
-v /run/dbus/system_bus_socket:/run/dbus/system_bus_socket
```

And this allows the container to send d-bus commands to the host OS's Avahi daemon

### Basic Usage

```bash
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /run/dbus/system_bus_socket:/run/dbus/system_bus_socket \
  bolasblack/traefik-avahi-helper
```

### With Redis Integration

If you want to use Redis for service discovery, you can set the `REDIS_URL` environment variable:

```bash
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /run/dbus/system_bus_socket:/run/dbus/system_bus_socket \
  -e REDIS_URL=redis://redis-host:6379 \
  bolasblack/traefik-avahi-helper
```

## AppArmor

If you are running on a system with AppArmor installed you may get errors about not being able to send d-bus messages. To fix this add
`--privileged` to the command line.

This is a temporary workaround until a suitable policy can be developed.

## Building from Source

To build the Docker image locally:

```bash
# Clone the repository
git clone https://github.com/bolasblack/traefik-avahi-helper.git
cd traefik-avahi-helper

# Build and push multi-platform images
./scripts/build-images.sh
```

## How It Works

1. The container monitors Docker for containers with Traefik labels
2. When it finds containers with `Host(\`domain.local\`)` rules, it extracts these domains
3. Optionally, it can also discover services from Redis using the same pattern
4. It writes these domains to a file that is monitored by a Python script
5. The Python script uses mdns-publisher to publish these domains as mDNS CNAMEs via the Avahi daemon

## Acknowledgements

This project uses and borrows heavily from [mdns-publisher](https://github.com/alticelabs/mdns-publisher)

Original work by [hardillb](https://github.com/hardillb) with additional contributions from [c4605](https://github.com/bolasblack)
