import { parseTldvConf, parsePlaylist } from "../src/pipeline/playlist";

describe("parseTldvConf", () => {
  test("parses valid TLDVCONF line", () => {
    const result = parseTldvConf(
      "#TLDVCONF:1711234567,5,https://media-files.tldv.io/meetings/abc123/"
    );
    expect(result).toEqual({
      expiry: "1711234567",
      offset: 5,
      baseUrl: "https://media-files.tldv.io/meetings/abc123/",
    });
  });

  test("throws on missing prefix", () => {
    expect(() => parseTldvConf("TLDVCONF:1,2,url")).toThrow(
      "Invalid TLDVCONF"
    );
  });

  test("throws on malformed line (missing commas)", () => {
    expect(() => parseTldvConf("#TLDVCONF:123")).toThrow("Malformed TLDVCONF");
  });
});

describe("parsePlaylist", () => {
  test("parses m3u8 with TLDVCONF and obfuscated segments", () => {
    const m3u8 = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#TLDVCONF:1711234567,3,https://media.example.com/",
      "#EXTINF:2.0,",
      "zerkh_000.qp",
      "#EXTINF:2.0,",
      "zerkh_001.qp",
      "#EXT-X-ENDLIST",
    ].join("\n");

    const result = parsePlaylist(m3u8);
    expect(result.conf.offset).toBe(3);
    expect(result.conf.baseUrl).toBe("https://media.example.com/");
    expect(result.segmentUrls).toHaveLength(2);
    expect(result.segmentUrls[0]).toBe(
      "https://media.example.com/chunk_000.ts"
    );
    expect(result.segmentUrls[1]).toBe(
      "https://media.example.com/chunk_001.ts"
    );
  });

  test("throws if no TLDVCONF header", () => {
    expect(() => parsePlaylist("#EXTM3U\nchunk.ts")).toThrow(
      "Segment line found before TLDVCONF"
    );
  });

  test("skips empty lines", () => {
    const m3u8 = "#TLDVCONF:123,0,https://base.com/\n\nchunk.ts\n\n";
    const result = parsePlaylist(m3u8);
    expect(result.segmentUrls).toEqual(["https://base.com/chunk.ts"]);
  });
});
