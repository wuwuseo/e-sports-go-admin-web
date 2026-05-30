---
name: "permission-seed-generator"
description: "Generates permission seed data from project routes/menus. Invoke when user wants to create permission seed data for RBAC systems based on existing menu configurations."
---

# Permission Seed Generator

This skill automatically generates permission seed data based on the project's route/menu configuration.

## Features

- **Menu Permissions**: Generates menu-type permissions from route configurations
- **API Permissions**: Creates API permissions for CRUD operations
- **Button Permissions**: Generates button permissions for common actions (add, edit, delete)
- **Hierarchical Structure**: Maintains parent-child relationships between permissions
- **Proper Naming Conventions**: Uses consistent permission code naming (e.g., `role:list`, `permission:add`)

## Usage

1. Run the skill when you need to generate permission seed data
2. The skill will:
   - Scan the project's route configuration files
   - Generate menu permissions based on route meta data
   - Create corresponding API permissions for each menu
   - Add button permissions for common operations
   - Output the seed data to `src/data/permission-seed.ts`

## Generated Data Structure

```typescript
interface Permission {
  id: number;
  name: string;           // Display name
  code: string;          // Permission code (e.g., 'role:list')
  type: 'menu' | 'api' | 'button';  // Permission type
  domain: string;        // Domain/tenant identifier
  path?: string;         // API endpoint path
  method?: string;       // HTTP method (GET, POST, PUT, DELETE)
  menu_path?: string;    // Menu route path
  component?: string;    // Vue component path
  icon?: string;         // Menu icon
  parent_id?: number;    // Parent permission ID
  sort_order?: number;   // Display order
  is_common?: boolean;   // Is common permission (visible to all)
  status: number;        // Status (1=enabled, 0=disabled)
  description?: string;  // Description
}
```

## Example Output

The skill generates a comprehensive permission hierarchy like:

```
System (menu)
├── Role Management (menu)
│   ├── role:list (api)
│   ├── role:create (api)
│   ├── role:update (api)
│   ├── role:delete (api)
│   ├── role:add (button)
│   ├── role:edit (button)
│   └── role:delete (button)
└── Permission Management (menu)
    ├── permission:list (api)
    ├── permission:create (api)
    └── ...
```

## Triggers

Invoke this skill when:
- User asks to "generate permission seed data"
- User wants to "create RBAC permissions from menus"
- User needs to "initialize permission data for role-based access control"
- Setting up a new project with RBAC requirements