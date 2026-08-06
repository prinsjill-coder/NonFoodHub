import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { CONTENT_STATUSES } from "../shared/content-status.js";
import { validateMediaFile } from "../shared/media-file-validation.js";
import {
  getMediaAssets,
  getMediaCounts,
  MEDIA_RIGHTS_STATUSES,
  MEDIA_TYPES,
  MEDIA_USAGE_TYPES
} from "../shared/media-model.js";
import { normalizeMediaFileForSession, stableStringify } from "../shared/media-normalizer.js";
import { validateMediaAsset } from "../shared/media-validation.js";
import { createMediaSession } from "../studio/js/state/media-session.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(rootDir, relativePath), "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function firstAsset(data) {
  return data.items[0];
}

function secondAsset(data) {
  return data.items[1];
}

function expectInvalid(data, expectedPath) {
  const report = validateMediaFile(data);
  assert.equal(report.valid, false);
  assert.ok(
    report.errors.some((error) => error.path === expectedPath),
    `Verwachtte fout op ${expectedPath}`
  );
}

async function runCheck(name, check) {
  await check();
  console.log(`ok - ${name}`);
}

export async function runMediaChecks() {
  const media = readJson("data/media.json");

  await runCheck("media.json is geldige JSON en valideert volledig", () => {
    const report = validateMediaFile(media);
    assert.equal(report.valid, true);
    assert.deepEqual(report.errors, []);
  });

  await runCheck("media gebruikt centrale status-, type-, gebruiks- en rechtenlijsten", () => {
    assert.deepEqual(media.statuses, CONTENT_STATUSES);
    assert.deepEqual(media.types.map((item) => item.id), MEDIA_TYPES);
    assert.deepEqual(media.usageTypes.map((item) => item.id), MEDIA_USAGE_TYPES);
    assert.deepEqual(media.rightsStatuses.map((item) => item.id), MEDIA_RIGHTS_STATUSES);
  });

  await runCheck("geregistreerde mediapaden bestaan lokaal binnen het project", () => {
    getMediaAssets(media).forEach((asset) => {
      assert.equal(asset.file.startsWith("/"), false, `${asset.id} heeft een absoluut pad.`);
      assert.equal(asset.file.startsWith("file://"), false, `${asset.id} heeft een file-url.`);
      assert.equal(existsSync(resolve(rootDir, asset.file)), true, `${asset.file} ontbreekt.`);
    });
  });

  await runCheck("dubbele id wordt geblokkeerd", () => {
    const data = clone(media);
    secondAsset(data).id = firstAsset(data).id;
    expectInvalid(data, "items[1].id");
  });

  await runCheck("padvalidatie blokkeert lokale paden en file-url", () => {
    let data = clone(media);
    firstAsset(data).file = "/absolute/voorbeeld.png";
    expectInvalid(data, "items[0].file");

    data = clone(media);
    firstAsset(data).file = "file:///voorbeeld.png";
    expectInvalid(data, "items[0].file");
  });

  await runCheck("bestandsextensie past bij mediatype", () => {
    let data = clone(media);
    firstAsset(data).type = "pdf";
    firstAsset(data).file = "assets/images/voorbeeld.png";
    expectInvalid(data, "items[0].file");

    data = clone(media);
    firstAsset(data).type = "image";
    firstAsset(data).file = "assets/downloads/voorbeeld.pdf";
    expectInvalid(data, "items[0].file");
  });

  await runCheck("alt-tekst en rechtenstatus zijn verplicht bij ready/published waar nodig", () => {
    let data = clone(media);
    firstAsset(data).status = "ready";
    firstAsset(data).alt = "";
    expectInvalid(data, "items[0].alt");

    data = clone(media);
    firstAsset(data).status = "published";
    firstAsset(data).rightsStatus = "unknown";
    expectInvalid(data, "items[0].rightsStatus");
  });

  await runCheck("formuliervalidatie blokkeert dubbele id, ongeldig pad en ongeldig type", () => {
    const asset = {
      ...firstAsset(media),
      id: secondAsset(media).id
    };
    let errors = validateMediaAsset(asset, media.items, { originalId: firstAsset(media).id });
    assert.equal(errors.id, "Deze id is al in gebruik.");

    errors = validateMediaAsset({ ...firstAsset(media), file: "file:///test.png" }, media.items, {
      originalId: firstAsset(media).id
    });
    assert.equal(errors.file, "Gebruik een bestand binnen het project, bijvoorbeeld assets/images/brochures.png. Gebruik geen lokaal computerpad.");

    errors = validateMediaAsset({ ...firstAsset(media), type: "video" }, media.items, {
      originalId: firstAsset(media).id
    });
    assert.equal(errors.type, "Kies een geldig mediatype.");
  });

  await runCheck("onbekende velden waarschuwen maar blokkeren laden niet", () => {
    const data = clone(media);
    data.extraRoot = "tijdelijk";
    firstAsset(data).extraAsset = "tijdelijk";

    const report = validateMediaFile(data);
    assert.equal(report.valid, true);
    assert.ok(report.warnings.some((warning) => warning.path === "root.extraRoot"));
    assert.ok(report.warnings.some((warning) => warning.path === "items[0].extraAsset"));
  });

  await runCheck("normalisatie is deterministisch en stript onbekende velden", () => {
    const data = clone(media);
    data.extraRoot = "tijdelijk";
    firstAsset(data).extraAsset = "tijdelijk";
    const first = normalizeMediaFileForSession(data);
    const second = normalizeMediaFileForSession(data);

    assert.equal(stableStringify(first), stableStringify(second));
    assert.equal("extraRoot" in first, false);
    assert.equal("extraAsset" in first.items[0], false);
  });

  await runCheck("sessie start schoon, wordt dirty en kan herstellen", () => {
    const session = createMediaSession(media);
    assert.equal(session.snapshot().dirty, false);

    const asset = firstAsset(media);
    session.applyMediaAsset({ ...asset, title: `${asset.title} Test` }, asset.id);
    assert.equal(session.snapshot().dirty, true);
    assert.equal(session.snapshot().hasUnexportedChanges, true);

    session.restoreSource();
    assert.equal(session.snapshot().dirty, false);
    assert.equal(session.findById(asset.id).title, asset.title);
  });

  await runCheck("sessie beschermt snapshots en gevonden items tegen externe mutatie", () => {
    const session = createMediaSession(media);
    const asset = firstAsset(media);

    const snapshot = session.snapshot();
    snapshot.lastValidationReport.errors.push({ path: "test", message: "mutatie" });
    assert.equal(session.snapshot().lastValidationReport.errors.length, 0);

    const found = session.findById(asset.id);
    found.title = "Mutatie buiten sessie";
    assert.notEqual(session.findById(asset.id).title, "Mutatie buiten sessie");
  });

  await runCheck("mediacounts rapporteren registry- en controlewaarden", () => {
    const counts = getMediaCounts(media);
    assert.equal(counts.total, media.items.length);
    assert.equal(counts.missingFilePath, 0);
    assert.equal(counts.missingAlt, 0);
    assert.equal(counts.needsRightsReview, media.items.length);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMediaChecks()
    .then(() => {
      console.log("Media checks voltooid.");
    })
    .catch((error) => {
      console.error(`Media checks mislukt: ${error.message}`);
      process.exitCode = 1;
    });
}
