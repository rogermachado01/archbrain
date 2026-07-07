import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // scripts/okf-scan/** (used by the /pipeline API routes) depends on these
  // for real Node-native work — simple-git spawns the `git` binary,
  // @cdktf/hcl2json wraps a native HCL parser, @anthropic-ai/sdk does Node
  // HTTP/streaming — bundling them can break in ways native `require` doesn't.
  serverExternalPackages: ["simple-git", "@cdktf/hcl2json", "@anthropic-ai/sdk"],
};

export default nextConfig;
