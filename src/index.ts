import { writeFile } from "fs/promises";
import { combineLatest, distinctUntilChanged, map, of } from "rxjs";
import nodemon from "nodemon";
import { startServiceDiscoveryViaDockerLabels } from "./docker.ts";
import { startServiceDiscoveryViaRedis } from "./redis.ts";

async function main(options: { dockerSocketPath: string; redisUrl?: string }) {
  // Start nodemon
  (nodemon as any)({
    watch: "cnames",
    script: "cname.py",
    execMap: {
      py: "python",
    },
  });
  nodemon
    .on("start", function () {
      console.log("starting cname.py");
    })
    .on("restart", function (files) {
      console.log("restarting cname.py with " + files);
    });

  combineLatest(
    startServiceDiscoveryViaDockerLabels(options.dockerSocketPath),
    options.redisUrl == null
      ? of([])
      : startServiceDiscoveryViaRedis(options.redisUrl)
  )
    .pipe(
      map(([cnamesFromDocker, cnamesFromRedis]) => {
        const cnames = Array.from(
          new Set([...cnamesFromDocker, ...cnamesFromRedis])
        );
        cnames.sort();
        return cnames;
      }),
      distinctUntilChanged((a, b) => a.join(",") === b.join(","))
    )
    .subscribe({
      next: async (cnames) => {
        console.log("Writing cnames:", cnames);
        try {
          await writeFile("cnames", cnames.join("\n"), "utf8");
        } catch (err) {
          console.error("Error writing to cnames file:", err);
        }
      },
      error: (err) => {
        console.error("Error in cnames subscription:", err);
        process.exit(1);
      },
    });
}

main({
  dockerSocketPath: "/var/run/docker.sock",
  redisUrl: process.env.REDIS_URL,
}).catch((err) => {
  console.error("Unhandled error in main function:", err);
  process.exit(1);
});
