// Converts every .glb/.gltf in /raw-models into a small, compressed .glb in /server/uploads/models:
//   - Draco geometry compression
//   - textures converted to WebP and limited to 2048x2048
//   - duplicate/unused data removed
// It also adds a placeholder entry to server/scripts/seed-data.json for each new model.
//
// Usage (from the repo root):  npm run models:optimize
import fs from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, resample, textureCompress, draco } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { slugify } from '../server/utils/slug.js';

const ROOT = path.join(import.meta.dirname, '..');
const RAW_DIR = path.join(ROOT, 'raw-models');
const OUT_DIR = path.join(ROOT, 'server', 'uploads', 'models');
const SEED_DATA_FILE = path.join(ROOT, 'server', 'scripts', 'seed-data.json');

const MAX_TEXTURE_SIZE = 2048;
const SUPPORTED = ['.glb', '.gltf'];
// Formats glTF-Transform can't read - these must be converted in Blender first
const NEEDS_BLENDER = ['.obj', '.stl', '.fbx', '.dae', '.ply', '.3ds', '.blend', '.usd', '.usdz'];
// Downloads often name the file "scene.gltf"; then the folder name is more useful
const GENERIC_NAMES = ['scene', 'model', 'untitled', 'mesh', 'object'];

const formatSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${(bytes / 1024).toFixed(0)} KB`;

// Human-friendly name for a model file: "damaged_helmet/scene.gltf" -> "damaged_helmet"
const sourceName = (relativePath) => {
  const { dir, name } = path.parse(relativePath);
  return dir && GENERIC_NAMES.includes(name.toLowerCase()) ? path.basename(dir) : name;
};

// Size on disk before optimizing. A .gltf keeps its geometry (.bin) and textures in
// separate files, so those are added up too.
const originalSize = async (filePath) => {
  let total = (await fs.stat(filePath)).size;
  if (path.extname(filePath).toLowerCase() !== '.gltf') return total;

  const json = JSON.parse(await fs.readFile(filePath, 'utf8'));
  const uris = [...(json.buffers ?? []), ...(json.images ?? [])]
    .map((item) => item.uri)
    .filter((uri) => uri && !uri.startsWith('data:'));

  for (const uri of new Set(uris)) {
    const stat = await fs.stat(path.join(path.dirname(filePath), decodeURIComponent(uri))).catch(() => null);
    if (stat) total += stat.size;
  }
  return total;
};

// Adds a placeholder artifact to seed-data.json for every optimized model that has none yet.
// Existing (possibly filled-in) entries are never changed.
const addSeedPlaceholders = async (models) => {
  const seedData = JSON.parse(await fs.readFile(SEED_DATA_FILE, 'utf8'));
  const known = new Set(seedData.artifacts.map((artifact) => artifact.model));
  const exhibitionKeys = seedData.exhibitions.map((exhibition) => exhibition.key);
  const added = [];

  for (const { file, title } of models) {
    if (known.has(file)) continue;
    seedData.artifacts.push({
      model: file,
      // Spread new artifacts across the exhibitions; change this to any exhibition "key"
      exhibition: exhibitionKeys[seedData.artifacts.length % exhibitionKeys.length] ?? null,
      title,
      description: 'TODO: a few sentences about this artifact',
      era: 'TODO',
      region: 'TODO',
      category: 'TODO',
      material: '',
      tags: [],
      credits: { author: 'TODO', sourceUrl: 'TODO', license: 'TODO' },
    });
    added.push(file);
  }

  if (added.length > 0) {
    await fs.writeFile(SEED_DATA_FILE, `${JSON.stringify(seedData, null, 2)}\n`);
  }
  return added;
};

const printBlenderHelp = (files) => {
  if (files.length > 0) {
    console.log(`\n${files.length} file(s) need converting in Blender first:`);
    files.forEach((file) => console.log(`  - raw-models/${file}`));
  }
  console.log(`
How to convert them (Blender 4.x, free from blender.org):
  1. File > New > General, then press A and Delete to remove the default cube, camera and light.
  2. File > Import > Wavefront (.obj)  or  STL (.stl)  (FBX: File > Import > FBX), and pick the file.
     For .obj keep the .mtl file and texture images in the same folder so materials load.
  3. Check the model: STL files are often in millimetres and huge. Select it, press S to scale
     it to a sensible size, then Ctrl+A > All Transforms. STL has no colours, so add a
     material in the Material tab if you want one.
  4. File > Export > glTF 2.0 (.glb/.gltf):
       Format: glTF Binary (.glb)
       Include: Selected Objects off (exports everything), Transform: +Y Up checked
       Mesh: Apply Modifiers checked
  5. Save the .glb into raw-models/ (you can delete the .obj/.stl), then run this script again.
`);
};

const main = async () => {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // All files under raw-models, including sub-folders (paths relative to raw-models)
  const allFiles = (await fs.readdir(RAW_DIR, { recursive: true })).map((file) => file.split(path.sep).join('/'));
  const models = allFiles.filter((file) => SUPPORTED.includes(path.extname(file).toLowerCase()));
  const unsupported = allFiles.filter((file) => NEEDS_BLENDER.includes(path.extname(file).toLowerCase()));

  if (models.length === 0 && unsupported.length === 0) {
    console.log('No models found in raw-models/.');
    return;
  }

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(), // read models that are already Draco-compressed
      'draco3d.encoder': await draco3d.createEncoderModule(), // write Draco-compressed geometry
      'meshopt.decoder': MeshoptDecoder, // read models compressed with meshopt
    });
  await MeshoptDecoder.ready;

  const results = [];
  const failed = [];
  const usedNames = new Set();

  for (const file of models) {
    const inputPath = path.join(RAW_DIR, file);
    const name = sourceName(file);

    // Output file name is a URL-friendly slug; add -2, -3 if two models end up with the same name
    let outputFile = `${slugify(name) || 'model'}.glb`;
    for (let n = 2; usedNames.has(outputFile); n += 1) outputFile = `${slugify(name) || 'model'}-${n}.glb`;
    usedNames.add(outputFile);

    process.stdout.write(`Optimizing ${file} ... `);
    try {
      const before = await originalSize(inputPath);
      const document = await io.read(inputPath);

      await document.transform(
        dedup(), // merge identical meshes, materials and textures
        weld(), // merge duplicate vertices (helps Draco compress better)
        resample(), // remove redundant animation keyframes (does nothing if there are no animations)
        prune(), // remove nodes, materials and textures that nothing uses
        textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [MAX_TEXTURE_SIZE, MAX_TEXTURE_SIZE] }),
        draco() // compress the geometry
      );

      const outputPath = path.join(OUT_DIR, outputFile);
      await io.write(outputPath, document);
      const after = (await fs.stat(outputPath)).size;

      console.log('done');
      results.push({
        source: file,
        output: outputFile,
        before: formatSize(before),
        after: formatSize(after),
        saved: `${Math.round((1 - after / before) * 100)}%`,
        title: name.replace(/[_-]+/g, ' ').trim(),
      });
    } catch (error) {
      console.log('FAILED');
      failed.push({ file, error: error.message });
    }
  }

  if (results.length > 0) {
    console.log(`\nOptimized ${results.length} model(s) into server/uploads/models:`);
    console.table(results.map(({ title, ...row }) => row));

    const added = await addSeedPlaceholders(results.map((r) => ({ file: r.output, title: r.title })));
    if (added.length > 0) {
      console.log(`Added ${added.length} placeholder(s) to server/scripts/seed-data.json - fill in the TODOs:`);
      added.forEach((file) => console.log(`  - ${file}`));
    }
  }

  if (failed.length > 0) {
    console.log(`\n${failed.length} model(s) could not be optimized:`);
    failed.forEach(({ file, error }) => console.log(`  - ${file}: ${error}`));
    console.log('Tip: open the file in Blender and re-export it as .glb (see the steps below).');
  }

  if (unsupported.length > 0 || failed.length > 0) printBlenderHelp(unsupported);

  process.exitCode = failed.length > 0 ? 1 : 0;
};

await main();
