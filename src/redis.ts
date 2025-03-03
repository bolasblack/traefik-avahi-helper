import { createClient } from "@redis/client";
import { combineLatest, interval, Observable, switchMap } from "rxjs";
import { matchDomainCNames } from "./regexHelpers.ts";

export function startServiceDiscoveryViaRedis(
  redisUrl: string,
  options?: { interval: number }
): Observable<string[]> {
  return combineLatest(
    redisClient(redisUrl),
    interval(options?.interval ?? 1000)
  ).pipe(
    switchMap(async ([client]) => {
      const cnames = new Set<string>();
      for await (const key of client.scanIterator({
        MATCH: "traefik/http/routers/*/rule",
      })) {
        const rule = await client.get(key);
        if (!rule) continue;
        matchDomainCNames(rule).forEach((domain) => {
          cnames.add(domain);
        });
      }
      return Array.from(cnames);
    })
  );
}

function redisClient(
  redisUrl: string
): Observable<ReturnType<typeof createClient>> {
  return new Observable((subscriber) => {
    const client = createClient({ url: redisUrl });

    client.on("error", (err) => {
      subscriber.error(err);
    });

    client.connect().then(
      () => {
        subscriber.next(client);
      },
      (err) => {
        subscriber.error(err);
      }
    );

    return () => {
      client.quit();
    };
  });
}
