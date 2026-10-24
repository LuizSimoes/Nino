import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "outputs/3d/Nino_v4_mouth_rebuild.glb");
const targetPath = path.join(root, "outputs/3d/Nino_v6_pendant_legible.glb");
const outputPath = path.join(root, "outputs/3d/Nino_v6_complete.glb");

const eyeNames = new Set([
  "EyeGlint_L",
  "EyeGlint_R",
  "EyeWhite_L",
  "EyeWhite_R",
  "Iris_L",
  "Iris_R",
  "Pupil_L",
  "Pupil_R",
]);

function readGlb(filePath) {
  const file = fs.readFileSync(filePath);
  if (file.toString("ascii", 0, 4) !== "glTF") {
    throw new Error(`${filePath} is not a binary glTF file`);
  }

  let json;
  let binary = Buffer.alloc(0);
  let offset = 12;
  while (offset < file.length) {
    const length = file.readUInt32LE(offset);
    const type = file.readUInt32LE(offset + 4);
    const data = file.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString("utf8"));
    if (type === 0x004e4942) binary = Buffer.from(data);
    offset += 8 + length;
  }
  if (!json) throw new Error(`${filePath} has no JSON chunk`);
  return { json, binary };
}

function align4(value) {
  return (value + 3) & ~3;
}

function writeGlb(filePath, json, binary) {
  const jsonBytes = Buffer.from(JSON.stringify(json));
  const jsonPadded = Buffer.alloc(align4(jsonBytes.length), 0x20);
  jsonBytes.copy(jsonPadded);

  const binPadded = Buffer.alloc(align4(binary.length));
  binary.copy(binPadded);
  json.buffers[0].byteLength = binary.length;

  // Recreate JSON after updating buffers[0].byteLength.
  const finalJsonBytes = Buffer.from(JSON.stringify(json));
  const finalJson = Buffer.alloc(align4(finalJsonBytes.length), 0x20);
  finalJsonBytes.copy(finalJson);

  const totalLength = 12 + 8 + finalJson.length + 8 + binPadded.length;
  const header = Buffer.alloc(12);
  header.write("glTF", 0, "ascii");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(finalJson.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binPadded.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);

  fs.writeFileSync(filePath, Buffer.concat([header, jsonHeader, finalJson, binHeader, binPadded]));
}

const source = readGlb(sourcePath);
const target = readGlb(targetPath);
const sourceJson = source.json;
const targetJson = target.json;

targetJson.accessors ??= [];
targetJson.bufferViews ??= [];
targetJson.materials ??= [];
targetJson.meshes ??= [];
targetJson.nodes ??= [];

const copiedViews = new Map();
const copiedAccessors = new Map();
const copiedMaterials = new Map();
const binaryParts = [target.binary];
let binaryLength = target.binary.length;

function appendAligned(buffer) {
  const alignedStart = align4(binaryLength);
  if (alignedStart > binaryLength) {
    binaryParts.push(Buffer.alloc(alignedStart - binaryLength));
    binaryLength = alignedStart;
  }
  const start = binaryLength;
  binaryParts.push(buffer);
  binaryLength += buffer.length;
  return start;
}

function copyBufferView(index) {
  if (copiedViews.has(index)) return copiedViews.get(index);
  const sourceView = sourceJson.bufferViews[index];
  if (sourceView.buffer !== 0) throw new Error("Only single-buffer GLBs are supported");
  const start = sourceView.byteOffset ?? 0;
  const bytes = source.binary.subarray(start, start + sourceView.byteLength);
  const clone = structuredClone(sourceView);
  clone.buffer = 0;
  clone.byteOffset = appendAligned(bytes);
  const result = targetJson.bufferViews.push(clone) - 1;
  copiedViews.set(index, result);
  return result;
}

function copyAccessor(index) {
  if (copiedAccessors.has(index)) return copiedAccessors.get(index);
  const clone = structuredClone(sourceJson.accessors[index]);
  if (clone.bufferView !== undefined) clone.bufferView = copyBufferView(clone.bufferView);
  if (clone.sparse) {
    clone.sparse.indices.bufferView = copyBufferView(clone.sparse.indices.bufferView);
    clone.sparse.values.bufferView = copyBufferView(clone.sparse.values.bufferView);
  }
  const result = targetJson.accessors.push(clone) - 1;
  copiedAccessors.set(index, result);
  return result;
}

function copyMaterial(index) {
  if (copiedMaterials.has(index)) return copiedMaterials.get(index);
  const sourceMaterial = sourceJson.materials[index];
  const existing = targetJson.materials.findIndex((material) => material.name === sourceMaterial.name);
  if (existing >= 0) {
    copiedMaterials.set(index, existing);
    return existing;
  }
  const result = targetJson.materials.push(structuredClone(sourceMaterial)) - 1;
  copiedMaterials.set(index, result);
  return result;
}

function copyPrimitive(sourcePrimitive) {
  const clone = structuredClone(sourcePrimitive);
  clone.attributes = Object.fromEntries(
    Object.entries(sourcePrimitive.attributes).map(([semantic, accessor]) => [semantic, copyAccessor(accessor)]),
  );
  if (sourcePrimitive.indices !== undefined) clone.indices = copyAccessor(sourcePrimitive.indices);
  if (sourcePrimitive.material !== undefined) clone.material = copyMaterial(sourcePrimitive.material);
  if (sourcePrimitive.targets) {
    clone.targets = sourcePrimitive.targets.map((targetShape) =>
      Object.fromEntries(
        Object.entries(targetShape).map(([semantic, accessor]) => [semantic, copyAccessor(accessor)]),
      ),
    );
  }
  return clone;
}

const headIndex = targetJson.nodes.findIndex((node) => node.name === "head");
if (headIndex < 0) throw new Error("Target GLB has no head node");
targetJson.nodes[headIndex].children ??= [];

for (const sourceNode of sourceJson.nodes) {
  if (!eyeNames.has(sourceNode.name)) continue;
  if (sourceNode.mesh === undefined) throw new Error(`${sourceNode.name} has no mesh`);

  const sourceMesh = sourceJson.meshes[sourceNode.mesh];
  const meshClone = structuredClone(sourceMesh);
  meshClone.primitives = sourceMesh.primitives.map(copyPrimitive);
  const meshIndex = targetJson.meshes.push(meshClone) - 1;

  const nodeClone = structuredClone(sourceNode);
  nodeClone.mesh = meshIndex;
  delete nodeClone.skin;
  const nodeIndex = targetJson.nodes.push(nodeClone) - 1;
  targetJson.nodes[headIndex].children.push(nodeIndex);
}

const finalBinary = Buffer.concat(binaryParts, binaryLength);
writeGlb(outputPath, targetJson, finalBinary);

const exportedEyes = targetJson.nodes.filter((node) => eyeNames.has(node.name)).map((node) => node.name);
if (exportedEyes.length !== eyeNames.size) {
  throw new Error(`Expected ${eyeNames.size} eye nodes, got ${exportedEyes.length}`);
}

console.log(`NINO_V6_EYES_REPAIRED output=${outputPath} eyes=${exportedEyes.join(",")}`);
