const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../../../src/router/routes/modules');
const OUTPUT_FILE = path.join(__dirname, '../../../src/data/permission-seed.ts');

function getRoutesFromDir(dir) {
  const routes = [];
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    if (file.endsWith('.ts')) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const routeMatches = content.match(/path:\s*['"]([^'"]+)['"]/g);
      const nameMatches = content.match(/name:\s*['"]([^'"]+)['"]/g);
      const localeMatches = content.match(/locale:\s*['"]([^'"]+)['"]/g);
      
      if (routeMatches && nameMatches) {
        const routeObjs = [];
        for (let i = 0; i < routeMatches.length; i++) {
          const routePath = routeMatches[i].replace(/path:\s*['"]/g, '').replace(/['"]/, '');
          const routeName = nameMatches[i]?.replace(/name:\s*['"]/g, '').replace(/['"]/, '') || '';
          const locale = localeMatches[i]?.replace(/locale:\s*['"]/g, '').replace(/['"]/, '') || '';
          
          if (routePath && routeName) {
            routeObjs.push({
              path: routePath,
              name: routeName,
              locale: locale,
              module: file.replace('.ts', '')
            });
          }
        }
        routes.push(...routeObjs);
      }
    }
  });
  
  return routes;
}

function generatePermissionSeed(routes) {
  let permissions = [];
  let id = 1;
  
  const menuPermissions = [];
  const apiPermissions = [];
  const buttonPermissions = [];
  
  const menuMap = new Map();
  
  routes.forEach(route => {
    const menuName = route.name.replace(/^System/, '');
    const baseCode = menuName.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '').replace(/-/g, ':');
    
    if (!menuMap.has(route.path)) {
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
        description: `${menuName}页面`
      };
      
      menuPermissions.push(menuPermission);
      menuMap.set(route.path, menuPermission.id);
      
      const apiActions = [
        { code: 'list', method: 'GET', path: `/api/v1/admin/auth/${baseCode}s` },
        { code: 'create', method: 'POST', path: `/api/v1/admin/auth/${baseCode}s` },
        { code: 'update', method: 'PUT', path: `/api/v1/admin/auth/${baseCode}s/{id}` },
        { code: 'delete', method: 'DELETE', path: `/api/v1/admin/auth/${baseCode}s/{id}` }
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
          description: `${menuName}${action.code}API`
        });
      });
      
      const buttonActions = ['add', 'edit', 'delete'];
      
      buttonActions.forEach((action, index) => {
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
          description: `${menuName}${action}按钮`
        });
      });
    }
  });
  
  permissions = [...menuPermissions, ...apiPermissions, ...buttonPermissions];
  
  return permissions;
}

function generateTypeScriptCode(permissions) {
  const permissionsString = permissions.map(p => {
    const lines = [];
    lines.push('{');
    lines.push(`  id: ${p.id},`);
    lines.push(`  name: '${p.name}',`);
    lines.push(`  code: '${p.code}',`);
    lines.push(`  type: '${p.type}',`);
    lines.push(`  domain: '${p.domain}',`);
    if (p.path) lines.push(`  path: '${p.path}',`);
    if (p.method) lines.push(`  method: '${p.method}',`);
    if (p.menu_path) lines.push(`  menu_path: '${p.menu_path}',`);
    if (p.component) lines.push(`  component: '${p.component}',`);
    if (p.icon) lines.push(`  icon: '${p.icon}',`);
    lines.push(`  parent_id: ${p.parent_id === null ? 'null' : p.parent_id},`);
    lines.push(`  sort_order: ${p.sort_order},`);
    lines.push(`  is_common: ${p.is_common},`);
    lines.push(`  status: ${p.status},`);
    if (p.description) lines.push(`  description: '${p.description}',`);
    lines.push('}');
    return lines.join('\n');
  }).join(',\n');

  return `import type { SysPermissionResponse } from '@/types/api';

export const permissionSeedData: SysPermissionResponse[] = [
${permissionsString}
];

export default permissionSeedData;
`;
}

function main() {
  console.log('🔍 Scanning route files...');
  
  try {
    const routes = getRoutesFromDir(ROUTES_DIR);
    console.log(`✅ Found ${routes.length} routes`);
    
    console.log('📝 Generating permission seed data...');
    const permissions = generatePermissionSeed(routes);
    console.log(`✅ Generated ${permissions.length} permissions`);
    
    const code = generateTypeScriptCode(permissions);
    
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(OUTPUT_FILE, code);
    console.log(`✅ Output written to: ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  getRoutesFromDir,
  generatePermissionSeed,
  generateTypeScriptCode,
  main
};