import module from "module";
import path from "path";

// Add absolute path to local node_modules for Turbopack worker processes
const localNodeModules = "C:\\Users\\BRUNO CORDEIRO\\.gemini\\antigravity\\scratch\\cordeiro-energia\\node_modules";
if (!module.globalPaths.includes(localNodeModules)) {
  module.globalPaths.push(localNodeModules);
}

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
