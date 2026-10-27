#!/usr/bin/env node
/**
 * Permission seed generator.
 *
 * Scans src/router/routes/modules/*.ts and emits RBAC permission seed data
 * (menu -> api -> button) for the admin console.
 *
 * Usage:
 *   node .agents/skills/permission-seed-generator/scripts/generate-seed.js --dry-run
 *   node .agents/skills/permission-seed-generator/scripts/generate-seed.js --out ./tmp/seed.ts
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_ROUTE_DIR = path.join('src', 'router', 'routes', 'modules');
const DEFAULT_OUTPUT = path.join('src', 'data', 'permission-seed.ts');

/** Walk up from this script until a package.json is found. */
function findProjectRoot(startDir) {
  let dir = startDir;
  for (;;) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        `Cannot locate project root (no package.json above ${startDir})`
      );
    }
    dir = parent;
  }
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    force: false,
    help: false,
    out: null,
    routesDir: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--out') options.out = argv[++i];
    else if (arg === '--routes-dir') options.routesDir = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printUsage() {
  console.log(`Usage: node generate-seed.js [options]

  --dry-run              Parse routes and print a summary, write nothing
  --out <path>           Output file (default: src/data/permission-seed.ts)
  --routes-dir <path>    Route module directory (default: src/router/routes/modules)
  --force                Allow overwriting an existing output file
  --help                 Show this message`);
}

function getRoutesFromDir(dir) {
  const routes = [];
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    if (!file.endsWith('.ts')) return;

    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const routeMatches = content.match(/path:\s*['"]([^'"]+)['"]/g);
    const nameMatches = content.match(/name:\s*['"]([^'"]+)['"]/g);
    const localeMatches = content.match(/locale:\s*['"]([^'"]+)['"]/g);

    if (!routeMatches || !nameMatches) return;

    for (let i = 0; i < routeMatches.length; i += 1) {
      const routePath = routeMatches[i]
        .replace(/path:\s*['"]/g, '')
        .replace(/['"]$/, '');
      const routeName = (nameMatches[i] || '')
        .replace(/name:\s*['"]/g, '')
        .replace(/['"]$/, '');
      const locale = (localeMatches[i] || '')
        .replace(/locale:\s*['"]/g, '')
        .replace(/['"]$/, '');

      if (routePath && routeName) {
        routes.push({
          path: routePath,
          name: routeName,
          locale,
          module: file.replace(/\.ts$/, ''),
        });
      }
    }
  });

  return routes;
}

function generatePermissionSeed(routes) {
  const menuPermissions = [];
  const apiPermissions = [];
  const buttonPermissions = [];
  const menuMap = new Map();
  let id = 1;

  routes.forEach((route) => {
    if (menuMap.has(route.path)) return;

    const menuName = route.name.replace(/^System/, '');
    const baseCode = menuName
      .toLowerCase()
      .replace(/([A-Z])/g, '-$1')
      .replace(/^-/, '')
      .replace(/-/g, ':');
    const isCommon = route.path.startsWith('/dashboard');

    const menuPermission = {
      id: id++,
      name: menuName || route.path,
      code: baseCode || 'unknown',
      type: 'menu',
      domain: 'default',
      menu_path: route.path,
      component: `system/${route.module}/index`,
      parent_id: null,
      sort_order: 0,
      is_common: isCommon,
      status: 1,
      description: `${menuName}页面`,
    };

    menuPermissions.push(menuPermission);
    menuMap.set(route.path, menuPermission.id);

    const apiActions = [
      { code: 'list', method: 'GET', path: `/api/v1/admin/auth/${baseCode}s` },
      {
        code: 'create',
        method: 'POST',
        path: `/api/v1/admin/auth/${baseCode}s`,
      },
      {
        code: 'update',
        method: 'PUT',
        path: `/api/v1/admin/auth/${baseCode}s/{id}`,
      },
      {
        code: 'delete',
        method: 'DELETE',
        path: `/api/v1/admin/auth/${baseCode}s/{id}`,
      },
    ];

    apiActions.forEach((action, index) => {
      apiPermissions.push({
        id: id++,
        name: `${menuName}-${action.code}`,
        code: `${baseCode}:${action.code}`,
        type: 'api',
        domain: 'default',
        path: action.path,
        method: action.method,
        parent_id: menuPermission.id,
        sort_order: index,
        is_common: false,
        status: 1,
        description: `${menuName}${action.code}API`,
      });
    });

    ['add', 'edit', 'delete'].forEach((action, index) => {
      buttonPermissions.push({
        id: id++,
        name: `${menuName}-${action}`,
        code: `${baseCode}:${action}`,
        type: 'button',
        domain: 'default',
        parent_id: menuPermission.id,
        sort_order: index,
        is_common: false,
        status: 1,
        description: `${menuName}${action}按钮`,
      });
    });
  });

  return [...menuPermissions, ...apiPermissions, ...buttonPermissions];
}

function generateTypeScriptCode(permissions) {
  const permissionsString = permissions
    .map((p) => {
      const lines = ['{'];
      lines.push(`    id: ${p.id},`);
      lines.push(`    name: '${p.name}',`);
      lines.push(`    code: '${p.code}',`);
      lines.push(`    type: '${p.type}',`);
      lines.push(`    domain: '${p.domain}',`);
      if (p.path) lines.push(`    path: '${p.path}',`);
      if (p.method) lines.push(`    method: '${p.method}',`);
      if (p.menu_path) lines.push(`    menu_path: '${p.menu_path}',`);
      if (p.component) lines.push(`    component: '${p.component}',`);
      if (p.icon) lines.push(`    icon: '${p.icon}',`);
      lines.push(
        `    parent_id: ${p.parent_id === null ? 'null' : p.parent_id},`
      );
      lines.push(`    sort_order: ${p.sort_order},`);
      lines.push(`    is_common: ${p.is_common},`);
      lines.push(`    status: ${p.status},`);
      if (p.description) lines.push(`    description: '${p.description}',`);
      lines.push('  },');
      return lines.join('\n');
    })
    .join('\n');

  return `import type { SysPermissionType } from '@/types/api';

interface PermissionSeedItem {
  id: number;
  name: string;
  code: string;
  type: SysPermissionType;
  domain: string;
  path?: string;
  method?: string;
  menu_path?: string;
  component?: string;
  icon?: string;
  parent_id?: number | null;
  sort_order?: number;
  is_common?: boolean;
  status: number;
  description?: string;
}

export const permissionSeedData: PermissionSeedItem[] = [
${permissionsString}
];

export default permissionSeedData;
`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const root = findProjectRoot(__dirname);
  const routesDir = options.routesDir
    ? path.resolve(root, options.routesDir)
    : path.join(root, DEFAULT_ROUTE_DIR);
  const outputFile = options.out
    ? path.resolve(root, options.out)
    : path.join(root, DEFAULT_OUTPUT);

  if (!fs.existsSync(routesDir)) {
    throw new Error(`Route directory not found: ${routesDir}`);
  }

  console.log(`Scanning route files: ${routesDir}`);
  const routes = getRoutesFromDir(routesDir);
  console.log(`Found ${routes.length} routes`);

  const permissions = generatePermissionSeed(routes);
  const counts = permissions.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {});
  console.log(
    `Generated ${permissions.length} permissions ` +
      `(menu: ${counts.menu || 0}, api: ${counts.api || 0}, button: ${
        counts.button || 0
      })`
  );

  if (options.dryRun) {
    console.log(`Dry run: nothing written (target would be ${outputFile})`);
    console.log('OK');
    return;
  }

  if (fs.existsSync(outputFile) && !options.force) {
    throw new Error(
      `Refusing to overwrite existing file: ${outputFile}\n` +
        'Use --out <path> to write a scratch copy and diff it, or --force to overwrite deliberately.'
    );
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, generateTypeScriptCode(permissions));
  console.log(`Output written to: ${outputFile}`);
  console.log('OK');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`FAILED: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  findProjectRoot,
  getRoutesFromDir,
  generatePermissionSeed,
  generateTypeScriptCode,
  main,
};
