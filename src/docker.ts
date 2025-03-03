import Docker from "dockerode";
import {
  Observable,
  defer,
  fromEvent,
  map,
  merge,
  scan,
  skipUntil,
  switchMap,
} from "rxjs";
import {
  matchDomainCNames,
  traefikDockerLabelRe,
  traefikRouterRuleRe,
} from "./regexHelpers.ts";

/**
 * https://docs.docker.com/reference/api/engine/version/v1.48/#tag/System/operation/SystemEvents
 */
interface DockerMonitorEvent {
  Type: string;
  Action: string;
  Actor: {
    ID: string;
    Attributes: Record<string, string>;
  };
  scope: string;
  time: number;
  timeNano: number;
}

export function startServiceDiscoveryViaDockerLabels(
  socketPath: string
): Observable<string[]> {
  const docker = new Docker({ socketPath });

  return defer(() => {
    const initialPromise = fetchCNames(docker).then((cnames): CNameEvent[] =>
      cnames.map((cname) => ({ type: "start", cname }))
    );
    return merge(
      initialPromise,
      listenCNameEvents(docker).pipe(skipUntil(initialPromise))
    );
  }).pipe(
    scan((acc, events) => {
      const res = new Set(acc);
      events.forEach((event) => {
        if (event.type === "start") {
          res.add(event.cname);
        } else if (event.type === "stop") {
          res.delete(event.cname);
        }
      });
      return Array.from(res);
    }, [] as string[])
  );
}

async function fetchCNames(docker: Docker): Promise<string[]> {
  let cnames: string[] = [];

  const list: Docker.ContainerInfo[] =
    // https://docs.docker.com/reference/api/engine/version/v1.48/#tag/Container/operation/ContainerList
    await docker.listContainers();
  for (let i = 0; i < list.length; i++) {
    const cont = list[i];
    if (cont.Labels["traefik.enable"] === "true") {
      const keys = Object.keys(cont.Labels);

      keys.forEach((key) => {
        if (!traefikDockerLabelRe.test(key)) return;

        if (traefikRouterRuleRe.test(cont.Labels[key])) {
          traefikRouterRuleRe.lastIndex = 0;
          cnames = cnames.concat(matchDomainCNames(cont.Labels[key]));
        }
      });
    }
  }

  return cnames;
}

type CNameEvent =
  | { type: "start"; cname: string }
  | { type: "stop"; cname: string };

function listenCNameEvents(docker: Docker): Observable<CNameEvent[]> {
  return defer(() =>
    docker.getEvents({
      filters: { event: ["start", "stop"] },
    })
  ).pipe(
    switchMap((events) => {
      events.setEncoding("utf8");
      return fromEvent(events, "data");
    }),
    map((ev) => {
      const eventJSON: DockerMonitorEvent = JSON.parse(ev as string);

      if (eventJSON.Type !== "container") return [];
      if (!["start", "stop"].includes(eventJSON.Action)) return [];

      const keys = Object.keys(eventJSON.Actor.Attributes);

      const results: CNameEvent[] = [];
      for (const key of keys) {
        if (!traefikDockerLabelRe.test(key)) continue;

        const hosts = matchDomainCNames(eventJSON.Actor.Attributes[key]);
        if (!hosts.length) continue;

        if (eventJSON.Action === "start") {
          hosts.forEach((host) => results.push({ type: "start", cname: host }));
        } else if (eventJSON.Action === "stop") {
          hosts.forEach((host) => results.push({ type: "stop", cname: host }));
        }
      }
      return results;
    })
  );
}
