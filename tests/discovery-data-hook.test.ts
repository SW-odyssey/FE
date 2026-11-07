import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { previewDataSource } from "../src/features/discovery/data/preview.ts";
import type {
  DiscoveryDataSource,
  DiscoveryQuery,
} from "../src/features/discovery/data/types.ts";
import { useDiscoveryData } from "../src/features/discovery/hooks/useDiscoveryData.ts";

const query: DiscoveryQuery = {
  area: "jongno",
  category: "all",
  query: "",
  slot: "afternoon",
  activity: "any",
  origin: null,
  spaces: [],
};

test("preview hook renders final applied/draft/detail values on its first render", () => {
  let requests = 0;
  const source: DiscoveryDataSource = {
    snapshot: previewDataSource.snapshot,
    query: async () => {
      requests += 1;
      throw new Error("unexpected async request");
    },
    getPlace: async () => {
      requests += 1;
      throw new Error("unexpected async request");
    },
  };
  let observed: ReturnType<typeof useDiscoveryData> | undefined;
  function Probe() {
    observed = useDiscoveryData({
      query: { ...query },
      draftQuery: { ...query, activity: "quiet" },
      selectedId: "cheongsudang",
      source,
    });
    return createElement("span", null, observed.selected?.koreanName);
  }
  assert.match(renderToString(createElement(Probe)), /청수당/);
  const data = observed!;
  assert.equal(data.status, "success");
  assert.equal(data.draftStatus, "success");
  assert.equal(data.detailStatus, "success");
  assert.equal(data.error, null);
  assert.deepEqual(data.visible, source.snapshot!.query(query).items);
  assert.equal(
    data.draftCount,
    source.snapshot!.query({ ...query, activity: "quiet" }).total,
  );
  assert.equal(
    data.summaryFor(data.selected!, "ko"),
    data.selectedDetail!.summaries.ko,
  );
  assert.equal(data.photosFor(data.selected!), data.selectedDetail!.photos);
  assert.equal(data.lookupPlace("cheongsudang"), data.selected);
  const visible = data.visible;
  const selected = data.selected;
  data.retry();
  assert.equal(data.visible, visible);
  assert.equal(data.selected, selected);
  assert.equal(data.status, "success");
  assert.equal(requests, 0);
});

test("preview hook matches empty results and missing detail without a loading placeholder", () => {
  let observed: ReturnType<typeof useDiscoveryData> | undefined;
  function Probe() {
    observed = useDiscoveryData({
      query: { ...query, query: "not-a-fixture" },
      selectedId: "missing",
    });
    return null;
  }
  renderToString(createElement(Probe));
  assert.equal(observed!.status, "success");
  assert.equal(observed!.detailStatus, "success");
  assert.deepEqual(observed!.visible, []);
  assert.equal(observed!.draftCount, 0);
  assert.equal(observed!.selected, undefined);
  assert.equal(observed!.selectedDetail, undefined);
});
