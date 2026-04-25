/**
 * Removes CMake file(GLOB ... CONFIGURE_DEPENDS) from react-native-reanimated / react-native-worklets
 * on Windows only. CONFIGURE_DEPENDS + AV/indexers causes CMake/ninja loops ("build.ninja still dirty").
 * Safe to run multiple times (no-op if already patched).
 */
const fs = require("fs");
const path = require("path");

if (process.platform !== "win32") {
  process.exit(0);
}

const root = path.join(__dirname, "..");

const patches = [
  {
    file: path.join(root, "node_modules", "react-native-reanimated", "android", "CMakeLists.txt"),
    label: "reanimated",
    old: `file(GLOB_RECURSE REANIMATED_COMMON_CPP_SOURCES CONFIGURE_DEPENDS
     "\${COMMON_CPP_DIR}/reanimated/*.cpp")
file(GLOB_RECURSE REANIMATED_ANDROID_CPP_SOURCES CONFIGURE_DEPENDS
     "\${ANDROID_CPP_DIR}/reanimated/*.cpp")`,
    next: `# CONFIGURE_DEPENDS removed (Windows CMake/ninja fix).
file(GLOB_RECURSE REANIMATED_COMMON_CPP_SOURCES
     "\${COMMON_CPP_DIR}/reanimated/*.cpp")
file(GLOB_RECURSE REANIMATED_ANDROID_CPP_SOURCES
     "\${ANDROID_CPP_DIR}/reanimated/*.cpp")`,
  },
  {
    file: path.join(root, "node_modules", "react-native-worklets", "android", "CMakeLists.txt"),
    label: "worklets",
    old: `file(GLOB_RECURSE WORKLETS_COMMON_CPP_SOURCES CONFIGURE_DEPENDS
     "\${COMMON_CPP_DIR}/worklets/*.cpp")
file(GLOB_RECURSE WORKLETS_ANDROID_CPP_SOURCES CONFIGURE_DEPENDS
     "\${ANDROID_CPP_DIR}/worklets/*.cpp")`,
    next: `# CONFIGURE_DEPENDS removed (Windows CMake/ninja fix).
file(GLOB_RECURSE WORKLETS_COMMON_CPP_SOURCES
     "\${COMMON_CPP_DIR}/worklets/*.cpp")
file(GLOB_RECURSE WORKLETS_ANDROID_CPP_SOURCES
     "\${ANDROID_CPP_DIR}/worklets/*.cpp")`,
  },
];

function normalizeLf(s) {
  return s.replace(/\r\n/g, "\n");
}

const verbose = process.env.PATCH_CMAKE_VERBOSE === "1";

for (const { file, label, old, next } of patches) {
  if (!fs.existsSync(file)) {
    if (verbose) console.warn(`[patch-cmake-windows] skip ${label}: missing ${file}`);
    continue;
  }
  const raw = fs.readFileSync(file, "utf8");
  const n = normalizeLf(raw);
  const o = normalizeLf(old);
  if (!n.includes("CONFIGURE_DEPENDS")) {
    continue;
  }
  if (!n.includes(o)) {
    if (verbose) {
      console.warn(`[patch-cmake-windows] skip ${label}: expected block not found (already patched or version mismatch)`);
    }
    continue;
  }
  const out = n.replace(o, next);
  const useCrLf = /\r\n/.test(raw);
  fs.writeFileSync(file, useCrLf ? out.replace(/\n/g, "\r\n") : out, "utf8");
  console.log(`[patch-cmake-windows] patched ${label}`);
}

const codegenJni = path.join(
  root,
  "node_modules",
  "@react-native",
  "codegen",
  "lib",
  "generators",
  "modules",
  "GenerateModuleJniH.js"
);
if (fs.existsSync(codegenJni)) {
  let cg = fs.readFileSync(codegenJni, "utf8");
  const before = cg;
  cg = cg.replace(
    "file(GLOB react_codegen_SRCS CONFIGURE_DEPENDS *.cpp react/renderer/components/${libraryName}/*.cpp)",
    "file(GLOB react_codegen_SRCS *.cpp react/renderer/components/${libraryName}/*.cpp)"
  );
  if (cg !== before) {
    fs.writeFileSync(codegenJni, cg, "utf8");
    console.log("[patch-cmake-windows] patched @react-native/codegen GenerateModuleJniH.js");
    for (const lib of ["react-native-reanimated", "react-native-worklets"]) {
      const gen = path.join(root, "node_modules", lib, "android", "build", "generated");
      if (fs.existsSync(gen)) {
        fs.rmSync(gen, { recursive: true, force: true });
        console.log(`[patch-cmake-windows] removed ${lib}/android/build/generated (codegen template changed)`);
      }
    }
  }
}
